const { query } = require('../backend/src/config/database');

async function debug() {
  try {
    const tables = await query('SHOW TABLES');
    for (const tableObj of tables) {
      const tableName = Object.values(tableObj)[0];
      const columns = await query(`SHOW COLUMNS FROM ${tableName}`);
      for (const col of columns) {
        const colName = col.Field;
        const matches = await query(`SELECT * FROM ${tableName} WHERE \`${colName}\` LIKE '%IT101%'`);
        if (matches.length > 0) {
          console.log(`FOUND IT101 in table [${tableName}], column [${colName}]:`);
          console.table(matches);
        }
      }
    }
    console.log('Search complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
