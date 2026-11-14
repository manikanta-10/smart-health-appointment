const { query, pool } = require('../config/db');

async function create(conn, { appointmentId, phoneNumber, message, messageType, status, providerSid, errorMessage }) {
  const executor = conn || pool;
  const [result] = await executor.query(
    `INSERT INTO sms_logs
       (appointment_id, phone_number, message, message_type, status, provider_sid, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [appointmentId, phoneNumber, message, messageType, status, providerSid || null, errorMessage || null]
  );
  return result.insertId;
}

async function hasType(appointmentId, messageType) {
  const rows = await query(
    'SELECT id FROM sms_logs WHERE appointment_id = ? AND message_type = ? LIMIT 1',
    [appointmentId, messageType]
  );
  return rows.length > 0;
}

async function list({ status, messageType, limit = 300 } = {}) {
  const params = [];
  let where = 'WHERE 1 = 1';
  if (status) {
    where += ' AND s.status = ?';
    params.push(status);
  }
  if (messageType) {
    where += ' AND s.message_type = ?';
    params.push(messageType);
  }
  params.push(Number(limit));
  return query(
    `SELECT s.id, s.appointment_id, s.phone_number, s.message, s.message_type, s.status,
            s.provider_sid, s.error_message, s.sent_at,
            pu.name AS patient_name, du.name AS doctor_name, a.appointment_datetime
       FROM sms_logs s
       JOIN appointments a ON a.id = s.appointment_id
       JOIN users pu ON pu.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users du ON du.id = d.user_id
       ${where}
      ORDER BY s.sent_at DESC, s.id DESC
      LIMIT ?`,
    params
  );
}

async function stats() {
  const rows = await query(
    `SELECT status, COUNT(*) AS c FROM sms_logs GROUP BY status`
  );
  const out = { sent: 0, failed: 0, simulated: 0, total: 0 };
  for (const r of rows) {
    out[r.status] = r.c;
    out.total += r.c;
  }
  return out;
}

module.exports = { create, hasType, list, stats };
