const { query } = require('../config/database');
const logger = require('../utils/logger');

// Get attendance for a student (their own history)
exports.getMyAttendance = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { sectionId, month } = req.query;

    let sql = `
      SELECT a.*, 
             cs.session_date as sessionDate, cs.topic, cs.status as sessionStatus,
             cl.section_name as sectionName, cl.academic_year as academicYear, cl.semester,
             co.course_code as courseCode, co.course_name as courseName
      FROM attendance a
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      WHERE a.student_id = ?
    `;
    const params = [studentId];

    if (sectionId) {
      sql += ' AND cs.class_section_id = ?';
      params.push(sectionId);
    }

    if (month) {
      sql += ' AND DATE_FORMAT(cs.session_date, "%Y-%m") = ?';
      params.push(month);
    }

    sql += ' ORDER BY cs.session_date DESC';

    const attendance = await query(sql, params);
    res.json({ success: true, data: attendance });
  } catch (err) {
    next(err);
  }
};

// Get attendance summary per course for a student
exports.getMyAttendanceSummary = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const summary = await query(`
      SELECT 
        co.course_code   AS courseCode,
        co.course_name   AS courseName,
        cl.section_name  AS sectionName,
        cl.id            AS sectionId,
        COUNT(a.id) AS totalSessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS presentCount,
        SUM(CASE WHEN a.status = 'late'    THEN 1 ELSE 0 END) AS lateCount,
        SUM(CASE WHEN a.status = 'absent'  THEN 1 ELSE 0 END) AS absentCount,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excusedCount,
        ROUND(
          (SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2
        ) AS attendanceRate
      FROM attendance a
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      JOIN enrollments e ON e.class_section_id = cl.id AND e.student_id = a.student_id
      WHERE a.student_id = ? AND cs.status != 'cancelled' AND e.status = 'active'
      GROUP BY cl.id, co.id
    `, [studentId]);

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// Manual override attendance (instructor/admin)
exports.updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['present', 'late', 'absent', 'excused'];
    if (!validStatuses.includes(status)) {
      return res.status(422).json({ success: false, message: 'Invalid status.' });
    }

    const existing = await query(
      `SELECT a.*, cs.id as session_id, cl.instructor_id
       FROM attendance a
       JOIN class_sessions cs ON a.class_session_id = cs.id
       JOIN class_sections cl ON cs.class_section_id = cl.id
       WHERE a.id = ?`,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    const record = existing[0];
    if (req.user.role === 'instructor' && record.instructor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await query(
      `UPDATE attendance SET status = ?, manual_override = TRUE, override_by = ?, override_reason = ?
       WHERE id = ?`,
      [status, req.user.id, reason || null, id]
    );

    logger.info(`Attendance override: id=${id}, status=${status}, by=${req.user.id}`);

    const updated = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    next(err);
  }
};

// Get attendance stats for a section (instructor dashboard)
exports.getSectionAttendanceStats = async (req, res, next) => {
  try {
    const { sectionId } = req.params;

    const stats = await query(`
      SELECT 
        u.id,
        u.university_id  AS universityId,
        u.first_name     AS firstName,
        u.last_name      AS lastName,
        COUNT(a.id) AS totalSessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS presentCount,
        SUM(CASE WHEN a.status = 'late'    THEN 1 ELSE 0 END) AS lateCount,
        SUM(CASE WHEN a.status = 'absent'  THEN 1 ELSE 0 END) AS absentCount,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excusedCount,
        ROUND(
          (SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2
        ) AS attendanceRate
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN class_sessions cs ON cs.class_section_id = e.class_section_id AND cs.status != 'cancelled'
      LEFT JOIN attendance a ON a.student_id = u.id AND a.class_session_id = cs.id
      WHERE e.class_section_id = ? AND e.status = 'active'
      GROUP BY u.id
      ORDER BY u.last_name ASC
    `, [sectionId]);

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// ── Manual attendance by instructor ────────────────────────────
exports.manualAttendance = async (req, res, next) => {
  try {
    const { sessionId, studentId, status, reason } = req.body;
    if (!sessionId || !studentId || !status) {
      return res.status(422).json({ success: false, message: 'sessionId, studentId and status are required.' });
    }
    // Upsert attendance record
    const existing = await query(
      'SELECT id FROM attendance WHERE class_session_id=? AND student_id=?',
      [sessionId, studentId]
    );
    if (existing.length) {
      await query(
        'UPDATE attendance SET status=?, override_reason=?, updated_at=NOW() WHERE id=?',
        [status, reason || 'Manual override by instructor', existing[0].id]
      );
    } else {
      await query(
        'INSERT INTO attendance (student_id, class_session_id, status, override_reason) VALUES (?,?,?,?)',
        [studentId, sessionId, status, reason || 'Manual override by instructor']
      );
    }
    // Log override
    logger.info(`Manual attendance: session=${sessionId} student=${studentId} status=${status} by instructor=${req.user.id}`);
    const [record] = await query('SELECT * FROM attendance WHERE class_session_id=? AND student_id=?', [sessionId, studentId]);
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

