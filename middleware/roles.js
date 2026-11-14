const ApiError = require('../utils/ApiError');

function allowRoles(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Access denied. This resource requires role: ${roles.join(' or ')}`));
    }
    return next();
  };
}

module.exports = { allowRoles };
