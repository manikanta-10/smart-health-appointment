# Smart Health Appointment Booking System

## Complete Project Explanation, Architecture, Database, API and Viva Guide

> This document explains the implementation that exists in the current project. It is based on the actual source files in this repository. It does not modify any source code. Where a feature is not implemented, it is stated clearly instead of being presented as available.

**Project path:** `D:\Health_Appointment_System\smart-health-appointment`  
**Application type:** Full-stack web application  
**Backend:** Node.js + Express + MySQL  
**Frontend:** Static HTML, Bootstrap 5 and vanilla JavaScript  
**Primary time zone:** Asia/Kolkata (IST)  
**SMS mode by default:** Simulated demo mode

---

## Table of Contents

1. [Project Introduction](#1-project-introduction)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Frontend Pages](#5-frontend-pages)
6. [Backend Explanation](#6-backend-explanation)
7. [Database Design](#7-database-design)
8. [User Roles and Workflows](#8-user-roles-and-workflows)
9. [Appointment Booking Logic](#9-appointment-booking-logic)
10. [Security](#10-security)
11. [SMS and Reminder System](#11-sms-and-reminder-system)
12. [API Documentation](#12-api-documentation)
13. [Testing](#13-testing)
14. [How to Run the Project](#14-how-to-run-the-project)
15. [Advantages and Limitations](#15-advantages-and-limitations)
16. [Complete Booking Example](#16-complete-booking-example)
17. [40 Viva Questions and Answers](#17-40-viva-questions-and-answers)
18. [Conclusion](#18-conclusion)

---

# 1. Project Introduction

## 1.1 Purpose

The Smart Health Appointment Booking System is a web-based clinic appointment platform. It allows patients to find active doctors, view available time slots, book appointments, and cancel eligible appointments. Doctors can manage their professional profile, weekly working hours, appointments and patient list. Administrators can manage doctor and patient accounts, monitor appointments, view calendars, audit cancellations and inspect SMS logs.

The project is designed as an academic full-stack application. It demonstrates:

- Role-based authentication and authorization.
- Relational database design with foreign keys and constraints.
- REST API development with Express.
- Server-side validation and business rules.
- Transaction-based booking with overlap prevention.
- Available-slot generation from doctor availability.
- A responsive multi-page frontend using Bootstrap.
- Integration with Twilio for optional SMS, with a safe simulated mode.

## 1.2 Problem Being Solved

A manual clinic booking process can cause:

- Double booking of the same doctor and time.
- Long waiting times and phone congestion.
- Difficulty in knowing which slots are genuinely free.
- No clear cancellation record.
- No central view of doctors, patients and appointments.
- No reliable reminder mechanism.

This system solves these problems through:

- Database-level uniqueness and application-level overlap checks.
- Real-time slot generation based on doctor availability.
- Separate dashboards for each role.
- Cancellation audit logs.
- Optional SMS confirmation and reminder logging.
- Admin visibility across the entire clinic.

## 1.3 Main Objectives

1. Provide a public doctor directory.
2. Allow patients to register and log in securely.
3. Allow patients to view only genuinely available appointment slots.
4. Prevent double booking and overlapping appointments.
5. Allow a doctor to define weekly working hours and consultation duration.
6. Allow doctors and administrators to manage appointment status.
7. Record every cancellation with an audit trail.
8. Send booking confirmations and reminders when Twilio is configured; otherwise simulate them without falsely claiming delivery.
9. Provide dashboards and calendar views for patients, doctors and administrators.

## 1.4 User Roles

| Role | Main purpose |
|---|---|
| Patient | Register, find doctors, view slots, book and cancel eligible appointments, edit profile |
| Doctor | Manage availability, view and update own appointments, view patients and cancellations |
| Admin | Manage doctors and patients, monitor all appointments, cancel appointments, view calendars, cancellations and SMS logs |

## 1.5 Key Implemented Features

- Public doctor listing and specialization filtering.
- Patient self-registration with password validation.
- JWT-based login for all roles.
- Role-specific dashboards.
- Weekly doctor availability with multiple time ranges per day.
- Configurable consultation duration from 10 to 120 minutes.
- Server-generated slot grid.
- Booking with:
  - Future-time validation.
  - Availability validation.
  - Overlap prevention.
  - Weekly booking limit.
  - Transaction and row lock.
  - Database unique constraint as final protection.
- Patient cancellation with a 6-hour rule.
- Doctor and admin status updates.
- Admin cancellation that bypasses the patient 6-hour rule.
- Cancellation audit logs.
- SMS confirmation and reminder logging.
- Simulated SMS mode when Twilio credentials are absent.
- FullCalendar views for patient, doctor and admin.
- Integration test suite with 26 tests.

## 1.6 Explicitly Not Implemented

The following are not part of the current implementation:

- Online payment or payment gateway.
- Video consultation.
- Prescription management.
- Medical report upload.
- Email notifications.
- Real-time WebSocket notifications.
- Automatic appointment rescheduling.
- Doctor self-registration.
- Patient-facing doctor ratings or reviews.
- Multi-clinic or multi-branch support.
- Refresh tokens or server-side token revocation lists.
- Automatic no-show handling.
- GPS or location-based search.
- SMS delivery receipts beyond Twilio's accepted-message SID.
- A production-grade secret-management system.

---

# 2. Technology Stack

## 2.1 Backend Technologies

| Technology | Version / package | Purpose |
|---|---|---|
| Node.js | Runtime available on machine | Executes server-side JavaScript |
| Express | `^4.21.2` | HTTP server, routing and middleware |
| MySQL | Relational database | Stores users, doctors, availability, appointments, cancellations and SMS logs |
| mysql2 | `^3.12.0` | Promise-based MySQL access and connection pooling |
| bcrypt | `^6.0.0` | Password hashing and comparison |
| jsonwebtoken | `^9.0.2` | JWT creation and verification |
| express-validator | `^7.2.1` | Request body validation |
| express-rate-limit | `^7.5.0` | Login and registration rate limiting |
| helmet | `^8.0.0` | HTTP security headers |
| cors | `^2.8.5` | Cross-origin request support |
| dotenv | `^16.4.7` | Loads environment variables from `.env` |
| node-cron | `^3.0.3` | Scheduled reminder checks |
| twilio | `^5.4.3` | Optional real SMS sending |

## 2.2 Frontend Technologies

| Technology | Version | Purpose |
|---|---|---|
| HTML5 | Static pages | Page structure |
| CSS3 | Custom stylesheet | Responsive visual design |
| Bootstrap | 5.3.3 | Layout, cards, tables, modals and forms |
| Font Awesome | 6.5.2 | Icons |
| Google Fonts - Inter | Web font | Typography |
| JavaScript | Vanilla ES6 | Page logic and API calls |
| FullCalendar | 6.1.15 | Patient, doctor and admin calendar views |
| Chart.js | 4.4.1 | Admin appointment-status chart |

## 2.3 Development and Testing Tools

| Tool | Purpose |
|---|---|
| nodemon | Automatic server restart during development |
| supertest | HTTP API integration testing |
| node:test | Built-in Node.js test runner |
| node:assert/strict | Assertions in tests |
| `.env.example` | Documents required environment variables |
| `server.log` | Existing runtime log file in the repository |

## 2.4 Important Package Scripts

From `package.json`:

| Script | Command | Purpose |
|---|---|---|
| `npm start` | `node server.js` | Start the production-style server |
| `npm run dev` | `nodemon server.js` | Start with auto-reload |
| `npm run seed` | `node database/seed.js` | Recreate schema and insert demo data |
| `npm test` | `node --test --test-concurrency=1 tests/api.test.js` | Run integration tests serially |
| `npm run reminders` | Runs `runReminderCheck()` once | Manually trigger reminder processing |

---

# 3. System Architecture

## 3.1 High-Level Architecture

The application is a layered monolith with a static multi-page frontend.

```text
+-----------------------------+
| Browser                     |
| HTML + Bootstrap + JS       |
| localStorage token          |
+--------------+--------------+
               |
               | fetch("/api/...")
               | Authorization: Bearer <JWT>
               v
+-----------------------------+
| Express Application         |
|                             |
| helmet / cors / JSON parser |
| static file serving         |
| /api route modules          |
+--------------+--------------+
               |
               v
+-----------------------------+
| Route + Middleware Layer    |
| authenticate                |
| allowRoles                  |
| express-validator           |
| rate limiters               |
+--------------+--------------+
               |
               v
+-----------------------------+
| Controller Layer            |
| Request parsing             |
| HTTP response formatting    |
+--------------+--------------+
               |
               v
+-----------------------------+
| Service + Model Layer       |
| Business rules              |
| Transactions                |
| SQL queries                 |
+--------------+--------------+
               |
               v
+-----------------------------+
| MySQL Database              |
| users, doctors,             |
| doctor_availability,        |
| appointments,               |
| cancellation_logs,          |
| sms_logs                    |
+-----------------------------+

Background process:
node-cron -> reminderService -> appointmentModel + smsService
```

## 3.2 Request Lifecycle

A typical authenticated request follows this path:

1. The browser sends a request to an `/api/...` endpoint.
2. `app.js` applies Helmet, CORS, JSON parsing and URL-encoded parsing.
3. The matching route module receives the request.
4. `authenticate` reads the `Authorization: Bearer <token>` header.
5. The JWT is verified.
6. The user is reloaded from MySQL using the JWT user ID.
7. The user's `is_active` flag is checked.
8. `req.user` is populated with `id`, name, email, phone, role and `doctorId`.
9. `allowRoles(...)` checks whether the role is permitted.
10. `express-validator` rules and the `validate` middleware check request fields.
11. The controller calls models or services.
12. Services apply business rules and may use a database transaction.
13. The controller returns a JSON response.
14. Errors are passed to the central error handler.

## 3.3 Architectural Style

The project uses a **layered monolithic architecture**:

- Presentation layer: static HTML, CSS and browser JavaScript.
- API layer: Express routes.
- Application layer: controllers and services.
- Data-access layer: models.
- Persistence layer: MySQL.
- Shared utilities: time, slots, periods, API errors and async wrapper.

This is not a microservices system. All API modules run in one Node.js process.

## 3.4 Static File Serving

`app.js` serves the `public/` directory with:

```js
app.use(express.static(publicDir, { extensions: ['html'] }));
```

The `extensions: ['html']` option allows URLs such as `/login` to resolve to `login.html`. The root URL `/` explicitly sends `index.html`. Unknown browser routes return `404.html`; unknown API routes return a JSON 404.

## 3.5 Standard API Response Shape

Success:

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": [
    { "field": "password", "message": "Password must contain at least one number." }
  ]
}
```

The `errors` array appears for validation failures. Some errors may omit it.

## 3.6 Time-Zone Architecture

The application deliberately treats MySQL `DATETIME` values as **IST wall-clock values**. For example, `2026-11-16 10:00:00` means 10:00 AM in Asia/Kolkata.

`utils/time.js` converts real instants to IST wall-clock values and uses JavaScript `Date` objects whose UTC fields represent IST fields. This makes arithmetic and comparisons consistent even if the host machine is in another time zone.

FullCalendar receives ISO-like strings without a time-zone suffix. The frontend appends `+05:30` when rendering so that the calendar displays IST correctly.

---

# 4. Folder Structure

```text
smart-health-appointment/
|
+-- app.js
+-- server.js
+-- package.json
+-- package-lock.json
+-- .env.example
+-- .gitignore
+-- server.log
|
+-- config/
|   +-- db.js
|
+-- controllers/
|   +-- adminController.js
|   +-- appointmentController.js
|   +-- authController.js
|   +-- doctorController.js
|   +-- doctorPublicController.js
|   +-- patientController.js
|
+-- database/
|   +-- schema.sql
|   +-- seed.js
|
+-- middleware/
|   +-- auth.js
|   +-- errorHandler.js
|   +-- rateLimit.js
|   +-- roles.js
|   +-- validate.js
|
+-- models/
|   +-- appointmentModel.js
|   +-- availabilityModel.js
|   +-- cancellationModel.js
|   +-- doctorModel.js
|   +-- smsLogModel.js
|   +-- statsModel.js
|   +-- userModel.js
|
+-- routes/
|   +-- adminRoutes.js
|   +-- appointmentRoutes.js
|   +-- authRoutes.js
|   +-- doctorPublicRoutes.js
|   +-- doctorRoutes.js
|   +-- patientRoutes.js
|
+-- services/
|   +-- appointmentService.js
|   +-- reminderService.js
|   +-- smsService.js
|
+-- utils/
|   +-- ApiError.js
|   +-- asyncHandler.js
|   +-- periods.js
|   +-- slots.js
|   +-- time.js
|
+-- tests/
|   +-- api.test.js
|
+-- public/
|   +-- index.html
|   +-- login.html
|   +-- register.html
|   +-- 404.html
|   +-- css/
|   |   +-- styles.css
|   +-- js/
|   |   +-- api.js
|   |   +-- layout.js
|   |   +-- login.js
|   |   +-- register.js
|   |   +-- landing.js
|   |   +-- patient-dashboard.js
|   |   +-- patient-doctors.js
|   |   +-- patient-doctor.js
|   |   +-- patient-appointments.js
|   |   +-- patient-calendar.js
|   |   +-- patient-profile.js
|   |   +-- doctor-common.js
|   |   +-- doctor-dashboard.js
|   |   +-- doctor-appointments.js
|   |   +-- doctor-availability.js
|   |   +-- doctor-patients.js
|   |   +-- doctor-calendar.js
|   |   +-- doctor-cancellations.js
|   |   +-- doctor-profile.js
|   |   +-- admin-dashboard.js
|   |   +-- admin-doctors.js
|   |   +-- admin-patients.js
|   |   +-- admin-appointments.js
|   |   +-- admin-calendar.js
|   |   +-- admin-cancellations.js
|   |   +-- admin-sms-logs.js
|   |   +-- admin-profile.js
|   +-- patient/
|   |   +-- dashboard.html
|   |   +-- doctors.html
|   |   +-- doctor.html
|   |   +-- appointments.html
|   |   +-- calendar.html
|   |   +-- profile.html
|   +-- doctor/
|   |   +-- dashboard.html
|   |   +-- appointments.html
|   |   +-- availability.html
|   |   +-- patients.html
|   |   +-- calendar.html
|   |   +-- cancellations.html
|   |   +-- profile.html
|   +-- admin/
|       +-- dashboard.html
|       +-- doctors.html
|       +-- patients.html
|       +-- appointments.html
|       +-- calendar.html
|       +-- cancellations.html
|       +-- sms-logs.html
|       +-- profile.html
|
+-- node_modules/
```

## 4.1 Important File Responsibilities

| File | Responsibility |
|---|---|
| `server.js` | Loads `.env`, tests the database connection, starts Express, starts reminder cron, handles shutdown |
| `app.js` | Creates Express app, applies middleware, mounts API routes, serves static frontend |
| `config/db.js` | MySQL connection pool, `query()`, `withTransaction()`, `testConnection()` |
| `middleware/auth.js` | JWT signing, authentication, user reload and active-account check |
| `middleware/roles.js` | Role-based access guard |
| `middleware/validate.js` | Converts express-validator errors into a 422 API response |
| `middleware/errorHandler.js` | Central error mapping and JSON API 404 |
| `middleware/rateLimit.js` | Login and registration rate limits |
| `services/appointmentService.js` | Booking, cancellation and status-transition business rules |
| `services/smsService.js` | Twilio initialization, phone normalization, message building and SMS logging |
| `services/reminderService.js` | Reminder window calculation and cron scheduling |
| `utils/time.js` | IST wall-clock handling and date formatting |
| `utils/slots.js` | Slot generation, availability validation and calendar events |
| `utils/periods.js` | Today, tomorrow, current week and next week boundaries |
| `models/*.js` | SQL queries for each entity |
| `routes/*.js` | Endpoint definitions and route-level validation |
| `controllers/*.js` | Request handling and response building |
| `public/js/api.js` | Shared API client, session storage and UI helpers |
| `public/js/layout.js` | Role-based sidebar and topbar shell |

---

# 5. Frontend Pages

## 5.1 Shared Frontend Behaviour

### Session storage

The browser stores:

- `sha_token`: JWT token.
- `sha_user`: JSON user object containing `id`, `name`, `email`, `phone`, `role` and optionally `doctor_id`.

### API client

`public/js/api.js` provides:

- `API.request(path, options)` for JSON fetch requests.
- Automatic Bearer token header.
- Automatic session clearing and redirect on 401.
- Toast messages.
- Confirmation dialogs.
- Prompt dialogs.
- Modal creation.
- HTML escaping.
- Date/time formatting.
- IST time calculations.
- Status badges.
- Currency formatting.
- Debounce and empty states.

### Authentication guard

`Auth.requireAuth([role])` redirects unauthenticated users to login and redirects users with the wrong role to their own dashboard.

### Shared application shell

`public/js/layout.js` builds:

- Sidebar with role-specific navigation.
- Brand and current user information.
- Topbar with page title, subtitle, current date, IST label and profile menu.
- Logout buttons.
- Mobile sidebar toggle.

## 5.2 Public Pages

| Page | File | Description |
|---|---|---|
| Landing page | `public/index.html` | Hero, call-to-action, featured active doctors, booking steps and footer |
| Login | `public/login.html` | Email/password login, demo account fill buttons, password visibility toggle |
| Registration | `public/register.html` | Patient-only registration with validation and automatic login |
| 404 | `public/404.html` | Friendly not-found page |

### Landing page

- Displays featured doctors fetched from `GET /api/doctors`.
- If a user is already logged in, the navigation shows “Go to dashboard”.
- Doctor cards show name, specialization, qualification, experience and fee.
- Doctor cards direct unauthenticated users to login before booking.

### Login page

- Demo buttons fill seeded credentials.
- On success, stores token and user and redirects by role.
- If session expired, a warning is shown.
- A 401 response clears the session.

### Registration page

- Collects name, email, phone, password and confirmation.
- Enforces:
  - Name at least 2 characters.
  - Valid email.
  - Phone of 10-15 digits with optional `+`, `-`, spaces.
  - Password at least 8 characters, containing a letter and a number.
  - Matching passwords.
- The server forces the role to `patient`.
- Successful registration logs the user in and redirects to the patient dashboard.

## 5.3 Patient Pages

| Page | File | Purpose | Main API calls |
|---|---|---|---|
| Dashboard | `public/patient/dashboard.html` | Greeting, next appointment and recent history | `GET /api/patient/stats` |
| Find Doctors | `public/patient/doctors.html` | Search and filter active doctors | `GET /api/doctors`, `GET /api/doctors/specializations` |
| Doctor Detail / Booking | `public/patient/doctor.html` | Doctor profile, date selection, available slots and booking | `GET /api/doctors/:id`, `GET /api/doctors/:id/slots`, `POST /api/appointments` |
| My Appointments | `public/patient/appointments.html` | Upcoming/history tabs and cancellation | `GET /api/patient/appointments`, `POST /api/appointments/:id/cancel` |
| Calendar | `public/patient/calendar.html` | FullCalendar slot view and click-to-book | `GET /api/doctors`, `GET /api/doctors/:id/calendar`, `POST /api/appointments` |
| Profile | `public/patient/profile.html` | Update name/email/phone and change password | `GET/PUT /api/patient/profile`, `PUT /api/auth/password` |

### Patient dashboard

- Shows a welcome message with the patient's first name.
- Shows the next upcoming appointment, or an empty state with a “Find a doctor” button.
- Shows the five most recent history appointments.
- There are no statistic cards on this page after the redesign.

### Find Doctors

- Loads specializations from the public API.
- Supports text search and specialization filtering.
- Shows doctor cards with qualification, experience, duration, fee and bio.
- Links to the doctor detail page and a calendar view.
- The public listing only includes active doctors.

### Doctor Detail and Booking

- Reads the doctor ID from `?id=`.
- Loads the public doctor profile.
- Date input is limited to today through 60 days ahead.
- Shows only available slots returned by the API.
- “Find next available” searches up to 21 days.
- Booking asks for confirmation and an optional reason.
- On success, redirects to My Appointments.
- On a 409 conflict, reloads the slot list.
- The page contains a demo-mode notice explaining that SMS is simulated and not delivered.

### My Appointments

- Two tabs: Upcoming and History.
- Upcoming means active statuses with a future date.
- History means completed/cancelled appointments or appointments in the past.
- A cancel button is shown only when the appointment is `booked` or `confirmed` and at least 6 hours remain.
- The frontend condition is a convenience; the server enforces the same rule.

### Patient Calendar

- Uses FullCalendar with month, week and day views.
- Only available slots are returned by the patient calendar API.
- Clicking an available slot opens a confirmation and reason prompt.
- The page is reachable with `/patient/calendar.html` and from the doctor directory, but it is not shown in the main patient sidebar.

### Patient Profile

- Shows name, phone, email and account creation date.
- Allows name, phone and email updates.
- Checks that a new email is not already registered.
- Allows password change after verifying the current password.
- Updates the local session after profile changes.

## 5.4 Doctor Pages

| Page | File | Purpose | Main API calls |
|---|---|---|---|
| Dashboard | `public/doctor/dashboard.html` | Today's appointments and upcoming list | `GET /api/doctor/dashboard`, `GET /api/doctor/profile` |
| Appointments | `public/doctor/appointments.html` | Date/status filtering and appointment management | `GET /api/doctor/appointments`, `GET /api/doctor/appointments/:id`, `PATCH /api/doctor/appointments/:id/status` |
| Availability | `public/doctor/availability.html` | Weekly working hours and consultation duration | `GET /api/doctor/profile`, `PUT /api/doctor/availability` |
| My Patients | `public/doctor/patients.html` | Patients with appointments and history modal | `GET /api/doctor/patients`, `GET /api/doctor/patients/:patientId` |
| Calendar | `public/doctor/calendar.html` | Own appointments and free slots in FullCalendar | `GET /api/doctor/calendar` |
| Cancellations | `public/doctor/cancellations.html` | Cancellation audit for the doctor | `GET /api/doctor/cancellations` |
| Profile | `public/doctor/profile.html` | Professional details and password | `GET/PUT /api/doctor/profile`, `PUT /api/auth/password` |

### Doctor dashboard

- Shows a welcome message and specialization with years of experience.
- Shows today's appointments with patient name, phone and status.
- Shows up to five upcoming active appointments.
- Appointment detail modal supports valid status actions.
- There are no statistic cards on this page after the redesign.

### Doctor appointments

- Default date range is 30 days in the past to 60 days in the future.
- Filters by date range and status.
- Displays patient, appointment time, reason, fee and status.
- Details modal allows:
  - `booked` -> Confirmed or Cancelled.
  - `confirmed` -> Completed or Cancelled.
  - `completed` and `cancelled` -> no further actions.

### Doctor availability

- Displays Monday through Sunday.
- Each day can be enabled or disabled.
- Each enabled day can have multiple time ranges.
- Consultation duration choices: 10, 15, 20, 30, 45, 60, 90 and 120 minutes.
- Shortcut: copy Monday to Tuesday-Friday.
- Shortcut: clear all working hours.
- Saving replaces all availability rows for that doctor.
- The UI warns that changing duration affects future bookable slots.
- The UI allows saving no ranges after explicit confirmation; this makes the doctor temporarily unbookable.

### Doctor patients

- Lists patients who have at least one appointment with the doctor.
- Shows total visits, completed visits, last visit and next visit.
- “View” opens a modal with the patient's appointment history with that doctor.

### Doctor calendar

- Default view is week view, with month and day options.
- Shows appointment events and free-slot events.
- Free slots are generated from availability and duration.
- Clicking an appointment opens the same management modal.
- Clicking a free slot explains that patients can book it.
- The page is reachable by direct URL but is not in the main doctor sidebar.

### Doctor cancellations

- Lists cancellations for that doctor only.
- Shows patient, appointment time, previous status, cancelled-by user/role, reason and cancellation time.
- The page is reachable by direct URL but is not in the main doctor sidebar.

### Doctor profile

- Editable: name, phone, specialization, qualification, experience, consultation fee, duration and bio.
- Email is read-only.
- Password change verifies the current password.
- Availability is managed on the separate Availability page.

## 5.5 Admin Pages

| Page | File | Purpose | Main API calls |
|---|---|---|---|
| Dashboard | `public/admin/dashboard.html` | Summary statistics, status chart and upcoming appointments | `GET /api/admin/stats` |
| Manage Doctors | `public/admin/doctors.html` | Create, edit, activate/deactivate doctors | `GET/POST/PUT /api/admin/doctors`, `PUT /api/admin/doctors/:id/status` |
| Manage Patients | `public/admin/patients.html` | Search patients and activate/deactivate accounts | `GET /api/admin/patients`, `PUT /api/admin/patients/:id/status` |
| Manage Appointments | `public/admin/appointments.html` | Filter and manage all appointments | `GET /api/admin/appointments`, `PATCH /api/admin/appointments/:id/status`, `POST /api/admin/appointments/:id/cancel` |
| Calendar | `public/admin/calendar.html` | All appointments across doctors | `GET /api/admin/calendar`, `GET /api/admin/doctors` |
| Cancellation Logs | `public/admin/cancellations.html` | Full cancellation audit trail | `GET /api/admin/cancellations`, `GET /api/admin/doctors` |
| SMS Logs | `public/admin/sms-logs.html` | SMS attempt history and delivery mode | `GET /api/admin/sms-logs` |
| Profile | `public/admin/profile.html` | Read-only admin details and password change | `GET /api/auth/me`, `PUT /api/auth/password` |

### Admin dashboard

- Shows exactly three statistic cards:
  - Total active doctors.
  - Total active patients.
  - Total appointments.
- Shows one Chart.js bar chart of appointment statuses: Booked, Confirmed, Completed and Cancelled.
- Shows upcoming appointments.
- Other statistics returned by the API (today, week, completed, cancelled, SMS statistics, daily counts and per-doctor data) are not all displayed on the redesigned dashboard, but are available in the API response and used by tests.

### Manage Doctors

- Lists all doctors, including inactive doctors.
- Search by name, email or specialization.
- Add doctor modal collects:
  - Name, email, phone, password.
  - Specialization, qualification.
  - Experience, fee and duration.
  - Bio.
- New doctors automatically receive default availability: Monday-Friday, 09:00-17:00.
- Edit modal:
  - Email is read-only.
  - Password is optional; leave blank to keep current.
  - Changing duration affects future slots.
- Activate/deactivate uses a confirmation dialog.
- Deactivation prevents login and new bookings but preserves existing records.
- The API also exposes a delete endpoint, but it performs a soft deactivation rather than physically deleting the doctor.

### Manage Patients

- Lists patients with appointment counts and last appointment.
- Search by name, email or phone.
- Shows active/inactive state.
- Activate/deactivate requires confirmation.
- Deactivated patients cannot log in or book.

### Manage Appointments

- Filters: doctor, single date and status.
- Displays patient, doctor, time range, reason and status.
- Status actions:
  - Confirm for `booked`.
  - Complete for `booked` or `confirmed` in the UI.
  - Cancel for `booked` or `confirmed`.
- Cancellation prompts for an optional reason and warns that admin cancellation bypasses the 6-hour patient rule.
- **Implementation note:** The backend service only allows `booked -> confirmed` and `confirmed -> completed`. The admin UI currently displays “Complete” for a booked appointment as well, but the backend rejects that transition. This is a UI/backend consistency issue, not a security issue.

### Admin calendar

- Shows all appointments or a selected doctor's appointments.
- Month, week and day views.
- Event colors:
  - Booked: blue.
  - Confirmed: teal/green.
  - Completed: grey.
  - Cancelled: red.
- Clicking an event shows patient, doctor, time and reason.
- The modal links to the appointment management page.

### Cancellation Logs

- Full audit trail across doctors.
- Filter by doctor.
- Shows patient, doctor, appointment date, previous status, cancelled-by name/role, reason and cancellation timestamp.

### SMS Logs

- Shows a mode banner:
  - Twilio configured: “Twilio is configured.” Rows marked sent were accepted by Twilio.
  - Demo mode: all messages are simulated and NOT delivered.
- Shows statistic cards for sent, simulated, failed and total attempts.
- Filters by status and message type.
- Shows patient, doctor, appointment, type, status, phone, message, error and timestamp.

### Admin Profile

- Name, email and phone are displayed but cannot be edited from this page.
- Password change is supported.
- The page explains that administrator details are managed by the system.

## 5.6 Navigation Summary

### Patient sidebar

- Dashboard
- Find Doctors
- My Appointments
- Manage Profile

### Doctor sidebar

- Dashboard
- Appointments
- My Patients
- Availability
- Profile

### Admin sidebar

- Dashboard
- Manage Doctors
- Manage Patients
- Manage Appointments
- Calendar
- Cancellation Logs
- SMS Logs (Demo)
- My Profile

Accessible by direct URL but not in the sidebar:

- `/patient/calendar.html`
- `/doctor/calendar.html`
- `/doctor/cancellations.html`

## 5.7 Visual Design

The redesigned frontend uses:

- A white and blue healthcare palette.
- Blue primary actions (`#2563eb`) and teal accent (`#0f9b8e`).
- Inter font.
- Rounded cards and subtle borders.
- Responsive sidebar and topbar.
- Status badges.
- Tables with responsive wrappers.
- Modals for details and confirmations.
- Toast notifications.
- Empty states and loading indicators.
- No marketing emphasis on SMS outside the admin SMS log page and the booking demo notice.

---

# 6. Backend Explanation

## 6.1 `server.js`

Responsibilities:

1. Load `.env` through `dotenv`.
2. Import the Express app.
3. Test MySQL connectivity with `SELECT 1`.
4. Exit with an error if the database is unreachable.
5. Start the HTTP server on `PORT` or `3000`.
6. Print the URL, SMS mode and time zone.
7. Start the reminder cron.
8. Handle `SIGINT` and `SIGTERM` for graceful shutdown.
9. Close the MySQL pool and force exit after 5 seconds if graceful shutdown hangs.

## 6.2 `app.js`

Middleware order:

1. Disable `x-powered-by`.
2. Helmet with:
   - Content Security Policy disabled.
   - Cross-origin embedder policy disabled.
   - Cross-origin resource policy set to `cross-origin`.
3. CORS enabled for all origins.
4. JSON body parser with a 200 KB limit.
5. URL-encoded parser.
6. Health endpoint.
7. API route modules.
8. JSON 404 for unknown `/api` routes.
9. Static frontend.
10. HTML 404 fallback.
11. Central error handler.

API mounts:

| Mount | Route module |
|---|---|
| `/api/auth` | `authRoutes.js` |
| `/api/patient` | `patientRoutes.js` |
| `/api/doctor` | `doctorRoutes.js` |
| `/api/admin` | `adminRoutes.js` |
| `/api/doctors` | `doctorPublicRoutes.js` |
| `/api/appointments` | `appointmentRoutes.js` |

## 6.3 Controllers

| Controller | Responsibilities |
|---|---|
| `authController.js` | Patient registration, login, current user, password change |
| `patientController.js` | Patient profile, appointments, dashboard statistics, doctor-specific history |
| `doctorController.js` | Doctor dashboard, profile, availability, appointments, status updates, slots, calendar, patients, cancellations |
| `doctorPublicController.js` | Public doctor list, specializations, doctor detail, authenticated slot and calendar endpoints |
| `adminController.js` | Admin stats, doctor management, patient management, all appointments, cancellations, calendars and SMS logs |
| `appointmentController.js` | Create appointment, cancel appointment, view one appointment |

Controllers generally:

- Read `req.body`, `req.query`, `req.params` and `req.user`.
- Call models or services.
- Use `asyncHandler` so rejected promises reach the error handler.
- Throw `ApiError` for expected failures.
- Return consistent JSON.

## 6.4 Services

### `appointmentService.js`

Contains the core booking and cancellation rules:

- `bookAppointment()`
- `cancelAppointment()`
- `changeAppointmentStatus()`
- `CANCELLATION_WINDOW_HOURS = 6`

### `smsService.js`

- Detects Twilio configuration.
- Lazily loads Twilio.
- Normalizes phone numbers.
- Builds confirmation and reminder messages.
- Sends or simulates SMS.
- Always attempts to write an `sms_logs` row.
- Never lets SMS failure break a booking.
- Prevents duplicate confirmation/reminder logs.

### `reminderService.js`

- Calculates a rolling 24-hour-plus-15-minute reminder window.
- Finds due appointments without a reminder log.
- Sends/simulates reminders.
- Returns a summary.
- Schedules the cron task.
- Runs once shortly after startup.

## 6.5 Models

| Model | Main responsibilities |
|---|---|
| `userModel.js` | Create user, find by email/ID, update profile, activate/deactivate, list patients, count roles |
| `doctorModel.js` | List public/admin doctors, find by ID/user ID, create, update, activate/deactivate, specializations, count active |
| `availabilityModel.js` | List availability, get one day, replace all ranges |
| `appointmentModel.js` | Insert, overlap check, weekly count, find/lock, update status, list for patient/doctor/admin/range/reminders/slots, list doctor patients, list global upcoming |
| `cancellationModel.js` | Create audit row, list all or by doctor with joined names |
| `smsLogModel.js` | Create log, check type, list filtered logs, aggregate statistics |
| `statsModel.js` | Admin, doctor and patient statistics, status breakdown, per-doctor totals, daily counts |

All SQL uses parameter placeholders (`?`) for user input.

## 6.6 Middleware

### `authenticate`

- Requires an `Authorization: Bearer <token>` header.
- Verifies the JWT with `JWT_SECRET`.
- Reloads the user from the database.
- Obtains `doctor_id` for doctor accounts.
- Rejects missing, invalid, expired or inactive accounts.
- Populates `req.user`.

### `allowRoles(...roles)`

- Requires `req.user`.
- Returns 403 if the user's role is not allowed.

### `validate`

- Reads `express-validator` results.
- Returns 422 with the first validation message and a structured `errors` array.

### `errorHandler`

- `ApiError`: uses its status and message.
- Duplicate `unique_doctor_datetime`: 409 with a “slot was just booked” message.
- Other duplicate key: 409 generic duplicate message.
- Malformed JSON: 400.
- Foreign-key conflict: 409.
- Unknown error: logs server-side and returns a generic 500.

### Rate limiters

| Limiter | Window | Limit |
|---|---|---|
| Auth | 15 minutes | 30 requests |
| Registration | 1 hour | 20 requests |

Rate limiting is not applied globally to all endpoints.

## 6.7 Utilities

### `utils/time.js`

Key functions:

- `nowIST()`: current IST wall-clock Date.
- `parseWall()`: parses `YYYY-MM-DD HH:mm[:ss]` or ISO-like wall time.
- `parseInputWall()`: converts strings with explicit time zones to IST wall time; plain strings are treated as IST.
- `instantToWall()`: real instant to IST wall clock.
- `toMysql()`: wall Date to `YYYY-MM-DD HH:mm:ss`.
- `addMinutes()`, `addDays()`, `startOfDay()`.
- `combineDateTime()`.
- `mondayOf()`.
- `diffHours()`.
- Display formatting helpers.
- `toCalendarLocal()`.
- `todayStr()`.

### `utils/periods.js`

Returns consistent boundaries for:

- Now.
- Today start.
- Tomorrow.
- Current week start (Monday).
- Next week.
- MySQL-ready strings and date strings.

### `utils/slots.js`

- `daySlots()`: generate all slot states for a doctor and date.
- `availableSlotsForDate()`: filter to available slots.
- `availableSlotEvents()`: produce FullCalendar events for available slots.
- `fitsAvailability()`: validate that a requested start is on an aligned grid point inside a working range.

### `utils/ApiError.js`

Provides typed errors:

- 400 `badRequest`
- 401 `unauthorized`
- 403 `forbidden`
- 404 `notFound`
- 409 `conflict`
- 422 `unprocessable`

### `utils/asyncHandler.js`

Wraps async route handlers and forwards rejected promises to Express error handling.

## 6.8 Database Access

`config/db.js` creates a MySQL pool with:

- Connection limit 10.
- `dateStrings: true`.
- `decimalNumbers: true`.
- `multipleStatements: false`.
- UTF-8 `utf8mb4_unicode_ci`.

`withTransaction(fn)`:

1. Gets a connection.
2. Begins a transaction.
3. Runs the callback.
4. Commits on success.
5. Rolls back on error.
6. Always releases the connection.

---

# 7. Database Design

## 7.1 Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o| DOCTORS : "doctor profile"
    USERS ||--o{ APPOINTMENTS : "books as patient"
    DOCTORS ||--o{ DOCTOR_AVAILABILITY : "has"
    DOCTORS ||--o{ APPOINTMENTS : "receives"
    APPOINTMENTS ||--o{ CANCELLATION_LOGS : "has"
    APPOINTMENTS ||--o{ SMS_LOGS : "has"
    USERS ||--o{ CANCELLATION_LOGS : "cancels"

    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password
        varchar phone
        enum role
        tinyint is_active
        datetime created_at
        datetime updated_at
    }

    DOCTORS {
        int id PK
        int user_id FK UK
        varchar specialization
        varchar qualification
        int experience
        decimal consultation_fee
        int appointment_duration
        text bio
        datetime created_at
        datetime updated_at
    }

    DOCTOR_AVAILABILITY {
        int id PK
        int doctor_id FK
        tinyint day_of_week
        time start_time
        time end_time
        tinyint is_available
    }

    APPOINTMENTS {
        int id PK
        int patient_id FK
        int doctor_id FK
        datetime appointment_datetime
        datetime appointment_end_datetime
        enum status
        varchar reason
        datetime created_at
        datetime updated_at
    }

    CANCELLATION_LOGS {
        int id PK
        int appointment_id FK
        int cancelled_by FK
        varchar cancellation_reason
        datetime cancelled_at
        enum previous_status
        enum new_status
    }

    SMS_LOGS {
        int id PK
        int appointment_id FK
        varchar phone_number
        text message
        enum message_type
        enum status
        varchar provider_sid
        varchar error_message
        datetime sent_at
    }
```

## 7.2 `users`

Stores all account types in one table.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED` | Primary key, auto-increment |
| `name` | `VARCHAR(120)` | Required |
| `email` | `VARCHAR(160)` | Required, unique |
| `password` | `VARCHAR(255)` | bcrypt hash |
| `phone` | `VARCHAR(20)` | Required |
| `role` | `ENUM('patient','doctor','admin')` | Default `patient` |
| `is_active` | `TINYINT(1)` | Default 1 |
| `created_at` | `DATETIME` | Default current timestamp |
| `updated_at` | `DATETIME` | Auto-updated |

Indexes:

- Primary key on `id`.
- Unique key `uq_users_email`.
- Index on `role`.
- Index on `phone`.

## 7.3 `doctors`

Stores doctor-specific professional information and links to `users`.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED` | Primary key |
| `user_id` | `INT UNSIGNED` | FK to `users.id`, unique, cascade delete |
| `specialization` | `VARCHAR(120)` | Required |
| `qualification` | `VARCHAR(160)` | Nullable |
| `experience` | `INT UNSIGNED` | Default 0 |
| `consultation_fee` | `DECIMAL(10,2)` | Default 0.00 |
| `appointment_duration` | `INT UNSIGNED` | Default 30 minutes |
| `bio` | `TEXT` | Nullable |
| timestamps | `DATETIME` | Created/updated |

Indexes:

- Primary key.
- Unique `uq_doctors_user(user_id)`.
- Index on specialization.
- FK to users with `ON DELETE CASCADE`.

## 7.4 `doctor_availability`

Stores recurring weekly working ranges.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED` | Primary key |
| `doctor_id` | `INT UNSIGNED` | FK to `doctors.id`, cascade delete |
| `day_of_week` | `TINYINT UNSIGNED` | 0 = Sunday, 1 = Monday, ..., 6 = Saturday |
| `start_time` | `TIME` | Required |
| `end_time` | `TIME` | Required |
| `is_available` | `TINYINT(1)` | Default 1 |

Constraints:

- `chk_availability_day`: day between 0 and 6.
- `chk_availability_time`: `start_time < end_time`.
- Index on `(doctor_id, day_of_week)`.
- FK to doctors with cascade delete.

The table supports multiple ranges for the same day, for example a morning and afternoon session.

## 7.5 `appointments`

Stores booked appointments.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED` | Primary key |
| `patient_id` | `INT UNSIGNED` | FK to `users.id` |
| `doctor_id` | `INT UNSIGNED` | FK to `doctors.id` |
| `appointment_datetime` | `DATETIME` | Start, stored as IST wall time |
| `appointment_end_datetime` | `DATETIME` | End, computed from duration |
| `status` | `ENUM('booked','confirmed','completed','cancelled')` | Default `booked` |
| `reason` | `VARCHAR(500)` | Nullable |
| created/updated | `DATETIME` | Audit timestamps |

Indexes and constraints:

- Primary key.
- **Unique `unique_doctor_datetime(doctor_id, appointment_datetime)`**.
- Index `(patient_id, appointment_datetime)`.
- Index `(doctor_id, status, appointment_datetime)`.
- Index on `appointment_datetime`.
- Index on `status`.
- FKs to users and doctors with cascade delete.

Why `appointment_end_datetime` exists:

- It supports interval overlap detection.
- It allows correct calendar rendering.
- It avoids recalculating duration for every conflict query.

## 7.6 `cancellation_logs`

Stores an audit trail for cancellations.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED` | Primary key |
| `appointment_id` | `INT UNSIGNED` | FK to appointments |
| `cancelled_by` | `INT UNSIGNED` | FK to users |
| `cancellation_reason` | `VARCHAR(500)` | Nullable |
| `cancelled_at` | `DATETIME` | Default current timestamp |
| `previous_status` | `ENUM(...)` | Required |
| `new_status` | `ENUM(...)` | Default `cancelled` |

Indexes:

- Index on `appointment_id`.
- Index on `cancelled_by`.
- Cascading foreign keys.

An appointment can have more than one log row in theory because there is no uniqueness constraint, but normal application flows cancel only once because cancelled is terminal.

## 7.7 `sms_logs`

Stores SMS attempts.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT UNSIGNED` | Primary key |
| `appointment_id` | `INT UNSIGNED` | FK to appointments |
| `phone_number` | `VARCHAR(20)` | Normalized or original phone |
| `message` | `TEXT` | SMS body |
| `message_type` | `ENUM('confirmation','reminder','cancellation','other')` | Default `other` |
| `status` | `ENUM('sent','failed','simulated')` | Required |
| `provider_sid` | `VARCHAR(100)` | Twilio SID when sent |
| `error_message` | `VARCHAR(500)` | Error detail when failed |
| `sent_at` | `DATETIME` | Default current timestamp |

Constraints:

- Unique `uq_sms_appointment_type(appointment_id, message_type)`.
- Index on status.
- FK to appointments with cascade delete.

The unique key guarantees that an appointment can have at most one confirmation log and one reminder log.

## 7.8 Relationship Summary

- One user can have zero or one doctor profile.
- A doctor profile belongs to exactly one user.
- One doctor has many availability rows.
- One patient can have many appointments.
- One doctor can have many appointments.
- One appointment belongs to one patient and one doctor.
- One appointment can have cancellation logs.
- One appointment can have SMS logs, at most one per message type.
- A cancellation log records the user who cancelled.

## 7.9 Data-Integrity Choices

- Foreign keys enforce relationships.
- Cascading deletes are used in the schema, but the application prefers soft deactivation for doctors and patients.
- The unique appointment key prevents exact duplicate doctor/start-time bookings.
- Application-level interval overlap prevents partial overlaps.
- `CHECK` constraints validate day and time ranges in availability.
- Transactions protect multi-step operations.
- `dateStrings: true` avoids unintended JavaScript timezone conversion of MySQL DATETIME values.
- `decimalNumbers: true` returns fees as numbers rather than strings.

---

# 8. User Roles and Workflows

## 8.1 Permission Matrix

| Capability | Patient | Doctor | Admin |
|---|---:|---:|---:|
| Register self | Yes | No | No |
| Login | Yes | Yes | Yes |
| View public doctor list | Yes | Yes | Yes |
| View own profile | Yes | Yes | Yes |
| Edit own patient details | Yes | No | No |
| Edit own doctor professional details | No | Yes | Yes, via admin doctor edit |
| Manage own availability | No | Yes | No direct UI |
| View own appointments | Yes | Yes | Yes, all |
| Book appointment | Yes | No | No |
| Cancel own appointment | Yes, 6-hour rule | Yes, via status endpoint | Yes, no 6-hour rule |
| Confirm/complete appointment | No | Yes | Yes |
| View all patients | No | Only own patients | Yes |
| Create doctor accounts | No | No | Yes |
| Activate/deactivate doctors | No | No | Yes |
| Activate/deactivate patients | No | No | Yes |
| View all cancellations | No | Own only | Yes |
| View SMS logs | No | No | Yes |
| View admin dashboard | No | No | Yes |

## 8.2 Patient Workflow

```text
Open landing page
    |
    v
Register or log in
    |
    v
Patient dashboard
    |
    +--> Find doctors --> filter/search
    |         |
    |         v
    |    Doctor detail
    |         |
    |         v
    |    Choose date and available slot
    |         |
    |         v
    |    Enter reason and confirm
    |         |
    |         v
    |    Server validates and books
    |         |
    |         v
    |    Confirmation SMS log (sent/simulated/failed)
    |
    +--> My appointments
              |
              +--> Upcoming
              +--> History
              |
              +--> Cancel if at least 6 hours remain
```

### Patient registration

- Only patients can self-register.
- Email must be unique.
- Password is hashed with bcrypt.
- A JWT is issued immediately.
- The patient is redirected to their dashboard.

### Patient booking

- The patient must be authenticated.
- The patient selects a doctor, date and slot.
- The server is the source of truth for availability and conflicts.
- The frontend cannot force an invalid booking.

### Patient cancellation

- Only the patient's own appointment can be cancelled.
- Status must be `booked` or `confirmed`.
- At least 6 hours must remain.
- The slot becomes available again because cancelled appointments are not active conflicts.
- A cancellation log is written.

## 8.3 Doctor Workflow

```text
Log in
  |
  v
Doctor dashboard
  |
  +--> Today's appointments
  +--> Upcoming appointments
  |
  +--> Appointments page
  |       |
  |       +--> Filter by date/status
  |       +--> View details
  |       +--> Confirm / Complete / Cancel
  |
  +--> Availability
  |       |
  |       +--> Enable/disable days
  |       +--> Add/remove time ranges
  |       +--> Set duration
  |       +--> Save
  |
  +--> My Patients
  |       |
  |       +--> View patient appointment history
  |
  +--> Calendar
  |       |
  |       +--> Own appointments + free slots
  |
  +--> Cancellations
  |       |
  |       +--> Own cancellation audit
  |
  +--> Profile
          |
          +--> Update professional details
          +--> Change password
```

Important doctor restrictions:

- A doctor can only see appointments assigned to their own `doctor_id`.
- A doctor can only view patients who have an appointment with them.
- A doctor can only manage their own availability and profile.
- A doctor cannot book appointments.

## 8.4 Admin Workflow

```text
Log in
  |
  v
Admin dashboard
  |
  +--> 3 summary cards + status chart + upcoming appointments
  |
  +--> Manage Doctors
  |       |
  |       +--> Add doctor
  |       +--> Edit doctor
  |       +--> Reset password
  |       +--> Activate/deactivate
  |
  +--> Manage Patients
  |       |
  |       +--> Search
  |       +--> Activate/deactivate
  |
  +--> Manage Appointments
  |       |
  |       +--> Filter by doctor/date/status
  |       +--> Confirm
  |       +--> Complete
  |       +--> Cancel, bypassing 6-hour rule
  |
  +--> Calendar
  |       |
  |       +--> All doctors or one doctor
  |
  +--> Cancellation Logs
  |       |
  |       +--> Filter by doctor
  |
  +--> SMS Logs
  |       |
  |       +--> Mode banner
  |       +--> Status/type filters
  |
  +--> Profile
          |
          +--> Read-only admin details
          +--> Change password
```

## 8.5 Appointment Status Lifecycle

```text
                 +-----------+
                 |  booked   |
                 +-----+-----+
                       |
          +------------+------------+
          |                         |
          v                         v
   +-----------+              +-----------+
   | confirmed |              | cancelled |
   +-----+-----+              +-----------+
         |
         +------------+
         |            |
         v            v
  +-----------+  +-----------+
  | completed |  | cancelled |
  +-----------+  +-----------+
```

Rules in `appointmentService.changeAppointmentStatus`:

| Current status | Allowed next statuses |
|---|---|
| `booked` | `confirmed`, `cancelled` |
| `confirmed` | `completed`, `cancelled` |
| `completed` | None |
| `cancelled` | None |

`completed` and `cancelled` are terminal states.

When status changes to `cancelled` through the service, a cancellation log row is also written.

## 8.6 Account Deactivation

- Admin can deactivate a doctor or patient.
- Deactivation sets `users.is_active = 0`.
- Login is rejected for inactive accounts.
- Existing JWTs are also rejected because `authenticate` reloads the user and checks `is_active`.
- Existing appointments are preserved.
- The user cannot use protected endpoints while inactive.

---

# 9. Appointment Booking Logic

## 9.1 Overview

Booking is the most important part of the project. It is implemented in `services/appointmentService.js` with supporting logic in `utils/slots.js` and `models/appointmentModel.js`.

The server enforces all critical rules. The frontend only presents choices.

## 9.2 Input

The booking endpoint accepts:

```json
{
  "doctor_id": 1,
  "appointment_datetime": "2026-11-16T10:00",
  "reason": "Routine checkup"
}
```

`appointment_datetime` may be:

- A plain wall-clock string such as `2026-11-16T10:00` or `2026-11-16 10:00:00`.
- A string with an explicit timezone such as `2026-11-16T10:00:00+05:30` or a `Z` suffix. Such values are converted to IST wall time.

## 9.3 Booking Validation Steps

`bookAppointment()` performs these steps:

### Step 1: Basic time validation

- The parsed date must exist.
- Seconds must be zero. Times must be on a whole minute.

### Step 2: Future validation

- The start must be strictly later than the current IST time.
- Past or equal times are rejected.

### Step 3: Transaction starts

A database transaction begins before the remaining steps.

### Step 4: Lock the doctor row

```sql
SELECT d.*, u.name AS doctor_name, u.is_active
  FROM doctors d
  JOIN users u ON u.id = d.user_id
 WHERE d.id = ?
   FOR UPDATE
```

The `FOR UPDATE` row lock serializes bookings for the same doctor. Two concurrent requests for the same doctor cannot both pass the conflict checks at the same time.

### Step 5: Doctor existence and active-state check

- The doctor must exist.
- The linked user must be active.
- Otherwise a 404-style “Doctor not found or is currently unavailable” error is returned.

### Step 6: Compute end time

```text
end = start + doctor.appointment_duration
```

The duration defaults to 30 minutes if missing or zero.

### Step 7: Validate availability

`slots.fitsAvailability()` checks:

1. The start is inside one of the doctor's available ranges for that weekday.
2. The entire appointment ends before or at the range end.
3. The start is aligned to the duration grid from the start of the range.
4. Seconds are zero.

Example:

- Range: 09:00-13:00.
- Duration: 30 minutes.
- Valid starts: 09:00, 09:30, 10:00, ..., 12:30.
- Invalid start: 10:15.

### Step 8: Overlap check

```sql
SELECT id, appointment_datetime, appointment_end_datetime, status
  FROM appointments
 WHERE doctor_id = ?
   AND status IN ('booked', 'confirmed', 'completed')
   AND appointment_datetime < requested_end
   AND appointment_end_datetime > requested_start
 LIMIT 1
```

This interval-overlap formula catches:

- Exact duplicate times.
- Partial overlaps.
- A requested appointment inside an existing appointment.
- An existing appointment inside the requested interval.
- Different start times that still overlap.

### Step 9: Weekly limit check

The service calculates the Monday-Sunday week containing the requested start.

```text
weekStart = Monday 00:00 of the appointment week
weekEnd   = next Monday 00:00
```

It counts appointments for the same patient and same doctor with status:

- `booked`
- `confirmed`
- `completed`

If the count is already 2, booking is rejected.

Important nuances:

- The limit is per patient per doctor per week.
- It is not a global patient limit across all doctors.
- `cancelled` appointments do not count.
- Completed appointments count for the week in which they occurred.
- The limit is checked at booking time.

### Step 10: Insert appointment

The appointment is inserted with:

- `status = 'booked'`.
- Start and end timestamps.
- Optional reason, limited to 500 characters.

### Step 11: Commit

If every step succeeds, the transaction commits.

### Step 12: Send confirmation SMS

After the transaction, the service reloads the appointment with joined patient and doctor details and attempts to send a confirmation SMS.

SMS failure does not roll back the appointment. The response still indicates that the appointment was booked.

## 9.4 Final Database Safety Net

Even with the row lock and overlap check, the database has:

```sql
UNIQUE KEY unique_doctor_datetime (doctor_id, appointment_datetime)
```

If a duplicate exact start-time insert somehow occurs, MySQL raises `ER_DUP_ENTRY`. The error handler converts this to a 409 response:

> This slot was just booked by another patient. Please choose a different time.

Note: The unique key protects exact duplicate start times, not every possible partial overlap. Partial overlap protection is handled by the application-level interval query and doctor row lock.

## 9.5 Slot Generation

`utils/slots.js` generates the bookable grid for one doctor and one date.

### Algorithm

1. Read the doctor's duration. Default to 30 minutes.
2. Load all availability rows for the doctor.
3. Parse the requested date.
4. Load all appointments for that doctor in the date range.
5. Determine the weekday number (0 = Sunday).
6. Filter availability rows for that weekday where `is_available = 1`.
7. For each range:
   - Parse range start and end on the requested date.
   - Start at the range start.
   - Add the duration repeatedly.
   - Generate a slot only if the slot end is still within the range end.
8. Deduplicate slots by start time.
9. Exclude slots before the current IST minute.
10. Mark a slot as booked if it overlaps an active appointment.
11. Sort by start time.

### Example

Doctor duration: 30 minutes.  
Monday availability: 09:00-13:00 and 14:00-17:00.

Generated slots:

```text
09:00-09:30
09:30-10:00
10:00-10:30
...
12:30-13:00
14:00-14:30
...
16:30-17:00
```

### Active statuses for slot conflicts

```js
['booked', 'confirmed', 'completed']
```

Cancelled appointments are excluded, so a cancelled slot becomes available again.

### Public vs doctor slot views

- Public/patient slot endpoint returns only available slots.
- Doctor slot view marks occupied slots as `booked` and includes the appointment ID.
- Doctor calendar can include free-slot events.
- Patient calendar only receives available-slot events.

## 9.6 Cancellation Logic

`cancelAppointment()`:

1. Starts a transaction.
2. Locks the appointment row with `SELECT ... FOR UPDATE`.
3. Loads the full appointment details.
4. Checks ownership:
   - Admin can act on any appointment.
   - Patient can cancel only their own.
   - Doctor can cancel only appointments assigned to them.
5. Checks current status:
   - Only `booked` or `confirmed` can be cancelled.
   - Already completed/cancelled appointments are rejected.
6. Applies the 6-hour rule when requested:
   - `hoursLeft = appointmentStart - nowIST`.
   - If less than 6 hours, reject.
7. Updates status to `cancelled`.
8. Inserts a cancellation log with:
   - Appointment ID.
   - Cancelling user ID.
   - Reason.
   - Previous status.
   - New status.
9. Returns the updated appointment.

The 6-hour rule is enforced only when `enforceSixHourRule = true`:

- Patient cancellation endpoint: true.
- Admin cancellation endpoint: false.
- Doctor/admin status-change endpoint: false when setting status to `cancelled`.

## 9.7 Status Change Logic

`changeAppointmentStatus()`:

1. Accepts only `confirmed`, `completed` or `cancelled`.
2. Locks the appointment row.
3. Loads the appointment.
4. Enforces ownership.
5. Checks the transition table.
6. If the new status is `cancelled`, updates the appointment and writes a cancellation log.
7. If the new status is `confirmed` or `completed`, updates the status without a cancellation log.
8. Returns the updated appointment.

## 9.8 Why Booking Is Safe Under Concurrency

Two layers protect against double booking:

1. The doctor row lock serializes bookings for the same doctor inside a transaction.
2. The unique `(doctor_id, appointment_datetime)` constraint catches exact duplicates even if the application check is bypassed.

The overlap query catches partial overlaps. Because the doctor row is locked during the check-and-insert sequence, a competing transaction cannot change the appointment set for the same doctor between the check and the insert.

## 9.9 Booking Error Cases

| Case | HTTP status | Meaning |
|---|---:|---|
| Missing or invalid date | 400 | Invalid input |
| Seconds not zero | 400 | Time not on a whole minute |
| Past time | 400 | Must be future |
| Doctor missing/inactive | 404 | Doctor unavailable |
| Time not in availability grid | 400 | Invalid slot |
| Overlap or exact duplicate | 409 | Slot already booked |
| Weekly limit reached | 409 | Third active booking in same week |
| Not authenticated | 401 | Missing/invalid token |
| Wrong role | 403 | Patient-only booking endpoint |
| Validation failure | 422 | express-validator error |

---

# 10. Security

## 10.1 Password Security

- Passwords are hashed using bcrypt with 10 salt rounds.
- Plain-text passwords are never stored.
- Login uses `bcrypt.compare`.
- Password change verifies the current password.
- New password must be 8-72 characters and contain at least one letter and one number.
- New password must differ from the current password.

## 10.2 Authentication

- JWT is signed with `{ id, role }`.
- Secret comes from `JWT_SECRET`.
- Expiry comes from `JWT_EXPIRES_IN`, default `8h`.
- The token is sent as `Authorization: Bearer <token>`.
- `authenticate` reloads the user from the database on every protected request.
- This ensures role changes and deactivation take effect without waiting for token expiry.

## 10.3 Authorization

- Role guards restrict routes:
  - `/api/patient/*` -> patient only.
  - `/api/doctor/*` -> doctor only.
  - `/api/admin/*` -> admin only.
- Ownership checks add a second layer:
  - Patients can only view/cancel their own appointments.
  - Doctors can only view/manage their own appointments and patients.
- Admin actions bypass ownership restrictions by design.

## 10.4 SQL Injection Prevention

- All user input is passed through parameter placeholders (`?`).
- No string concatenation of user values into SQL.
- `multipleStatements` is disabled in the pool.
- Dynamic `WHERE` clauses only append fixed SQL fragments and parameter placeholders.

## 10.5 Input Validation

Server-side validation exists for:

- Registration name, email, phone and password.
- Login email and password.
- Password change.
- Patient profile updates.
- Doctor profile fields.
- Doctor availability day/time ranges and duration.
- Appointment doctor ID, datetime and reason length.
- Appointment status values.
- Cancellation reason length.

Frontend validation also exists but is not trusted as the only defense.

## 10.6 Rate Limiting

- Login: 30 attempts per 15 minutes per IP.
- Registration: 20 attempts per hour per IP.
- Limits use standard draft-7 headers and disable legacy headers.

Limitations:

- No rate limit on booking, cancellation or general API traffic.
- In-memory store by default; not shared across multiple server instances.

## 10.7 HTTP Security Headers

Helmet is enabled, but:

- Content Security Policy is disabled.
- Cross-origin embedder policy is disabled.
- Cross-origin resource policy is `cross-origin`.

This is practical for the CDN-based frontend but weaker than a strict production CSP.

CORS is enabled for all origins. This is acceptable for a local academic project but should be restricted in production.

## 10.8 XSS Protection

- The frontend uses `API.escapeHtml()` for most dynamic text inserted into HTML.
- Dynamic names, emails, reasons and messages are escaped in tables, cards and modals.
- The app does not use `innerHTML` with raw server data without escape in most user-content paths.

Remaining risk:

- The frontend has a large amount of HTML template construction; any future unescaped interpolation could introduce XSS.
- A strict CSP is not enabled.
- JWT is stored in `localStorage`, so an XSS flaw could expose the token.

## 10.9 Transaction and Integrity Protection

- Booking uses a transaction.
- Appointment row cancellation uses a row lock.
- Doctor row booking uses a row lock.
- Unique constraints prevent duplicate confirmation/reminder logs.
- Foreign keys preserve relational integrity.
- Inactive accounts are rejected at authentication time.

## 10.10 Sensitive Data Handling

- Passwords are never returned in API responses.
- Public doctor responses include professional and contact information but not password.
- API errors do not expose SQL or stack traces to clients.
- Twilio credentials are read from environment variables.
- SMS content is stored in logs, so production deployments should consider privacy requirements.

## 10.11 Security Limitations

- JWT is stored in `localStorage`, which is vulnerable to XSS.
- No refresh token or token revocation list.
- No CSRF token; Bearer auth reduces classic CSRF risk but does not eliminate all browser-based risks.
- CORS allows all origins.
- CSP is disabled.
- Default JWT secret fallback (`dev_insecure_secret`) must not be used in production.
- No HTTPS configuration in the application itself.
- No email verification.
- No password-reset workflow.
- No account lockout beyond rate limiting.
- No audit log for profile or password changes.
- No rate limiting on appointment booking.
- Twilio `sent` means Twilio accepted the message, not that the handset received it.
- Server logs may contain appointment details and phone numbers.

---

# 11. SMS and Reminder System

## 11.1 Purpose

The system attempts to send:

1. A booking confirmation when an appointment is created.
2. A reminder when the appointment enters the next 24-hour window.

## 11.2 Modes

`isConfigured()` returns true only when:

- `TWILIO_ACCOUNT_SID` is non-empty.
- It starts with `AC`.
- `TWILIO_AUTH_TOKEN` is non-empty.
- `TWILIO_PHONE_NUMBER` is non-empty.

If not configured, the app runs in simulated demo mode.

## 11.3 Simulated Mode

In simulated mode:

- The message is written to `sms_logs` with status `simulated`.
- The server console prints `[SMS SIMULATED] (demo mode, not delivered)`.
- No external request is made.
- The API message explicitly says the SMS was simulated and not delivered.
- The admin SMS page shows a warning banner.

Simulated messages are never reported as delivered.

## 11.4 Twilio Mode

When configured:

- Twilio is lazily required to avoid startup failure if the package is not installed.
- The client is created with the configured SID and token.
- `messages.create()` sends the SMS.
- On success, an `sms_logs` row is written with status `sent` and the Twilio message SID.
- On failure, a row is written with status `failed` and an error message.

Important nuance: Twilio returning a message SID means the message was accepted by Twilio. It does not prove handset delivery.

## 11.5 Phone Normalization

`normalizePhone()`:

- Removes non-digit characters except `+`.
- If the number starts with `+`, keep it.
- 10 digits -> prepend `+91`.
- 12 digits starting with `91` -> prepend `+`.
- 11 digits starting with `0` -> replace leading `0` with `+91`.
- Otherwise prepend `+` to the digits.

Examples:

| Input | Output |
|---|---|
| `9876500001` | `+919876500001` |
| `09876500001` | `+919876500001` |
| `919876500001` | `+919876500001` |
| `+919876500001` | `+919876500001` |

## 11.6 Confirmation Message

```text
Hello <patient name>, your appointment with <doctor name> is booked for
<date> at <time>. Thank you!
```

## 11.7 Reminder Message

```text
Reminder: Your appointment with <doctor name> is scheduled for tomorrow at
<time>. Please arrive on time.
```

The reminder text says “tomorrow” even though the technical window is a rolling 24 hours plus 15 minutes. This is a minor wording simplification.

## 11.8 SMS Logging

Every send attempt tries to write a row.

Fields:

- Appointment ID.
- Normalized phone.
- Message.
- Message type: confirmation, reminder, cancellation or other.
- Status: sent, simulated or failed.
- Provider SID when available.
- Error message when failed.
- Timestamp.

The booking flow does not fail if SMS logging or sending fails.

## 11.9 Duplicate Prevention

Three layers prevent duplicate confirmation or reminder messages:

1. `smsService.sendBookingConfirmation()` checks `smsLogModel.hasType(appointment.id, 'confirmation')`.
2. `smsService.sendReminder()` checks for an existing reminder.
3. The database has `UNIQUE (appointment_id, message_type)`.

If a duplicate insert occurs, the service treats `ER_DUP_ENTRY` as skipped.

## 11.10 Reminder Cron

Default cron expression:

```text
*/15 * * * *
```

This runs every 15 minutes.

`REMINDER_CRON` can override it.

Reminder window:

```text
windowStart = nowIST
windowEnd   = nowIST + 24 hours + 15 minutes
```

`appointmentModel.listForReminders()` selects appointments with:

- Status `booked` or `confirmed`.
- Start between window start and window end.
- No existing reminder log.

The reminder service also runs once about 3 seconds after startup.

Manual trigger:

```bash
npm run reminders
```

## 11.11 Seeded SMS Data

`database/seed.js` creates simulated confirmation logs for seeded upcoming appointments. The phone number for those seed logs is `demo-seed`, which is not a real deliverable phone number. This is intentionally demo data.

## 11.12 Reminder Statistics

`runReminderCheck()` returns:

```json
{
  "checked": 0,
  "sent": 0,
  "simulated": 0,
  "failed": 0,
  "skipped": 0,
  "mode": "simulated"
}
```

## 11.13 SMS Limitations

- No delivery webhook handling.
- No retry queue.
- No opt-out management.
- No templating system.
- No per-user SMS preference.
- No cancellation SMS is sent by the current cancellation flows, even though the schema supports the `cancellation` message type.
- Reminder wording says “tomorrow” for a rolling 24-hour window.
- Cron runs inside the Node process; multiple instances could duplicate work, though the database unique key prevents duplicate rows.

---

# 12. API Documentation

## 12.1 Conventions

Base URL:

```text
http://localhost:3000/api
```

Authentication:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

Success response:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Description"
}
```

## 12.2 HTTP Status Codes Used

| Status | Meaning |
|---:|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / invalid business operation |
| 401 | Missing, invalid or expired authentication |
| 403 | Authenticated but wrong role / inactive account / forbidden resource |
| 404 | Resource or route not found |
| 409 | Conflict: duplicate, overlap, weekly limit, related-record conflict |
| 422 | Validation failure |
| 500 | Unexpected server error |

## 12.3 Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Returns status, timezone, SMS mode and timestamp |

Response data includes:

```json
{
  "status": "ok",
  "timezone": "Asia/Kolkata",
  "sms_mode": "simulated",
  "timestamp": "2026-11-12T..."
}
```

## 12.4 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a patient |
| POST | `/api/auth/login` | No | Log in and receive JWT |
| GET | `/api/auth/me` | Yes | Current user and doctor profile if applicable |
| PUT | `/api/auth/password` | Yes | Change password |

### Register body

```json
{
  "name": "New Patient",
  "email": "new.patient@example.com",
  "phone": "9876512345",
  "password": "Patient@123"
}
```

### Login body

```json
{
  "email": "ravi.patient@smarthealth.com",
  "password": "Patient@123"
}
```

### Password change body

```json
{
  "current_password": "Patient@123",
  "new_password": "NewPatient@456"
}
```

## 12.5 Public Doctors

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/doctors` | No | List active doctors; optional `q`, `specialization` |
| GET | `/api/doctors/specializations` | No | List distinct active specializations |
| GET | `/api/doctors/:id` | No | Get one active doctor |
| GET | `/api/doctors/:id/slots?date=YYYY-MM-DD` | Yes | Available slots for a date |
| GET | `/api/doctors/:id/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` | Yes | Available-slot events for FullCalendar |

Example:

```http
GET /api/doctors?specialization=Cardiologist&q=Ananya
```

## 12.6 Patient

All patient routes require a patient token.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patient/profile` | Get own profile |
| PUT | `/api/patient/profile` | Update name, phone and/or email |
| GET | `/api/patient/appointments?scope=upcoming\|history\|all` | List own appointments |
| GET | `/api/patient/stats` | Dashboard statistics, next appointment and recent history |
| GET | `/api/patient/doctors/:id/history` | Own appointment history with one doctor |

### Patient profile update body

```json
{
  "name": "Ravi Verma",
  "phone": "9876510001",
  "email": "ravi.patient@smarthealth.com"
}
```

### Appointment scopes

- `upcoming`: status booked/confirmed and start >= now.
- `history`: completed/cancelled OR start < now.
- `all`: all appointments for the patient.

## 12.7 Appointments

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/appointments` | Patient | Book an appointment |
| POST | `/api/appointments/:id/cancel` | Patient | Cancel own appointment with 6-hour rule |
| GET | `/api/appointments/:id` | Any authenticated | View appointment with ownership check |

### Booking body

```json
{
  "doctor_id": 1,
  "appointment_datetime": "2026-11-16T10:00",
  "reason": "Routine checkup"
}
```

### Cancellation body

```json
{
  "reason": "Schedule conflict"
}
```

## 12.8 Doctor

All doctor routes require a doctor token.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/doctor/dashboard` | Doctor statistics, today's appointments and upcoming list |
| GET | `/api/doctor/profile` | Doctor profile and availability |
| PUT | `/api/doctor/profile` | Update doctor professional details |
| GET | `/api/doctor/availability` | Get availability |
| PUT | `/api/doctor/availability` | Replace availability and optionally duration |
| GET | `/api/doctor/appointments?from=&to=&status=` | List own appointments |
| GET | `/api/doctor/appointments/:id` | Get one own appointment |
| PATCH | `/api/doctor/appointments/:id/status` | Change own appointment status |
| GET | `/api/doctor/slots?date=YYYY-MM-DD` | Own slot grid including booked states |
| GET | `/api/doctor/calendar?start=&end=&include_slots=1` | Own calendar events |
| GET | `/api/doctor/patients` | Patients who have appointments with the doctor |
| GET | `/api/doctor/patients/:patientId` | Patient details and own history with the doctor |
| GET | `/api/doctor/cancellations` | Own cancellation logs |

### Availability update body

```json
{
  "appointment_duration": 30,
  "ranges": [
    { "day_of_week": 1, "start_time": "09:00:00", "end_time": "13:00:00" },
    { "day_of_week": 1, "start_time": "14:00:00", "end_time": "17:00:00" },
    { "day_of_week": 2, "start_time": "09:00:00", "end_time": "17:00:00" }
  ]
}
```

Valid duration values: 10, 15, 20, 30, 45, 60, 90, 120.

### Status update body

```json
{
  "status": "confirmed",
  "reason": "Optional reason used when cancelling"
}
```

Allowed values: `confirmed`, `completed`, `cancelled`.

## 12.9 Admin

All admin routes require an admin token.

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Full admin statistics, status breakdown, per-doctor data, 7-day counts, SMS stats and upcoming appointments |

### Doctor management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/doctors` | List all doctors, including inactive |
| POST | `/api/admin/doctors` | Create doctor account and default availability |
| PUT | `/api/admin/doctors/:id` | Update doctor details and optionally password |
| PUT | `/api/admin/doctors/:id/status` | Activate/deactivate doctor |
| DELETE | `/api/admin/doctors/:id` | Soft-deactivate doctor |

### Patient management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/patients?q=` | List patients with appointment counts |
| PUT | `/api/admin/patients/:id/status` | Activate/deactivate patient |

### Appointment management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/appointments?doctor_id=&patient_id=&date=&status=&from=&to=` | List all appointments with filters |
| POST | `/api/admin/appointments/:id/cancel` | Cancel without 6-hour rule; writes audit log |
| PATCH | `/api/admin/appointments/:id/status` | Change status with transition rules |

### Audit and calendar

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/cancellations?doctor_id=` | Full cancellation audit |
| GET | `/api/admin/calendar?start=&end=&doctor_id=` | All or doctor-specific calendar events |
| GET | `/api/admin/sms-logs?status=&message_type=` | SMS logs and statistics |

### Admin doctor create body

```json
{
  "name": "Dr. New Doctor",
  "email": "new.doctor@example.com",
  "phone": "9876509999",
  "password": "Doctor@123",
  "specialization": "General Physician",
  "qualification": "MBBS",
  "experience": 5,
  "consultation_fee": 500,
  "appointment_duration": 30,
  "bio": "General physician"
}
```

### Admin doctor status body

```json
{
  "is_active": false
}
```

## 12.10 API Behaviour Notes

- Public doctor routes return only active doctors.
- Doctor slot and calendar routes require authentication even though the doctor directory is public.
- Patient calendar returns only available slots, never occupied slots.
- Doctor calendar can return both appointments and free slots.
- Admin calendar returns appointment events only.
- Calendar date ranges are limited to 62 days.
- Doctor public calendar does not enforce the 62-day limit in the controller, but `availableSlotEvents` has an internal `maxDays = 62` guard.
- Most list endpoints apply fixed limits (for example 200-1000 rows), but most do not expose pagination to the frontend.

---

# 13. Testing

## 13.1 Test Framework

The project uses:

- `node:test` for test structure.
- `node:assert/strict` for assertions.
- `supertest` for HTTP requests against the Express app.
- The real MySQL database, not a mock.

Test file:

```text
tests/api.test.js
```

## 13.2 Important Destructive Behaviour

Before tests run:

```js
execFileSync(process.execPath, ['database/seed.js'], ...)
```

This recreates the schema and reseeds data. Therefore:

**`npm test` is destructive and must not be run against a database containing important data.**

After tests:

```js
await pool.end();
```

## 13.3 Test Command

```bash
npm test
```

The package script uses:

```bash
node --test --test-concurrency=1 tests/api.test.js
```

Serial execution avoids conflicting bookings and data changes across tests.

## 13.4 Test Result

The current suite contains 26 tests. The verified run reported:

```text
26 tests passed
0 failed
```

## 13.5 Test Coverage

The suite covers:

1. Health endpoint reports simulated SMS mode and timezone.
2. Public doctor directory works without credentials.
3. Weak registration password is rejected with 422.
4. Registration creates a patient and token.
5. Invalid password login is rejected with 401.
6. Seeded accounts can log in and receive a token.
7. Protected routes require authentication and correct role.
8. Available slots are aligned, unbooked and future.
9. Booking succeeds and writes a simulated SMS confirmation.
10. Duplicate exact booking returns 409.
11. A second booking with the same doctor in one week is allowed.
12. A third active booking in the same Monday-Sunday week is rejected.
13. A different start time inside an existing appointment is rejected as an overlap.
14. Patient can cancel a future appointment once but not twice.
15. Patient cancellation enforces the 6-hour boundary.
16. Doctor can confirm an appointment; patients cannot use doctor status routes.
17. Invalid status transitions are rejected.
18. Admin cancellation bypasses the 6-hour rule and writes an audit log.
19. Admin dashboard statistics and chart data are returned.
20. Admin SMS logs show simulated status and never claim delivery.
21. Admin can create a doctor with default Mon-Fri availability.
22. Admin can reset a doctor password.
23. Doctor can replace weekly availability and duration.
24. Invalid availability ranges are rejected.
25. Deactivated doctor cannot log in or use an existing token.
26. Patient can update their own profile.
27. Doctor patient directory and cancellation history include test activity.
28. MySQL enforces the unique doctor/date-time constraint.
29. Admin and doctor calendar endpoints return events.

The exact count of individual `test()` blocks is 26. The list above groups some assertions that are part of the same test or closely related checks.

## 13.6 Why Integration Testing Is Valuable Here

The critical rules involve the database and multiple layers:

- JWT authentication.
- Role permissions.
- Slot generation from availability.
- Transaction locks.
- SQL overlap queries.
- Unique constraints.
- SMS log writes.
- Audit logs.

Unit tests alone would not prove that these pieces work together. Integration tests exercise the actual routes, middleware, services, models and MySQL schema.

## 13.7 Manual Verification Previously Performed

The project was also manually checked for:

- Frontend JavaScript syntax with `node --check`.
- Static page and asset availability over HTTP.
- Admin, doctor and patient login.
- Role-specific dashboard API responses.
- Redesigned admin dashboard: 3 statistic cards and 1 chart.
- Redesigned patient and doctor dashboards: 0 statistic cards.
- Landing page and patient dashboard no longer promoting SMS.
- Verification server stopped after checks.

These manual checks are separate from the automated `npm test` suite.

---

# 14. How to Run the Project

## 14.1 Prerequisites

- Node.js and npm installed.
- MySQL server running.
- A MySQL user with permission to create/use the database.
- A terminal in the project root.

## 14.2 Install Dependencies

```bash
npm install
```

## 14.3 Create Environment File

Copy `.env.example` to `.env` and set the values.

Example:

```env
PORT=3000
NODE_ENV=development
APP_TIMEZONE=Asia/Kolkata

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_health_appointment

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

REMINDER_CRON=*/15 * * * *
```

If Twilio values are blank, SMS runs in simulated mode.

## 14.4 Seed the Database

```bash
npm run seed
```

This:

- Runs `database/schema.sql`.
- Creates the database if needed.
- Drops and recreates the six tables.
- Inserts demo users, doctors, patients, availability, appointments, a cancellation and SMS logs.

## 14.5 Start the Server

```bash
npm start
```

or during development:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 14.6 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@smarthealth.com` | `Admin@123` |
| Doctor | `ananya.doctor@smarthealth.com` | `Doctor@123` |
| Doctor | `rajesh.doctor@smarthealth.com` | `Doctor@123` |
| Doctor | `priya.doctor@smarthealth.com` | `Doctor@123` |
| Doctor | `arjun.doctor@smarthealth.com` | `Doctor@123` |
| Patient | `ravi.patient@smarthealth.com` | `Patient@123` |
| Patient | `sneha.patient@smarthealth.com` | `Patient@123` |
| Patient | `mohammed.patient@smarthealth.com` | `Patient@123` |
| Patient | `kavya.patient@smarthealth.com` | `Patient@123` |

## 14.7 Run Tests

```bash
npm test
```

Warning: this reseeds and overwrites the configured database.

## 14.8 Manually Run Reminders

```bash
npm run reminders
```

## 14.9 Enable Real SMS

Set:

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+...
```

The SID must start with `AC`. Restart the server after changing `.env`.

## 14.10 Common Problems

| Problem | Likely cause | Fix |
|---|---|---|
| Server exits at startup with DB error | MySQL not running or wrong credentials | Start MySQL and check `.env` |
| `ER_BAD_DB_ERROR` | Database missing | Run `npm run seed` |
| Login fails for demo account | Database not seeded or password changed | Run `npm run seed` |
| SMS says simulated | Twilio not configured | Expected demo behaviour; configure Twilio if needed |
| Slots do not appear | Doctor has no availability, day is off, all slots booked, or date is in the past | Check availability and date |
| Third booking rejected | Weekly limit | Choose another doctor or week |
| Cancel button disabled | Less than 6 hours remain or status is terminal | Contact clinic/admin |
| Calendar empty | No appointments or no availability in the viewed range | Check doctor and date range |
| Test data disappeared | `npm test` reseeded the database | Expected; use a separate test database in the future |

## 14.11 Production Notes

Before real deployment:

- Use a strong `JWT_SECRET`.
- Use a dedicated database user with least privilege.
- Use HTTPS.
- Restrict CORS.
- Enable a suitable CSP.
- Move JWT storage to secure HttpOnly cookies or add strong XSS protections.
- Use a persistent rate-limit store.
- Use a separate test database.
- Add database backups.
- Add monitoring and centralized logs.
- Protect SMS logs and personal data.
- Consider a queue for SMS sending.
- Add delivery-status webhooks if delivery confirmation is required.

---

# 15. Advantages and Limitations

## 15.1 Advantages

### Strong booking integrity

- Server-side availability validation.
- Interval overlap detection.
- Doctor row lock.
- Unique database constraint.
- Transaction rollback on failure.

### Clear role separation

- Patients, doctors and administrators have distinct routes and dashboards.
- Ownership checks prevent cross-user data access.
- Admin-only management for accounts.

### Practical slot generation

- Slots are generated from real availability.
- Multiple ranges per day are supported.
- Duration is configurable.
- Cancelled appointments free slots again.
- Past slots are excluded.

### Auditability

- Cancellations are recorded with user, role, status and reason.
- SMS attempts are logged.
- Appointment timestamps are stored.

### Demo-safe SMS

- The app works without Twilio.
- Simulated mode never falsely claims delivery.
- Admin UI clearly communicates the mode.
- Twilio failures do not break bookings.

### Good academic scope

- Demonstrates authentication, authorization, REST APIs, relational design, transactions, validation, testing and responsive UI.
- Runs locally with a straightforward setup.

### Responsive frontend

- Bootstrap layout.
- Mobile sidebar.
- Cards, tables, modals and toasts.
- FullCalendar views.
- Chart.js visualization.

## 15.2 Limitations

### Feature limitations

- No payments.
- No video consultation.
- No prescriptions or medical records.
- No email notifications.
- No SMS cancellation messages in current flows.
- No patient rescheduling workflow.
- No doctor self-registration.
- No multi-clinic support.
- No reviews/ratings.
- No waitlist.
- No recurring appointments.
- No export to PDF/Excel.
- No pagination UI for large datasets.

### Technical limitations

- Static multi-page frontend rather than a component-based SPA.
- Some duplicated page markup and JavaScript patterns.
- JWT in `localStorage`.
- No refresh token.
- No token revocation list.
- CORS is open.
- CSP is disabled.
- Default JWT secret fallback exists for development.
- No HTTPS setup in the application.
- No CSRF protection beyond Bearer-token usage.
- Rate limiting is not global.
- No rate limit on booking.
- SMS logs store message content and phone numbers.
- Reminder cron runs inside the web process.
- Twilio mode has no delivery receipt handling.
- The reminder message says “tomorrow” for a rolling 24-hour window.
- Some API responses return more data than the redesigned UI displays.
- Admin appointment UI offers “Complete” for booked appointments even though the backend only allows confirmed -> completed.
- The patient and doctor calendar pages and doctor cancellation page are accessible but not in the main sidebar.
- Availability ranges can overlap; slot generation deduplicates by start time, but the data model does not prevent overlapping ranges.
- The database schema uses cascading deletes even though the application prefers soft deactivation; direct deletion could remove history.
- No database migration system; `seed.js` recreates the schema.

### Test limitations

- Tests use the real configured database and are destructive.
- No unit-test separation.
- No browser/end-to-end UI automation in the current test suite.
- No load or concurrency stress tests, although the booking logic is designed for concurrency.
- No coverage report.

## 15.3 Future Improvements

1. Add a rescheduling workflow.
2. Add cancellation SMS.
3. Add a background job queue for SMS and reminders.
4. Add Twilio delivery-status webhooks.
5. Add email notifications.
6. Add pagination and server-side search.
7. Add doctor leave management and one-off availability exceptions.
8. Add clinic holidays.
9. Add multi-clinic support.
10. Add secure refresh tokens or cookie-based sessions.
11. Add strict CSP and restricted CORS.
12. Add global and booking-specific rate limits.
13. Add audit logs for profile and password changes.
14. Add database migrations.
15. Add a separate test database.
16. Add browser end-to-end tests.
17. Add payment integration if required.
18. Add prescription and medical-record modules.
19. Add patient reviews.
20. Add accessibility review and automated UI checks.
21. Add export/reporting.
22. Add observability: structured logs, metrics and alerts.

---

# 16. Complete Booking Example

This example uses IST wall-clock time.

## 16.1 Scenario

- Patient: Ravi Verma (`ravi.patient@smarthealth.com`).
- Doctor: Dr. Ananya Sharma, Cardiologist, doctor ID 1.
- Consultation duration: 30 minutes.
- Doctor availability on Monday: 09:00-13:00 and 14:00-17:00.
- Requested date: Monday, 16 November 2026.
- Requested time: 10:00 IST.
- Reason: “Chest discomfort follow-up”.

## 16.2 Step 1: Patient Logs In

Request:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ravi.patient@smarthealth.com",
  "password": "Patient@123"
}
```

Server:

1. Finds the user by email.
2. Compares the password with bcrypt.
3. Checks `is_active`.
4. Finds the doctor profile if the user is a doctor (not applicable here).
5. Signs a JWT containing `{ id, role }`.
6. Returns token and public user.

Browser:

- Stores `sha_token` and `sha_user` in `localStorage`.
- Redirects to `/patient/dashboard.html`.

## 16.3 Step 2: Patient Opens Doctor Detail

Browser requests:

```http
GET /api/doctors/1
```

Response includes:

```json
{
  "success": true,
  "data": {
    "doctor": {
      "id": 1,
      "name": "Dr. Ananya Sharma",
      "specialization": "Cardiologist",
      "qualification": "MBBS, MD (Cardiology)",
      "experience": 12,
      "consultation_fee": 800,
      "appointment_duration": 30,
      "bio": "..."
    }
  }
}
```

## 16.4 Step 3: Patient Loads Slots

Browser requests:

```http
GET /api/doctors/1/slots?date=2026-11-16
Authorization: Bearer <patient-token>
```

Backend:

1. Confirms doctor exists and is active.
2. Loads availability rows for doctor 1.
3. Identifies Monday as `day_of_week = 1`.
4. Finds ranges 09:00-13:00 and 14:00-17:00.
5. Loads appointments for that day.
6. Generates 30-minute slots.
7. Excludes past slots.
8. Marks overlaps as booked.
9. Returns only available slots.

Example available slots:

```json
{
  "success": true,
  "data": {
    "date": "2026-11-16",
    "doctor": {
      "id": 1,
      "name": "Dr. Ananya Sharma",
      "specialization": "Cardiologist",
      "appointment_duration": 30,
      "consultation_fee": 800
    },
    "slots": [
      { "start": "09:00", "end": "09:30", "datetime": "2026-11-16 09:00:00", "status": "available", "appointment_id": null },
      { "start": "09:30", "end": "10:00", "datetime": "2026-11-16 09:30:00", "status": "available", "appointment_id": null },
      { "start": "10:00", "end": "10:30", "datetime": "2026-11-16 10:00:00", "status": "available", "appointment_id": null }
    ]
  }
}
```

## 16.5 Step 4: Patient Books 10:00

Request:

```http
POST /api/appointments
Authorization: Bearer <patient-token>
Content-Type: application/json

{
  "doctor_id": 1,
  "appointment_datetime": "2026-11-16T10:00",
  "reason": "Chest discomfort follow-up"
}
```

## 16.6 Step 5: Server Processes Booking

### 5.1 Parse input

`parseInputWall("2026-11-16T10:00")` produces a wall Date:

```text
2026-11-16 10:00:00 IST
```

### 5.2 Validate time

- Seconds = 0.
- Start is in the future relative to the current IST time.

### 5.3 Begin transaction

Connection obtained and transaction started.

### 5.4 Lock doctor row

```sql
SELECT d.*, u.name AS doctor_name, u.is_active
  FROM doctors d
  JOIN users u ON u.id = d.user_id
 WHERE d.id = 1
   FOR UPDATE
```

The row is locked until commit or rollback.

### 5.5 Check availability

Duration = 30. End = 10:30.

Range 09:00-13:00:

- Start 10:00 is inside the range.
- End 10:30 is inside the range.
- Offset from 09:00 is 60 minutes.
- 60 is divisible by 30.
- Valid.

### 5.6 Check overlap

```sql
SELECT id, appointment_datetime, appointment_end_datetime, status
  FROM appointments
 WHERE doctor_id = 1
   AND status IN ('booked', 'confirmed', 'completed')
   AND appointment_datetime < '2026-11-16 10:30:00'
   AND appointment_end_datetime > '2026-11-16 10:00:00'
 LIMIT 1
```

No row is returned, so the slot is free.

### 5.7 Check weekly limit

The week is:

```text
Monday 2026-11-16 00:00:00
to
Monday 2026-11-23 00:00:00
```

The query counts Ravi's active appointments with doctor 1 in that range. Suppose the count is 0. The limit is 2, so the booking is allowed.

### 5.8 Insert appointment

```sql
INSERT INTO appointments
  (patient_id, doctor_id, appointment_datetime, appointment_end_datetime, status, reason)
VALUES
  (5, 1, '2026-11-16 10:00:00', '2026-11-16 10:30:00', 'booked',
   'Chest discomfort follow-up');
```

### 5.9 Commit

The transaction commits, releasing the doctor row lock.

## 16.7 Step 6: Send Confirmation SMS

The service reloads the appointment with joins:

- Patient name, email, phone.
- Doctor name, email, phone.
- Specialization, duration, fee.

It builds:

```text
Hello Ravi Verma, your appointment with Dr. Ananya Sharma is booked for
Mon, 16 Nov 2026 at 10:00 AM. Thank you!
```

If Twilio is not configured:

```sql
INSERT INTO sms_logs
  (appointment_id, phone_number, message, message_type, status)
VALUES
  (?, '+919876510001', 'Hello Ravi Verma, ...', 'confirmation', 'simulated');
```

Response:

```json
{
  "success": true,
  "message": "Appointment booked successfully. SMS confirmation was simulated (demo mode - not delivered).",
  "data": {
    "appointment": {
      "id": 101,
      "patient_id": 5,
      "doctor_id": 1,
      "appointment_datetime": "2026-11-16 10:00:00",
      "appointment_end_datetime": "2026-11-16 10:30:00",
      "status": "booked",
      "reason": "Chest discomfort follow-up"
    },
    "sms": {
      "status": "simulated"
    }
  }
}
```

HTTP status: `201 Created`.

## 16.8 Step 7: Database State

`appointments` row:

| Field | Value |
|---|---|
| patient_id | 5 |
| doctor_id | 1 |
| appointment_datetime | 2026-11-16 10:00:00 |
| appointment_end_datetime | 2026-11-16 10:30:00 |
| status | booked |
| reason | Chest discomfort follow-up |

`sms_logs` row:

| Field | Value |
|---|---|
| appointment_id | 101 |
| phone_number | +919876510001 |
| message_type | confirmation |
| status | simulated |
| provider_sid | NULL |
| error_message | NULL |

## 16.9 Step 8: Duplicate Attempt

Another request for doctor 1 at exactly 10:00:

- The transaction locks the doctor row.
- The overlap query finds the existing appointment.
- The service throws a 409 conflict.

Or, if the application check were bypassed, the unique key `(doctor_id, appointment_datetime)` would raise `ER_DUP_ENTRY`, also resulting in 409.

## 16.10 Step 9: Partial Overlap Attempt

Another request for doctor 1 at 10:15 with a 30-minute duration:

- 10:15 is not aligned to the 30-minute grid, so `fitsAvailability` rejects it with 400.
- If a different doctor duration made 10:15 valid, the overlap query would still detect that 10:15-10:45 overlaps 10:00-10:30 and return 409.

## 16.11 Step 10: Weekly Limit Example

Suppose Ravi already has:

- Monday 10:00 with doctor 1.
- Wednesday 15:00 with doctor 1.

A third booking with doctor 1 in the same Monday-Sunday week is rejected:

```json
{
  "success": false,
  "message": "Weekly booking limit reached. A patient can book at most 2 appointments with the same doctor per calendar week (Monday-Sunday)."
}
```

HTTP status: `409 Conflict`.

A booking with a different doctor that week is allowed by the weekly-limit rule.

## 16.12 Step 11: Cancellation Example

Suppose the patient cancels on Sunday, more than 6 hours before the Monday appointment.

Request:

```http
POST /api/appointments/101/cancel
Authorization: Bearer <patient-token>
Content-Type: application/json

{
  "reason": "Schedule conflict"
}
```

Processing:

1. Lock appointment 101.
2. Check patient ownership.
3. Status is `booked`.
4. Hours remaining >= 6.
5. Update status to `cancelled`.
6. Insert cancellation log:
   - `appointment_id = 101`
   - `cancelled_by = 5`
   - `cancellation_reason = "Schedule conflict"`
   - `previous_status = "booked"`
   - `new_status = "cancelled"`
7. Return the updated appointment.

Result:

- The slot 10:00-10:30 becomes available again.
- The appointment no longer appears under Upcoming.
- It appears in History as cancelled.
- Admin and doctor cancellation views show the audit record.

If the patient tries to cancel again, the service sees status `cancelled` and returns 400.

If the patient tries to cancel only 5 hours before the appointment, the service returns 400 with the 6-hour message.

If an admin cancels 5 hours before the appointment, the admin endpoint passes `enforceSixHourRule: false`, so the cancellation succeeds and is audited.

---

# 17. 40 Viva Questions and Answers

## Q1. What is the main purpose of this project?

It is a clinic appointment booking system where patients can find doctors and book available slots, doctors can manage availability and appointments, and administrators can manage accounts and monitor all activity.

## Q2. What are the three user roles?

Patient, doctor and admin.

## Q3. What technologies are used in the backend?

Node.js, Express, MySQL, mysql2, bcrypt, JWT, express-validator, express-rate-limit, Helmet, CORS, node-cron and Twilio.

## Q4. What technologies are used in the frontend?

HTML, CSS, Bootstrap 5, Font Awesome, Google Fonts Inter, vanilla JavaScript, FullCalendar and Chart.js.

## Q5. Why is Express used?

Express provides routing, middleware composition and static file serving with a small amount of boilerplate, which is suitable for a layered REST API.

## Q6. Why is MySQL used?

The data is highly relational: users, doctor profiles, availability, appointments, cancellations and SMS logs. MySQL provides foreign keys, transactions, indexes and unique constraints needed for booking integrity.

## Q7. What architectural pattern does the project use?

A layered monolithic architecture: routes, middleware, controllers, services, models, utilities and MySQL, with a static multi-page frontend.

## Q8. How does a request flow through the backend?

Browser -> Express middleware -> route -> authentication/role/validation middleware -> controller -> service/model -> MySQL -> JSON response.

## Q9. How is authentication implemented?

Using JWT. On login, the server signs a token containing the user ID and role. Protected requests send `Authorization: Bearer <token>`. Middleware verifies the token and reloads the user from the database.

## Q10. Why does the middleware reload the user from the database?

So that role changes, account deletion and deactivation take effect immediately, even if an old token has not expired.

## Q11. How are passwords stored?

As bcrypt hashes with 10 salt rounds. Plain passwords are never stored.

## Q12. What is the difference between authentication and authorization?

Authentication proves who the user is. Authorization decides what that user is allowed to do. This project uses `authenticate` and `allowRoles`.

## Q13. How long does a JWT last?

By default, 8 hours, controlled by `JWT_EXPIRES_IN`.

## Q14. Where is the token stored in the browser?

In `localStorage` under the key `sha_token`.

## Q15. What are the main database tables?

`users`, `doctors`, `doctor_availability`, `appointments`, `cancellation_logs` and `sms_logs`.

## Q16. Why are `users` and `doctors` separate tables?

`users` stores common account data for all roles. `doctors` stores doctor-only professional data and links to a user with a one-to-one relationship. This avoids nullable doctor columns on patient/admin rows.

## Q17. Why does `appointments` have an end datetime?

It enables correct interval-overlap detection, calendar rendering and duration-aware conflict checks.

## Q18. What does the unique key `unique_doctor_datetime` do?

It prevents two appointments with the same doctor at exactly the same start time, providing a database-level final safety net.

## Q19. Why is a unique key alone not enough to prevent overlaps?

A unique key on `(doctor_id, appointment_datetime)` only prevents identical start times. Two appointments could start at different times and still overlap. The service therefore uses an interval overlap query.

## Q20. How is an overlap detected?

Using `existing_start < requested_end AND existing_end > requested_start` for active statuses. If any row matches, the slot is considered taken.

## Q21. How are slots generated?

For each working range on the selected weekday, the system starts at the range start and repeatedly adds the doctor's consultation duration. It includes a slot only if the entire slot fits inside the range, then removes past and occupied slots.

## Q22. What does `day_of_week = 1` mean?

Monday, because the schema uses 0 = Sunday, 1 = Monday, ..., 6 = Saturday.

## Q23. How does the doctor's consultation duration affect slots?

It is the step size of the slot grid and the length of each appointment. Changing it affects future slot generation, not existing appointment end times.

## Q24. How are past slots excluded?

`daySlots()` compares each slot start with the current IST time in MySQL format and skips slots earlier than the current minute. The booking service also rejects any start that is not strictly in the future.

## Q25. How is concurrency handled during booking?

The service starts a transaction and locks the doctor row with `SELECT ... FOR UPDATE`. This serializes competing bookings for the same doctor. The unique constraint provides a final safety net.

## Q26. What is the weekly booking limit?

A patient can have at most two active appointments with the same doctor in one Monday-Sunday week. Active statuses for this count are `booked`, `confirmed` and `completed`; cancelled appointments do not count.

## Q27. Why is the weekly limit per patient and doctor, not global?

It prevents excessive repeat bookings with one doctor while still allowing the patient to consult other doctors.

## Q28. What is the appointment status lifecycle?

`booked -> confirmed -> completed`, and both `booked` and `confirmed` can transition to `cancelled`. `completed` and `cancelled` are terminal.

## Q29. What is the patient cancellation rule?

A patient can cancel only their own `booked` or `confirmed` appointment, and only if at least 6 hours remain before the start.

## Q30. Can an admin cancel within 6 hours?

Yes. The admin cancellation endpoint calls the service with `enforceSixHourRule: false`. The cancellation is recorded in the audit log.

## Q31. What is stored in `cancellation_logs`?

The appointment, the user who cancelled, the reason, the timestamp, the previous status and the new status.

## Q32. How does the app prevent duplicate SMS messages?

Three layers: the query for due reminders excludes appointments with an existing reminder, the SMS service checks for an existing log, and the database has a unique key on `(appointment_id, message_type)`.

## Q33. What happens if Twilio is not configured?

The app runs in simulated mode. It writes an `sms_logs` row with status `simulated`, prints a demo message, and explicitly tells the user that the SMS was not delivered.

## Q34. Does `status = sent` guarantee the patient received the SMS?

No. It means Twilio accepted the message and returned a SID. Actual handset delivery requires a delivery-status webhook, which is not implemented.

## Q35. How are phone numbers normalized?

Ten-digit numbers get `+91`. Numbers starting with `91` get `+`. Numbers starting with `0` are converted to `+91` without the zero. Other numbers get a leading `+`.

## Q36. How does the reminder cron work?

It runs every 15 minutes by default, finds `booked` or `confirmed` appointments starting within the next 24 hours and 15 minutes that do not already have a reminder log, and sends or simulates one reminder per appointment.

## Q37. How is input validated?

Using express-validator rules on routes and additional business validation in services. The `validate` middleware returns 422 with field errors.

## Q38. How is SQL injection prevented?

All user input is passed as parameter placeholders (`?`). SQL strings are not built from raw user values, and multiple statements are disabled.

## Q39. What security measures are implemented?

bcrypt password hashing, JWT authentication, role guards, ownership checks, parameterized SQL, input validation, rate limiting on login/registration, Helmet headers, CORS configuration, transactions, unique constraints and active-account checks.

## Q40. What are the main limitations or future improvements?

No payments, video consultation, prescriptions, email, rescheduling or delivery receipts. JWT is in localStorage, CORS is open, CSP is disabled, there is no token revocation, no global rate limit, the admin UI/back-end transition mismatch for “Complete” on booked appointments should be fixed, and tests use a destructive real database. Future work could add rescheduling, cancellation SMS, a job queue, delivery webhooks, stricter security, migrations, pagination and end-to-end browser tests.

---

# 18. Conclusion

The Smart Health Appointment Booking System is a complete academic full-stack project with a clear separation between frontend, API, business logic and database. Its strongest technical feature is the booking engine: it combines availability validation, slot-grid generation, interval overlap detection, transaction-based row locking and a database unique constraint to protect against double booking.

The system provides meaningful workflows for all three roles:

- Patients can discover doctors, view real availability, book, cancel under a fair 6-hour rule, and manage their profile.
- Doctors can control their weekly schedule and consultation duration, manage their own appointments, view their patients and review cancellations.
- Administrators can manage accounts, monitor every appointment, cancel when necessary with a full audit trail, and inspect SMS attempts.

The database design is normalized and relationally sound. The cancellation and SMS audit tables add traceability. The simulated SMS mode makes the project safe to demonstrate without paid credentials, while the optional Twilio integration shows how real messaging can be added.

The project also demonstrates responsible engineering practices:

- Server-side enforcement rather than trusting the browser.
- Parameterized SQL.
- Password hashing.
- Role and ownership checks.
- Transactions and row locks.
- Consistent error handling.
- Automated integration tests.
- Explicit handling of demo mode instead of pretending messages were delivered.

For a production system, the next priorities would be stronger browser-token security, stricter CORS/CSP, a separate test database, pagination, a rescheduling workflow, a background SMS queue, delivery webhooks and database migrations. Even in its current form, the project is a solid demonstration of full-stack development, relational database design and appointment-booking integrity.
