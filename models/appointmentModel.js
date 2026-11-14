const { query, pool } = require('../config/db');

const ACTIVE_STATUSES = ['booked', 'confirmed'];

const detailSelect = `
  SELECT a.id, a.patient_id, a.doctor_id, a.appointment_datetime, a.appointment_end_datetime,
         a.status, a.reason, a.created_at, a.updated_at,
         pu.name AS patient_name, pu.email AS patient_email, pu.phone AS patient_phone,
         du.name AS doctor_name, du.email AS doctor_email, du.phone AS doctor_phone,
         d.specialization, d.appointment_duration, d.consultation_fee
    FROM appointments a
    JOIN users pu ON pu.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    JOIN users du ON du.id = d.user_id
`;

async function insert(conn, { patientId, doctorId, start, end, status = 'booked', reason }) {
  const executor = conn || pool;
  const [result] = await executor.query(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_datetime, appointment_end_datetime, status, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patientId, doctorId, start, end, status, reason || null]
  );
  return result.insertId;
}

async function findOverlap(conn, doctorId, startMysql, endMysql, excludeId = null) {
  const executor = conn || pool;
  const params = [doctorId, endMysql, startMysql];
  let sql = `SELECT id, appointment_datetime, appointment_end_datetime, status
               FROM appointments
              WHERE doctor_id = ?
                AND status IN ('booked', 'confirmed', 'completed')
                AND appointment_datetime < ?
                AND appointment_end_datetime > ?`;
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await executor.query(sql, params);
  return rows[0] || null;
}

async function countWeekly(conn, patientId, doctorId, weekStartMysql, weekEndMysql) {
  const executor = conn || pool;
  const [rows] = await executor.query(
    `SELECT COUNT(*) AS c
       FROM appointments
      WHERE patient_id = ?
        AND doctor_id = ?
        AND status IN ('booked', 'confirmed', 'completed')
        AND appointment_datetime >= ?
        AND appointment_datetime < ?`,
    [patientId, doctorId, weekStartMysql, weekEndMysql]
  );
  return rows[0].c;
}

