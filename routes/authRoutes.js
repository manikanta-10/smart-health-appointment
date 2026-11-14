const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters.'),
    body('email').trim().isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('phone')
      .trim()
      .matches(/^[0-9+\-\s]{10,15}$/)
      .withMessage('Please enter a valid phone number (10-15 digits).'),
    body('password')
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/[A-Za-z]/)
      .withMessage('Password must contain at least one letter.')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number.')
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  validate,
  authController.login
);

router.get('/me', authenticate, authController.me);

router.put(
  '/password',
  authenticate,
  [
    body('current_password').notEmpty().withMessage('Current password is required.'),
    body('new_password')
      .isLength({ min: 8, max: 72 })
      .withMessage('New password must be at least 8 characters.')
      .matches(/[A-Za-z]/)
      .withMessage('New password must contain at least one letter.')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number.')
  ],
  validate,
  authController.changePassword
);

module.exports = router;
