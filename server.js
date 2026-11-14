require('dotenv').config();

const app = require('./app');
const { testConnection, pool } = require('./config/db');
const { startReminderCron } = require('./services/reminderService');
const smsService = require('./services/smsService');

const PORT = Number(process.env.PORT || 3000);

async function start() {
  try {
    await testConnection();
    console.log('[DB] Connected to MySQL database:', process.env.DB_NAME || 'smart_health_appointment');
  } catch (err) {
    console.error('[DB] Unable to connect to MySQL:', err.message);
    console.error('     Check your .env DB_* settings and make sure MySQL is running.');
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log('');
    console.log('==========================================================');
    console.log('  Smart Health Appointment Booking System');
    console.log(`  URL      : http://localhost:${PORT}`);
    console.log(`  SMS mode : ${smsService.isConfigured() ? 'Twilio (live)' : 'SIMULATED (demo, not delivered)'}`);
    console.log(`  Timezone : ${process.env.APP_TIMEZONE || 'Asia/Kolkata'}`);
    console.log('==========================================================');
    console.log('');
  });

  startReminderCron();

  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received, shutting down...`);
    server.close(async () => {
      try {
        await pool.end();
      } catch (_) {
        /* ignore */
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
