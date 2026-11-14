const userModel = require('../models/userModel');
const appointmentModel = require('../models/appointmentModel');
const statsModel = require('../models/statsModel');
const { periods } = require('../utils/periods');
const { parseWall } = require('../utils/time');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getProfile = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at
      }
    }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;
  const fields = {};
  if (name !== undefined) fields.name = String(name).trim();
  if (phone !== undefined) fields.phone = String(phone).trim();
  if (email !== undefined && String(email).trim().toLowerCase() !== req.user.email) {
    const target = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      throw ApiError.badRequest('Please enter a valid email address.');
    }
    const existing = await userModel.findByEmail(target);
    if (existing) throw ApiError.conflict('This email is already registered to another account.');
    fields.email = target;
  }

  await userModel.updateProfile(req.user.id, fields);
  const user = await userModel.findById(req.user.id);
  res.json({
    success: true,
    message: 'Profile updated successfully.',
    data: {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    }
  });
});

const listAppointments = asyncHandler(async (req, res) => {
  const scope = ['upcoming', 'history', 'all'].includes(req.query.scope) ? req.query.scope : 'all';
  const appointments = await appointmentModel.listForPatient(req.user.id, { scope });
  res.json({ success: true, data: { appointments } });
});

const getStats = asyncHandler(async (req, res) => {
  const p = periods();
  const stats = await statsModel.patientStats(req.user.id, { now: p.nowMysql });
  const upcoming = await appointmentModel.listForPatient(req.user.id, { scope: 'upcoming', limit: 1 });
  const recent = await appointmentModel.listForPatient(req.user.id, { scope: 'history', limit: 5 });
  res.json({
    success: true,
    data: { stats, nextAppointment: upcoming[0] || null, recentAppointments: recent }
  });
});

const getDoctorHistory = asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);
  if (!doctorId) throw ApiError.badRequest('Invalid doctor id.');
  const appointments = await appointmentModel.listAll({
    doctorId,
    patientId: req.user.id,
    limit: 200
  });
  res.json({ success: true, data: { appointments } });
});

module.exports = { getProfile, updateProfile, listAppointments, getStats, getDoctorHistory };
