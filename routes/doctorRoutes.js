const express = require('express');
const { body } = require('express-validator');
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, allowRoles('doctor'));

router.get('/dashboard', doctorController.dashboard);
router.get('/profile', doctorController.getProfile);
router.put(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('phone').optional().trim().matches(/^[0-9+\-\s]{10,15}$/).withMessage('Invalid phone number.'),
    body('experience').optional().isInt({ min: 0, max: 70 }).withMessage('Experience must be 0-70 years.'),
    body('consultation_fee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be positive.'),
    body('appointment_duration').optional().isInt({ min: 10, max: 120 }).withMessage('Duration must be 10-120 minutes.'),
    body('bio').optional().isLength({ max: 2000 })
  ],
  validate,
  doctorController.updateProfile
);

router.get('/availability', doctorController.getAvailability);
router.put('/availability', doctorController.updateAvailability);

router.get('/appointments', doctorController.listAppointments);
router.get('/appointments/:id', doctorController.appointmentDetail);
router.patch(
  '/appointments/:id/status',
  [
    body('status').isIn(['confirmed', 'completed', 'cancelled']).withMessage('Invalid status.'),
    body('reason').optional().isLength({ max: 500 })
  ],
  validate,
  doctorController.updateAppointmentStatus
);

router.get('/slots', doctorController.getSlots);
router.get('/calendar', doctorController.calendar);
router.get('/patients', doctorController.listPatients);
router.get('/patients/:patientId', doctorController.patientDetail);
router.get('/cancellations', doctorController.listCancellations);

module.exports = router;
