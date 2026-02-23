const { DateTime } = require('luxon');
const db = require('../db');
const { encrypt, decrypt } = require('../utils/crypto');
const { fetchGitHubStats } = require('../services/githubService');

async function getSettings(req, res) {
  const userId = req.user.userId;
  const [[row]] = await db.query('SELECT github_username, github_token_encrypted FROM github_settings WHERE user_id = ? LIMIT 1', [userId]);
  if (!row) return res.json({ settings: null });
  return res.json({
    settings: {
      githubUsername: row.github_username,
      hasToken: !!row.github_token_encrypted,
    },
  });
}

async function saveSettings(req, res) {
  const userId = req.user.userId;
  const { githubUsername, githubToken } = req.body || {};
  if (!githubUsername) return res.status(400).json({ message: 'githubUsername required' });

  const tokenEncrypted = githubToken ? encrypt(githubToken) : null;

  await db.query(
    `INSERT INTO github_settings (user_id, github_username, github_token_encrypted, created_at, updated_at)
     VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE github_username = VALUES(github_username), github_token_encrypted = COALESCE(VALUES(github_token_encrypted), github_token_encrypted), updated_at = UTC_TIMESTAMP()`,
    [userId, githubUsername, tokenEncrypted]
  );

  return res.json({ ok: true });
}

async function getStats(req, res) {
  const userId = req.user.userId;
  const [[settings]] = await db.query('SELECT github_username, github_token_encrypted FROM github_settings WHERE user_id = ? LIMIT 1', [userId]);
  if (!settings) return res.status(404).json({ message: 'GitHub settings not configured' });
  if (!settings.github_token_encrypted) {
    return res.status(400).json({ message: 'GitHub token is required to fetch contribution stats' });
  }

  const [[cache]] = await db.query('SELECT * FROM github_stats_cache WHERE user_id = ? LIMIT 1', [userId]);
  if (cache) {
    const payload = typeof cache.payload_json === 'string' ? JSON.parse(cache.payload_json) : cache.payload_json;
    return res.json({
      fetchedAtUtc: cache.fetched_at_utc,
      nextAllowedRefreshAtUtc: cache.next_allowed_refresh_at_utc,
      payload,
      currentStreak: cache.current_streak,
      longestStreak: cache.longest_streak,
    });
  }

  const token = settings.github_token_encrypted ? decrypt(settings.github_token_encrypted) : null;
  let stats;
  try {
    stats = await fetchGitHubStats(settings.github_username, token);
  } catch (err) {
    const message = String(err.message || '');
    if (message.includes('401') || message.toLowerCase().includes('requires authentication')) {
      return res.status(400).json({ message: 'Invalid GitHub token or missing required scopes' });
    }
    return res.status(503).json({ message: 'GitHub stats are temporarily unavailable' });
  }
  const now = DateTime.utc();
  const next = now.plus({ hours: 24 });

  await db.query(
    `INSERT INTO github_stats_cache
     (user_id, fetched_at_utc, next_allowed_refresh_at_utc, payload_json, current_streak, longest_streak)
     VALUES (?, ?, ?, ?, ?, ?)`
    , [
      userId,
      now.toFormat('yyyy-LL-dd HH:mm:ss'),
      next.toFormat('yyyy-LL-dd HH:mm:ss'),
      JSON.stringify(stats.payload),
      stats.currentStreak,
      stats.longestStreak,
    ]
  );

  return res.json({
    fetchedAtUtc: now.toISO(),
    nextAllowedRefreshAtUtc: next.toISO(),
    payload: stats.payload,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
  });
}

async function refreshStats(req, res) {
  const userId = req.user.userId;
  const [[settings]] = await db.query('SELECT github_username, github_token_encrypted FROM github_settings WHERE user_id = ? LIMIT 1', [userId]);
  if (!settings) return res.status(404).json({ message: 'GitHub settings not configured' });
  if (!settings.github_token_encrypted) {
    return res.status(400).json({ message: 'GitHub token is required to refresh contribution stats' });
  }

  const [[cache]] = await db.query('SELECT * FROM github_stats_cache WHERE user_id = ? LIMIT 1', [userId]);
  const now = DateTime.utc();

  if (cache) {
    const nextAllowed = normalizeDateTime(cache.next_allowed_refresh_at_utc);
    if (nextAllowed > now) {
      return res.status(429).json({
        message: 'Refresh not allowed yet',
        nextAllowedRefreshAtUtc: nextAllowed.toISO(),
      });
    }
  }

  const token = settings.github_token_encrypted ? decrypt(settings.github_token_encrypted) : null;
  let stats;
  try {
    stats = await fetchGitHubStats(settings.github_username, token);
  } catch (err) {
    const message = String(err.message || '');
    if (message.includes('401') || message.toLowerCase().includes('requires authentication')) {
      return res.status(400).json({ message: 'Invalid GitHub token or missing required scopes' });
    }
    return res.status(503).json({ message: 'GitHub stats are temporarily unavailable' });
  }
  const next = now.plus({ hours: 24 });

  await db.query(
    `INSERT INTO github_stats_cache
     (user_id, fetched_at_utc, next_allowed_refresh_at_utc, payload_json, current_streak, longest_streak)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE fetched_at_utc = VALUES(fetched_at_utc), next_allowed_refresh_at_utc = VALUES(next_allowed_refresh_at_utc), payload_json = VALUES(payload_json), current_streak = VALUES(current_streak), longest_streak = VALUES(longest_streak)`,
    [
      userId,
      now.toFormat('yyyy-LL-dd HH:mm:ss'),
      next.toFormat('yyyy-LL-dd HH:mm:ss'),
      JSON.stringify(stats.payload),
      stats.currentStreak,
      stats.longestStreak,
    ]
  );

  return res.json({
    fetchedAtUtc: now.toISO(),
    nextAllowedRefreshAtUtc: next.toISO(),
    payload: stats.payload,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
  });
}

function normalizeDateTime(value) {
  if (value instanceof Date) return DateTime.fromJSDate(value);
  return DateTime.fromISO(String(value), { zone: 'utc' });
}

module.exports = { getSettings, saveSettings, getStats, refreshStats };
