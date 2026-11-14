/**
 * Time helpers.
 *
 * The whole application works with "IST wall clock" values. MySQL DATETIME
 * columns store the IST wall-clock time (e.g. 2026-11-12 10:00:00 means
 * 10:00 AM in Asia/Kolkata). Internally we represent such wall-clock values
 * as JS Dates whose UTC fields hold the IST fields. This keeps comparisons
 * and arithmetic consistent regardless of the machine timezone.
 */

const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

function istParts(date = new Date()) {
  const parts = partsFormatter.formatToParts(date).filter((p) => p.type !== 'literal');
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

/** Current time in IST, represented as a wall-clock Date (UTC fields = IST fields). */
function nowIST() {
  const p = istParts();
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Parse a wall-clock string ('YYYY-MM-DD HH:mm[:ss]' or 'YYYY-MM-DDTHH:mm[:ss]'). */
function parseWall(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(
      value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(),
      value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds()
    ));
  }
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
}

/** Convert a real instant (Date) into an IST wall-clock Date. */
function instantToWall(date = new Date()) {
  const p = istParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
}

/**
 * Parse an incoming booking/date string. Strings with an explicit timezone
 * (Z or +05:30) are treated as real instants and converted to IST wall time.
 * Plain strings are treated as IST wall time already.
 */
function parseInputWall(value) {
  if (typeof value === 'string' && /(Z|[+-]\d{2}:\d{2})$/i.test(value.trim())) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return instantToWall(d);
  }
  return parseWall(value);
}

/** Wall Date -> 'YYYY-MM-DD HH:mm:ss' for MySQL DATETIME. */
function toMysql(d) {
  return `${formatDate(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function formatDate(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function formatTime(d) {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** 'HH:mm:ss' or 'HH:mm' -> minutes since midnight */
function timeToMinutes(t) {
  if (typeof t !== 'string') return null;
  const m = t.match(/^(\d{2}):(\d{2})/);
  if (!m) return null;
  return +m[1] * 60 + +m[2];
}

function addMinutes(d, minutes) {
  return new Date(d.getTime() + minutes * 60000);
}

function addDays(d, days) {
  return new Date(d.getTime() + days * 86400000);
}

function startOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Combine 'YYYY-MM-DD' + 'HH:mm[:ss]' into a wall Date. */
function combineDateTime(dateStr, timeStr) {
  const dm = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = String(timeStr).match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!dm || !tm) return null;
  return new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2], +(tm[3] || 0)));
}

function weekdayOf(dateStr) {
  const d = parseWall(`${dateStr} 00:00:00`);
  return d.getUTCDay();
}

function mondayOf(d) {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(d, diff));
}

function diffHours(later, earlier) {
  return (later.getTime() - earlier.getTime()) / 3600000;
}

function formatDisplay(d) {
  const dow = DAY_SHORT[d.getUTCDay()];
  const mon = MONTH_SHORT[d.getUTCMonth()];
  const hour12 = d.getUTCHours() % 12 || 12;
  const ampm = d.getUTCHours() < 12 ? 'AM' : 'PM';
  return `${dow}, ${d.getUTCDate()} ${mon} ${d.getUTCFullYear()}, ${pad(hour12)}:${pad(d.getUTCMinutes())} ${ampm}`;
}

function formatDateDisplay(dateStr) {
  const d = parseWall(`${dateStr} 00:00:00`);
  if (!d) return dateStr;
  return `${DAY_SHORT[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatTimeDisplay(d) {
  const hour12 = d.getUTCHours() % 12 || 12;
  const ampm = d.getUTCHours() < 12 ? 'AM' : 'PM';
  return `${pad(hour12)}:${pad(d.getUTCMinutes())} ${ampm}`;
}

/** FullCalendar uses local-ish ISO strings; we keep them timezone-neutral. */
function toCalendarLocal(d) {
  return `${formatDate(d)}T${formatTime(d)}:00`;
}

function todayStr() {
  return formatDate(nowIST());
}

module.exports = {
  TZ,
  DAY_NAMES,
  DAY_SHORT,
  nowIST,
  istParts,
  parseWall,
  parseInputWall,
  instantToWall,
  toMysql,
  formatDate,
  formatTime,
  timeToMinutes,
  addMinutes,
  addDays,
  startOfDay,
  combineDateTime,
  weekdayOf,
  mondayOf,
  diffHours,
  formatDisplay,
  formatDateDisplay,
  formatTimeDisplay,
  toCalendarLocal,
  todayStr,
  pad
};
