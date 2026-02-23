const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const seedFile = path.join(__dirname, 'seeds', 'seed.sql');

async function run() {
  const sslConfig = process.env.DB_SSL_CA
    ? {
        ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'),
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      }
    : undefined;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    ssl: sslConfig,
    multipleStatements: true,
  });

  const demoPassword = process.env.DEMO_PASSWORD || 'demo1234';
  const hash = await bcrypt.hash(demoPassword, 10);

  let sql = fs.readFileSync(seedFile, 'utf8');
  sql = sql.replace('{{DEMO_PASSWORD_HASH}}', hash.replace(/'/g, "''"));

  if (!sql.trim()) {
    throw new Error('seed.sql is empty');
  }

  await connection.query(sql);
  await connection.end();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
