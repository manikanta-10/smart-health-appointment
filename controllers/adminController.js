const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const doctorModel = require('../models/doctorModel');
const availabilityModel = require('../models/availabilityModel');
const appointmentModel = require('../models/appointmentModel');
const cancellationModel = require('../models/cancellationModel');
const smsLogModel = require('../models/smsLogModel');
const statsModel = require('../models/statsModel');
const appointmentService = require('../services/appointmentService');
const { periods } = require('../utils/periods');
const { parseWall, formatDate, addDays } = require('../utils/time');
const { withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const SALT_ROUNDS = 10;

const getStats = asyncHandler(async (req, res) => {
  const p = periods();
  const stats = await statsModel.adminStats({
    now: p.nowMysql,
    todayStart: p.todayStart,
    tomorrow: p.tomorrow,
    weekStart: p.weekStartMysql,
    nextWeek: p.nextWeekMysql
  });
  const statusBreakdown = await statsModel.statusBreakdown();
  const perDoctor = await statsModel.perDoctor();
  const smsStats = await smsLogModel.stats();

  const todayWall = parseWall(`${p.today} 00:00:00`);
  const startDate = formatDate(addDays(todayWall, -6));
  const rawDaily = await statsModel.dailyCounts({ startDate, endDate: p.tomorrowDate });
  const dailyMap = new Map(rawDaily.map((r) => [String(r.day), r.count]));
  const daily = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = formatDate(addDays(todayWall, -i));
    daily.push({ date: d, count: dailyMap.get(d) || 0 });
  }

  const upcoming = await appointmentModel.listUpcomingGlobal(6);

  res.json({
    success: true,
    data: { stats, statusBreakdown, perDoctor, daily, smsStats, upcoming }
  });
});

const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await doctorModel.listAdmin();
  res.json({ success: true, data: { doctors } });
});

const createDoctor = asyncHandler(async (req, res) => {
  const {
    name, email, phone, password, specialization, qualification,
    experience, consultation_fee: consultationFee, appointment_duration: appointmentDuration, bio
  } = req.body;

  const existing = await userModel.findByEmail(email);
  if (existing) throw ApiError.conflict('An account with this email already exists.');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const doctorId = await withTransaction(async (conn) => {
    const userId = await userModel.create(conn, {
      name: name.trim(),
      email,
      phone: phone.trim(),
      password: hash,
      role: 'doctor'
    });
    const id = await doctorModel.create(conn, {
      userId,
      specialization: specialization.trim(),
      qualification: qualification ? String(qualification).trim() : null,
      experience,
      consultationFee,
      appointmentDuration,
      bio: bio ? String(bio).trim() : null
    });
    const defaultRanges = [1, 2, 3, 4, 5].map((day) => ({
      day_of_week: day,
      start_time: '09:00:00',
      end_time: '17:00:00',
      is_available: 1
    }));
    await availabilityModel.replaceForDoctor(conn, id, defaultRanges);
    return id;
  });

  const doctor = await doctorModel.findById(doctorId);
  res.status(201).json({
    success: true,
    message: 'Doctor account created. Default availability Mon-Fri 09:00-17:00 was set; the doctor can adjust it.',
    data: { doctor }
  });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);
  const doctor = await doctorModel.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Doctor not found.');

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
  const newPassword = b.password ? String(b.password) : null;

  await withTransaction(async (conn) => {
    await doctorModel.update(conn, doctorId, data);
    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await conn.query('UPDATE users SET password = ? WHERE id = ?', [hash, doctor.user_id]);
    }
  });

  const updated = await doctorModel.findById(doctorId);
  res.json({ success: true, message: 'Doctor details updated.', data: { doctor: updated } });
});

const setDoctorActive = asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);
  const active = req.body.is_active === true || req.body.is_active === 1 || req.body.is_active === '1';
  const doctor = await doctorModel.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Doctor not found.');
  await doctorModel.setActive(doctorId, active);
  res.json({
    success: true,
    message: active ? 'Doctor account activated.' : 'Doctor account deactivated. Existing appointments are preserved.',
    data: { doctor_id: doctorId, is_active: active ? 1 : 0 }
  });
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);
  const doctor = await doctorModel.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Doctor not found.');
  await doctorModel.setActive(doctorId, false);
  res.json({
    success: true,
    message: 'Doctor account deactivated (soft delete). Appointments and audit history are preserved.'
  });
});

