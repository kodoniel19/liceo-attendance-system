const mysql = require('mysql2/promise');
const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'qr_attendance_db'
};

(async () => {
  try {
    const conn = await mysql.createConnection(config);
    const [students] = await conn.execute('SELECT id, first_name, last_name FROM users WHERE first_name LIKE ?', ['%Doniel%']);
    console.log('STUDENTS:', students);

    if (students.length > 0) {
      const sid = students[0].id;
      const [enrollments] = await conn.execute('SELECT * FROM enrollments WHERE student_id = ?', [sid]);
      console.log('ENROLLMENTS:', enrollments);
      
      const sectionIds = enrollments.map(e => e.class_section_id);
      console.log('ENROLLED SECTION IDS:', sectionIds);

      const [announcements] = await conn.execute('SELECT * FROM announcements WHERE class_section_id IN (?)', [sectionIds]);
      console.log('ANNOUNCEMENTS FOR THESE SECTIONS:', announcements);
    }
    await conn.end();
  } catch (err) {
    console.error(err);
  }
})();
