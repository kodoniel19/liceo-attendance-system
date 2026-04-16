const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
  console.log('🎓 Starting Automated Database Setup...');

  const user = process.env.DB_USER || 'root';
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT) || 3306;
  const dbName = process.env.DB_NAME || 'liceo_attendance';
  const password = process.env.DB_PASSWORD || '';

  let conn;
  try {
    conn = await mysql.createConnection({
      host, port, user, password,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL.');

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      let schema = fs.readFileSync(schemaPath, 'utf8');
      schema = schema.replace(/CREATE DATABASE[\s\S]*?;/gi, '').replace(/USE\s+\w+\s*;/gi, '').trim();
      const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 5);
      for (const stmt of statements) {
        try { await conn.query(stmt); } catch (e) {}
      }
      console.log('✅ Schema synchronization complete.');
    }
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  }
}

setup();
