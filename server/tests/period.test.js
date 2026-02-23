const { DateTime } = require('luxon');
const { getCurrentPeriodKey, getPeriodKeyFromDate, Horizons } = require('../src/utils/period');

describe('period key computation', () => {
  test('daily key matches YYYY-MM-DD', () => {
    const dt = DateTime.fromISO('2026-02-21T10:00:00Z');
    const key = getPeriodKeyFromDate(Horizons.DAILY, dt.setZone('UTC'));
    expect(key).toBe('2026-02-21');
  });

  test('weekly key matches ISO week', () => {
    const dt = DateTime.fromISO('2026-02-21T10:00:00Z');
    const key = getPeriodKeyFromDate(Horizons.WEEKLY, dt.setZone('UTC'));
    expect(key).toBe('2026-W08');
  });

  test('monthly key matches YYYY-MM', () => {
    const dt = DateTime.fromISO('2026-02-21T10:00:00Z');
    const key = getPeriodKeyFromDate(Horizons.MONTHLY, dt.setZone('UTC'));
    expect(key).toBe('2026-02');
  });

  test('quarterly key matches YYYY-Qn', () => {
    const dt = DateTime.fromISO('2026-02-21T10:00:00Z');
    const key = getPeriodKeyFromDate(Horizons.QUARTERLY, dt.setZone('UTC'));
    expect(key).toBe('2026-Q1');
  });

  test('half-yearly key matches YYYY-Hn', () => {
    const dt = DateTime.fromISO('2026-08-21T10:00:00Z');
    const key = getPeriodKeyFromDate(Horizons.HALF_YEARLY, dt.setZone('UTC'));
    expect(key).toBe('2026-H2');
  });

  test('yearly key matches YYYY', () => {
    const dt = DateTime.fromISO('2026-02-21T10:00:00Z');
    const key = getPeriodKeyFromDate(Horizons.YEARLY, dt.setZone('UTC'));
    expect(key).toBe('2026');
  });

  test('getCurrentPeriodKey uses timezone', () => {
    const nowUtc = DateTime.fromISO('2026-02-21T01:00:00Z');
    const key = getCurrentPeriodKey(Horizons.DAILY, 'America/Los_Angeles', nowUtc);
    expect(key).toBe('2026-02-20');
  });
});