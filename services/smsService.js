const smsLogModel = require('../models/smsLogModel');
const { parseWall, formatDateDisplay, formatTimeDisplay } = require('../utils/time');

let twilioClient = null;
let twilioLoadAttempted = false;

function getCredentials() {
  return {
    accountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
    authToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
    from: (process.env.TWILIO_PHONE_NUMBER || '').trim()
  };
}

function isConfigured() {
  const c = getCredentials();
  return Boolean(c.accountSid && c.authToken && c.from && c.accountSid.startsWith('AC'));
}

function getClient() {
  if (!isConfigured()) return null;
  if (!twilioLoadAttempted) {
    twilioLoadAttempted = true;
    try {
      // Lazy load so the app runs fine without Twilio installed/configured.
      // eslint-disable-next-line global-require
      const twilio = require('twilio');
      twilioClient = twilio(getCredentials().accountSid, getCredentials().authToken);
    } catch (err) {
      console.error('[SMS] Failed to initialise Twilio client:', err.message);
      twilioClient = null;
    }
  }
  return twilioClient;
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  const onlyDigits = digits.replace(/\D/g, '');
  if (onlyDigits.length === 10) return `+91${onlyDigits}`;
  if (onlyDigits.length === 12 && onlyDigits.startsWith('91')) return `+${onlyDigits}`;
  if (onlyDigits.length === 11 && onlyDigits.startsWith('0')) return `+91${onlyDigits.slice(1)}`;
  return `+${onlyDigits}`;
}

function formatAppointment(appointment) {
  const d = parseWall(appointment.appointment_datetime);
  if (!d) return { date: appointment.appointment_datetime, time: '' };
  return { date: formatDateDisplay(String(appointment.appointment_datetime).slice(0, 10)), time: formatTimeDisplay(d) };
}

function buildConfirmationMessage(appointment) {
  const { date, time } = formatAppointment(appointment);
  return `Hello ${appointment.patient_name}, your appointment with ${appointment.doctor_name} is booked for ${date} at ${time}. Thank you!`;
}

function buildReminderMessage(appointment) {
  const { time } = formatAppointment(appointment);
  return `Reminder: Your appointment with ${appointment.doctor_name} is scheduled for tomorrow at ${time}. Please arrive on time.`;
}

/**
 * Send (or simulate) an SMS and always write an sms_logs row.
 * Never throws: booking flows must not fail because SMS failed.
 * Simulated messages are logged with status = 'simulated' and are NEVER
 * reported as delivered.
 */
async function sendSms({ appointmentId, phoneNumber, message, messageType }) {
  const to = normalizePhone(phoneNumber);

  if (!isConfigured()) {
    const logId = await smsLogModel.create(null, {
      appointmentId,
      phoneNumber: to || phoneNumber,
      message,
      messageType,
      status: 'simulated'
    });
    console.log(`[SMS SIMULATED] (demo mode, not delivered) to ${to || phoneNumber}: ${message}`);
    return { status: 'simulated', logId, delivered: false };
  }

  const client = getClient();
  try {
    const res = await client.messages.create({ body: message, from: getCredentials().from, to });
    const logId = await smsLogModel.create(null, {
      appointmentId,
      phoneNumber: to,
      message,
      messageType,
      status: 'sent',
      providerSid: res.sid
    });
    console.log(`[SMS SENT] to ${to} (sid: ${res.sid})`);
    return { status: 'sent', logId, providerSid: res.sid, delivered: true };
  } catch (err) {
    const logId = await smsLogModel.create(null, {
      appointmentId,
      phoneNumber: to,
      message,
      messageType,
      status: 'failed',
      errorMessage: String(err.message || err).slice(0, 500)
    });
    console.error(`[SMS FAILED] to ${to}: ${err.message}`);
    return { status: 'failed', logId, delivered: false, error: err.message };
  }
}

async function sendBookingConfirmation(appointment) {
  try {
    if (await smsLogModel.hasType(appointment.id, 'confirmation')) {
      return { status: 'skipped', reason: 'confirmation already logged' };
    }
    return await sendSms({
      appointmentId: appointment.id,
      phoneNumber: appointment.patient_phone,
      message: buildConfirmationMessage(appointment),
      messageType: 'confirmation'
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return { status: 'skipped', reason: 'duplicate' };
    console.error('[SMS] Confirmation error:', err.message);
    return { status: 'failed', error: err.message };
  }
}

async function sendReminder(appointment) {
  try {
    if (await smsLogModel.hasType(appointment.id, 'reminder')) {
      return { status: 'skipped', reason: 'reminder already logged' };
    }
    return await sendSms({
      appointmentId: appointment.id,
      phoneNumber: appointment.patient_phone,
      message: buildReminderMessage(appointment),
      messageType: 'reminder'
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return { status: 'skipped', reason: 'duplicate' };
    console.error('[SMS] Reminder error:', err.message);
    return { status: 'failed', error: err.message };
  }
}

module.exports = {
  isConfigured,
  normalizePhone,
  buildConfirmationMessage,
  buildReminderMessage,
  sendSms,
  sendBookingConfirmation,
  sendReminder
};
