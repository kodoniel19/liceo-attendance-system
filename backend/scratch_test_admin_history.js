const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    const config = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };
    const pool = mysql.createPool(config);

    const [rows] = await pool.query(`
      SELECT 
          att.id,
          sess.start_time as sessionDate,
          c.course_code as courseCode,
          c.course_name as courseName,
          cl.section_name as sectionName,
          att.status,
          att.remarks
      FROM attendance att
      JOIN class_sessions sess ON att.class_session_id = sess.id
      JOIN class_sections cl ON sess.class_section_id = cl.id
      JOIN courses c ON cl.course_id = c.id
      WHERE att.student_id = 9 AND sess.status = 'ended'
      ORDER BY sess.start_time DESC
    `);
    console.log("History records:", rows.length);
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
