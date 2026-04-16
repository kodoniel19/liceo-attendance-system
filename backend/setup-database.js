const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
  console.log('🎓 Starting PRO Database Setup...');

  const user = process.env.DB_USER;
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT) || 3306;
  const dbName = process.env.DB_NAME;
  const password = process.env.DB_PASSWORD;

  console.log(`- Host: ${host}`);
  console.log(`- Database: ${dbName}`);
  console.log(`- User: ${user}`);

  let conn;
  try {
    conn = await mysql.createConnection({
      host, port, user, password,
      database: dbName,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL.');

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📋 Reading schema...');
      let schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Remove all CREATE DATABASE and USE commands to stay in the current 'railway' DB
      schema = schema.replace(/CREATE DATABASE[\s\S]*?;/gi, '');
      schema = schema.replace(/USE\s+[\w`]+\s*;/gi, '');
      
      const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 5);
      console.log(`🛠️ Executing ${statements.length} sql commands...`);
      
      for (const stmt of statements) {
        try { 
          await conn.query(stmt); 
        } catch (e) {
          if (!e.message.includes('already exists') && !e.message.includes('Duplicate')) {
            console.log(`  ⚠️  Warning on command: ${e.message}`);
          }
        }
      }
      console.log('✅ Database tables created successfully!');
    }
    
    await conn.end();
    console.log('🚀 Setup finished.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  }
}

setup();
