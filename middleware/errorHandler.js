const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {})
    });
  }

  if (err && err.code === 'ER_DUP_ENTRY') {
    if (String(err.message).includes('unique_doctor_datetime')) {
      return res.status(409).json({
        success: false,
        message: 'This slot was just booked by another patient. Please choose a different time.'
      });
    }
    return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }

  if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2')) {
    return res.status(409).json({ success: false, message: 'This operation conflicts with related records.' });
  }

  console.error('[Unhandled error]', err);
  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred. Please try again.'
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