const listPatients = asyncHandler(async (req, res) => {
  const patients = await userModel.listPatients({ q: req.query.q || '' });
  res.json({ success: true, data: { patients } });
});

const setPatientActive = asyncHandler(async (req, res) => {
  const patientId = Number(req.params.id);
  const active = req.body.is_active === true || req.body.is_active === 1 || req.body.is_active === '1';
  const patient = await userModel.findById(patientId);
  if (!patient || patient.role !== 'patient') throw ApiError.notFound('Patient not found.');
  await userModel.setActive(patientId, active);
  res.json({
    success: true,
    message: active ? 'Patient account activated.' : 'Patient account deactivated.',
    data: { patient_id: patientId, is_active: active ? 1 : 0 }
  });
});

const listAppointments = asyncHandler(async (req, res) => {
  const { doctor_id: doctorId, patient_id: patientId, date, status, from, to } = req.query;
  const appointments = await appointmentModel.listAll({
    doctorId: doctorId ? Number(doctorId) : undefined,
    patientId: patientId ? Number(patientId) : undefined,
    date,
    status,
    from,
    to,
    limit: 500
  });
  res.json({ success: true, data: { appointments } });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointmentId = Number(req.params.id);
  const appointment = await appointmentService.cancelAppointment({
    appointmentId,
    actor: req.user,
    reason: req.body.reason ? String(req.body.reason).slice(0, 500) : 'Cancelled by administrator',
    enforceSixHourRule: false
  });
  res.json({ success: true, message: 'Appointment cancelled by admin.', data: { appointment } });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointmentId = Number(req.params.id);
  const appointment = await appointmentService.changeAppointmentStatus({
    appointmentId,
    actor: req.user,
    status: req.body.status,
    reason: req.body.reason
  });
  res.json({
    success: true,
    message: `Appointment marked as ${req.body.status}.`,
    data: { appointment }
  });
});

const listCancellations = asyncHandler(async (req, res) => {
  const doctorId = req.query.doctor_id ? Number(req.query.doctor_id) : undefined;
  const cancellations = await cancellationModel.listAll({ doctorId });
  res.json({ success: true, data: { cancellations } });
});

const calendar = asyncHandler(async (req, res) => {
  const { start, end, doctor_id: doctorId } = req.query;
  const startWall = start ? parseWall(`${start} 00:00:00`) : null;
  const endWall = end ? parseWall(`${end} 00:00:00`) : null;
  if (!startWall || !endWall || endWall < startWall) {
    throw ApiError.badRequest('Valid start and end dates are required (YYYY-MM-DD).');
  }
  const days = Math.round((endWall.getTime() - startWall.getTime()) / 86400000) + 1;
  if (days > 62) throw ApiError.badRequest('Date range too large. Maximum 62 days.');

  const appointments = await appointmentModel.listAll({
    doctorId: doctorId ? Number(doctorId) : undefined,
    from: start,
    to: formatDate(endWall),
    limit: 1000
  });

  const events = appointments.map((a) => ({
    id: `appt-${a.id}`,
    title: `${a.patient_name} - ${a.doctor_name}`,
    start: a.appointment_datetime.replace(' ', 'T'),
    end: a.appointment_end_datetime.replace(' ', 'T'),
    backgroundColor:
      a.status === 'booked' ? '#2563eb' : a.status === 'confirmed' ? '#0f9b8e' : a.status === 'completed' ? '#64748b' : '#dc2626',
    borderColor: 'transparent',
    extendedProps: {
      appointment_id: a.id,
      status: a.status,
      doctor_name: a.doctor_name,
      patient_name: a.patient_name,
      patient_phone: a.patient_phone,
      specialization: a.specialization,
      reason: a.reason
    }
  }));

  res.json({ success: true, data: { events } });
});

const listSmsLogs = asyncHandler(async (req, res) => {
  const logs = await smsLogModel.list({
    status: req.query.status,
    messageType: req.query.message_type
  });
  const stats = await smsLogModel.stats();
  res.json({ success: true, data: { logs, stats, mode: require('../services/smsService').isConfigured() ? 'twilio' : 'simulated' } });
});

module.exports = {
  getStats,
  listDoctors,
  createDoctor,
  updateDoctor,
  setDoctorActive,
  deleteDoctor,
  listPatients,
  setPatientActive,
  listAppointments,
  cancelAppointment,
  updateAppointmentStatus,
  listCancellations,
  calendar,
  listSmsLogs
};
