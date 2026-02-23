const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../db');

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  timezone: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

async function register(req, res) {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const { name, email, password, timezone } = parse.data;
  const hash = await bcrypt.hash(password, 10);

  try {
    const [result] = await db.query(
      `INSERT INTO users (name, email, password_hash, timezone, week_starts_on, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'MONDAY', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [name, email, hash, timezone]
    );

    const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already registered' });
    }
    return res.status(500).json({ message: 'Registration failed' });
  }
}

async function login(req, res) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.errors });

  const { email, password } = parse.data;
  const [[user]] = await db.query('SELECT id, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
}

async function me(req, res) {
  const [[user]] = await db.query(
    'SELECT id, name, email, timezone, week_starts_on FROM users WHERE id = ? LIMIT 1',
    [req.user.userId]
  );
  return res.json({ user });
}

module.exports = { register, login, me };