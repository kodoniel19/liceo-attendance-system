require('dotenv').config({ path: 'backend/.env' });
const { query } = require('../backend/src/config/database');

async function run() {
  try {
    console.log('Altering table...');
    await query("ALTER TABLE enrollments MODIFY COLUMN status ENUM('pending', 'active', 'dropped', 'incomplete', 'declined') DEFAULT 'pending'");
    console.log('Table altered successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error altering table:', err);
    process.exit(1);
  }
}

run();
