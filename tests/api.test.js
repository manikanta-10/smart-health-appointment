/* Backend API integration tests. Run with: npm test
 * The suite reseeds the database before running, so it is destructive by design. */
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const request = require('supertest');

const app = require('../app');
const { pool } = require('../config/db');
const {
  todayStr,
  parseWall,
  addDays,
  addMinutes,
  formatDate,
  mondayOf,
  nowIST,
  toMysql
} = require('../utils/time');

const state = {};

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password) {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function book(token, doctorId, datetime, reason = 'QA test booking') {
  return request(app)
    .post('/api/appointments')
    .set(auth(token))
    .send({ doctor_id: doctorId, appointment_datetime: datetime, reason });
}

async function collectWeeklySlots(doctorId, token, minCount = 3) {
  let cursor = addDays(parseWall(`${todayStr()} 00:00:00`), 2);
  const weeks = new Map();
  for (let i = 0; i < 35; i += 1) {
    const dateStr = formatDate(cursor);
    // eslint-disable-next-line no-await-in-loop
    const res = await request(app)
      .get(`/api/doctors/${doctorId}/slots`)
      .query({ date: dateStr })
      .set(auth(token));
    if (res.status === 200) {
      for (const slot of res.body.data.slots) {
        const key = formatDate(mondayOf(parseWall(slot.datetime)));
        if (!weeks.has(key)) weeks.set(key, []);
        weeks.get(key).push({ ...slot, date: dateStr });
      }
    }
    const found = [...weeks.values()].find((arr) => arr.length >= minCount);
    if (found) return found.slice(0, minCount);
    cursor = addDays(cursor, 1);
  }
  throw new Error('Could not find enough future slots in one week for the test doctor.');
}

before(async () => {
  execFileSync(process.execPath, ['database/seed.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });

  const admin = await login('admin@smarthealth.com', 'Admin@123');
  const doctor = await login('arjun.doctor@smarthealth.com', 'Doctor@123');
  const patient = await login('ravi.patient@smarthealth.com', 'Patient@123');
  assert.equal(admin.status, 200);
  assert.equal(doctor.status, 200);
  assert.equal(patient.status, 200);
  state.adminToken = admin.body.data.token;
  state.doctorToken = doctor.body.data.token;
  state.patientToken = patient.body.data.token;
  state.seededDoctorId = doctor.body.data.user.doctorId;

  const doctorsRes = await request(app).get('/api/doctors');
  assert.equal(doctorsRes.status, 200);
  const gp = doctorsRes.body.data.doctors.find((d) => d.email === 'arjun.doctor@smarthealth.com');
  assert.ok(gp, 'Seeded GP doctor should exist');
  state.gpDoctorId = gp.id;

  const email = `qa.patient.${Date.now()}@example.com`;
  const registration = await request(app).post('/api/auth/register').send({
    name: 'QA Patient',
    email,
    phone: '9876512345',
    password: 'Patient@123'
  });
  assert.equal(registration.status, 201);
  state.newPatientEmail = email;
  state.newPatientToken = registration.body.data.token;
  state.newPatientId = registration.body.data.user.id;

  state.weeklySlots = await collectWeeklySlots(state.gpDoctorId, state.newPatientToken, 3);
});

after(async () => {
  await pool.end();
});

test('health endpoint reports ok and simulated SMS mode', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, 'ok');
  assert.equal(res.body.data.sms_mode, 'simulated');
  assert.equal(res.body.data.timezone, 'Asia/Kolkata');
});

test('public doctor directory lists seeded doctors without credentials', async () => {
  const res = await request(app).get('/api/doctors');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.doctors.length >= 4);
  for (const doctor of res.body.data.doctors) {
    assert.equal(doctor.password, undefined);
    assert.ok(doctor.name.startsWith('Dr.'));
    assert.ok(doctor.specialization);
  }
});

