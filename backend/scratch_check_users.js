require('dotenv').config({ path: './.env' });
const { query } = require('./src/config/database');

(async () => {
    try {
        const users = await query('SELECT id, first_name, last_name, role, email FROM users');
        console.table(users);
    } catch (e) {
        console.error(e);
    }
    process.exit();
})();
