const { withTransaction } = require('../config/db');
const appointmentModel = require('../models/appointmentModel');
const availabilityModel = require('../models/availabilityModel');
const cancellationModel = require('../models/cancellationModel');
const smsService = require('./smsService');
const slots = require('../utils/slots');
const time = require('../utils/time');
const ApiError = require('../utils/ApiError');

const CANCELLATION_WINDOW_HOURS = 6;

/**
 * Book an appointment with full backend enforcement:
 *  - doctor must exist and be active
 *  - slot must be in the future and inside doctor availability grid
 *  - no overlap with active appointments (interval overlap check)
 *  - max 2 active appointments per patient/doctor per calendar week (Mon-Sun)
 *  - row-level lock on the doctor serialises concurrent bookings
 *  - DB unique key (doctor_id, appointment_datetime) as final safety net
 */
async function bookAppointment({ patientId, doctorId, startWall, reason }) {
  if (!startWall) throw ApiError.badRequest('Invalid appointment date/time.');
  if (startWall.getUTCSeconds() !== 0) {
    throw ApiError.badRequest('Appointment time must be on a whole minute.');
  }

  const now = time.nowIST();
  if (startWall <= now) {
    throw ApiError.badRequest('You cannot book an appointment in the past. Please pick an upcoming slot.');
  }

  const appointmentId = await withTransaction(async (conn) => {
    const [doctorRows] = await conn.query(
      `SELECT d.*, u.name AS doctor_name, u.is_active
         FROM doctors d JOIN users u ON u.id = d.user_id
        WHERE d.id = ? FOR UPDATE`,
      [doctorId]
    );
    const doctor = doctorRows[0];
    if (!doctor || !doctor.is_active) {
      throw ApiError.notFound('Doctor not found or is currently unavailable.');
    }

    const duration = Number(doctor.appointment_duration) || 30;
    const endWall = time.addMinutes(startWall, duration);
    const startMysql = time.toMysql(startWall);
    const endMysql = time.toMysql(endWall);

    const availability = await availabilityModel.listByDoctor(doctorId, conn);
    if (!slots.fitsAvailability(availability, doctor, startWall)) {
      throw ApiError.badRequest(
        'The selected time is not an available slot for this doctor. Please choose from the available slots.'
      );
    }

    const overlap = await appointmentModel.findOverlap(conn, doctorId, startMysql, endMysql);
    if (overlap) {
      throw ApiError.conflict(
        'This slot is already booked. Please choose another available slot.'
      );
    }

    const weekStart = time.mondayOf(startWall);
    const weekEnd = time.addDays(weekStart, 7);
    const weeklyCount = await appointmentModel.countWeekly(
      conn,
      patientId,
      doctorId,
      time.toMysql(weekStart),
      time.toMysql(weekEnd)
    );
    if (weeklyCount >= 2) {
      throw ApiError.conflict(
        'Weekly booking limit reached. A patient can book at most 2 appointments with the same doctor per calendar week (Monday-Sunday).'
      );
    }

    const id = await appointmentModel.insert(conn, {
      patientId,
      doctorId,
      start: startMysql,
      end: endMysql,
      status: 'booked',
      reason
    });

    return id;
  });

  const appointment = await appointmentModel.findById(appointmentId);
  let sms = { status: 'skipped' };
  try {
    sms = await smsService.sendBookingConfirmation(appointment);
  } catch (err) {
    console.error('[Booking] SMS confirmation failed:', err.message);
    sms = { status: 'failed', error: err.message };
  }

  return { appointment, sms };
}

function assertCanActOnAppointment(appointment, actor) {
  if (actor.role === 'admin') return;
  if (actor.role === 'patient' && appointment.patient_id !== actor.id) {
    throw ApiError.forbidden('You can only manage your own appointments.');
  }
  if (actor.role === 'doctor' && appointment.doctor_id !== actor.doctorId) {
    throw ApiError.forbidden('You can only manage appointments assigned to you.');
  }
}

/**
 * Cancel an appointment. Patients must cancel at least 6 hours ahead.
 * Doctors and admins can cancel through their dedicated status endpoints
 * (enforceSixHourRule = false).
 */
async function cancelAppointment({ appointmentId, actor, reason, enforceSixHourRule = true }) {
  const result = await withTransaction(async (conn) => {
    const locked = await appointmentModel.lockById(conn, appointmentId);
    if (!locked) throw ApiError.notFound('Appointment not found.');

    const appointment = await appointmentModel.findById(appointmentId, conn);
    assertCanActOnAppointment(appointment, actor);

    if (!['booked', 'confirmed'].includes(appointment.status)) {
      throw ApiError.badRequest(`Appointment is already ${appointment.status} and cannot be cancelled.`);
    }

    if (enforceSixHourRule) {
      const start = time.parseWall(appointment.appointment_datetime);
      const hoursLeft = time.diffHours(start, time.nowIST());
      if (hoursLeft < CANCELLATION_WINDOW_HOURS) {
        throw ApiError.badRequest(
          'Appointments can only be cancelled at least 6 hours before the scheduled time. Please contact the clinic for urgent changes.'
        );
      }
    }

    const previousStatus = appointment.status;
    await appointmentModel.updateStatus(conn, appointmentId, 'cancelled');
    await cancellationModel.create(conn, {
      appointmentId,
      cancelledBy: actor.id,
      reason: reason || `Cancelled by ${actor.role}`,
      previousStatus,
      newStatus: 'cancelled'
    });

    return appointmentModel.findById(appointmentId, conn);
  });

  return result;
}

/**
 * Doctor/admin status transitions.
 * booked -> confirmed | cancelled
 * confirmed -> completed | cancelled
 * completed/cancelled are terminal.
 */
async function changeAppointmentStatus({ appointmentId, actor, status, reason }) {
  const allowedStatuses = ['confirmed', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    throw ApiError.badRequest('Invalid status. Allowed values: confirmed, completed, cancelled.');
  }

  const result = await withTransaction(async (conn) => {
    const locked = await appointmentModel.lockById(conn, appointmentId);
    if (!locked) throw ApiError.notFound('Appointment not found.');

    const appointment = await appointmentModel.findById(appointmentId, conn);
    assertCanActOnAppointment(appointment, actor);

    const transitions = {
      booked: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };
    if (!transitions[appointment.status].includes(status)) {
      throw ApiError.badRequest(
        `Cannot change appointment status from "${appointment.status}" to "${status}".`
      );
    }

    if (status === 'cancelled') {
      await appointmentModel.updateStatus(conn, appointmentId, 'cancelled');
      await cancellationModel.create(conn, {
        appointmentId,
        cancelledBy: actor.id,
        reason: reason || `Cancelled by ${actor.role}`,
        previousStatus: appointment.status,
        newStatus: 'cancelled'
      });
    } else {
      await appointmentModel.updateStatus(conn, appointmentId, status);
    }

    return appointmentModel.findById(appointmentId, conn);
  });

  return result;
}

module.exports = {
  CANCELLATION_WINDOW_HOURS,
  bookAppointment,
  cancelAppointment,
  changeAppointmentStatus
};
