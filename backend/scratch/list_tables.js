require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [rows] = await connection.execute('SHOW TABLES');
        console.log('Tables in database:', JSON.stringify(rows));
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
})();
