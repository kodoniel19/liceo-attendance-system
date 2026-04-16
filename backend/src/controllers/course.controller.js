const { query } = require('../config/database');
const logger = require('../utils/logger');

exports.getCourses = async (req, res, next) => {
  try {
    const { search, department, isActive, all } = req.query;
    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (search) { 
      sql += ' AND (course_code LIKE ? OR course_name LIKE ?)'; 
      const s = `%${search}%`; 
      params.push(s, s); 
    }
    if (department) { 
      sql += ' AND department = ?'; 
      params.push(department); 
    }
    
    // If 'all' is not present, apply is_active and default to 1 (active only)
    if (all !== 'true') {
      if (isActive !== undefined) { 
        sql += ' AND is_active = ?'; 
        params.push(isActive === 'true' ? 1 : 0); 
      } else {
        sql += ' AND is_active = 1';
      }
    }
    
    sql += ' ORDER BY course_code ASC';
    const courses = await query(sql, params);
    res.json({ success: true, data: courses });
  } catch (err) { next(err); }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { courseCode, courseName, description, units, department } = req.body;
    if (!courseCode || !courseName) {
      return res.status(422).json({ success: false, message: 'Course code and name required.' });
    }
    const result = await query(
      'INSERT INTO courses (course_code, course_name, description, units, department) VALUES (?, ?, ?, ?, ?)',
      [courseCode, courseName, description || null, units || 3, department || null]
    );
    const course = await query('SELECT * FROM courses WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: course[0] });
  } catch (err) { next(err); }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courseName, description, units, department, isActive } = req.body;
    await query(
      'UPDATE courses SET course_name = COALESCE(?, course_name), description = COALESCE(?, description), units = COALESCE(?, units), department = COALESCE(?, department), is_active = COALESCE(?, is_active) WHERE id = ?',
      [courseName, description, units, department, isActive !== undefined ? isActive : null, id]
    );
    const course = await query('SELECT * FROM courses WHERE id = ?', [id]);
    res.json({ success: true, data: course[0] });
  } catch (err) { next(err); }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Safety check: Cannot archive a course that has active sections
    const activeSections = await query('SELECT id FROM class_sections WHERE course_id = ? AND is_active = 1 LIMIT 1', [id]);
    if (activeSections.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete/archive this course because it has active class sections. Please archive the sections first.' 
      });
    }

    // We now use soft-delete by default
    await query('UPDATE courses SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Course moved to archive.' });
  } catch (err) { next(err); }
};

exports.restoreCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('UPDATE courses SET is_active = 1 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Course restored successfully.' });
  } catch (err) { next(err); }
};

exports.hardDeleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check for ANY sections (even inactive ones) to prevent orphan records
    const sections = await query('SELECT id FROM class_sections WHERE course_id = ? LIMIT 1', [id]);
    if (sections.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'This course has history (class sections) and cannot be permanently removed. Use Archiving instead.' 
      });
    }

    await query('DELETE FROM courses WHERE id = ?', [id]);
    res.json({ success: true, message: 'Course permanently deleted.' });
  } catch (err) { next(err); }
};
