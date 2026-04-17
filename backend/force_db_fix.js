require('dotenv').config();
const { query, pool } = require('./src/config/database');

async function forceFix() {
  try {
    const [dbInfo] = await query('SELECT DATABASE() as db');
    console.log('--- DATABASE FIX LOG ---');
    console.log('Connected to Database:', dbInfo.db);
    
    console.log('Checking class_sessions columns...');
    const columns = await query('SHOW COLUMNS FROM class_sessions');
    const columnNames = columns.map(c => c.Field);
    console.log('Existing columns:', columnNames.join(', '));
    
    if (!columnNames.includes('is_resumed')) {
      console.log('is_resumed MISSING! Adding it now...');
      await query('ALTER TABLE class_sessions ADD COLUMN is_resumed BOOLEAN DEFAULT FALSE AFTER status');
      console.log('SUCCESS: Column added.');
    } else {
      console.log('is_resumed already exists.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL ERROR:', err);
    process.exit(1);
  }
}

forceFix();