test('registration rejects a weak password', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Weak Password',
    email: `weak.${Date.now()}@example.com`,
    phone: '9876501234',
    password: 'weak'
  });
  assert.equal(res.status, 422);
  assert.equal(res.body.success, false);
});

test('registration creates a patient account and token', async () => {
  assert.ok(state.newPatientToken);
  const me = await request(app).get('/api/auth/me').set(auth(state.newPatientToken));
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.role, 'patient');
  assert.equal(me.body.data.user.email, state.newPatientEmail);
});

test('login rejects an invalid password', async () => {
  const res = await login('ravi.patient@smarthealth.com', 'WrongPassword1');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('login returns a token and public user for seeded accounts', async () => {
  const res = await login('ravi.patient@smarthealth.com', 'Patient@123');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.role, 'patient');
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.password, undefined);
});

test('protected routes require authentication and the correct role', async () => {
  const anonymous = await request(app).get('/api/admin/stats');
  assert.equal(anonymous.status, 401);

  const wrongRole = await request(app).get('/api/admin/stats').set(auth(state.patientToken));
  assert.equal(wrongRole.status, 403);
});

test('available slots endpoint returns aligned, unbooked future slots', async () => {
  const date = state.weeklySlots[0].date;
  const res = await request(app)
    .get(`/api/doctors/${state.gpDoctorId}/slots`)
    .query({ date })
    .set(auth(state.newPatientToken));
  assert.equal(res.status, 200);
  assert.ok(res.body.data.slots.length > 0);
  for (const slot of res.body.data.slots) {
    assert.equal(slot.status, 'available');
    assert.match(slot.datetime, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:00$/);
    assert.equal(slot.appointment_id, null);
  }
});

test('booking an available slot succeeds and logs a simulated SMS', async () => {
  const slot = state.weeklySlots[0];
  const res = await book(state.newPatientToken, state.gpDoctorId, slot.datetime, 'QA booking one');
  assert.equal(res.status, 201);
  assert.equal(res.body.data.appointment.status, 'booked');
  assert.equal(res.body.data.sms.status, 'simulated');
  assert.match(res.body.message, /simulated/i);
  state.booking1Id = res.body.data.appointment.id;

  const [rows] = await pool.query(
    'SELECT status, message_type FROM sms_logs WHERE appointment_id = ?',
    [state.booking1Id]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'simulated');
  assert.equal(rows[0].message_type, 'confirmation');
});

test('booking the same doctor and time again is rejected with 409', async () => {
  const slot = state.weeklySlots[0];
  const res = await book(state.newPatientToken, state.gpDoctorId, slot.datetime, 'Duplicate attempt');
  assert.equal(res.status, 409);
  assert.match(res.body.message, /already booked/i);
});

test('a second appointment with the same doctor in one week is allowed', async () => {
  const slot = state.weeklySlots[1];
  const res = await book(state.newPatientToken, state.gpDoctorId, slot.datetime, 'QA booking two');
  assert.equal(res.status, 201);
  assert.equal(res.body.data.appointment.status, 'booked');
  state.booking2Id = res.body.data.appointment.id;
});

test('a third active appointment in the same Mon-Sun week is rejected', async () => {
  const slot = state.weeklySlots[2];
  const res = await book(state.newPatientToken, state.gpDoctorId, slot.datetime, 'QA booking three');
  assert.equal(res.status, 409);
  assert.match(res.body.message, /Weekly booking limit/i);
});

test('overlap prevention rejects a different start time inside an existing appointment', async () => {
  const base = state.weeklySlots[2];
  const start = parseWall(base.datetime);
  const end = addMinutes(start, 30);

  await pool.query(
    `INSERT INTO appointments
       (patient_id, doctor_id, appointment_datetime, appointment_end_datetime, status, reason)
     VALUES (?, ?, ?, ?, 'booked', 'QA overlap setup')`,
    [state.newPatientId, state.gpDoctorId, base.datetime, toMysql(end)]
  );

  const overlappingStart = toMysql(addMinutes(start, 15));
  const res = await book(state.newPatientToken, state.gpDoctorId, overlappingStart, 'QA overlap attempt');
  assert.equal(res.status, 409);
  assert.match(res.body.message, /already booked/i);
});

