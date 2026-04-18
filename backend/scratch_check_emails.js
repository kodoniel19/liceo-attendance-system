require('dotenv').config({ path: './.env' });
const { query } = require('./src/config/database');

(async () => {
    try {
        const sections = await query('SELECT id, section_name FROM class_sections WHERE is_active=1');
        for (let s of sections) {
            const students = await query(`
             SELECT u.email, co.course_code 
             FROM enrollments e
             JOIN users u ON e.student_id = u.id
             JOIN class_sections cl ON e.class_section_id = cl.id
             JOIN courses co ON cl.course_id = co.id
             WHERE e.class_section_id = ? AND e.status = 'active'
           `, [s.id]);
           
           console.log(`Section ${s.id} (${s.section_name}): found ${students.length} active students apps with emails.`);
           if (students.length > 0) {
               console.log('   -> Emails:', students.map(st => st.email).join(', '));
           }
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
})();
