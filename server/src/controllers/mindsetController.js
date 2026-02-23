const { z } = require('zod');
const db = require('../db');

const createSchema = z.object({
  title: z.string().min(1),
  content_markdown: z.string().min(1),
});

const updateSchema = createSchema.partial();

async function listNotes(req, res) {
  const userId = req.user.userId;
  const [rows] = await db.query('SELECT * FROM mindset_notes WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return res.json({ notes: rows });
}

async function createNote(req, res) {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const { title, content_markdown } = parse.data;
  const [result] = await db.query(
    'INSERT INTO mindset_notes (user_id, title, content_markdown, created_at, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
    [userId, title, content_markdown]
  );
  const [[note]] = await db.query('SELECT * FROM mindset_notes WHERE id = ? LIMIT 1', [result.insertId]);
  return res.status(201).json({ note });
}

async function updateNote(req, res) {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const noteId = Number(req.params.id);
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(parse.data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

  values.push(userId, noteId);
  await db.query(`UPDATE mindset_notes SET ${fields.join(', ')}, updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND id = ?`, values);
  const [[note]] = await db.query('SELECT * FROM mindset_notes WHERE user_id = ? AND id = ? LIMIT 1', [userId, noteId]);
  return res.json({ note });
}

async function deleteNote(req, res) {
  const userId = req.user.userId;
  const noteId = Number(req.params.id);
  await db.query('DELETE FROM mindset_notes WHERE user_id = ? AND id = ?', [userId, noteId]);
  return res.json({ ok: true });
}

module.exports = { listNotes, createNote, updateNote, deleteNote };