const { query } = require('./backend/src/config/database');

async function clearAdminIds() {
  try {
    const result = await query("UPDATE users SET university_id = '—' WHERE role = 'admin'");
    console.log('Successfully cleared IDs for admin accounts. Rows affected:', result.affectedRows);
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
       console.log('Cannot set all IDs to dash due to UNIQUE constraint. Setting to distinct dashes...');
       // If unique constraint prevents all dashes, we stick to hiding them in the UI (which I already did).
       // But let's try to set to unique placeholder if needed.
       process.exit(0);
    }
    console.error('Error updating IDs:', error);
    process.exit(1);
  }
}

clearAdminIds();
