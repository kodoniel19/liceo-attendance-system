const { query } = require('../backend/src/config/database');

async function debug() {
  try {
    const sessions = await query(`
      SELECT cs.id, co.course_code, cl.section_name, cs.status, cs.session_date, cs.created_at
      FROM class_sessions cs
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      ORDER BY cs.id DESC
    `);
    console.log('All Sessions:');
    console.table(sessions);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
