const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'123456',database:'liceo_attendance'});
  
  // Check if reset_token columns exist
  const [cols] = await c.query("SHOW COLUMNS FROM users");
  const colNames = cols.map(r => r.Field);
  console.log('Columns:', colNames.join(', '));
  
  const hasToken = colNames.includes('reset_token');
  const hasExpires = colNames.includes('reset_token_expires');
  console.log('reset_token:', hasToken ? 'EXISTS' : 'MISSING');
  console.log('reset_token_expires:', hasExpires ? 'EXISTS' : 'MISSING');
  
  if (!hasToken) {
    await c.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL");
    console.log('Added reset_token column');
  }
  if (!hasExpires) {
    await c.query("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME DEFAULT NULL");
    console.log('Added reset_token_expires column');
  }
  
  if (hasToken && hasExpires) console.log('All columns ready!');
  
  await c.end();
})();
