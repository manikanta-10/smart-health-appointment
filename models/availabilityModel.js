const { query, pool } = require('../config/db');

async function listByDoctor(doctorId, conn) {
  const executor = conn || pool;
  const [rows] = await executor.query(
    `SELECT id, doctor_id, day_of_week, start_time, end_time, is_available
       FROM doctor_availability
      WHERE doctor_id = ?
      ORDER BY day_of_week, start_time`,
    [doctorId]
  );
  return rows;
}

async function getForDay(doctorId, dayOfWeek, conn) {
  const executor = conn || pool;
  const [rows] = await executor.query(
    `SELECT id, doctor_id, day_of_week, start_time, end_time, is_available
       FROM doctor_availability
      WHERE doctor_id = ? AND day_of_week = ? AND is_available = 1
      ORDER BY start_time`,
    [doctorId, dayOfWeek]
  );
  return rows;
}

async function replaceForDoctor(conn, doctorId, ranges) {
  const executor = conn || pool;
  await executor.query('DELETE FROM doctor_availability WHERE doctor_id = ?', [doctorId]);
  if (!ranges.length) return;
  const values = ranges.map((r) => [doctorId, r.day_of_week, r.start_time, r.end_time, r.is_available ? 1 : 0]);
  await executor.query(
    'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available) VALUES ?',
    [values]
  );
}

module.exports = { listByDoctor, getForDay, replaceForDoctor };
