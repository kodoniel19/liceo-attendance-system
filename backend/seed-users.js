const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedAdmin() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME     || 'liceo_attendance'
  });

  const password = 'Admin@2024';
  const hash = await bcrypt.hash(password, 12);

  // Upsert admin
  await conn.execute(
    `INSERT INTO users (university_id, email, password_hash, first_name, last_name, role, department, is_active, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1`,
    ['ADMIN-001', 'admin@liceo.edu.ph', hash, 'System', 'Administrator', 'admin', 'IT Department']
  );

  // Also fix instructor and student hashes
  const instrHash = await bcrypt.hash('Admin@2024', 12);
  await conn.execute(
    `UPDATE users SET password_hash = ? WHERE email IN ('instructor@liceo.edu.ph', 'student@liceo.edu.ph')`,
    [instrHash]
  );

  const [rows] = await conn.execute('SELECT id, email, role, is_active FROM users ORDER BY id');
  console.log('\n✅ Users in database:');
  rows.forEach(r => console.log(`  [${r.role.toUpperCase()}] ${r.email} — active: ${r.is_active}`));
  console.log('\n📋 Login credentials:');
  console.log('  admin:      admin@liceo.edu.ph / Admin@2024');
  console.log('  instructor: instructor@liceo.edu.ph / Admin@2024');
  console.log('  student:    student@liceo.edu.ph / Admin@2024');

  await conn.end();
  console.log('\n✅ Done!');
}

seedAdmin().catch(console.error);
