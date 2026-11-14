const doctorModel = require('../models/doctorModel');
const availabilityModel = require('../models/availabilityModel');
const appointmentModel = require('../models/appointmentModel');
const cancellationModel = require('../models/cancellationModel');
const statsModel = require('../models/statsModel');
const appointmentService = require('../services/appointmentService');
const slotsUtil = require('../utils/slots');
const { periods } = require('../utils/periods');
const { parseWall, formatDate, toMysql, addDays } = require('../utils/time');
const { withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function requireDoctor(req) {
  if (!req.user.doctorId) throw ApiError.forbidden('Doctor profile not found for this account.');
  return req.user.doctorId;
}

const getProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorModel.findByUserId(req.user.id);
  if (!doctor) throw ApiError.notFound('Doctor profile not found.');
  const availability = await availabilityModel.listByDoctor(doctor.id);
  res.json({ success: true, data: { doctor, availability } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorModel.findByUserId(req.user.id);
  if (!doctor) throw ApiError.notFound('Doctor profile not found.');

  const b = req.body;
  const data = {
    user_id: doctor.user_id,
    name: b.name !== undefined ? String(b.name).trim() : undefined,
    phone: b.phone !== undefined ? String(b.phone).trim() : undefined,
    specialization: b.specialization !== undefined ? String(b.specialization).trim() : undefined,
    qualification: b.qualification !== undefined ? String(b.qualification).trim() : undefined,
    experience: b.experience !== undefined ? Number(b.experience) : undefined,
    consultation_fee: b.consultation_fee !== undefined ? Number(b.consultation_fee) : undefined,
    appointment_duration: b.appointment_duration !== undefined ? Number(b.appointment_duration) : undefined,
    bio: b.bio !== undefined ? String(b.bio).trim() : undefined
  };

  await withTransaction(async (conn) => {
    await doctorModel.update(conn, doctor.id, data);
  });

  const updated = await doctorModel.findByUserId(req.user.id);
  res.json({ success: true, message: 'Profile updated successfully.', data: { doctor: updated } });
});

const getAvailability = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const availability = await availabilityModel.listByDoctor(doctorId);
  res.json({ success: true, data: { availability } });
});

const updateAvailability = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const { ranges, appointment_duration: appointmentDuration } = req.body;

  if (!Array.isArray(ranges)) throw ApiError.badRequest('ranges must be an array.');

  const cleaned = [];
  for (const r of ranges) {
    const day = Number(r.day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw ApiError.badRequest('Invalid day_of_week. Use 0 (Sunday) to 6 (Saturday).');
    }
    const start = String(r.start_time || '').slice(0, 8);
    const end = String(r.end_time || '').slice(0, 8);
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(start) || !/^\d{2}:\d{2}(:\d{2})?$/.test(end)) {
      throw ApiError.badRequest(`Invalid time range for day ${day}. Use HH:mm.`);
    }
    if (start >= end) throw ApiError.badRequest(`End time must be after start time for day ${day}.`);
    cleaned.push({ day_of_week: day, start_time: start, end_time: end, is_available: r.is_available !== false });
  }

  if (appointmentDuration !== undefined) {
    const d = Number(appointmentDuration);
    if (![10, 15, 20, 30, 45, 60, 90, 120].includes(d)) {
      throw ApiError.badRequest('appointment_duration must be one of 10, 15, 20, 30, 45, 60, 90, 120 minutes.');
    }
  }

  await withTransaction(async (conn) => {
    await availabilityModel.replaceForDoctor(conn, doctorId, cleaned);
    if (appointmentDuration !== undefined) {
      await conn.query('UPDATE doctors SET appointment_duration = ? WHERE id = ?', [
        Number(appointmentDuration),
        doctorId
      ]);
    }
  });

  const availability = await availabilityModel.listByDoctor(doctorId);
  res.json({ success: true, message: 'Availability updated successfully.', data: { availability } });
});

const dashboard = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const p = periods();
  const stats = await statsModel.doctorStats(doctorId, {
    now: p.nowMysql,
    todayStart: p.todayStart,
    tomorrow: p.tomorrow,
    weekStart: p.weekStartMysql,
    nextWeek: p.nextWeekMysql
  });
  const todayAppointments = await appointmentModel.listForRange(
    doctorId,
    p.todayStart,
    p.tomorrow
  );
  const upcoming = await appointmentModel.listForRange(
    doctorId,
    p.nowMysql,
    toMysql(addDays(p.now, 60))
  );
  const upcomingActive = upcoming.filter((a) => ['booked', 'confirmed'].includes(a.status)).slice(0, 5);

  res.json({
    success: true,
    data: { stats, today: p.today, todayAppointments, upcoming: upcomingActive }
  });
});

