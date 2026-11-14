const {
  nowIST,
  startOfDay,
  addDays,
  mondayOf,
  toMysql,
  formatDate
} = require('./time');

function periods() {
  const now = nowIST();
  const todayStart = startOfDay(now);
  const tomorrow = addDays(todayStart, 1);
  const weekStart = mondayOf(now);
  const nextWeek = addDays(weekStart, 7);
  return {
    now,
    nowMysql: toMysql(now),
    todayStart: toMysql(todayStart),
    tomorrow: toMysql(tomorrow),
    today: formatDate(todayStart),
    tomorrowDate: formatDate(tomorrow),
    weekStart,
    weekStartMysql: toMysql(weekStart),
    nextWeek,
    nextWeekMysql: toMysql(nextWeek),
    weekStartDate: formatDate(weekStart)
  };
}

module.exports = { periods };
