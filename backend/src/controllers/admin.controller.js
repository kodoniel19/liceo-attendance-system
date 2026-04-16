const { query } = require('../config/database');
const logger = require('../utils/logger');
const { getPHTNow } = require('../utils/time');

// FEATURE #1: At-Risk Monitoring
exports.getAtRiskStudents = async (req, res, next) => {
  try {
    const threshold = 75; // 75% threshold
    
    const students = await query(`
      SELECT 
        student_id as id, universityId, firstName, lastName,
        ROUND(AVG(attendanceRate), 2) as overallRate,
        COUNT(section_id) as totalSubjects
      FROM (
        SELECT 
          u.id as student_id, 
          u.university_id as universityId, 
          u.first_name as firstName, 
          u.last_name as lastName,
          cl.id as section_id,
          (
            SELECT (SUM(CASE WHEN att.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(sess.id)) * 100
            FROM class_sessions sess
            LEFT JOIN attendance att ON sess.id = att.class_session_id AND att.student_id = u.id
            WHERE sess.class_section_id = cl.id AND sess.status = 'ended'
          ) as attendanceRate
        FROM users u
        JOIN enrollments e ON u.id = e.student_id AND e.status = 'active'
        JOIN class_sections cl ON e.class_section_id = cl.id
        WHERE u.role = 'student'
      ) per_section
      WHERE attendanceRate IS NOT NULL
      GROUP BY student_id
      HAVING overallRate < ?
      ORDER BY overallRate ASC
    `, [threshold]);

    res.json({ success: true, data: students });
  } catch (err) { 
    logger.error('Error fetching at-risk students:', err);
    next(err); 
  }
};

// FEATURE #5: Global Broadcast Creation
exports.createGlobalAnnouncement = async (req, res, next) => {
  try {
    const { title, content, targetRole } = req.body;
    const adminId = req.user.id;
    const nowPHT = getPHTNow();

    const result = await query(
      'INSERT INTO announcements (instructor_id, title, content, is_global, target_role, created_at) VALUES (?, ?, ?, TRUE, ?, ?)',
      [adminId, title, content, targetRole || 'all', nowPHT]
    );

    res.json({ success: true, message: 'Global broadcast sent successfully', id: result.insertId });
  } catch (err) { next(err); }
};

// FEATURE: View Student Record History
exports.getStudentAttendanceHistory = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    
    // Validate student exists
    const user = await query('SELECT id FROM users WHERE id = ? AND role = "student"', [studentId]);
    if (!user.length) return res.status(404).json({ success: false, message: 'Student not found' });

    // Fetch history across all subjects
    const history = await query(`
      SELECT 
          att.id,
          sess.start_time as sessionDate,
          c.code as courseCode,
          c.name as courseName,
          cl.name as sectionName,
          att.status,
          att.remarks
      FROM attendance att
      JOIN class_sessions sess ON att.class_session_id = sess.id
      JOIN class_sections cl ON sess.class_section_id = cl.id
      JOIN courses c ON cl.course_id = c.id
      WHERE att.student_id = ? AND sess.status = 'ended'
      ORDER BY sess.start_time DESC
    `, [studentId]);

    res.json({ success: true, data: history });
  } catch (err) {
    logger.error('Error fetching student history for admin:', err);
    next(err);
  }
};
