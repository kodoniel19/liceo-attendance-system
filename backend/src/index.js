require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// FORCE DATABASE INITIALIZATION ON STARTUP
async function initializeDatabase() {
  try {
    const config = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    };
    
    logger.info(`🔍 [STARTUP] Attempting DB Connection:`);
    logger.info(`   - Host: ${config.host}`);
    logger.info(`   - User: ${config.user}`);
    logger.info(`   - DB:   ${config.database}`);
    
    const conn = await mysql.createConnection(config);
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      let schema = fs.readFileSync(schemaPath, 'utf8');
      schema = schema.replace(/CREATE DATABASE[\s\S]*?;/gi, '').replace(/USE\s+[\w`]+\s*;/gi, '').trim();
      const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 5);
      
      for (const stmt of statements) {
        try { await conn.query(stmt); } catch (e) {}
      }
      
      // ENSURE ADMIN HAS CORRECT PASSWORD
      const adminPass = '$2a$12$9s5wgEQASr3ucRByDyJ7wu6A79uJSiVot6jUoWvbsjEq9g/d/u7/m'; // Admin@2024
      await conn.query(`
        INSERT INTO users (university_id, email, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ('ADMIN-001', 'admin@liceo.edu.ph', ?, 'System', 'Administrator', 'admin', TRUE, TRUE)
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = TRUE
      `, [adminPass]);

      logger.info('✅ Database schema verified/initialized');

      // DIAGNOSTIC CHECK
      const [countResult] = await conn.query('SELECT COUNT(*) as count FROM users');
      const [adminCheck] = await conn.query('SELECT email, role FROM users WHERE email = "admin@liceo.edu.ph"');
      
      logger.info(`📊 DATABASE DIAGNOSTICS:`);
      logger.info(` - Total Users in DB: ${countResult[0].count}`);
      if (adminCheck.length > 0) {
        logger.info(` - Admin Found: YES (Role: ${adminCheck[0].role})`);
      } else {
        logger.error(` - Admin Found: NO (!!!)`);
      }
    }
    await conn.end();
  } catch (err) {
    logger.error('❌ Database initialization warning:', err.message);
  }
}

const PORT = process.env.PORT || 3000;

let server;

// Start app after DB Check
initializeDatabase().then(() => {
  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Liceo Attendance API running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => logger.info('Process terminated.'));
  }
});
