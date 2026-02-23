const { DateTime } = require('luxon');
const { ensureCurrentPeriod } = require('../src/services/periodService');

function createMockDb(state) {
  return {
    query: async (sql, params) => {
      if (sql.startsWith('SELECT id, timezone')) {
        const user = state.users.find((u) => u.id === params[0]);
        return [[user]];
      }

      if (sql.startsWith('UPDATE tasks SET period_key')) {
        const [newKey, userId, horizon, prevKey] = params;
        state.tasks.forEach((t) => {
          if (t.user_id === userId && t.horizon === horizon && t.period_key === prevKey && t.status === 'PENDING') {
            t.period_key = newKey;
          }
        });
        return [{ affectedRows: 1 }];
      }

      if (sql.startsWith('UPDATE tasks SET archived_at_utc')) {
        const [userId, horizon, prevKey] = params;
        state.tasks.forEach((t) => {
          if (t.user_id === userId && t.horizon === horizon && t.period_key === prevKey && t.status === 'DONE' && !t.archived_at_utc) {
            t.archived_at_utc = 'archived';
          }
        });
        return [{ affectedRows: 1 }];
      }

      if (sql.includes('FROM recurring_task_templates')) {
        const [userId, horizon, date] = params;
        const rows = state.templates.filter((t) => {
          if (t.user_id !== userId || t.horizon !== horizon || !t.is_active) return false;
          if (t.start_date > date) return false;
          if (t.end_date && t.end_date < date) return false;
          return true;
        });
        return [rows];
      }

      if (sql.startsWith('SELECT id FROM tasks WHERE user_id')) {
        const [userId, templateId, periodKey] = params;
        const rows = state.tasks.filter((t) => t.user_id === userId && t.template_id === templateId && t.period_key === periodKey);
        return [rows.map((t) => ({ id: t.id }))];
      }

      if (sql.startsWith('INSERT INTO tasks')) {
        const [userId, title, description, horizon, priority, periodKey, templateId] = params;
        const id = state.tasks.length + 1;
        state.tasks.push({
          id,
          user_id: userId,
          title,
          description_markdown: description,
          horizon,
          priority,
          status: 'PENDING',
          period_key: periodKey,
          template_id: templateId,
        });
        return [{ insertId: id }];
      }

      if (sql.startsWith('INSERT INTO reminders')) {
        const [userId, taskId, remindAt] = params;
        state.reminders.push({ id: state.reminders.length + 1, user_id: userId, task_id: taskId, remind_at_utc: remindAt });
        return [{ insertId: state.reminders.length }];
      }

      if (sql.startsWith('UPDATE users SET')) {
        const [currentKey, userId] = params;
        const user = state.users.find((u) => u.id === userId);
        if (user) user.last_daily_key = currentKey;
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unhandled query in mock: ${sql}`);
    },
  };
}

describe('ensureCurrentPeriod', () => {
  test('rolls over previous pending tasks to current', async () => {
    const state = {
      users: [{ id: 1, timezone: 'UTC', last_daily_key: null }],
      tasks: [
        { id: 1, user_id: 1, horizon: 'DAILY', status: 'PENDING', period_key: '2026-02-20' },
        { id: 2, user_id: 1, horizon: 'DAILY', status: 'DONE', period_key: '2026-02-20' },
      ],
      templates: [],
      reminders: [],
    };

    const db = createMockDb(state);
    const now = DateTime.fromISO('2026-02-21T10:00:00Z');

    await ensureCurrentPeriod(db, 1, 'DAILY', now);

    expect(state.tasks.find((t) => t.id === 1).period_key).toBe('2026-02-21');
    expect(state.tasks.find((t) => t.id === 2).period_key).toBe('2026-02-20');
    expect(state.tasks.find((t) => t.id === 2).archived_at_utc).toBe('archived');
  });

  test('is idempotent for recurring templates', async () => {
    const state = {
      users: [{ id: 1, timezone: 'UTC', last_daily_key: null }],
      tasks: [],
      templates: [
        {
          id: 10,
          user_id: 1,
          title: 'Morning walk',
          description_markdown: '20 minutes',
          horizon: 'DAILY',
          priority: 'MEDIUM',
          is_active: true,
          start_date: '2026-01-01',
          end_date: null,
          reminder_enabled: true,
          reminder_time_local: '07:30:00',
        },
      ],
      reminders: [],
    };

    const db = createMockDb(state);

    const now = DateTime.fromISO('2026-02-21T10:00:00Z');
    await ensureCurrentPeriod(db, 1, 'DAILY', now);
    await ensureCurrentPeriod(db, 1, 'DAILY', now);

    const taskCount = state.tasks.length;
    const reminderCount = state.reminders.length;

    expect(taskCount).toBe(1);
    expect(reminderCount).toBe(1);
  });
});
