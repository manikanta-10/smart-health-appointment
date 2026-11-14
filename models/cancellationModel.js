const { query, pool } = require('../config/db');

async function create(conn, { appointmentId, cancelledBy, reason, previousStatus, newStatus = 'cancelled' }) {
  const executor = conn || pool;
  const [result] = await executor.query(
    `INSERT INTO cancellation_logs (appointment_id, cancelled_by, cancellation_reason, previous_status, new_status)
     VALUES (?, ?, ?, ?, ?)`,
    [appointmentId, cancelledBy, reason || null, previousStatus, newStatus]
  );
  return result.insertId;
}

const logSelect = `
  SELECT c.id, c.appointment_id, c.cancelled_by, c.cancellation_reason, c.cancelled_at,
         c.previous_status, c.new_status,
         u.name AS cancelled_by_name, u.role AS cancelled_by_role,
         a.appointment_datetime, a.doctor_id, a.patient_id,
         pu.name AS patient_name, du.name AS doctor_name
    FROM cancellation_logs c
    JOIN users u ON u.id = c.cancelled_by
    JOIN appointments a ON a.id = c.appointment_id
    JOIN users pu ON pu.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    JOIN users du ON du.id = d.user_id
`;

async function listAll({ doctorId, limit = 300 } = {}) {
  const params = [];
  let where = 'WHERE 1 = 1';
  if (doctorId) {
    where += ' AND a.doctor_id = ?';
    params.push(doctorId);
  }
  params.push(Number(limit));
  return query(`${logSelect} ${where} ORDER BY c.cancelled_at DESC LIMIT ?`, params);
}

async function listForDoctor(doctorId, limit = 200) {
  return query(`${logSelect} WHERE a.doctor_id = ? ORDER BY c.cancelled_at DESC LIMIT ?`, [
    doctorId,
    Number(limit)
  ]);
}

module.exports = { create, listAll, listForDoctor };
