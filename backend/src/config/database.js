const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'liceo_attendance',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: 'local'
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ MySQL database connected successfully');
    connection.release();
  } catch (err) {
    logger.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
})();

// Helper: run a query
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Helper: run within a transaction
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { pool, query, withTransaction };
