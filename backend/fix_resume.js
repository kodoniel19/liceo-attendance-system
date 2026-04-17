require('dotenv').config();
const { query } = require('./src/config/database');

async function finalFix() {
  try {
    console.log('--- STARTING FINAL DATABASE FIX ---');
    
    // 1. Check table existence
    const tables = await query("SHOW TABLES LIKE 'class_sessions'");
    if (tables.length === 0) {
      console.error('ERROR: Table class_sessions not found!');
      process.exit(1);
    }

    // 2. Check column
    const columns = await query("SHOW COLUMNS FROM class_sessions LIKE 'is_resumed'");
    
    if (columns.length === 0) {
      console.log('Action: Adding missing is_resumed column...');
      await query("ALTER TABLE class_sessions ADD COLUMN is_resumed BOOLEAN DEFAULT FALSE AFTER status");
      console.log('✅ SUCCESS: Column is_resumed added.');
    } else {
      console.log('✅ Column is_resumed already exists. No action needed.');
    }
    
    console.log('--- FIX COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ CRITICAL ERROR DURING FIX:', err.message);
    process.exit(1);
  }
}

finalFix();
