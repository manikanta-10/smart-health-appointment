const appointmentService = require('../services/appointmentService');
const appointmentModel = require('../models/appointmentModel');
const { parseInputWall } = require('../utils/time');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const createAppointment = asyncHandler(async (req, res) => {
  const { doctor_id: doctorIdRaw, appointment_datetime: appointmentDatetime, reason } = req.body;
  const doctorId = Number(doctorIdRaw);
  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    throw ApiError.badRequest('A valid doctor must be selected.');
  }

  const startWall = parseInputWall(appointmentDatetime);
  if (!startWall) {
    throw ApiError.badRequest('Invalid appointment date/time. Use format YYYY-MM-DDTHH:mm.');
  }

  const { appointment, sms } = await appointmentService.bookAppointment({
    patientId: req.user.id,
    doctorId,
    startWall,
    reason: reason ? String(reason).slice(0, 500) : null
  });

  let message = 'Appointment booked successfully.';
  if (sms.status === 'simulated') {
    message += ' SMS confirmation was simulated (demo mode - not delivered).';
  } else if (sms.status === 'sent') {
    message += ' An SMS confirmation has been sent to your phone.';
  } else if (sms.status === 'failed') {
    message += ' The SMS confirmation could not be sent, but your appointment is confirmed.';
  }

  res.status(201).json({
    success: true,
    message,
    data: { appointment, sms: { status: sms.status } }
  });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointmentId = Number(req.params.id);
  if (!Number.isInteger(appointmentId)) throw ApiError.badRequest('Invalid appointment id.');

  const appointment = await appointmentService.cancelAppointment({
    appointmentId,
    actor: req.user,
    reason: req.body.reason ? String(req.body.reason).slice(0, 500) : 'Cancelled by patient',
    enforceSixHourRule: true
  });

  res.json({
    success: true,
    message: 'Appointment cancelled successfully.',
    data: { appointment }
  });
});

const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentModel.findById(Number(req.params.id));
  if (!appointment) throw ApiError.notFound('Appointment not found.');
  if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
    throw ApiError.forbidden('You can only view your own appointments.');
  }
  if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.doctorId) {
    throw ApiError.forbidden('You can only view appointments assigned to you.');
  }
  res.json({ success: true, data: { appointment } });
});

module.exports = { createAppointment, cancelAppointment, getAppointment };