test('patient can cancel their own future appointment but not twice', async () => {
  const cancel = await request(app)
    .post(`/api/appointments/${state.booking2Id}/cancel`)
    .set(auth(state.newPatientToken))
    .send({ reason: 'QA cancellation' });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.data.appointment.status, 'cancelled');

  const detail = await request(app)
    .get(`/api/appointments/${state.booking2Id}`)
    .set(auth(state.newPatientToken));
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.appointment.status, 'cancelled');

  const again = await request(app)
    .post(`/api/appointments/${state.booking2Id}/cancel`)
    .set(auth(state.newPatientToken))
    .send({ reason: 'Second cancel' });
  assert.equal(again.status, 400);
});

test('patient cancellation enforces the 6-hour boundary', async () => {
  const now = nowIST();
  const insert = async (startWall) => {
    const [result] = await pool.query(
      `INSERT INTO appointments
         (patient_id, doctor_id, appointment_datetime, appointment_end_datetime, status, reason)
       VALUES (?, ?, ?, ?, 'booked', 'QA 6-hour boundary')`,
      [
        state.newPatientId,
        state.gpDoctorId,
        toMysql(startWall),
        toMysql(addMinutes(startWall, 15))
      ]
    );
    return result.insertId;
  };

  const tooLateId = await insert(addMinutes(now, 5 * 60 + 50));
  const tooLate = await request(app)
    .post(`/api/appointments/${tooLateId}/cancel`)
    .set(auth(state.newPatientToken))
    .send({ reason: 'Too close to appointment' });
  assert.equal(tooLate.status, 400);
  assert.match(tooLate.body.message, /6 hours/i);

  const allowedId = await insert(addMinutes(now, 6 * 60 + 10));
  const allowed = await request(app)
    .post(`/api/appointments/${allowedId}/cancel`)
    .set(auth(state.newPatientToken))
    .send({ reason: 'More than six hours ahead' });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.data.appointment.status, 'cancelled');
});

test('doctor can confirm an appointment; patients cannot use doctor status routes', async () => {
  const confirm = await request(app)
    .patch(`/api/doctor/appointments/${state.booking1Id}/status`)
    .set(auth(state.doctorToken))
    .send({ status: 'confirmed' });
  assert.equal(confirm.status, 200);
  assert.equal(confirm.body.data.appointment.status, 'confirmed');

  const forbidden = await request(app)
    .patch(`/api/doctor/appointments/${state.booking1Id}/status`)
    .set(auth(state.newPatientToken))
    .send({ status: 'completed' });
  assert.equal(forbidden.status, 403);

  const invalidTransition = await request(app)
    .patch(`/api/doctor/appointments/${state.booking2Id}/status`)
    .set(auth(state.doctorToken))
    .send({ status: 'confirmed' });
  assert.equal(invalidTransition.status, 400);
});

