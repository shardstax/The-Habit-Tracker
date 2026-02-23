const { DateTime } = require('luxon');

const Horizons = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  HALF_YEARLY: 'HALF_YEARLY',
  YEARLY: 'YEARLY',
};

function getCurrentPeriodKey(horizon, timezone, nowUtc = DateTime.utc()) {
  const zoned = nowUtc.setZone(timezone);
  return getPeriodKeyFromDate(horizon, zoned);
}

function getPeriodKeyFromDate(horizon, dateTime) {
  const dt = dateTime;
  switch (horizon) {
    case Horizons.DAILY:
      return dt.toISODate();
    case Horizons.WEEKLY: {
      const weekYear = dt.weekYear;
      const weekNumber = String(dt.weekNumber).padStart(2, '0');
      return `${weekYear}-W${weekNumber}`;
    }
    case Horizons.MONTHLY: {
      const month = String(dt.month).padStart(2, '0');
      return `${dt.year}-${month}`;
    }
    case Horizons.QUARTERLY: {
      const quarter = Math.floor((dt.month - 1) / 3) + 1;
      return `${dt.year}-Q${quarter}`;
    }
    case Horizons.HALF_YEARLY: {
      const half = dt.month <= 6 ? 1 : 2;
      return `${dt.year}-H${half}`;
    }
    case Horizons.YEARLY:
      return `${dt.year}`;
    default:
      throw new Error(`Unknown horizon: ${horizon}`);
  }
}

function getPeriodStartDate(horizon, periodKey, timezone) {
  switch (horizon) {
    case Horizons.DAILY:
      return DateTime.fromISO(periodKey, { zone: timezone }).startOf('day');
    case Horizons.WEEKLY: {
      const match = periodKey.match(/^(\d{4})-W(\d{2})$/);
      if (!match) throw new Error('Invalid weekly period key');
      const weekYear = Number(match[1]);
      const weekNumber = Number(match[2]);
      return DateTime.fromObject({ weekYear, weekNumber, weekday: 1 }, { zone: timezone }).startOf('day');
    }
    case Horizons.MONTHLY: {
      const match = periodKey.match(/^(\d{4})-(\d{2})$/);
      if (!match) throw new Error('Invalid monthly period key');
      const year = Number(match[1]);
      const month = Number(match[2]);
      return DateTime.fromObject({ year, month, day: 1 }, { zone: timezone }).startOf('day');
    }
    case Horizons.QUARTERLY: {
      const match = periodKey.match(/^(\d{4})-Q(\d)$/);
      if (!match) throw new Error('Invalid quarterly period key');
      const year = Number(match[1]);
      const quarter = Number(match[2]);
      const month = (quarter - 1) * 3 + 1;
      return DateTime.fromObject({ year, month, day: 1 }, { zone: timezone }).startOf('day');
    }
    case Horizons.HALF_YEARLY: {
      const match = periodKey.match(/^(\d{4})-H(\d)$/);
      if (!match) throw new Error('Invalid half-yearly period key');
      const year = Number(match[1]);
      const half = Number(match[2]);
      const month = half === 1 ? 1 : 7;
      return DateTime.fromObject({ year, month, day: 1 }, { zone: timezone }).startOf('day');
    }
    case Horizons.YEARLY: {
      const year = Number(periodKey);
      return DateTime.fromObject({ year, month: 1, day: 1 }, { zone: timezone }).startOf('day');
    }
    default:
      throw new Error(`Unknown horizon: ${horizon}`);
  }
}

function getPreviousPeriodKey(horizon, currentKey, timezone) {
  const start = getPeriodStartDate(horizon, currentKey, timezone);
  let prev;
  switch (horizon) {
    case Horizons.DAILY:
      prev = start.minus({ days: 1 });
      break;
    case Horizons.WEEKLY:
      prev = start.minus({ weeks: 1 });
      break;
    case Horizons.MONTHLY:
      prev = start.minus({ months: 1 });
      break;
    case Horizons.QUARTERLY:
      prev = start.minus({ months: 3 });
      break;
    case Horizons.HALF_YEARLY:
      prev = start.minus({ months: 6 });
      break;
    case Horizons.YEARLY:
      prev = start.minus({ years: 1 });
      break;
    default:
      throw new Error(`Unknown horizon: ${horizon}`);
  }
  return getPeriodKeyFromDate(horizon, prev);
}

function getNextPeriodKey(horizon, currentKey, timezone) {
  const start = getPeriodStartDate(horizon, currentKey, timezone);
  let next;
  switch (horizon) {
    case Horizons.DAILY:
      next = start.plus({ days: 1 });
      break;
    case Horizons.WEEKLY:
      next = start.plus({ weeks: 1 });
      break;
    case Horizons.MONTHLY:
      next = start.plus({ months: 1 });
      break;
    case Horizons.QUARTERLY:
      next = start.plus({ months: 3 });
      break;
    case Horizons.HALF_YEARLY:
      next = start.plus({ months: 6 });
      break;
    case Horizons.YEARLY:
      next = start.plus({ years: 1 });
      break;
    default:
      throw new Error(`Unknown horizon: ${horizon}`);
  }
  return getPeriodKeyFromDate(horizon, next);
}

module.exports = {
  Horizons,
  getCurrentPeriodKey,
  getPeriodKeyFromDate,
  getPeriodStartDate,
  getPreviousPeriodKey,
  getNextPeriodKey,
};