async function findById(id, conn) {
  const executor = conn || pool;
  const [rows] = await executor.query(`${detailSelect} WHERE a.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function lockById(conn, id) {
  const [rows] = await conn.query('SELECT * FROM appointments WHERE id = ? FOR UPDATE', [id]);
  return rows[0] || null;
}

async function updateStatus(conn, id, status) {
  const executor = conn || pool;
  await executor.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
}

async function listForPatient(patientId, { scope = 'all', limit = 200 } = {}) {
  const params = [patientId];
  let extra = '';
  if (scope === 'upcoming') {
    extra = "AND a.status IN ('booked', 'confirmed') AND a.appointment_datetime >= ?";
    params.push(nowMysqlSafe());
  } else if (scope === 'history') {
    extra = "AND (a.status IN ('completed', 'cancelled') OR a.appointment_datetime < ?)";
    params.push(nowMysqlSafe());
  }
  params.push(Number(limit));
  return query(
    `${detailSelect} WHERE a.patient_id = ? ${extra}
      ORDER BY a.appointment_datetime ${scope === 'upcoming' ? 'ASC' : 'DESC'}
      LIMIT ?`,
    params
  );
}

async function listForDoctor(doctorId, { from, to, status, limit = 500 } = {}) {
  const params = [doctorId];
  let extra = '';
  if (from) {
    extra += ' AND a.appointment_datetime >= ?';
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    extra += ' AND a.appointment_datetime <= ?';
    params.push(`${to} 23:59:59`);
  }
  if (status) {
    extra += ' AND a.status = ?';
    params.push(status);
  }
  params.push(Number(limit));
  return query(
    `${detailSelect} WHERE a.doctor_id = ? ${extra} ORDER BY a.appointment_datetime DESC LIMIT ?`,
    params
  );
}

async function listAll({ doctorId, patientId, date, status, from, to, limit = 500 } = {}) {
  const params = [];
  let where = 'WHERE 1 = 1';
  if (doctorId) {
    where += ' AND a.doctor_id = ?';
    params.push(doctorId);
  }
  if (patientId) {
    where += ' AND a.patient_id = ?';
    params.push(patientId);
  }
  if (date) {
    where += ' AND a.appointment_datetime >= ? AND a.appointment_datetime <= ?';
    params.push(`${date} 00:00:00`, `${date} 23:59:59`);
  }
  if (from) {
    where += ' AND a.appointment_datetime >= ?';
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    where += ' AND a.appointment_datetime <= ?';
    params.push(`${to} 23:59:59`);
  }
  if (status) {
    where += ' AND a.status = ?';
    params.push(status);
  }
  params.push(Number(limit));
  return query(`${detailSelect} ${where} ORDER BY a.appointment_datetime DESC LIMIT ?`, params);
}

async function listForRange(doctorId, startMysql, endMysql, statuses = null) {
  const params = [doctorId, startMysql, endMysql];
  let extra = '';
  if (statuses && statuses.length) {
    extra = ` AND a.status IN (${statuses.map(() => '?').join(',')})`;
    params.push(...statuses);
  }
  return query(
    `${detailSelect}
      WHERE a.doctor_id = ? AND a.appointment_datetime >= ? AND a.appointment_datetime < ? ${extra}
      ORDER BY a.appointment_datetime ASC`,
    params
  );
}

async function listForReminders(windowStartMysql, windowEndMysql) {
  return query(
    `${detailSelect}
      WHERE a.status IN ('booked', 'confirmed')
        AND a.appointment_datetime >= ? AND a.appointment_datetime <= ?
        AND NOT EXISTS (
          SELECT 1 FROM sms_logs s
           WHERE s.appointment_id = a.id AND s.message_type = 'reminder'
        )
      ORDER BY a.appointment_datetime ASC`,
    [windowStartMysql, windowEndMysql]
  );
}

async function listSlotsInRange(doctorId, startMysql, endMysql) {
  return query(
    `SELECT id, appointment_datetime, appointment_end_datetime, status
       FROM appointments
      WHERE doctor_id = ? AND appointment_datetime >= ? AND appointment_datetime < ?
        AND status IN ('booked', 'confirmed', 'completed', 'cancelled')
      ORDER BY appointment_datetime ASC`,
    [doctorId, startMysql, endMysql]
  );
}

async function listPatientsForDoctor(doctorId) {
  return query(
    `SELECT u.id, u.name, u.email, u.phone,
            COUNT(a.id) AS total_visits,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_visits,
            SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_visits,
            MAX(a.appointment_datetime) AS last_visit,
            MIN(CASE WHEN a.status IN ('booked','confirmed') AND a.appointment_datetime >= ? THEN a.appointment_datetime END) AS next_visit
       FROM appointments a
       JOIN users u ON u.id = a.patient_id
      WHERE a.doctor_id = ?
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY last_visit DESC`,
    [nowMysqlSafe(), doctorId]
  );
}

async function listUpcomingGlobal(limit = 5) {
  return query(
    `${detailSelect}
      WHERE a.status IN ('booked', 'confirmed') AND a.appointment_datetime >= ?
      ORDER BY a.appointment_datetime ASC LIMIT ?`,
    [nowMysqlSafe(), Number(limit)]
  );
}

function nowMysqlSafe() {
  const { toMysql, nowIST } = require('../utils/time');
  return toMysql(nowIST());
}

module.exports = {
  ACTIVE_STATUSES,
  insert,
  findOverlap,
  countWeekly,
  findById,
  lockById,
  updateStatus,
  listForPatient,
  listForDoctor,
  listAll,
  listForRange,
  listForReminders,
  listSlotsInRange,
  listPatientsForDoctor,
  listUpcomingGlobal
};
