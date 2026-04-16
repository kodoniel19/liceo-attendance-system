require('dotenv').config({ path: './backend/.env' });
const { query } = require('../backend/src/config/database');
(async () => {
  try {
    const users = await query('SELECT id, first_name, last_name, role FROM users WHERE first_name LIKE ?', ['%Doniel%']);
    console.log('USERS:', users);
    
    if (users.length > 0) {
      const studentId = users[0].id;
      const enrollments = await query(`
        SELECT e.*, cl.section_name, co.course_code 
        FROM enrollments e 
        JOIN class_sections cl ON e.class_section_id = cl.id
        JOIN courses co ON cl.course_id = co.id
        WHERE e.student_id = ?
      `, [studentId]);
      console.log('ENROLLMENTS:', enrollments);
      
      const announcements = await query(`
        SELECT a.id, a.title, cl.section_name 
        FROM announcements a
        JOIN class_sections cl ON a.class_section_id = cl.id
        JOIN enrollments e ON cl.id = e.class_section_id
        WHERE e.student_id = ? AND e.status = 'active'
      `, [studentId]);
      console.log('ANNOUNCEMENTS ACCESSIBLE:', announcements);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
