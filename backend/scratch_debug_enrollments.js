require('dotenv').config({ path: './.env' });
const { query } = require('./src/config/database');

(async () => {
    try {
        // Find the sections for instructor deko74415 (since that's the user's email)
        const instructors = await query('SELECT id, first_name, last_name FROM users WHERE email = ?', ['deko74415@liceo.edu.ph']);
        console.log('Instructors matching email:', instructors);
        
        if (instructors.length > 0) {
            const sections = await query('SELECT id, section_name FROM class_sections WHERE instructor_id = ?', [instructors[0].id]);
            console.log('Sections for this instructor:', sections);
            
            for (const section of sections) {
                const enrollments = await query(`
                    SELECT e.*, u.first_name, u.last_name, u.email, u.is_active as user_active
                    FROM enrollments e
                    JOIN users u ON e.student_id = u.id
                    WHERE e.class_section_id = ?
                `, [section.id]);
                console.log(`Enrollments for section ${section.section_name} (ID: ${section.id}):`, enrollments);
            }
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
})();
