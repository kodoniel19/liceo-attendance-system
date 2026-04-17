require('dotenv').config();
const { query } = require('./src/config/database');

async function checkAllDBs() {
  try {
    const dbs = await query('SHOW DATABASES');
    console.log('--- ALL DATABASES ---');
    for (const db of dbs) {
      const dbName = db.Database;
      console.log(`Checking DB: ${dbName}...`);
      try {
        await query(`USE \`${dbName}\``);
        const tables = await query("SHOW TABLES LIKE 'class_sessions'");
        if (tables.length > 0) {
          const columns = await query("SHOW COLUMNS FROM class_sessions LIKE 'is_resumed'");
          if (columns.length > 0) {
            console.log(`  Row: class_sessions FOUND and has is_resumed ✅`);
          } else {
            console.log(`  Row: class_sessions FOUND but MISSING is_resumed ❌`);
            console.log(`  Action: Fixing DB ${dbName}...`);
            await query("ALTER TABLE class_sessions ADD COLUMN is_resumed BOOLEAN DEFAULT FALSE AFTER status");
            console.log(`  Result: Fixed ${dbName} ✅`);
          }
        }
      } catch (e) {
        console.log(`  Skip: Could not access ${dbName}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAllDBs();
