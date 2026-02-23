const { z } = require('zod');
const { DateTime } = require('luxon');
const db = require('../db');

const createSchema = z.object({
  title: z.string().min(1),
  description_markdown: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

async function listGoals(req, res) {
  const userId = req.user.userId;
  const [rows] = await db.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return res.json({ goals: rows });
}

async function createGoal(req, res) {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const g = parse.data;
  const [result] = await db.query(
    'INSERT INTO goals (user_id, title, description_markdown, created_at, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
    [userId, g.title, g.description_markdown || null]
  );

  const goalTagName = normalizeTagName(g.title);
  if (goalTagName) {
    await db.query(
      'INSERT IGNORE INTO tags (user_id, name, color, created_at) VALUES (?, ?, NULL, UTC_TIMESTAMP())',
      [userId, goalTagName]
    );
  }

  const [[goal]] = await db.query('SELECT * FROM goals WHERE id = ? LIMIT 1', [result.insertId]);
  return res.status(201).json({ goal });
}

async function updateGoal(req, res) {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const goalId = Number(req.params.id);

  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(parse.data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

  values.push(userId, goalId);
  await db.query(`UPDATE goals SET ${fields.join(', ')}, updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND id = ?`, values);
  const [[goal]] = await db.query('SELECT * FROM goals WHERE user_id = ? AND id = ? LIMIT 1', [userId, goalId]);
  return res.json({ goal });
}

async function deleteGoal(req, res) {
  const userId = req.user.userId;
  const goalId = Number(req.params.id);
  await db.query('DELETE FROM goals WHERE user_id = ? AND id = ?', [userId, goalId]);
  return res.json({ ok: true });
}

async function linkTask(req, res) {
  const userId = req.user.userId;
  const goalId = Number(req.params.id);
  const taskId = Number(req.body.taskId);
  if (!taskId) return res.status(400).json({ message: 'taskId required' });

  const [[goal]] = await db.query('SELECT id FROM goals WHERE user_id = ? AND id = ? LIMIT 1', [userId, goalId]);
  if (!goal) return res.status(404).json({ message: 'Goal not found' });

  await db.query('INSERT IGNORE INTO task_goals (task_id, goal_id) VALUES (?, ?)', [taskId, goalId]);
  return res.json({ ok: true });
}

async function unlinkTask(req, res) {
  const userId = req.user.userId;
  const goalId = Number(req.params.id);
  const taskId = Number(req.body.taskId);
  if (!taskId) return res.status(400).json({ message: 'taskId required' });

  const [[goal]] = await db.query('SELECT id FROM goals WHERE user_id = ? AND id = ? LIMIT 1', [userId, goalId]);
  if (!goal) return res.status(404).json({ message: 'Goal not found' });

  await db.query('DELETE FROM task_goals WHERE task_id = ? AND goal_id = ?', [taskId, goalId]);
  return res.json({ ok: true });
}

async function getAnalytics(req, res) {
  const userId = req.user.userId;
  const goalId = Number(req.params.id);

  const [[user]] = await db.query('SELECT timezone FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const [[counts]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) AS doneCount,
       SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END) AS pendingCount
     FROM tasks t
     JOIN task_goals tg ON tg.task_id = t.id
     WHERE t.user_id = ? AND tg.goal_id = ?`,
    [userId, goalId]
  );

  const since = DateTime.utc().minus({ days: 30 }).toFormat('yyyy-LL-dd HH:mm:ss');
  const [rows] = await db.query(
    `SELECT DATE(t.updated_at) AS day, COUNT(*) AS count
     FROM tasks t
     JOIN task_goals tg ON tg.task_id = t.id
     WHERE t.user_id = ? AND tg.goal_id = ? AND t.status = 'DONE' AND t.updated_at >= ?
     GROUP BY DATE(t.updated_at)
     ORDER BY day ASC`,
    [userId, goalId, since]
  );

  const seriesCompletedByDate = rows.map((r) => ({ date: r.day, count: r.count }));

  return res.json({
    totalLinkedTasks: counts.total || 0,
    doneCount: counts.doneCount || 0,
    pendingCount: counts.pendingCount || 0,
    seriesCompletedByDate,
  });
}

module.exports = {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  linkTask,
  unlinkTask,
  getAnalytics,
  getGoalTasks,
};

async function getGoalTasks(req, res) {
  const userId = req.user.userId;
  const goalId = Number(req.params.id);
  const status = req.query.status;

  const params = [userId, goalId];
  let statusSql = '';
  if (status === 'PENDING' || status === 'DONE') {
    statusSql = ' AND t.status = ?';
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT t.* FROM tasks t
     JOIN task_goals tg ON tg.task_id = t.id
     WHERE t.user_id = ? AND tg.goal_id = ?${statusSql}
     ORDER BY FIELD(t.priority, 'URGENT','HIGH','MEDIUM','LOW'), t.created_at DESC`,
    params
  );

  return res.json({ tasks: rows });
}

function normalizeTagName(input) {
  const trimmed = String(input || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const words = trimmed.split(' ').slice(0, 10);
  const clipped = words.join(' ');
  return clipped.slice(0, 64);
}
