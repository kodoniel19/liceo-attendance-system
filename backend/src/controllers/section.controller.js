const { query } = require('../config/database');
const logger = require('../utils/logger');

exports.getSections = async (req, res, next) => {
  try {
    const { courseId, instructorId, semester, academicYear, isActive, all } = req.query;
    let sql = `
      SELECT cl.*,
             cl.section_name as sectionName,
             cl.academic_year as academicYear,
             cl.schedule_day as scheduleDay,
             cl.schedule_time_start as scheduleTimeStart,
             cl.schedule_time_end as scheduleTimeEnd,
             cl.max_students as maxStudents,
             cl.course_id as courseId,
             cl.instructor_id as instructorId,
             cl.is_active as isActive,
             co.course_code as courseCode,
             co.course_name as courseName,
             co.units as units,
             u.first_name as instructorFirst,
             u.last_name as instructorLast,
             (SELECT COUNT(*) FROM enrollments e WHERE e.class_section_id = cl.id AND e.status = 'active') as enrolledCount
      FROM class_sections cl
      JOIN courses co ON cl.course_id = co.id
      JOIN users u ON cl.instructor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Apply is_active filtering if 'all' is not true
    if (all !== 'true') {
      if (isActive !== undefined) {
        sql += ' AND cl.is_active = ?';
        params.push(isActive === 'true' ? 1 : 0);
      } else {
        sql += ' AND cl.is_active = 1';
      }
    }

    if (req.user.role === 'instructor') {
      sql += ' AND cl.instructor_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'student') {
      sql += ' AND cl.id IN (SELECT class_section_id FROM enrollments WHERE student_id = ? AND status = "active")';
      params.push(req.user.id);
    }

    if (courseId) { sql += ' AND cl.course_id = ?'; params.push(courseId); }
    if (instructorId) { sql += ' AND cl.instructor_id = ?'; params.push(instructorId); }
    if (semester) { sql += ' AND cl.semester = ?'; params.push(semester); }
    if (academicYear) { sql += ' AND cl.academic_year = ?'; params.push(academicYear); }

    sql += ' ORDER BY co.course_code, cl.section_name';
    const sections = await query(sql, params);
    res.json({ success: true, data: sections });
  } catch (err) { next(err); }
};

exports.getSection = async (req, res, next) => {
  try {
    const sections = await query(
      `SELECT cl.*, co.course_code, co.course_name, co.units,
              u.first_name as instructor_first, u.last_name as instructor_last
       FROM class_sections cl
       JOIN courses co ON cl.course_id = co.id
       JOIN users u ON cl.instructor_id = u.id
       WHERE cl.id = ?`,
      [req.params.id]
    );
    if (!sections.length) return res.status(404).json({ success: false, message: 'Section not found.' });
    res.json({ success: true, data: sections[0] });
  } catch (err) { next(err); }
};

exports.createSection = async (req, res, next) => {
  try {
    const { courseId, instructorId, sectionName, academicYear, semester, scheduleDay, scheduleTimeStart, scheduleTimeEnd, room, maxStudents } = req.body;
    const instructor = req.user.role === 'admin' ? instructorId : req.user.id;
    const result = await query(
      `INSERT INTO class_sections (course_id, instructor_id, section_name, academic_year, semester, schedule_day, schedule_time_start, schedule_time_end, room, max_students)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [courseId || null, instructor || null, sectionName || null, academicYear || null, semester || null, scheduleDay || null, scheduleTimeStart || null, scheduleTimeEnd || null, room || null, maxStudents || 40]
    );
    const section = await query('SELECT * FROM class_sections WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: section[0] });
  } catch (err) { next(err); }
};

