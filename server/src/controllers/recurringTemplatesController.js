const { z } = require('zod');
const db = require('../db');

const horizonEnum = z.enum(['DAILY','WEEKLY','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY']);
const priorityEnum = z.enum(['LOW','MEDIUM','HIGH','URGENT']);

const createSchema = z.object({
  title: z.string().min(1),
  description_markdown: z.string().optional().nullable(),
  horizon: horizonEnum,
  priority: priorityEnum.default('MEDIUM'),
  is_active: z.boolean().default(true),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  reminder_enabled: z.boolean().default(false),
  reminder_time_local: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
});

const updateSchema = createSchema.partial();

async function listTemplates(req, res) {
  const userId = req.user.userId;
  const [rows] = await db.query('SELECT * FROM recurring_task_templates WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return res.json({ templates: rows });
}

async function createTemplate(req, res) {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const t = parse.data;
  const [result] = await db.query(
    `INSERT INTO recurring_task_templates
     (user_id, title, description_markdown, horizon, priority, is_active, start_date, end_date, reminder_enabled, reminder_time_local, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [userId, t.title, t.description_markdown || null, t.horizon, t.priority, t.is_active ? 1 : 0, t.start_date, t.end_date || null, t.reminder_enabled ? 1 : 0, t.reminder_time_local || null]
  );

  const [[template]] = await db.query('SELECT * FROM recurring_task_templates WHERE id = ? LIMIT 1', [result.insertId]);
  return res.status(201).json({ template });
}

async function updateTemplate(req, res) {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const userId = req.user.userId;
  const templateId = Number(req.params.id);

  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(parse.data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

  values.push(userId, templateId);
  await db.query(
    `UPDATE recurring_task_templates SET ${fields.join(', ')}, updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND id = ?`,
    values
  );

  const [[template]] = await db.query('SELECT * FROM recurring_task_templates WHERE user_id = ? AND id = ? LIMIT 1', [userId, templateId]);
  return res.json({ template });
}

async function deleteTemplate(req, res) {
  const userId = req.user.userId;
  const templateId = Number(req.params.id);
  await db.query('DELETE FROM recurring_task_templates WHERE user_id = ? AND id = ?', [userId, templateId]);
  return res.json({ ok: true });
}

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };