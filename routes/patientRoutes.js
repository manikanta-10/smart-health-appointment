const express = require('express');
const { body } = require('express-validator');
const patientController = require('../controllers/patientController');
const { authenticate } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, allowRoles('patient'));

router.get('/profile', patientController.getProfile);
router.put(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters.'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9+\-\s]{10,15}$/)
      .withMessage('Please enter a valid phone number (10-15 digits).'),
    body('email').optional().trim().isEmail().withMessage('Please enter a valid email address.')
  ],
  validate,
  patientController.updateProfile
);

router.get('/appointments', patientController.listAppointments);
router.get('/stats', patientController.getStats);
router.get('/doctors/:id/history', patientController.getDoctorHistory);

module.exports = router;