exports.updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courseId, sectionName, academicYear, semester, scheduleDay, scheduleTimeStart, scheduleTimeEnd, room, maxStudents } = req.body;

    if (req.user.role === 'instructor') {
      const [sec] = await query('SELECT instructor_id FROM class_sections WHERE id=?', [id]);
      if (!sec || sec.instructor_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You do not own this section.' });
      }
    }

    await query(
      `UPDATE class_sections SET
         course_id          = COALESCE(?, course_id),
         section_name       = COALESCE(?, section_name),
         academic_year      = COALESCE(?, academic_year),
         semester           = COALESCE(?, semester),
         schedule_day       = COALESCE(?, schedule_day),
         schedule_time_start = COALESCE(?, schedule_time_start),
         schedule_time_end   = COALESCE(?, schedule_time_end),
         room               = ?,
         max_students       = COALESCE(?, max_students)
       WHERE id = ?`,
      [courseId || null, sectionName || null, academicYear || null, semester || null, scheduleDay || null,
       scheduleTimeStart || null, scheduleTimeEnd || null, room || null, maxStudents || null, id]
    );

    const [updated] = await query(
      `SELECT cl.*, co.course_code as courseCode, co.course_name as courseName
       FROM class_sections cl JOIN courses co ON cl.course_id = co.id WHERE cl.id=?`, [id]
    );
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.enrollStudent = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { studentId } = req.body;

    const existing = await query(
      'SELECT id, status FROM enrollments WHERE student_id = ? AND class_section_id = ?',
      [studentId, sectionId]
    );

    if (existing.length) {
      if (existing[0].status === 'active') {
        return res.status(409).json({ success: false, message: 'Student already enrolled.' });
      } else {
        // Re-activate a dropped or incomplete enrollment
        await query(
          "UPDATE enrollments SET status = 'active', enrollment_date = CURDATE() WHERE id = ?",
          [existing[0].id]
        );
        return res.json({ success: true, message: 'Student enrollment reactivated.' });
      }
    }

    await query(
      'INSERT INTO enrollments (student_id, class_section_id, enrollment_date, status) VALUES (?, ?, CURDATE(), "pending")',
      [studentId, sectionId]
    );
    res.status(201).json({ success: true, message: 'Invitation sent to student.' });
  } catch (err) { next(err); }
};

exports.respondToEnrollment = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const studentId = req.user.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action.' });
    }

    const status = action === 'accept' ? 'active' : 'declined';
    
    const result = await query(
      "UPDATE enrollments SET status = ? WHERE student_id = ? AND class_section_id = ? AND status = 'pending'",
      [status, studentId, sectionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'No pending invitation found.' });
    }

    res.json({ success: true, message: `Class invitation ${action}ed.` });
  } catch (err) { next(err); }
};

exports.getSectionStudents = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const students = await query(
      `SELECT u.id, u.university_id, u.first_name, u.last_name, u.email, e.status, e.enrollment_date
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.class_section_id = ? AND e.status IN ('active', 'pending')
       ORDER BY u.last_name`,
      [sectionId]
    );
    res.json({ success: true, data: students });
  } catch (err) { next(err); }
};

exports.getAnnouncements = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const announcements = await query(
      `SELECT a.*, u.first_name, u.last_name 
       FROM announcements a 
       JOIN users u ON a.instructor_id = u.id 
       WHERE a.class_section_id = ? 
       ORDER BY a.created_at DESC`,
      [sectionId]
    );
    res.json({ success: true, data: announcements });
  } catch (err) { next(err); }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { title, content, isGlobal } = req.body;
    const instructorId = req.user.id;

    const result = await query(
      'INSERT INTO announcements (class_section_id, instructor_id, title, content, is_global) VALUES (?, ?, ?, ?, ?)',
      [isGlobal ? null : sectionId, instructorId, title, content, isGlobal || false]
    );

    res.json({ success: true, message: 'Announcement created successfully', id: result.insertId });
  } catch (err) { next(err); }
};

exports.unenrollStudent = async (req, res, next) => {
  try {
    const { sectionId, studentId } = req.params;
    await query(
      "UPDATE enrollments SET status='dropped' WHERE student_id=? AND class_section_id=?",
      [studentId, sectionId]
    );
    res.json({ success: true, message: 'Student removed from section.' });
  } catch (err) { next(err); }
};

