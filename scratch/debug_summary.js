const { query } = require('./backend/src/config/database');

async function debug() {
  try {
    const studentId = 1; // Assuming student ID 1 for testing
    const summary = await query(`
      SELECT 
        co.course_code   AS courseCode,
        co.course_name   AS courseName,
        cl.section_name  AS sectionName,
        cl.id            AS sectionId,
        cl.schedule      AS schedule,
        cl.room          AS room,
        COUNT(a.id) AS totalSessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS presentCount,
        SUM(CASE WHEN a.status = 'late'    THEN 1 ELSE 0 END) AS lateCount,
        SUM(CASE WHEN a.status = 'absent'  THEN 1 ELSE 0 END) AS absentCount,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excusedCount,
        COALESCE(
          ROUND(
            (SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100, 2
          ), 0.00
        ) AS attendanceRate,
        u.first_name AS instructorFirst,
        u.last_name AS instructorLast
      FROM enrollments e
      JOIN class_sections cl ON e.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      JOIN users u ON cl.instructor_id = u.id
      LEFT JOIN class_sessions cs ON cs.class_section_id = cl.id AND cs.status != 'cancelled'
      LEFT JOIN attendance a ON a.class_session_id = cs.id AND a.student_id = e.student_id
      WHERE e.student_id = ? 
      GROUP BY cl.id, co.id, u.id, cl.schedule, cl.room
    `, [studentId]);

    console.log('SUMMARY RESULTS:', summary);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

debug();
