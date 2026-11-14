/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const {
  nowIST,
  startOfDay,
  addDays,
  addMinutes,
  toMysql
} = require('../utils/time');

const SALT_ROUNDS = 10;

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    console.log('[Seed] Recreating schema from database/schema.sql ...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await conn.query(schema);
    await conn.query(`USE \`${process.env.DB_NAME || 'smart_health_appointment'}\``);

    const patientHash = await bcrypt.hash('Patient@123', SALT_ROUNDS);
    const doctorHash = await bcrypt.hash('Doctor@123', SALT_ROUNDS);
    const adminHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);

    const insertUser = async (name, email, phone, password, role) => {
      const [r] = await conn.query(
        'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, password, phone, role]
      );
      return r.insertId;
    };

    console.log('[Seed] Creating users ...');
    await insertUser('System Administrator', 'admin@smarthealth.com', '9876500000', adminHash, 'admin');

    const doctorUsers = [
      {
        name: 'Dr. Ananya Sharma',
        email: 'ananya.doctor@smarthealth.com',
        phone: '9876500001',
        specialization: 'Cardiologist',
        qualification: 'MBBS, MD (Cardiology)',
        experience: 12,
        fee: 800,
        duration: 30,
        bio: 'Senior interventional cardiologist focused on preventive heart care, hypertension and cardiac rehabilitation.'
      },
      {
        name: 'Dr. Rajesh Kumar',
        email: 'rajesh.doctor@smarthealth.com',
        phone: '9876500002',
        specialization: 'Orthopedic Surgeon',
        qualification: 'MBBS, MS (Orthopedics)',
        experience: 15,
        fee: 1000,
        duration: 30,
        bio: 'Orthopedic surgeon specialising in joint replacement, sports injuries and spine care.'
      },
      {
        name: 'Dr. Priya Nair',
        email: 'priya.doctor@smarthealth.com',
        phone: '9876500003',
        specialization: 'Dermatologist',
        qualification: 'MBBS, MD (Dermatology)',
        experience: 8,
        fee: 600,
        duration: 20,
        bio: 'Dermatologist treating acne, pigmentation, hair loss and paediatric skin conditions.'
      },
      {
        name: 'Dr. Arjun Mehta',
        email: 'arjun.doctor@smarthealth.com',
        phone: '9876500004',
        specialization: 'General Physician',
        qualification: 'MBBS, MD (General Medicine)',
        experience: 10,
        fee: 500,
        duration: 15,
        bio: 'General physician for fever, infections, diabetes, thyroid and routine health checkups.'
      }
    ];

    const doctorIds = {};
    for (const d of doctorUsers) {
      const userId = await insertUser(d.name, d.email, d.phone, doctorHash, 'doctor');
      const [r] = await conn.query(
        `INSERT INTO doctors (user_id, specialization, qualification, experience, consultation_fee, appointment_duration, bio)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, d.specialization, d.qualification, d.experience, d.fee, d.duration, d.bio]
      );
      doctorIds[d.email] = r.insertId;
    }

    console.log('[Seed] Creating patients ...');
    const patientUsers = [
      ['Ravi Verma', 'ravi.patient@smarthealth.com', '9876510001'],
      ['Sneha Iyer', 'sneha.patient@smarthealth.com', '9876510002'],
      ['Mohammed Faiz', 'mohammed.patient@smarthealth.com', '9876510003'],
      ['Kavya Reddy', 'kavya.patient@smarthealth.com', '9876510004']
    ];
    const patientIds = {};
    for (const [name, email, phone] of patientUsers) {
      patientIds[email] = await insertUser(name, email, phone, patientHash, 'patient');
    }

    console.log('[Seed] Setting doctor availability ...');
    const weekdayRanges = [];
    for (const day of [1, 2, 3, 4, 5]) {
      weekdayRanges.push([day, '09:00:00', '13:00:00']);
      weekdayRanges.push([day, '14:00:00', '17:00:00']);
    }
    weekdayRanges.push([6, '09:00:00', '12:00:00']);

    for (const email of ['ananya.doctor@smarthealth.com', 'rajesh.doctor@smarthealth.com', 'priya.doctor@smarthealth.com']) {
      const doctorId = doctorIds[email];
      for (const [day, start, end] of weekdayRanges) {
        await conn.query(
          'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, 1)',
          [doctorId, day, start, end]
        );
      }
    }
    const gpId = doctorIds['arjun.doctor@smarthealth.com'];
    for (const day of [1, 2, 3, 4, 5, 6]) {
      await conn.query(
        'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, 1)',
        [gpId, day, '10:00:00', '18:00:00']
      );
    }

    const today = startOfDay(nowIST());
    const at = (offset, timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      const base = addDays(today, offset);
      return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), h, m, 0));
    };

    const insertAppointment = async ({ patientEmail, doctorEmail, offset, time, status, reason }) => {
      const doctorId = doctorIds[doctorEmail];
      const start = at(offset, time);
      const [docRows] = await conn.query('SELECT appointment_duration FROM doctors WHERE id = ?', [doctorId]);
      const duration = docRows[0].appointment_duration;
      const end = addMinutes(start, duration);
      const [r] = await conn.query(
        `INSERT INTO appointments
           (patient_id, doctor_id, appointment_datetime, appointment_end_datetime, status, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [patientIds[patientEmail], doctorId, toMysql(start), toMysql(end), status, reason]
      );
      return { id: r.insertId, doctorId, start, duration };
    };

    console.log('[Seed] Creating sample appointments ...');
    const completed = [
      { patientEmail: 'ravi.patient@smarthealth.com', doctorEmail: 'ananya.doctor@smarthealth.com', offset: -2, time: '10:00', status: 'completed', reason: 'Routine cardiac checkup and ECG review' },
      { patientEmail: 'sneha.patient@smarthealth.com', doctorEmail: 'rajesh.doctor@smarthealth.com', offset: -3, time: '11:00', status: 'completed', reason: 'Knee pain follow-up' },
      { patientEmail: 'kavya.patient@smarthealth.com', doctorEmail: 'ananya.doctor@smarthealth.com', offset: -5, time: '15:00', status: 'completed', reason: 'Blood pressure review' },
      { patientEmail: 'sneha.patient@smarthealth.com', doctorEmail: 'arjun.doctor@smarthealth.com', offset: -7, time: '10:00', status: 'completed', reason: 'Fever and fatigue consultation' }
    ];
    for (const a of completed) await insertAppointment(a);

    const cancelled = await insertAppointment({
      patientEmail: 'kavya.patient@smarthealth.com',
      doctorEmail: 'priya.doctor@smarthealth.com',
      offset: -1,
      time: '12:00',
      status: 'cancelled',
      reason: 'Skin allergy consultation'
    });
    await conn.query(
      `INSERT INTO cancellation_logs
         (appointment_id, cancelled_by, cancellation_reason, cancelled_at, previous_status, new_status)
       VALUES (?, ?, ?, ?, 'booked', 'cancelled')`,
      [cancelled.id, patientIds['kavya.patient@smarthealth.com'], 'Schedule conflict', toMysql(addDays(today, -1))]
    );

    const upcoming = [
      { patientEmail: 'ravi.patient@smarthealth.com', doctorEmail: 'ananya.doctor@smarthealth.com', offset: 1, time: '10:00', status: 'booked', reason: 'Chest discomfort follow-up' },
      { patientEmail: 'sneha.patient@smarthealth.com', doctorEmail: 'rajesh.doctor@smarthealth.com', offset: 1, time: '11:00', status: 'confirmed', reason: 'Post-surgery review' },
      { patientEmail: 'mohammed.patient@smarthealth.com', doctorEmail: 'ananya.doctor@smarthealth.com', offset: 2, time: '10:30', status: 'booked', reason: 'Palpitations evaluation' },
      { patientEmail: 'ravi.patient@smarthealth.com', doctorEmail: 'priya.doctor@smarthealth.com', offset: 2, time: '14:40', status: 'booked', reason: 'Persistent skin rash' },
      { patientEmail: 'sneha.patient@smarthealth.com', doctorEmail: 'arjun.doctor@smarthealth.com', offset: 3, time: '10:15', status: 'booked', reason: 'General wellness checkup' },
      { patientEmail: 'kavya.patient@smarthealth.com', doctorEmail: 'rajesh.doctor@smarthealth.com', offset: 4, time: '15:00', status: 'booked', reason: 'Lower back pain' },
      { patientEmail: 'mohammed.patient@smarthealth.com', doctorEmail: 'priya.doctor@smarthealth.com', offset: 5, time: '10:00', status: 'booked', reason: 'Acne treatment review' },
      { patientEmail: 'kavya.patient@smarthealth.com', doctorEmail: 'arjun.doctor@smarthealth.com', offset: 6, time: '16:00', status: 'booked', reason: 'Diabetes follow-up' }
    ];
    for (const a of upcoming) {
      const appt = await insertAppointment(a);
      const [docRows] = await conn.query(
        `SELECT u.name AS doctor_name FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id = ?`,
        [appt.doctorId]
      );
      const [patRows] = await conn.query('SELECT name FROM users WHERE id = ?', [patientIds[a.patientEmail]]);
      const message = `Hello ${patRows[0].name}, your appointment with ${docRows[0].doctor_name} is booked for ${toMysql(appt.start).slice(0, 10)} at ${a.time}. Thank you!`;
      await conn.query(
        `INSERT INTO sms_logs (appointment_id, phone_number, message, message_type, status)
         VALUES (?, ?, ?, 'confirmation', 'simulated')`,
        [appt.id, 'demo-seed', message]
      );
    }

    console.log('');
    console.log('==========================================================');
    console.log('  Database seeded successfully!');
    console.log('  --------------------------------------------------------');
    console.log('  ADMIN    : admin@smarthealth.com      / Admin@123');
    console.log('  DOCTORS  : ananya.doctor@smarthealth.com   / Doctor@123');
    console.log('             rajesh.doctor@smarthealth.com   / Doctor@123');
    console.log('             priya.doctor@smarthealth.com    / Doctor@123');
    console.log('             arjun.doctor@smarthealth.com    / Doctor@123');
    console.log('  PATIENTS : ravi.patient@smarthealth.com    / Patient@123');
    console.log('             sneha.patient@smarthealth.com   / Patient@123');
    console.log('             mohammed.patient@smarthealth.com/ Patient@123');
    console.log('             kavya.patient@smarthealth.com   / Patient@123');
    console.log('==========================================================');
    console.log('');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
