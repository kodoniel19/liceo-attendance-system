require('dotenv').config({ path: './backend/.env' });
const { query } = require('../backend/src/config/database');
(async () => {
  try {
    const res = await query("SELECT id, first_name, last_name FROM users WHERE first_name LIKE '%Doniel%'");
    console.log('USER:', res);
    if (res.length > 0) {
      const sid = res[0].id;
      const enr = await query("SELECT * FROM enrollments WHERE student_id = ?", [sid]);
      console.log('ENROLLMENTS:', enr);
      const ann = await query("SELECT a.id, a.title, a.class_section_id FROM announcements a ORDER BY a.created_at DESC LIMIT 5");
      console.log('LATEST ANNOUNCEMENTS:', ann);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