test('admin cancellation bypasses the 6-hour rule and is written to the audit log', async () => {
  const res = await request(app)
    .post(`/api/admin/appointments/${state.booking1Id}/cancel`)
    .set(auth(state.adminToken))
    .send({ reason: 'QA admin cancellation' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.appointment.status, 'cancelled');

  const logs = await request(app).get('/api/admin/cancellations').set(auth(state.adminToken));
  assert.equal(logs.status, 200);
  const entry = logs.body.data.cancellations.find((c) => c.appointment_id === state.booking1Id);
  assert.ok(entry);
  assert.equal(entry.previous_status, 'confirmed');
  assert.equal(entry.cancelled_by_role, 'admin');
  assert.equal(entry.cancellation_reason, 'QA admin cancellation');
});

test('admin dashboard stats and chart data are returned', async () => {
  const res = await request(app).get('/api/admin/stats').set(auth(state.adminToken));
  assert.equal(res.status, 200);
  const { stats, statusBreakdown, perDoctor, daily, upcoming } = res.body.data;
  assert.ok(stats.total_doctors >= 4);
  assert.ok(stats.total_patients >= 5);
  assert.ok(stats.total_appointments >= 8);
  for (const key of ['booked', 'confirmed', 'completed', 'cancelled']) {
    assert.equal(typeof statusBreakdown[key], 'number');
  }
  assert.ok(Array.isArray(perDoctor));
  assert.equal(daily.length, 7);
  assert.ok(Array.isArray(upcoming));
});

test('admin SMS logs expose simulated status and never claim delivery', async () => {
  const res = await request(app).get('/api/admin/sms-logs').set(auth(state.adminToken));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.mode, 'simulated');
  assert.ok(res.body.data.stats.total >= 9);
  assert.ok(res.body.data.stats.simulated >= 9);
  assert.equal(res.body.data.stats.sent, 0);
  for (const log of res.body.data.logs) {
    assert.ok(['sent', 'simulated', 'failed'].includes(log.status));
  }

  const filtered = await request(app)
    .get('/api/admin/sms-logs')
    .query({ status: 'simulated' })
    .set(auth(state.adminToken));
  assert.equal(filtered.status, 200);
  assert.ok(filtered.body.data.logs.every((l) => l.status === 'simulated'));
});

test('admin can create a doctor account with default availability', async () => {
  const email = `qa.doctor.${Date.now()}@example.com`;
  const res = await request(app)
    .post('/api/admin/doctors')
    .set(auth(state.adminToken))
    .send({
      name: 'Dr. QA Test',
      email,
      phone: '9876588888',
      password: 'Doctor@123',
      specialization: 'QA Specialist',
      qualification: 'MBBS',
      experience: 5,
      consultation_fee: 400,
      appointment_duration: 30,
      bio: 'Temporary doctor created by automated tests.'
    });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.doctor.email, email);
  state.createdDoctorId = res.body.data.doctor.id;
  state.createdDoctorEmail = email;

  const loginRes = await login(email, 'Doctor@123');
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.data.user.role, 'doctor');
  state.createdDoctorToken = loginRes.body.data.token;

  const profile = await request(app)
    .get('/api/doctor/profile')
    .set(auth(state.createdDoctorToken));
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.availability.length, 5);

  const reset = await request(app)
    .put(`/api/admin/doctors/${state.createdDoctorId}`)
    .set(auth(state.adminToken))
    .send({ password: 'ResetDoctor@123' });
  assert.equal(reset.status, 200);

  const oldPassword = await login(email, 'Doctor@123');
  assert.equal(oldPassword.status, 401);
  const newPassword = await login(email, 'ResetDoctor@123');
  assert.equal(newPassword.status, 200);
  state.createdDoctorToken = newPassword.body.data.token;
  state.createdDoctorPassword = 'ResetDoctor@123';
});

test('doctor can replace weekly availability and duration; invalid ranges are rejected', async () => {
  const update = await request(app)
    .put('/api/doctor/availability')
    .set(auth(state.createdDoctorToken))
    .send({
      appointment_duration: 20,
      ranges: [
        { day_of_week: 1, start_time: '10:00:00', end_time: '12:00:00' },
        { day_of_week: 1, start_time: '14:00:00', end_time: '16:00:00' }
      ]
    });
  assert.equal(update.status, 200);
  assert.equal(update.body.data.availability.length, 2);

  const profile = await request(app)
    .get('/api/doctor/profile')
    .set(auth(state.createdDoctorToken));
  assert.equal(profile.body.data.doctor.appointment_duration, 20);

  const invalid = await request(app)
    .put('/api/doctor/availability')
    .set(auth(state.createdDoctorToken))
    .send({
      ranges: [{ day_of_week: 1, start_time: '15:00:00', end_time: '14:00:00' }]
    });
  assert.equal(invalid.status, 400);
});

