const { z } = require('zod');
const db = require('../db');

const saveSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content_markdown: z.string().min(1),
});

async function getEntry(req, res) {
  const userId = req.user.userId;
  const date = req.query.date;
  if (!date) return res.status(400).json({ message: 'date required' });

  const [[entry]] = await db.query(
    'SELECT * FROM journal_entries WHERE user_id = ? AND entry_date = ? LIMIT 1',
    [userId, date]
  );
  return res.json({ entry: entry || null });
}

async function saveEntry(req, res) {
  const parse = saveSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const { entry_date, content_markdown } = parse.data;

  await db.query(
    `INSERT INTO journal_entries (user_id, entry_date, content_markdown, created_at, updated_at)
     VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE content_markdown = VALUES(content_markdown), updated_at = UTC_TIMESTAMP()`
    , [userId, entry_date, content_markdown]
  );

  const [[entry]] = await db.query(
    'SELECT * FROM journal_entries WHERE user_id = ? AND entry_date = ? LIMIT 1',
    [userId, entry_date]
  );

  const taskIds = extractTaskIds(content_markdown);
  await db.query('DELETE FROM journal_mentions WHERE journal_entry_id = ?', [entry.id]);
  for (const taskId of taskIds) {
    await db.query('INSERT IGNORE INTO journal_mentions (journal_entry_id, task_id) VALUES (?, ?)', [entry.id, taskId]);
  }

  return res.json({ entry, mentionedTaskIds: taskIds });
}

async function history(req, res) {
  const userId = req.user.userId;
  const [rows] = await db.query(
    'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT 90',
    [userId]
  );
  return res.json({ entries: rows });
}

function extractTaskIds(markdown) {
  const ids = new Set();
  const regex = /task:(\d+)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    ids.add(Number(match[1]));
  }
  return Array.from(ids);
}

module.exports = { getEntry, saveEntry, history };