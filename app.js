const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorPublicRoutes = require('./routes/doctorPublicRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const smsService = require('./services/smsService');

const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(cors());
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
      sms_mode: smsService.isConfigured() ? 'twilio' : 'simulated',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctors', doctorPublicRoutes);
app.use('/api/appointments', appointmentRoutes);

app.use('/api', notFoundHandler);

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, { extensions: ['html'] }));

app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(publicDir, '404.html'));
  }
  return res.status(404).json({ success: false, message: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
