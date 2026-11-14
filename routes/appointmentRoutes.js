const express = require('express');
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  allowRoles('patient'),
  [
    body('doctor_id').isInt({ min: 1 }).withMessage('A valid doctor must be selected.'),
    body('appointment_datetime').notEmpty().withMessage('Appointment date/time is required.'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be at most 500 characters.')
  ],
  validate,
  appointmentController.createAppointment
);

router.post(
  '/:id/cancel',
  allowRoles('patient'),
  [body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be at most 500 characters.')],
  validate,
  appointmentController.cancelAppointment
);

router.get('/:id', appointmentController.getAppointment);

module.exports = router;
