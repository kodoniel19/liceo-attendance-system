const mysql = require('mysql2/promise');
const fs = require('fs');
const dotenv = require('dotenv');

// Manually load env from backend/.env
const envConfig = dotenv.parse(fs.readFileSync('backend/.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  try {
    const [columns] = await connection.query("SHOW COLUMNS FROM qr_sessions LIKE 'qr_data_url'");
    console.log(JSON.stringify(columns, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await connection.end();
  }
})();
