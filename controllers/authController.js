const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const doctorModel = require('../models/doctorModel');
const { signToken } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = 10;

function publicUser(user, doctorId = null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    doctor_id: doctorId
  };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await userModel.findByEmail(email);
  if (existing) throw ApiError.conflict('An account with this email already exists. Please log in instead.');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = await userModel.create(null, {
    name: name.trim(),
    email,
    phone: phone.trim(),
    password: hash,
    role: 'patient'
  });

  const user = await userModel.findById(id);
  const token = signToken(user);
  res.status(201).json({
    success: true,
    message: 'Registration successful. Welcome to Smart Health!',
    data: { token, user: publicUser(user) }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findByEmail(email);
  if (!user) throw ApiError.unauthorized('Invalid email or password.');

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password.');

  if (!user.is_active) {
    throw ApiError.forbidden('This account has been deactivated. Please contact the administrator.');
  }

  const full = await userModel.findById(user.id);
  const token = signToken(user);
  res.json({
    success: true,
    message: 'Login successful',
    data: { token, user: publicUser(full, full.doctor_id) }
  });
});

const me = asyncHandler(async (req, res) => {
  let doctor = null;
  if (req.user.role === 'doctor') {
    doctor = await doctorModel.findByUserId(req.user.id);
  }
  res.json({
    success: true,
    data: {
      user: req.user,
      doctor: doctor
        ? {
            id: doctor.id,
            specialization: doctor.specialization,
            qualification: doctor.qualification,
            experience: doctor.experience,
            consultation_fee: doctor.consultation_fee,
            appointment_duration: doctor.appointment_duration,
            bio: doctor.bio
          }
        : null
    }
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body;
  const user = await userModel.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found.');

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw ApiError.badRequest('Current password is incorrect.');

  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current password.');
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userModel.updateProfile(user.id, { password: hash });
  res.json({ success: true, message: 'Password changed successfully.' });
});

module.exports = { register, login, me, changePassword };
