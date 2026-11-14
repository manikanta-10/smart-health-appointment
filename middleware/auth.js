const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_insecure_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Session expired or token is invalid. Please log in again.');
  }

  const rows = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active,
            d.id AS doctor_id
       FROM users u
       LEFT JOIN doctors d ON d.user_id = u.id
      WHERE u.id = ?`,
    [payload.id]
  );

  if (!rows.length) throw ApiError.unauthorized('Account no longer exists');
  const user = rows[0];
  if (!user.is_active) throw ApiError.forbidden('Your account has been deactivated. Contact the administrator.');

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    doctorId: user.doctor_id || null
  };
  next();
});

module.exports = { authenticate, signToken, JWT_SECRET };
