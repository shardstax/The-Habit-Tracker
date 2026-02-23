const { z } = require('zod');
const db = require('../db');

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().nullable(),
});

const assignSchema = z.object({
  tagId: z.number().int(),
  entityType: z.enum(['TASK','JOURNAL','MINDSET']),
  entityId: z.number().int(),
});

async function listTags(req, res) {
  const userId = req.user.userId;
  const [rows] = await db.query('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC', [userId]);
  return res.json({ tags: rows });
}

async function createTag(req, res) {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const { name, color } = parse.data;
  const normalizedName = normalizeTagName(name);
  if (!normalizedName) return res.status(400).json({ message: 'Tag name is required' });

  try {
    const [result] = await db.query(
      'INSERT INTO tags (user_id, name, color, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())',
      [userId, normalizedName, color || null]
    );
    const [[tag]] = await db.query('SELECT * FROM tags WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ tag });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Tag name already exists' });
    }
    return res.status(500).json({ message: 'Failed to create tag' });
  }
}

async function deleteTag(req, res) {
  const userId = req.user.userId;
  const tagId = Number(req.params.id);
  await db.query('DELETE FROM tags WHERE user_id = ? AND id = ?', [userId, tagId]);
  return res.json({ ok: true });
}

async function assignTag(req, res) {
  const parse = assignSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const { tagId, entityType, entityId } = parse.data;

  await db.query(
    'INSERT IGNORE INTO tag_assignments (user_id, tag_id, entity_type, entity_id) VALUES (?, ?, ?, ?)',
    [userId, tagId, entityType, entityId]
  );

  return res.json({ ok: true });
}

async function unassignTag(req, res) {
  const parse = assignSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const { tagId, entityType, entityId } = parse.data;

  await db.query(
    'DELETE FROM tag_assignments WHERE user_id = ? AND tag_id = ? AND entity_type = ? AND entity_id = ?',
    [userId, tagId, entityType, entityId]
  );

  return res.json({ ok: true });
}

module.exports = { listTags, createTag, deleteTag, assignTag, unassignTag };

function normalizeTagName(input) {
  const trimmed = String(input || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const words = trimmed.split(' ').slice(0, 10);
  const clipped = words.join(' ');
  return clipped.slice(0, 64);
}