test('deactivated doctor cannot log in or use an existing token', async () => {
  const deactivate = await request(app)
    .put(`/api/admin/doctors/${state.createdDoctorId}/status`)
    .set(auth(state.adminToken))
    .send({ is_active: false });
  assert.equal(deactivate.status, 200);

  const loginRes = await login(state.createdDoctorEmail, state.createdDoctorPassword);
  assert.equal(loginRes.status, 403);

  const profile = await request(app)
    .get('/api/doctor/profile')
    .set(auth(state.createdDoctorToken));
  assert.equal(profile.status, 403);
});

test('patient can update their own profile', async () => {
  const update = await request(app)
    .put('/api/patient/profile')
    .set(auth(state.newPatientToken))
    .send({ name: 'QA Patient Updated', phone: '9876512345' });
  assert.equal(update.status, 200);
  assert.equal(update.body.data.user.name, 'QA Patient Updated');

  const profile = await request(app)
    .get('/api/patient/profile')
    .set(auth(state.newPatientToken));
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.user.name, 'QA Patient Updated');
});

test('doctor patient directory and cancellation history include test activity', async () => {
  const patients = await request(app).get('/api/doctor/patients').set(auth(state.doctorToken));
  assert.equal(patients.status, 200);
  const qaPatient = patients.body.data.patients.find((p) => p.id === state.newPatientId);
  assert.ok(qaPatient);
  assert.equal(qaPatient.name, 'QA Patient Updated');
  assert.ok(qaPatient.total_visits >= 2);

  const detail = await request(app)
    .get(`/api/doctor/patients/${state.newPatientId}`)
    .set(auth(state.doctorToken));
  assert.equal(detail.status, 200);
  assert.ok(detail.body.data.appointments.length >= 2);

  const cancellations = await request(app)
    .get('/api/doctor/cancellations')
    .set(auth(state.doctorToken));
  assert.equal(cancellations.status, 200);
  assert.ok(cancellations.body.data.cancellations.some((c) => c.appointment_id === state.booking2Id));
});

test('MySQL enforces the unique doctor/date-time constraint', async () => {
  const [indexes] = await pool.query(
    `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_used
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'appointments'
        AND INDEX_NAME = 'unique_doctor_datetime'
      GROUP BY INDEX_NAME, NON_UNIQUE`
  );
  assert.equal(indexes.length, 1);
  assert.equal(Number(indexes[0].NON_UNIQUE), 0);
  assert.equal(indexes[0].columns_used, 'doctor_id,appointment_datetime');

  const start = addMinutes(nowIST(), 8 * 60 + 7);
  const values = [
    state.newPatientId,
    state.gpDoctorId,
    toMysql(start),
    toMysql(addMinutes(start, 15)),
    'booked',
    'QA unique constraint'
  ];
  await pool.query(
    `INSERT INTO appointments
       (patient_id, doctor_id, appointment_datetime, appointment_end_datetime, status, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    values
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO appointments
         (patient_id, doctor_id, appointment_datetime, appointment_end_datetime, status, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      values
    ),
    (err) => err.code === 'ER_DUP_ENTRY'
  );
});

test('admin and doctor calendar endpoints return events for a date range', async () => {
  const start = todayStr();
  const end = formatDate(addDays(parseWall(`${start} 00:00:00`), 2));

  const admin = await request(app)
    .get('/api/admin/calendar')
    .query({ start, end })
    .set(auth(state.adminToken));
  assert.equal(admin.status, 200);
  assert.ok(Array.isArray(admin.body.data.events));

  const doctor = await request(app)
    .get('/api/doctor/calendar')
    .query({ start, end })
    .set(auth(state.doctorToken));
  assert.equal(doctor.status, 200);
  assert.ok(Array.isArray(doctor.body.data.events));
});
