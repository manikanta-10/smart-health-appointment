const { query, pool } = require('../config/db');

async function create(conn, { name, email, password, phone, role = 'patient', isActive = 1 }) {
  const executor = conn || pool;
  const [result] = await executor.query(
    `INSERT INTO users (name, email, password, phone, role, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email.toLowerCase(), password, phone, role, isActive ? 1 : 0]
  );
  return result.insertId;
}

async function findByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [String(email).toLowerCase()]);
  return rows[0] || null;
}

async function findById(id, conn) {
  const executor = conn || pool;
  const [rows] = await executor.query(
    `SELECT u.*, d.id AS doctor_id
       FROM users u
       LEFT JOIN doctors d ON d.user_id = u.id
      WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function updateProfile(id, fields) {
  const allowed = ['name', 'phone', 'email', 'password'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined && fields[key] !== null) {
      sets.push(`${key} = ?`);
      params.push(key === 'email' ? String(fields[key]).toLowerCase() : fields[key]);
    }
  }
  if (!sets.length) return false;
  params.push(id);
  const result = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

async function setActive(userId, active) {
  const result = await query('UPDATE users SET is_active = ? WHERE id = ?', [active ? 1 : 0, userId]);
  return result.affectedRows > 0;
}

async function listPatients({ q = '', limit = 200 } = {}) {
  const params = [];
  let where = "WHERE u.role = 'patient'";
  if (q) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  params.push(Number(limit));
  return query(
    `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
            COUNT(a.id) AS total_appointments,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_appointments,
            MAX(a.appointment_datetime) AS last_appointment
       FROM users u
       LEFT JOIN appointments a ON a.patient_id = u.id
       ${where}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ?`,
    params
  );
}

async function countRole(role) {
  const rows = await query('SELECT COUNT(*) AS c FROM users WHERE role = ? AND is_active = 1', [role]);
  return rows[0].c;
}

module.exports = { create, findByEmail, findById, updateProfile, setActive, listPatients, countRole };
