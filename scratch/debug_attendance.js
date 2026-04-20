const { query } = require('../backend/src/config/database');

async function debug() {
  try {
    const sessions = await query(`
      SELECT cs.id, cs.status, co.course_code,
             (SELECT COUNT(*) FROM attendance WHERE class_session_id = cs.id AND status != 'absent') as present_count
      FROM class_sessions cs
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      WHERE cs.status = 'active'
    `);
    console.log('Active Sessions and Present Counts:');
    console.table(sessions);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
