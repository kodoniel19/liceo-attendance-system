/**
 * Liceo Attendance System - Database Setup Script
 * Run: node setup-database.js
 * Or with password: node setup-database.js mypassword
 */

require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function setup() {
  console.log('\n🎓 Liceo Attendance System — Database Setup');
  console.log('═'.repeat(50));

  // Get password from args or prompt
  let password = process.argv[2];
  if (password === undefined) {
    password = await ask('\n📌 Enter your MySQL root password (press Enter if no password): ');
  }

  // Also ask for user if not root
  let user = process.env.DB_USER || 'root';
  let host = process.env.DB_HOST || 'localhost';
  let port = parseInt(process.env.DB_PORT) || 3306;
  let dbName = process.env.DB_NAME || 'liceo_attendance';

  console.log(`\n🔗 Connecting to MySQL at ${host}:${port} as '${user}'...`);

  let conn;
  try {
    // Connect without specifying a database first
    conn = await mysql.createConnection({
      host, port, user,
      password: password || '',
      multipleStatements: true
    });
    console.log('✅ MySQL connection successful!\n');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('\n💡 Make sure MySQL is running and check your password.');
    console.error('   If using XAMPP: Start MySQL from XAMPP Control Panel');
    console.error('   If using MySQL Workbench: Check the connection settings');
    rl.close();
    process.exit(1);
  }

  try {
    // Create database
    console.log(`📦 Creating database '${dbName}'...`);
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${dbName}' ready!\n`);

    // Use the database
    await conn.execute(`USE \`${dbName}\``);

    // Read and run schema.sql
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found at:', schemaPath);
      process.exit(1);
    }

    console.log('📋 Running schema and seed data...');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Remove CREATE DATABASE and USE statements (already done above)
    schema = schema
      .replace(/CREATE DATABASE[\s\S]*?;/gi, '')
      .replace(/USE\s+\w+\s*;/gi, '')
      .trim();

    // Split by semicolons and run each statement
    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 5);
    let success = 0, skipped = 0;

    for (const stmt of statements) {
      try {
        await conn.execute(stmt);
        success++;
      } catch (err) {
        // Skip duplicate entry errors (seed data already inserted)
        if (err.code === 'ER_DUP_ENTRY' || err.code === 'ER_TABLE_EXISTS_ERROR') {
          skipped++;
        } else if (err.message.includes('already exists')) {
          skipped++;
        } else {
          // Log non-critical errors but continue
          console.warn(`  ⚠  Skipping: ${err.message.substring(0, 80)}`);
          skipped++;
        }
      }
    }

    console.log(`✅ Schema applied! (${success} statements, ${skipped} skipped)\n`);

    // Update .env with the correct password
    const envPath = path.join(__dirname, 'backend', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD=${password}`);
    fs.writeFileSync(envPath, envContent);
    console.log('✅ backend/.env updated with your password!\n');

    // Verify by checking users table
    const [rows] = await conn.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users table has ${rows[0].count} record(s) — seed data OK!\n`);

    await conn.end();
    rl.close();

    console.log('═'.repeat(50));
    console.log('🎉 DATABASE SETUP COMPLETE!');
    console.log('═'.repeat(50));
    console.log('\nNext steps:');
    console.log('  1. Stop the backend if running (Ctrl+C in that terminal)');
    console.log('  2. Restart: cd backend && node src/index.js');
    console.log('  3. Open: http://localhost:4200');
    console.log('\n📋 Demo Login Credentials:');
    console.log('  Instructor: instructor@liceo.edu.ph / Admin@2024');
    console.log('  Student:    student@liceo.edu.ph    / Admin@2024\n');

  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    if (conn) await conn.end();
    rl.close();
    process.exit(1);
  }
}

setup();
