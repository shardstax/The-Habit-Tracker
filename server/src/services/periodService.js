const { DateTime } = require('luxon');
const {
  getCurrentPeriodKey,
  getPreviousPeriodKey,
  getPeriodStartDate,
} = require('../utils/period');

async function ensureCurrentPeriod(db, userId, horizon, nowUtc = DateTime.utc()) {
  const [[user]] = await db.query(
    'SELECT id, timezone, last_daily_key, last_weekly_key, last_monthly_key, last_quarterly_key, last_half_yearly_key, last_yearly_key FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (!user) throw new Error('User not found');

  const currentKey = getCurrentPeriodKey(horizon, user.timezone, nowUtc);
  const lastKeyColumn = getLastKeyColumn(horizon);
  const lastKey = user[lastKeyColumn];

  if (lastKey === currentKey) {
    return { currentKey, didRollover: false };
  }

  const previousKey = getPreviousPeriodKey(horizon, currentKey, user.timezone);

  await db.query(
    `UPDATE tasks SET period_key = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND horizon = ? AND period_key = ? AND status = 'PENDING'`,
    [currentKey, userId, horizon, previousKey]
  );

  await db.query(
    `UPDATE tasks SET archived_at_utc = UTC_TIMESTAMP()
     WHERE user_id = ? AND horizon = ? AND period_key = ? AND status = 'DONE' AND archived_at_utc IS NULL`,
    [userId, horizon, previousKey]
  );

  const periodStart = getPeriodStartDate(horizon, currentKey, user.timezone);
  const periodDate = periodStart.toISODate();

  const [templates] = await db.query(
    `SELECT * FROM recurring_task_templates
     WHERE user_id = ? AND horizon = ? AND is_active = 1
       AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`
    , [userId, horizon, periodDate, periodDate]
  );

  for (const template of templates) {
    const [existing] = await db.query(
      'SELECT id FROM tasks WHERE user_id = ? AND template_id = ? AND period_key = ? LIMIT 1',
      [userId, template.id, currentKey]
    );
    if (existing.length > 0) continue;

    const [insertResult] = await db.query(
      `INSERT INTO tasks (user_id, title, description_markdown, horizon, priority, status, period_key, due_at_utc, template_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, NULL, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [userId, template.title, template.description_markdown, template.horizon, template.priority, currentKey, template.id]
    );

    if (template.reminder_enabled && template.reminder_time_local) {
      const [hour, minute, second] = template.reminder_time_local.split(':').map(Number);
      const remindLocal = periodStart.set({ hour, minute, second: Number.isFinite(second) ? second : 0 });
      const remindUtc = remindLocal.toUTC().toFormat('yyyy-LL-dd HH:mm:ss');
      await db.query(
        'INSERT INTO reminders (user_id, task_id, remind_at_utc, is_read, created_at) VALUES (?, ?, ?, 0, UTC_TIMESTAMP())',
        [userId, insertResult.insertId, remindUtc]
      );
    }
  }

  await db.query(`UPDATE users SET ${lastKeyColumn} = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`, [currentKey, userId]);

  return { currentKey, didRollover: true };
}

function getLastKeyColumn(horizon) {
  switch (horizon) {
    case 'DAILY':
      return 'last_daily_key';
    case 'WEEKLY':
      return 'last_weekly_key';
    case 'MONTHLY':
      return 'last_monthly_key';
    case 'QUARTERLY':
      return 'last_quarterly_key';
    case 'HALF_YEARLY':
      return 'last_half_yearly_key';
    case 'YEARLY':
      return 'last_yearly_key';
    default:
      throw new Error(`Unknown horizon: ${horizon}`);
  }
}

module.exports = { ensureCurrentPeriod, getLastKeyColumn };
