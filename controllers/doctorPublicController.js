const doctorModel = require('../models/doctorModel');
const appointmentModel = require('../models/appointmentModel');
const slotsUtil = require('../utils/slots');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { parseWall } = require('../utils/time');

const listDoctors = asyncHandler(async (req, res) => {
  const { specialization, q } = req.query;
  const doctors = await doctorModel.list({ specialization, q });
  res.json({ success: true, data: { doctors } });
});

const listSpecializations = asyncHandler(async (req, res) => {
  const rows = await doctorModel.specializations();
  res.json({ success: true, data: { specializations: rows.map((r) => r.specialization) } });
});

const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorModel.findById(req.params.id);
  if (!doctor || !doctor.is_active) throw ApiError.notFound('Doctor not found.');
  res.json({ success: true, data: { doctor } });
});

const getAvailableSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date || !parseWall(`${date} 00:00:00`)) {
    throw ApiError.badRequest('A valid date query parameter is required (YYYY-MM-DD).');
  }
  const doctor = await doctorModel.findById(req.params.id);
  if (!doctor || !doctor.is_active) throw ApiError.notFound('Doctor not found.');

  const slots = await slotsUtil.availableSlotsForDate({ doctor, dateStr: date });
  res.json({
    success: true,
    data: {
      date,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        appointment_duration: doctor.appointment_duration,
        consultation_fee: doctor.consultation_fee
      },
      slots
    }
  });
});

const getAvailableCalendar = asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end || !parseWall(`${start} 00:00:00`) || !parseWall(`${end} 00:00:00`)) {
    throw ApiError.badRequest('Valid start and end query parameters are required (YYYY-MM-DD).');
  }
  const doctor = await doctorModel.findById(req.params.id);
  if (!doctor || !doctor.is_active) throw ApiError.notFound('Doctor not found.');

  const events = await slotsUtil.availableSlotEvents({ doctor, startDateStr: start, endDateStr: end });
  res.json({ success: true, data: { events } });
});

const getPatientAppointmentsForDoctor = asyncHandler(async (req, res) => {
  const rows = await appointmentModel.listAll({
    doctorId: req.params.id,
    patientId: req.user.id,
    limit: 200
  });
  res.json({ success: true, data: { appointments: rows } });
});

module.exports = {
  listDoctors,
  listSpecializations,
  getDoctor,
  getAvailableSlots,
  getAvailableCalendar,
  getPatientAppointmentsForDoctor
};
