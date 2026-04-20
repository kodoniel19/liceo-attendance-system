const { query } = require('../backend/src/config/database');

async function migrate() {
  try {
    console.log('Starting migration: Adding instructor_id to courses...');
    
    // Check if column exists
    const columns = await query("SHOW COLUMNS FROM courses LIKE 'instructor_id'");
    
    if (columns.length === 0) {
      await query("ALTER TABLE courses ADD COLUMN instructor_id INT UNSIGNED NULL");
      await query("ALTER TABLE courses ADD CONSTRAINT fk_course_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL");
      console.log('Migration successful: Column instructor_id added.');
    } else {
      console.log('Migration skipped: Column instructor_id already exists.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
