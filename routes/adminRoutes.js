const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, allowRoles('admin'));

router.get('/stats', adminController.getStats);

router.get('/doctors', adminController.listDoctors);
router.post(
  '/doctors',
  [
    body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters.'),
    body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('phone').trim().matches(/^[0-9+\-\s]{10,15}$/).withMessage('Valid phone is required.'),
    body('password')
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/[A-Za-z]/)
      .withMessage('Password must contain a letter.')
      .matches(/[0-9]/)
      .withMessage('Password must contain a number.'),
    body('specialization').trim().isLength({ min: 2, max: 120 }).withMessage('Specialization is required.'),
    body('experience').optional().isInt({ min: 0, max: 70 }),
    body('consultation_fee').optional().isFloat({ min: 0 }),
    body('appointment_duration').optional().isInt({ min: 10, max: 120 })
  ],
  validate,
  adminController.createDoctor
);
router.put(
  '/doctors/:id',
  [
    body('password')
      .optional({ values: 'falsy' })
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/[A-Za-z]/)
      .withMessage('Password must contain a letter.')
      .matches(/[0-9]/)
      .withMessage('Password must contain a number.')
  ],
  validate,
  adminController.updateDoctor
);
router.put('/doctors/:id/status', adminController.setDoctorActive);
router.delete('/doctors/:id', adminController.deleteDoctor);

router.get('/patients', adminController.listPatients);
router.put('/patients/:id/status', adminController.setPatientActive);

router.get('/appointments', adminController.listAppointments);
router.post('/appointments/:id/cancel', adminController.cancelAppointment);
router.patch(
  '/appointments/:id/status',
  [body('status').isIn(['confirmed', 'completed', 'cancelled']).withMessage('Invalid status.')],
  validate,
  adminController.updateAppointmentStatus
);

router.get('/cancellations', adminController.listCancellations);
router.get('/calendar', adminController.calendar);
router.get('/sms-logs', adminController.listSmsLogs);

module.exports = router;
