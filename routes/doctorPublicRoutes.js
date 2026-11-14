const express = require('express');
const doctorPublicController = require('../controllers/doctorPublicController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', doctorPublicController.listDoctors);
router.get('/specializations', doctorPublicController.listSpecializations);
router.get('/:id', doctorPublicController.getDoctor);
router.get('/:id/slots', authenticate, doctorPublicController.getAvailableSlots);
router.get('/:id/calendar', authenticate, doctorPublicController.getAvailableCalendar);

module.exports = router;
