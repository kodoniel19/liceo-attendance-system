require('dotenv').config({ path: './.env' });
const { query } = require('./src/config/database');

(async () => {
    try {
        const enrolls = await query('SELECT * FROM enrollments');
        console.table(enrolls);
    } catch (e) {
        console.error(e);
    }
    process.exit();
})();
