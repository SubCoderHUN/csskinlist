require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bans',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

pool.getConnection()
  .then(conn => {
    console.log('[DB] MySQL kapcsolat sikeres!');
    conn.release();
  })
  .catch(err => {
    console.warn('[DB] MySQL kapcsolat sikertelen (mock mód aktív):', err.message);
  });

module.exports = pool;