exports.getAvailableStudents = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { search } = req.query;
    let sql = `SELECT id, university_id, first_name, last_name, email
               FROM users
               WHERE role = 'student' AND is_active = 1
               AND id NOT IN (
                 SELECT student_id FROM enrollments
                 WHERE class_section_id = ? AND status = 'active'
               )`;
    const params = [sectionId];
    if (search) {
      sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR university_id LIKE ? OR email LIKE ?)';
      const s = `%${search}%`; params.push(s, s, s, s);
    }
    sql += ' ORDER BY last_name ASC LIMIT 100';
    const students = await query(sql, params);
    res.json({ success: true, data: students });
  } catch (err) { next(err); }
};

exports.deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info(`>>> Deactivating section: id=${id}, user=${req.user.id}`);
    
    // Check ownership if instructor
    if (req.user.role === 'instructor') {
      const [sec] = await query('SELECT instructor_id FROM class_sections WHERE id=?', [id]);
      if (!sec || sec.instructor_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You do not own this section.' });
      }
    }

    // Safety check: Don't archive if there are recent active sessions
    // (If user really wants to archive, they should probably delete sessions first or we just warn)
    // For now, let's block it to be safe as per user request
    const sessions = await query('SELECT id FROM class_sessions WHERE class_section_id = ? LIMIT 1', [id]);
    if (sessions.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete/archive this section because it already has attendance sessions. Please contact the administrator for manual data removal.' 
      });
    }

    // Soft delete: keep row but hide it
    await query('UPDATE class_sections SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Section archived successfully.' });
  } catch (err) { next(err); }
};

exports.restoreSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('UPDATE class_sections SET is_active = 1 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Section restored successfully.' });
  } catch (err) { next(err); }
};

exports.hardDeleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if it has any attendance records or enrollments that would prevent deletion
    // Usually if it's in the recycle bin it's already passed soft-delete checks
    // But we check again for safety
    const sessions = await query('SELECT id FROM class_sessions WHERE class_section_id = ? LIMIT 1', [id]);
    if (sessions.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'This section has session data and cannot be permanently deleted. Only empty sections can be hard-deleted.' 
      });
    }

    await query('DELETE FROM class_sections WHERE id = ?', [id]);
    res.json({ success: true, message: 'Section permanently deleted.' });
  } catch (err) { next(err); }
};

exports.getMyEnrolledSections = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const records = await query(`
      SELECT cl.*, co.course_code as courseCode, co.course_name as courseName,
             u.first_name as instructorFirst, u.last_name as instructorLast,
             e.status as enrollmentStatus
      FROM enrollments e
      JOIN class_sections cl ON e.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      JOIN users u ON cl.instructor_id = u.id
      WHERE e.student_id = ? AND e.status IN ('active', 'pending') AND cl.is_active = TRUE
      ORDER BY co.course_code ASC
    `, [studentId]);
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
};

exports.getMyAnnouncements = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const studentId = req.user.id;
    
    // Updated query to include global announcements
    const announcements = await query(`
      SELECT a.id, a.title, a.content, a.created_at,
             cl.id as sectionId, cl.section_name as sectionName,
             co.course_code as courseCode,
             u.first_name as instructorFirst, u.last_name as instructorLast,
             a.is_global as isGlobal
      FROM announcements a
      LEFT JOIN class_sections cl ON a.class_section_id = cl.id
      LEFT JOIN courses co ON cl.course_id = co.id
      INNER JOIN users u ON a.instructor_id = u.id
      WHERE (
        a.class_section_id IN (
          SELECT e.class_section_id FROM enrollments e
          JOIN class_sections cl ON e.class_section_id = cl.id
          WHERE e.student_id = ? AND e.status = 'active' AND cl.is_active = TRUE
        )
        OR a.is_global = TRUE
      )
      ORDER BY a.created_at DESC
    `, [studentId]);

    res.json({ success: true, data: announcements });
  } catch (err) { next(err); }
};
