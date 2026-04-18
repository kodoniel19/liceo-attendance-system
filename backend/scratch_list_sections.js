require('dotenv').config({ path: './.env' });
const { query } = require('./src/config/database');

(async () => {
    try {
        const sections = await query(`
            SELECT cs.id, cs.section_name, u.first_name, u.last_name, u.email
            FROM class_sections cs
            JOIN users u ON cs.instructor_id = u.id
        `);
        console.table(sections);
    } catch (e) {
        console.error(e);
    }
    process.exit();
})();
