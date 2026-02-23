const db = require('../db');

async function listReminders(req, res) {
  const userId = req.user.userId;
  const [rows] = await db.query(
    `SELECT r.id, r.task_id, r.remind_at_utc, t.title, t.horizon, t.period_key
     FROM reminders r
     JOIN tasks t ON r.task_id = t.id
     WHERE r.user_id = ? AND r.is_read = 0
     ORDER BY r.remind_at_utc ASC`,
    [userId]
  );
  return res.json({ reminders: rows });
}

async function markRead(req, res) {
  const userId = req.user.userId;
  const reminderId = Number(req.params.id);
  await db.query('UPDATE reminders SET is_read = 1 WHERE user_id = ? AND id = ?', [userId, reminderId]);
  return res.json({ ok: true });
}

module.exports = { listReminders, markRead };
