const cron = require('node-cron');
const appointmentModel = require('../models/appointmentModel');
const smsService = require('./smsService');
const { nowIST, addMinutes, toMysql } = require('../utils/time');

/**
 * Sends one reminder per appointment once the appointment enters the next
 * 24-hour window. Duplicate prevention is enforced in three layers:
 *  1. appointmentModel.listForReminders excludes appointments that already
 *     have a reminder SMS log.
 *  2. smsService.sendReminder re-checks sms_logs before sending.
 *  3. sms_logs has UNIQUE (appointment_id, message_type) at the DB level.
 */
async function runReminderCheck() {
  const now = nowIST();
  const windowStart = toMysql(now);
  const windowEnd = toMysql(addMinutes(now, 24 * 60 + 15));

  const due = await appointmentModel.listForReminders(windowStart, windowEnd);
  const summary = { checked: due.length, sent: 0, simulated: 0, failed: 0, skipped: 0, mode: smsService.isConfigured() ? 'twilio' : 'simulated' };

  for (const appointment of due) {
    // Re-check immediately before sending (another worker may have processed it).
    // eslint-disable-next-line no-await-in-loop
    const result = await smsService.sendReminder(appointment);
    if (result.status === 'sent') summary.sent += 1;
    else if (result.status === 'simulated') summary.simulated += 1;
    else if (result.status === 'failed') summary.failed += 1;
    else summary.skipped += 1;
  }

  if (summary.checked > 0) {
    console.log('[Reminder cron]', JSON.stringify(summary));
  }
  return summary;
}

let task = null;

function startReminderCron() {
  const expression = process.env.REMINDER_CRON || '*/15 * * * *';
  if (task) return task;
  task = cron.schedule(expression, () => {
    runReminderCheck().catch((err) => console.error('[Reminder cron] failed:', err.message));
  });
  console.log(`[Reminder cron] scheduled (${expression}) - mode: ${smsService.isConfigured() ? 'Twilio' : 'SIMULATED demo'}`);

  setTimeout(() => {
    runReminderCheck().catch((err) => console.error('[Reminder cron] initial run failed:', err.message));
  }, 3000);

  return task;
}

module.exports = { runReminderCheck, startReminderCron };
