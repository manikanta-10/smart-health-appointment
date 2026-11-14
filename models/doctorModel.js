const { query, pool } = require('../config/db');

const baseSelect = `
  SELECT d.id, d.user_id, d.specialization, d.qualification, d.experience,
         d.consultation_fee, d.appointment_duration, d.bio, d.created_at,
         u.name, u.email, u.phone, u.is_active
    FROM doctors d
    JOIN users u ON u.id = d.user_id
`;

async function list({ specialization = '', q = '', limit = 100 } = {}) {
  const params = [];
  let where = 'WHERE u.is_active = 1';
  if (specialization) {
    where += ' AND d.specialization = ?';
    params.push(specialization);
  }
  if (q) {
    where += ' AND (u.name LIKE ? OR d.specialization LIKE ? OR d.qualification LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  params.push(Number(limit));
  return query(`${baseSelect} ${where} ORDER BY u.name ASC LIMIT ?`, params);
}

async function findById(id) {
  const rows = await query(`${baseSelect} WHERE d.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function listAdmin() {
  return query(
    `${baseSelect} ORDER BY u.is_active DESC, u.name ASC`
  );
}

async function findByUserId(userId) {
  const rows = await query(`${baseSelect} WHERE d.user_id = ? LIMIT 1`, [userId]);
  return rows[0] || null;
}

async function create(conn, { userId, specialization, qualification, experience, consultationFee, appointmentDuration, bio }) {
  const executor = conn || pool;
  const [result] = await executor.query(
    `INSERT INTO doctors (user_id, specialization, qualification, experience, consultation_fee, appointment_duration, bio)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      specialization,
      qualification || null,
      Number(experience) || 0,
      Number(consultationFee) || 0,
      Number(appointmentDuration) || 30,
      bio || null
    ]
  );
  return result.insertId;
}

async function update(conn, doctorId, data) {
  const executor = conn || pool;
  const doctorFields = ['specialization', 'qualification', 'experience', 'consultation_fee', 'appointment_duration', 'bio'];
  const sets = [];
  const params = [];
  for (const key of doctorFields) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(data[key] === '' ? null : data[key]);
    }
  }
  if (sets.length) {
    params.push(doctorId);
    await executor.query(`UPDATE doctors SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  const userFields = ['name', 'phone'];
  const userSets = [];
  const userParams = [];
  for (const key of userFields) {
    if (data[key] !== undefined) {
      userSets.push(`${key} = ?`);
      userParams.push(data[key]);
    }
  }
  if (userSets.length) {
    userParams.push(data.user_id);
    await executor.query(`UPDATE users SET ${userSets.join(', ')} WHERE id = ?`, userParams);
  }
}

async function setActive(doctorId, active) {
  const rows = await query('SELECT user_id FROM doctors WHERE id = ?', [doctorId]);
  if (!rows.length) return false;
  const result = await query('UPDATE users SET is_active = ? WHERE id = ?', [active ? 1 : 0, rows[0].user_id]);
  return result.affectedRows > 0;
}

async function specializations() {
  return query(
    `SELECT DISTINCT d.specialization
       FROM doctors d JOIN users u ON u.id = d.user_id
      WHERE u.is_active = 1
      ORDER BY d.specialization ASC`
  );
}

async function countActive() {
  const rows = await query(
    `SELECT COUNT(*) AS c FROM doctors d JOIN users u ON u.id = d.user_id WHERE u.is_active = 1`
  );
  return rows[0].c;
}

module.exports = { list, listAdmin, findById, findByUserId, create, update, setActive, specializations, countActive };
