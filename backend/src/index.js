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
    
    logger.info(`Checking database: ${config.database} at ${config.host}`);
    
    const conn = await mysql.createConnection(config);
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      let schema = fs.readFileSync(schemaPath, 'utf8');
      schema = schema.replace(/CREATE DATABASE[\s\S]*?;/gi, '').replace(/USE\s+[\w`]+\s*;/gi, '').trim();
      const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 5);
      
      for (const stmt of statements) {
        try { await conn.query(stmt); } catch (e) {}
      }
      logger.info('✅ Database schema verified/initialized');
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
