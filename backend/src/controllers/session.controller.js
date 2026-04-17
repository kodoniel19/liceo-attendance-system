const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');

// Get all sessions for instructor's sections
exports.getSessions = async (req, res, next) => {
  try {
    const { sectionId, status, date } = req.query;
    let sql = `
      SELECT cs.*, cs.session_date as sessionDate, cl.section_name as sectionName,
             cl.academic_year as academicYear, cl.semester,
             co.course_code as courseCode, co.course_name as courseName,
             u.first_name as instructorFirst, u.last_name as instructorLast,
             (SELECT COUNT(*) FROM attendance a WHERE a.class_session_id = cs.id AND a.status != 'absent') as presentCount,
             (SELECT COUNT(*) FROM enrollments e WHERE e.class_section_id = cs.class_section_id AND e.status IN ('active', 'pending')) as enrolledCount,
             (SELECT JSON_OBJECT('id', id, 'qrDataUrl', qr_data_url, 'expiresAt', expires_at, 'isActive', is_active) 
              FROM qr_sessions qrs 
              WHERE qrs.class_session_id = cs.id 
              ORDER BY qrs.created_at DESC LIMIT 1) as activeQR
      FROM class_sessions cs
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      JOIN users u ON cl.instructor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'instructor') {
      sql += ' AND cl.instructor_id = ?';
      params.push(req.user.id);
    }

    if (sectionId) {
      sql += ' AND cs.class_section_id = ?';
      params.push(sectionId);
    }

    if (status) {
      sql += ' AND cs.status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND cs.session_date = ?';
      params.push(date);
    }

    sql += ' ORDER BY cs.session_date DESC, cs.created_at DESC LIMIT 100';

    const sessions = await query(sql, params);
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
};

// Get single session
exports.getSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sessions = await query(
      `SELECT cs.*,
              cs.session_date as sessionDate,
              cs.class_section_id as classSectionId,
              cs.late_threshold_minutes as lateThresholdMinutes,
              cs.created_by as createdBy,
              cl.section_name as sectionName,
              cl.academic_year as academicYear,
              cl.semester,
              cl.instructor_id as instructorId,
              co.course_code as courseCode,
              co.course_name as courseName,
              u.first_name as instructorFirst,
              u.last_name as instructorLast
       FROM class_sessions cs
       JOIN class_sections cl ON cs.class_section_id = cl.id
       JOIN courses co ON cl.course_id = co.id
       JOIN users u ON cl.instructor_id = u.id
       WHERE cs.id = ?`,
      [id]
    );

    if (!sessions.length) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const session = sessions[0];

    // Authorization
    if (req.user.role === 'instructor' && session.instructorId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// Create a session
exports.createSession = async (req, res, next) => {
  try {
    const { classSectionId, sessionDate, topic, notes, lateThresholdMinutes } = req.body;

    if (!classSectionId || !sessionDate) {
      return res.status(422).json({ success: false, message: 'Class section and date are required.' });
    }

    // Verify section belongs to instructor
    const sections = await query(
      'SELECT * FROM class_sections WHERE id = ? AND instructor_id = ?',
      [classSectionId, req.user.id]
    );

    if (!sections.length && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized for this section.' });
    }

    const result = await query(
      `INSERT INTO class_sessions (class_section_id, session_date, topic, notes, late_threshold_minutes, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [classSectionId, sessionDate, topic || null, notes || null, lateThresholdMinutes || 15, req.user.id]
    );

    // Auto-create absent records for all enrolled students
    const enrolled = await query(
      'SELECT student_id FROM enrollments WHERE class_section_id = ? AND status = ?',
      [classSectionId, 'active']
    );

    if (enrolled.length) {
      const sessionId = result.insertId;
      const values = enrolled.map(e => `(${e.student_id}, ${sessionId}, 'absent', NOW())`).join(',');
      await query(
        `INSERT IGNORE INTO attendance (student_id, class_session_id, status, created_at) VALUES ${values}`
      );
    }

    const sessions = await query('SELECT * FROM class_sessions WHERE id = ?', [result.insertId]);
    logger.info(`Session created: id=${result.insertId}, section=${classSectionId}`);

    res.status(201).json({ success: true, data: sessions[0] });
  } catch (err) {
    next(err);
  }
};

// Update session status
exports.updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, topic, notes } = req.body;

    const sessions = await query(
      `SELECT cs.*, cl.instructor_id FROM class_sessions cs
       JOIN class_sections cl ON cs.class_section_id = cl.id
       WHERE cs.id = ?`,
      [id]
    );

    if (!sessions.length) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (req.user.role === 'instructor' && sessions[0].instructor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await query(
      'UPDATE class_sessions SET status = COALESCE(?, status), topic = COALESCE(?, topic), notes = COALESCE(?, notes) WHERE id = ?',
      [status || null, topic || null, notes || null, id]
    );

    // If ending session, deactivate all QR codes
    if (status === 'ended') {
      await query('UPDATE qr_sessions SET is_active = FALSE WHERE class_session_id = ?', [id]);
    }

    const updated = await query('SELECT * FROM class_sessions WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    next(err);
  }
};

// Get attendance for a session
exports.getSessionAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { search } = req.query;

    let sql = `
      SELECT a.*,
             a.scan_time as scanTime,
             a.manual_override as manualOverride,
             a.override_by as overrideBy,
             a.override_reason as overrideReason,
             a.class_session_id as classSessionId,
             a.qr_session_id as qrSessionId,
             a.student_id as studentId,
             u.university_id as universityId,
             u.university_id,
             u.first_name as firstName,
             u.last_name as lastName,
             u.email,
             u.profile_photo as profilePhoto
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      WHERE a.class_session_id = ?
    `;
    const params = [id];

    if (search) {
      sql += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.university_id LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY u.last_name ASC, u.first_name ASC';

    const attendance = await query(sql, params);
    res.json({ success: true, data: attendance });
  } catch (err) {
    next(err);
  }
};

exports.deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info(`>>> Attempting delete session: id=${id}, user=${req.user.id}`);
    const sessions = await query(
      `SELECT cs.*, cl.instructor_id FROM class_sessions cs
       JOIN class_sections cl ON cs.class_section_id = cl.id
       WHERE cs.id = ?`,
      [id]
    );

    if (!sessions.length) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (req.user.role === 'instructor' && sessions[0].instructor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Delete attendance then qr_sessions then session
    await query('DELETE FROM attendance WHERE class_session_id = ?', [id]);
    await query('DELETE FROM qr_sessions WHERE class_session_id = ?', [id]);
    await query('DELETE FROM class_sessions WHERE id = ?', [id]);

    res.json({ success: true, message: 'Session deleted.' });
  } catch (err) {
    next(err);
  }
};
