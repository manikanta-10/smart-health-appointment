const { query } = require('../config/db');

async function adminStats({ now, todayStart, tomorrow, weekStart, nextWeek }) {
  const rows = await query(
    `SELECT
       (SELECT COUNT(*) FROM doctors d JOIN users u ON u.id = d.user_id WHERE u.is_active = 1) AS total_doctors,
       (SELECT COUNT(*) FROM users WHERE role = 'patient' AND is_active = 1) AS total_patients,
       (SELECT COUNT(*) FROM appointments) AS total_appointments,
       (SELECT COUNT(*) FROM appointments WHERE status IN ('booked','confirmed') AND appointment_datetime >= ?) AS upcoming_appointments,
       (SELECT COUNT(*) FROM appointments WHERE status = 'completed') AS completed_appointments,
       (SELECT COUNT(*) FROM appointments WHERE status = 'cancelled') AS cancelled_appointments,
       (SELECT COUNT(*) FROM appointments WHERE appointment_datetime >= ? AND appointment_datetime < ?) AS today_appointments,
       (SELECT COUNT(*) FROM appointments WHERE appointment_datetime >= ? AND appointment_datetime < ?) AS week_appointments`,
    [now, todayStart, tomorrow, weekStart, nextWeek]
  );
  return rows[0];
}

async function statusBreakdown() {
  const rows = await query('SELECT status, COUNT(*) AS count FROM appointments GROUP BY status');
  const out = { booked: 0, confirmed: 0, completed: 0, cancelled: 0 };
  for (const r of rows) out[r.status] = r.count;
  return out;
}

async function perDoctor() {
  return query(
    `SELECT d.id, u.name, d.specialization,
            COUNT(a.id) AS total,
            COALESCE(SUM(a.status = 'completed'), 0) AS completed,
            COALESCE(SUM(a.status = 'cancelled'), 0) AS cancelled,
            COALESCE(SUM(a.status IN ('booked','confirmed')), 0) AS active
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN appointments a ON a.doctor_id = d.id
      WHERE u.is_active = 1
      GROUP BY d.id, u.name, d.specialization
      ORDER BY total DESC, u.name ASC`
  );
}

async function dailyCounts({ startDate, endDate }) {
  const rows = await query(
    `SELECT DATE(appointment_datetime) AS day, COUNT(*) AS count
       FROM appointments
      WHERE appointment_datetime >= ? AND appointment_datetime < ?
      GROUP BY DATE(appointment_datetime)
      ORDER BY day ASC`,
    [`${startDate} 00:00:00`, `${endDate} 00:00:00`]
  );
  return rows;
}

async function doctorStats(doctorId, { now, todayStart, tomorrow, weekStart, nextWeek }) {
  const rows = await query(
    `SELECT
       (SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_datetime >= ? AND appointment_datetime < ?) AS today_appointments,
       (SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_datetime >= ? AND appointment_datetime < ?) AS week_appointments,
       (SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND status IN ('booked','confirmed') AND appointment_datetime >= ?) AS upcoming_appointments,
       (SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND status = 'completed') AS completed_appointments,
       (SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND status = 'cancelled') AS cancelled_appointments,
       (SELECT COUNT(*) FROM appointments WHERE doctor_id = ?) AS total_appointments,
       (SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE doctor_id = ?) AS total_patients`,
    [
      doctorId, todayStart, tomorrow,
      doctorId, weekStart, nextWeek,
      doctorId, now,
      doctorId,
      doctorId,
      doctorId,
      doctorId
    ]
  );
  return rows[0];
}

async function patientStats(patientId, { now }) {
  const rows = await query(
    `SELECT
       (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status IN ('booked','confirmed') AND appointment_datetime >= ?) AS upcoming_appointments,
       (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status = 'completed') AS completed_appointments,
       (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status = 'cancelled') AS cancelled_appointments,
       (SELECT COUNT(*) FROM appointments WHERE patient_id = ?) AS total_appointments,
       (SELECT COUNT(DISTINCT doctor_id) FROM appointments WHERE patient_id = ?) AS doctors_visited`,
    [patientId, now, patientId, patientId, patientId, patientId]
  );
  return rows[0];
}

module.exports = { adminStats, statusBreakdown, perDoctor, dailyCounts, doctorStats, patientStats };
