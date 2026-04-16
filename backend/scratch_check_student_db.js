const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 1. Find the student
    const [students] = await connection.execute(
      "SELECT id, first_name, last_name FROM users WHERE first_name LIKE '%Doniel%' OR last_name LIKE '%Ko%'"
    );
    console.log('>>> Students:', students);

    if (students.length === 0) return;
    const studentId = students[0].id;

    // 2. Find their enrollments and section status
    const [rows] = await connection.execute(`
      SELECT e.id as enrollmentId, e.status as enrollmentStatus, 
             cl.id as sectionId, cl.section_name, cl.is_active as sectionIsActive,
             co.course_code
      FROM enrollments e
      JOIN class_sections cl ON e.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      WHERE e.student_id = ?
    `, [studentId]);

    console.log('>>> Enrollments for student:', rows);

  } finally {
    await connection.end();
  }
}

check();
