const { DateTime } = require('luxon');
const db = require('../db');

async function getToday(req, res) {
  const [[countRow]] = await db.query('SELECT COUNT(*) AS count FROM motivation_items');
  const count = countRow.count || 0;
  if (count === 0) return res.status(404).json({ message: 'No motivation items seeded' });

  const epoch = DateTime.fromISO('1970-01-01', { zone: 'utc' });
  const daysSinceEpoch = Math.floor(DateTime.utc().startOf('day').diff(epoch, 'days').days);
  const index = daysSinceEpoch % count;

  const [rows] = await db.query(
    'SELECT quote, author, background_image_url FROM motivation_items ORDER BY id ASC LIMIT 1 OFFSET ?',
    [index]
  );

  const item = rows[0];
  return res.json({
    quote: item.quote,
    author: item.author,
    backgroundImageUrl: item.background_image_url,
  });
}

module.exports = { getToday };