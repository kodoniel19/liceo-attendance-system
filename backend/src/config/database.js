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

// Test connection and run auto-migrations on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    const [dbName] = await connection.query('SELECT DATABASE() as db');
    logger.info(`✅ MySQL database connected successfully [DB: ${dbName[0].db}]`);
    
    // Auto-migrate: Ensure columns exist
    logger.info('Running auto-migrations...');

    // 1. is_resumed for sessions
    const [columns] = await connection.query("SHOW COLUMNS FROM class_sessions LIKE 'is_resumed'");
    if (columns.length === 0) {
      logger.info('Adding missing column: is_resumed to class_sessions');
      await connection.query("ALTER TABLE class_sessions ADD COLUMN is_resumed BOOLEAN DEFAULT FALSE AFTER status");
      logger.info('✅ Column is_resumed added successfully');
    }

    // 2. instructor_id for courses
    const [courseCols] = await connection.query("SHOW COLUMNS FROM courses LIKE 'instructor_id'");
    if (courseCols.length === 0) {
      logger.info('Adding missing column: instructor_id to courses');
      await connection.query("ALTER TABLE courses ADD COLUMN instructor_id INT UNSIGNED NULL");
      await connection.query("ALTER TABLE courses ADD CONSTRAINT fk_course_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL");
      logger.info('✅ Column instructor_id added successfully');
    }
    
    connection.release();
  } catch (err) {
    logger.error('❌ MySQL initialization failed:', err.message);
    // Don't exit if it's just a migration error, let the app try to run
    if (err.message.includes('connection failed')) process.exit(1);
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
