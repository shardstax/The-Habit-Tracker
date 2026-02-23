const { z } = require('zod');
const db = require('../db');
const { ensureCurrentPeriod } = require('../services/periodService');
const { getNextPeriodKey } = require('../utils/period');

const horizonEnum = z.enum(['DAILY','WEEKLY','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY']);

const createSchema = z.object({
  title: z.string().min(1),
  description_markdown: z.string().optional().nullable(),
  horizon: horizonEnum,
  priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM'),
  period_key: z.string().min(1),
  due_at_utc: z.string().datetime().optional().nullable(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description_markdown: z.string().optional().nullable(),
  priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),
  status: z.enum(['PENDING','DONE']).optional(),
  period_key: z.string().optional(),
  due_at_utc: z.string().datetime().optional().nullable(),
});

async function listTasks(req, res) {
  const horizon = req.query.horizon;
  const periodKeyParam = req.query.periodKey || 'current';
  const horizonParse = horizonEnum.safeParse(horizon);
  if (!horizonParse.success) return res.status(400).json({ message: 'Invalid horizon' });

  const userId = req.user.userId;
  const [[user]] = await db.query('SELECT timezone FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const periodState = await ensureCurrentPeriod(db, userId, horizon);

  let periodKey = periodKeyParam;
  if (periodKeyParam === 'current') {
    periodKey = periodState.currentKey;
  } else if (periodKeyParam === 'tomorrow') {
    periodKey = getNextPeriodKey(horizon, periodState.currentKey, user.timezone);
  }

  const [rows] = await db.query(
    `SELECT * FROM tasks
     WHERE user_id = ? AND horizon = ? AND period_key = ? AND archived_at_utc IS NULL
     ORDER BY FIELD(priority, 'URGENT','HIGH','MEDIUM','LOW'), created_at DESC`,
    [userId, horizon, periodKey]
  );

  const tasks = await attachTags(userId, rows);
  return res.json({ tasks, periodKey });
}

async function createTask(req, res) {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const { title, description_markdown, horizon, priority, period_key, due_at_utc } = parse.data;

  const [result] = await db.query(
    `INSERT INTO tasks (user_id, title, description_markdown, horizon, priority, status, period_key, due_at_utc, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [userId, title, description_markdown || null, horizon, priority, period_key, due_at_utc || null]
  );

  const [[task]] = await db.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [result.insertId]);
  return res.status(201).json({ task });
}

async function updateTask(req, res) {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const taskId = Number(req.params.id);

  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(parse.data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

  values.push(userId, taskId);
  await db.query(
    `UPDATE tasks SET ${fields.join(', ')}, updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND id = ?`,
    values
  );

  const [[task]] = await db.query('SELECT * FROM tasks WHERE user_id = ? AND id = ? LIMIT 1', [userId, taskId]);
  return res.json({ task });
}

async function deleteTask(req, res) {
  const userId = req.user.userId;
  const taskId = Number(req.params.id);
  await db.query('DELETE FROM tasks WHERE user_id = ? AND id = ?', [userId, taskId]);
  return res.json({ ok: true });
}

async function pushTask(req, res) {
  const userId = req.user.userId;
  const taskId = Number(req.params.id);
  const [[task]] = await db.query('SELECT * FROM tasks WHERE user_id = ? AND id = ? LIMIT 1', [userId, taskId]);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (task.archived_at_utc) return res.status(400).json({ message: 'Archived tasks cannot be pushed' });

  const [[user]] = await db.query('SELECT timezone FROM users WHERE id = ? LIMIT 1', [userId]);
  const nextKey = getNextPeriodKey(task.horizon, task.period_key, user.timezone);

  await db.query('UPDATE tasks SET period_key = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [nextKey, taskId]);
  const [[updated]] = await db.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [taskId]);
  return res.json({ task: updated, nextKey });
}

async function listVault(req, res) {
  const userId = req.user.userId;
  const horizon = req.query.horizon;
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const params = [userId];
  let horizonClause = '';
  if (horizon) {
    const horizonParse = horizonEnum.safeParse(horizon);
    if (!horizonParse.success) return res.status(400).json({ message: 'Invalid horizon' });
    horizonClause = 'AND horizon = ?';
    params.push(horizon);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT * FROM tasks
     WHERE user_id = ? AND status = 'DONE' AND archived_at_utc IS NOT NULL ${horizonClause}
     ORDER BY archived_at_utc DESC
     LIMIT ? OFFSET ?`,
    params
  );

  const tasks = await attachTags(userId, rows);
  return res.json({ tasks });
}

async function restoreTask(req, res) {
  const userId = req.user.userId;
  const taskId = Number(req.params.id);
  const [[task]] = await db.query('SELECT * FROM tasks WHERE user_id = ? AND id = ? LIMIT 1', [userId, taskId]);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (!task.archived_at_utc) return res.status(400).json({ message: 'Task is not archived' });

  const [[user]] = await db.query('SELECT timezone FROM users WHERE id = ? LIMIT 1', [userId]);
  const periodState = await ensureCurrentPeriod(db, userId, task.horizon);

  await db.query(
    `UPDATE tasks
     SET archived_at_utc = NULL, status = 'PENDING', period_key = ?, updated_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND id = ?`,
    [periodState.currentKey, userId, taskId]
  );

  const [[updated]] = await db.query('SELECT * FROM tasks WHERE user_id = ? AND id = ? LIMIT 1', [userId, taskId]);
  return res.json({ task: updated });
}

async function searchTasks(req, res) {
  const userId = req.user.userId;
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit || 10), 50);
  if (!q) return res.json({ tasks: [] });

  const [rows] = await db.query(
    'SELECT id, title FROM tasks WHERE user_id = ? AND title LIKE ? ORDER BY created_at DESC LIMIT ?',
    [userId, `%${q}%`, limit]
  );

  return res.json({ tasks: rows });
}

async function attachTags(userId, tasks) {
  if (tasks.length === 0) return tasks;
  const ids = tasks.map((t) => t.id);
  const [rows] = await db.query(
    `SELECT ta.entity_id AS task_id, t.id, t.name, t.color
     FROM tag_assignments ta
     JOIN tags t ON ta.tag_id = t.id
     WHERE ta.user_id = ? AND ta.entity_type = 'TASK' AND ta.entity_id IN (${ids.map(() => '?').join(',')})`,
    [userId, ...ids]
  );

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.task_id)) map.set(row.task_id, []);
    map.get(row.task_id).push({ id: row.id, name: row.name, color: row.color });
  }

  return tasks.map((task) => ({ ...task, tags: map.get(task.id) || [] }));
}

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  pushTask,
  searchTasks,
  listVault,
  restoreTask,
};
