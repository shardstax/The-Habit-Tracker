const mysql = require('mysql2/promise');
require('dotenv').config();

const sslConfig = process.env.DB_SSL_CA
  ? {
      ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'),
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  ssl: sslConfig,
  connectionLimit: 10,
  multipleStatements: true,
});

module.exports = pool;
