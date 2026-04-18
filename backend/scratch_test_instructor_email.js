require('dotenv').config({ path: './.env' });
const { query } = require('./src/config/database');
const emailService = require('./src/utils/email');

(async () => {
    try {
        console.log('Testing Instructor announcement logic locally...');
        
        const sectionId = 1; // Assuming section 1 exists
        
        const students = await query(`
             SELECT u.email, co.course_code 
             FROM enrollments e
             JOIN users u ON e.student_id = u.id
             JOIN class_sections cl ON e.class_section_id = cl.id
             JOIN courses co ON cl.course_id = co.id
             WHERE e.class_section_id = ? AND e.status = 'active' AND u.email IS NOT NULL
           `, [sectionId]);

        console.log('Students found:', students);

        if (students.length > 0) {
            const emails = students.map(s => s.email).filter(e => e);
            const contextName = `Class Announcement: ${students[0].course_code || 'Update'}`;
            console.log('Dispatching to:', emails, contextName);
            
            await emailService.sendAnnouncementNotification(emails, 'Test from script', 'Body content', contextName);
        }
        console.log('Done script!');
    } catch (e) {
        console.error(e);
    }
    process.exit();
})();
