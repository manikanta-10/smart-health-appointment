-- ============================================================
-- Smart Health Appointment Booking System - MySQL schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_health_appointment
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_health_appointment;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS sms_logs;
DROP TABLE IF EXISTS cancellation_logs;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctor_availability;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE doctors (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  specialization VARCHAR(120) NOT NULL,
  qualification VARCHAR(160) DEFAULT NULL,
  experience INT UNSIGNED NOT NULL DEFAULT 0,
  consultation_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  appointment_duration INT UNSIGNED NOT NULL DEFAULT 30,
  bio TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doctors_user (user_id),
  KEY idx_doctors_specialization (specialization),
  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE doctor_availability (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  doctor_id INT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL COMMENT '0=Sunday ... 6=Saturday',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_availability_doctor_day (doctor_id, day_of_week),
  CONSTRAINT fk_availability_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE,
  CONSTRAINT chk_availability_day CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT chk_availability_time CHECK (start_time < end_time)
) ENGINE=InnoDB;

CREATE TABLE appointments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id INT UNSIGNED NOT NULL,
  doctor_id INT UNSIGNED NOT NULL,
  appointment_datetime DATETIME NOT NULL,
  appointment_end_datetime DATETIME NOT NULL,
  status ENUM('booked', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'booked',
  reason VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_doctor_datetime (doctor_id, appointment_datetime),
  KEY idx_appointments_patient (patient_id, appointment_datetime),
  KEY idx_appointments_doctor_status (doctor_id, status, appointment_datetime),
  KEY idx_appointments_datetime (appointment_datetime),
  KEY idx_appointments_status (status),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cancellation_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id INT UNSIGNED NOT NULL,
  cancelled_by INT UNSIGNED NOT NULL,
  cancellation_reason VARCHAR(500) DEFAULT NULL,
  cancelled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  previous_status ENUM('booked', 'confirmed', 'completed', 'cancelled') NOT NULL,
  new_status ENUM('booked', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'cancelled',
  PRIMARY KEY (id),
  KEY idx_cancel_appointment (appointment_id),
  KEY idx_cancel_by (cancelled_by),
  CONSTRAINT fk_cancel_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
  CONSTRAINT fk_cancel_user FOREIGN KEY (cancelled_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sms_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id INT UNSIGNED NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('confirmation', 'reminder', 'cancellation', 'other') NOT NULL DEFAULT 'other',
  status ENUM('sent', 'failed', 'simulated') NOT NULL,
  provider_sid VARCHAR(100) DEFAULT NULL,
  error_message VARCHAR(500) DEFAULT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sms_appointment_type (appointment_id, message_type),
  KEY idx_sms_status (status),
  CONSTRAINT fk_sms_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE=InnoDB;
