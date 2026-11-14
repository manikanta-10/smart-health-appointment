const availabilityModel = require('../models/availabilityModel');
const appointmentModel = require('../models/appointmentModel');
const {
  nowIST,
  parseWall,
  addDays,
  addMinutes,
  combineDateTime,
  formatDate,
  formatTime,
  toMysql,
  toCalendarLocal
} = require('./time');

const ACTIVE_STATUSES = ['booked', 'confirmed', 'completed'];

function rangesForDay(availability, dayOfWeek) {
  return availability.filter((r) => Number(r.day_of_week) === Number(dayOfWeek) && Number(r.is_available) === 1);
}

/**
 * Generate the slot grid for one date. Slots overlapping an active
 * appointment are marked 'booked'; cancelled appointments free the slot again.
 * Past slots are excluded. Only aligned slots (duration grid from the start of
 * each availability range) are generated.
 */
async function daySlots({ doctor, dateStr }) {
  const duration = Number(doctor.appointment_duration) || 30;
  const availability = await availabilityModel.listByDoctor(doctor.id);
  const dayStart = parseWall(`${dateStr} 00:00:00`);
  if (!dayStart) return [];
  const dayEnd = addDays(dayStart, 1);

  const appts = await appointmentModel.listSlotsInRange(
    doctor.id,
    toMysql(dayStart),
    toMysql(dayEnd)
  );

  const now = nowIST();
  const nowMysql = toMysql(now);
  const ranges = rangesForDay(availability, dayStart.getUTCDay());
  const seen = new Set();
  const slots = [];

  for (const range of ranges) {
    const rangeStart = combineDateTime(dateStr, range.start_time);
    const rangeEnd = combineDateTime(dateStr, range.end_time);
    if (!rangeStart || !rangeEnd) continue;

    for (let s = rangeStart; addMinutes(s, duration) <= rangeEnd; s = addMinutes(s, duration)) {
      const e = addMinutes(s, duration);
      const sMysql = toMysql(s);
      if (seen.has(sMysql)) continue;
      seen.add(sMysql);
      if (sMysql < nowMysql) continue;

      const overlapping = appts.find(
        (a) => a.appointment_datetime < toMysql(e) && a.appointment_end_datetime > sMysql
      );
      const isActive = overlapping && ACTIVE_STATUSES.includes(overlapping.status);

      slots.push({
        start: formatTime(s),
        end: formatTime(e),
        datetime: sMysql,
        status: isActive ? 'booked' : 'available',
        appointment_id: isActive ? overlapping.id : null
      });
    }
  }

  slots.sort((a, b) => a.datetime.localeCompare(b.datetime));
  return slots;
}

async function availableSlotsForDate({ doctor, dateStr }) {
  const slots = await daySlots({ doctor, dateStr });
  return slots.filter((s) => s.status === 'available');
}

/**
 * Availability events for a date range (used by the patient FullCalendar).
 * ONLY available slots are returned - occupied slots are never exposed.
 */
async function availableSlotEvents({ doctor, startDateStr, endDateStr, maxDays = 62 }) {
  const start = parseWall(`${startDateStr} 00:00:00`);
  const end = parseWall(`${endDateStr} 00:00:00`);
  if (!start || !end || end < start) return [];

  const events = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < maxDays) {
    guard += 1;
    const dateStr = formatDate(cursor);
    // eslint-disable-next-line no-await-in-loop
    const slots = await availableSlotsForDate({ doctor, dateStr });
    for (const slot of slots) {
      events.push({
        id: `slot-${doctor.id}-${slot.datetime.replace(/[^0-9]/g, '')}`,
        title: `Available ${slot.start}`,
        start: slot.datetime.replace(' ', 'T'),
        end: toCalendarLocal(addMinutes(parseWall(slot.datetime), Number(doctor.appointment_duration) || 30)),
        backgroundColor: '#d8f3ee',
        borderColor: '#0f9b8e',
        textColor: '#0b6e65',
        extendedProps: {
          type: 'available',
          doctor_id: doctor.id,
          datetime: slot.datetime,
          start_label: slot.start
        }
      });
    }
    cursor = addDays(cursor, 1);
  }
  return events;
}

/** Validate that a requested start time lands on an available, aligned slot. */
function fitsAvailability(availability, doctor, startWall) {
  const duration = Number(doctor.appointment_duration) || 30;
  if (startWall.getUTCSeconds() !== 0) return false;
  const endWall = addMinutes(startWall, duration);
  const dateStr = formatDate(startWall);
  const ranges = rangesForDay(availability, startWall.getUTCDay());

  for (const range of ranges) {
    const rangeStart = combineDateTime(dateStr, range.start_time);
    const rangeEnd = combineDateTime(dateStr, range.end_time);
    if (!rangeStart || !rangeEnd) continue;
    const offsetMinutes = (startWall.getTime() - rangeStart.getTime()) / 60000;
    if (
      offsetMinutes >= 0 &&
      startWall >= rangeStart &&
      endWall <= rangeEnd &&
      offsetMinutes % duration === 0
    ) {
      return true;
    }
  }
  return false;
}

module.exports = { daySlots, availableSlotsForDate, availableSlotEvents, fitsAvailability, ACTIVE_STATUSES };
