const { query } = require('../backend/src/config/database');

async function debug() {
  try {
    const courses = await query("SELECT * FROM courses WHERE course_code LIKE '%IT101%'");
    console.log('Courses matching IT101:');
    console.table(courses);

    const sections = await query("SELECT * FROM class_sections WHERE section_name LIKE '%BSIT%'");
    console.log('Sections matching BSIT:');
    console.table(sections);

    const sessions = await query(`
      SELECT cs.id, co.course_code, cl.section_name 
      FROM class_sessions cs
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      WHERE co.course_code LIKE '%IT101%'
    `);
    console.log('Sessions matching IT101:');
    console.table(sessions);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
