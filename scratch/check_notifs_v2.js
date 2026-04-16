require('dotenv').config({ path: './backend/.env' });
const { query } = require('./backend/src/config/database');

(async () => {
  try {
    const studentName = 'Doniel';
    const students = await query('SELECT id, first_name, last_name FROM users WHERE first_name LIKE ?', [`%${studentName}%`]);
    console.log('STUDENTS MATCHING:', students);

    if (students.length > 0) {
      const sid = students[0].id;
      const enrollments = await query('SELECT * FROM enrollments WHERE student_id = ?', [sid]);
      console.log(`ENROLLMENTS FOR STUDENT ID ${sid}:`, enrollments);

      const queryAnnouncements = await query(`
        SELECT a.id, a.title, cl.section_name 
        FROM announcements a
        INNER JOIN class_sections cl ON a.class_section_id = cl.id
        WHERE a.class_section_id IN (
          SELECT class_section_id FROM enrollments WHERE student_id = ? AND status = 'active'
        )
      `, [sid]);
      console.log('ANNOUNCEMENTS RESULT:', queryAnnouncements);
    }
    
    // Check all announcements
    const allA = await query('SELECT id, title, class_section_id FROM announcements ORDER BY created_at DESC LIMIT 5');
    console.log('LATEST 5 ANNOUNCEMENTS GLOBALLY:', allA);

  } catch (err) {
    console.error('ERROR:', err);
  }
  process.exit(0);
})();