const listAppointments = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const { from, to, status } = req.query;
  const appointments = await appointmentModel.listForDoctor(doctorId, { from, to, status });
  res.json({ success: true, data: { appointments } });
});

const appointmentDetail = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const appointment = await appointmentModel.findById(Number(req.params.id));
  if (!appointment) throw ApiError.notFound('Appointment not found.');
  if (appointment.doctor_id !== doctorId) {
    throw ApiError.forbidden('You can only view appointments assigned to you.');
  }
  res.json({ success: true, data: { appointment } });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const appointmentId = Number(req.params.id);
  const { status, reason } = req.body;
  const appointment = await appointmentService.changeAppointmentStatus({
    appointmentId,
    actor: req.user,
    status,
    reason
  });
  if (appointment.doctor_id !== doctorId) {
    throw ApiError.forbidden('You can only manage appointments assigned to you.');
  }
  res.json({
    success: true,
    message: `Appointment marked as ${status}.`,
    data: { appointment }
  });
});

const getSlots = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const { date } = req.query;
  if (!date || !parseWall(`${date} 00:00:00`)) {
    throw ApiError.badRequest('A valid date query parameter is required (YYYY-MM-DD).');
  }
  const doctor = await doctorModel.findById(doctorId);
  const slots = await slotsUtil.daySlots({ doctor, dateStr: date });
  res.json({ success: true, data: { date, slots } });
});

const calendar = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const { start, end, include_slots: includeSlots } = req.query;
  const startWall = start ? parseWall(`${start} 00:00:00`) : null;
  const endWall = end ? parseWall(`${end} 00:00:00`) : null;
  if (!startWall || !endWall || endWall < startWall) {
    throw ApiError.badRequest('Valid start and end dates are required (YYYY-MM-DD).');
  }
  const days = Math.round((endWall.getTime() - startWall.getTime()) / 86400000) + 1;
  if (days > 62) throw ApiError.badRequest('Date range too large. Maximum 62 days.');

  const appointments = await appointmentModel.listForRange(
    doctorId,
    `${start} 00:00:00`,
    `${formatDate(addDays(endWall, 1))} 00:00:00`
  );

  const events = appointments.map((a) => ({
    id: `appt-${a.id}`,
    title: `${a.patient_name} (${a.status})`,
    start: a.appointment_datetime.replace(' ', 'T'),
    end: a.appointment_end_datetime.replace(' ', 'T'),
    backgroundColor:
      a.status === 'booked' ? '#2563eb' : a.status === 'confirmed' ? '#0f9b8e' : a.status === 'completed' ? '#64748b' : '#dc2626',
    borderColor: 'transparent',
    extendedProps: {
      type: 'appointment',
      appointment_id: a.id,
      status: a.status,
      patient_name: a.patient_name,
      patient_phone: a.patient_phone,
      patient_email: a.patient_email,
      reason: a.reason
    }
  }));

  const wantsSlots = includeSlots === '1' || days <= 8;
  if (wantsSlots) {
    const doctor = await doctorModel.findById(doctorId);
    const slotEvents = await slotsUtil.availableSlotEvents({ doctor, startDateStr: start, endDateStr: end });
    for (const ev of slotEvents) {
      events.push({
        ...ev,
        title: 'Free slot',
        extendedProps: { ...ev.extendedProps, type: 'available' }
      });
    }
  }

  res.json({ success: true, data: { events } });
});

const listPatients = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const patients = await appointmentModel.listPatientsForDoctor(doctorId);
  res.json({ success: true, data: { patients } });
});

const patientDetail = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const patientId = Number(req.params.patientId);
  if (!patientId) throw ApiError.badRequest('Invalid patient id.');
  const appointments = await appointmentModel.listAll({ doctorId, patientId, limit: 200 });
  if (!appointments.length) {
    throw ApiError.notFound('No appointments found for this patient with you.');
  }
  res.json({
    success: true,
    data: {
      patient: {
        id: appointments[0].patient_id,
        name: appointments[0].patient_name,
        email: appointments[0].patient_email,
        phone: appointments[0].patient_phone
      },
      appointments
    }
  });
});

const listCancellations = asyncHandler(async (req, res) => {
  const doctorId = requireDoctor(req);
  const logs = await cancellationModel.listForDoctor(doctorId);
  res.json({ success: true, data: { cancellations: logs } });
});

module.exports = {
  getProfile,
  updateProfile,
  getAvailability,
  updateAvailability,
  dashboard,
  listAppointments,
  appointmentDetail,
  updateAppointmentStatus,
  getSlots,
  calendar,
  listPatients,
  patientDetail,
  listCancellations
};
