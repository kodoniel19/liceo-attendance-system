require('dotenv').config();
const { query } = require('./src/config/database');

async function checkTriggers() {
  try {
    const triggers = await query('SHOW TRIGGERS');
    console.log('Triggers:', JSON.stringify(triggers, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTriggers();
