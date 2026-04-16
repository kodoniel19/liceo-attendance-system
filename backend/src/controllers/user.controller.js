const { query } = require('../config/database');

// ── Get all users (admin only) ─────────────────────────────────
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, isActive } = req.query;
    let sql = `SELECT id, university_id, email, first_name, last_name, role,
                      department, is_active, email_verified, created_at
               FROM users WHERE 1=1`;
    const params = [];
    if (role)     { sql += ' AND role = ?';            params.push(role); }
    if (isActive !== undefined) { sql += ' AND is_active = ?'; params.push(isActive === 'true' ? 1 : 0); }
    if (search)   {
      sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR university_id LIKE ?)';
      const s = `%${search}%`; params.push(s, s, s, s);
    }
    sql += ' ORDER BY created_at DESC';
    const users = await query(sql, params);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// ── Update user (admin only) ───────────────────────────────────
exports.updateUserAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, department, isActive, universityId, email, password } = req.body;
    
    // Start building query
    let updateParts = [
      'first_name = COALESCE(?, first_name)',
      'last_name = COALESCE(?, last_name)',
      'role = COALESCE(?, role)',
      'department = COALESCE(?, department)',
      'is_active = COALESCE(?, is_active)',
      'university_id = COALESCE(?, university_id)',
      'email = COALESCE(?, email)'
    ];
    let queryParams = [
      firstName || null, lastName || null, role || null, department || null,
      isActive !== undefined ? (isActive ? 1 : 0) : null, universityId || null, email || null
    ];

    // Handle Password Force-Reset
    if (password && password.trim().length >= 8) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password, 12);
      updateParts.push('password_hash = ?');
      queryParams.push(hash);
    }

    queryParams.push(id);
    await query(`UPDATE users SET ${updateParts.join(', ')} WHERE id = ?`, queryParams);
    const [user] = await query('SELECT * FROM users WHERE id = ?', [id]);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// ── Deactivate user (admin only) ───────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
    }
    const [user] = await query('SELECT is_active FROM users WHERE id=?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) { next(err); }
};

// ── Toggle user active/inactive (admin only) ────────────────────
exports.toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own status.' });
    }
    const [user] = await query('SELECT is_active FROM users WHERE id=?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const newStatus = user.is_active ? 0 : 1;
    await query('UPDATE users SET is_active=? WHERE id=?', [newStatus, id]);
    res.json({ success: true, data: { isActive: !!newStatus }, message: `User ${newStatus ? 'activated' : 'deactivated'}.` });
  } catch (err) { next(err); }
};

// ── Create user (admin only) ───────────────────────────────────
exports.createUser = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { universityId, email, password, firstName, lastName, role, department } = req.body;

    if (!universityId || !email || !password || !firstName || !lastName || !role) {
      return res.status(422).json({ success: false, message: 'universityId, email, password, firstName, lastName, role are required.' });
    }
    if (password.length < 8) {
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // Check duplicates
    const existing = await query('SELECT id FROM users WHERE email=? OR university_id=?', [email, universityId]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email or University ID already in use.' });
    }

    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const result = await query(
      `INSERT INTO users (university_id, email, password_hash, first_name, last_name, role, department, is_active, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [universityId, email, hash, firstName, lastName, role, department || null]
    );
    const [created] = await query('SELECT id,university_id,email,first_name,last_name,role,department,is_active FROM users WHERE id=?', [result.insertId]);
    res.status(201).json({ success: true, data: created, message: 'User created successfully.' });
  } catch (err) { next(err); }
};


// ── System stats (admin only) ──────────────────────────────────
exports.getSystemStats = async (req, res, next) => {
  try {
    const [users]    = await query('SELECT COUNT(*) as total, SUM(role="student") as students, SUM(role="instructor") as instructors, SUM(role="admin") as admins FROM users');
    const [courses]  = await query('SELECT COUNT(*) as total FROM courses');
    const [sections] = await query('SELECT COUNT(*) as total FROM class_sections WHERE is_active=1');
    const [sessions] = await query('SELECT COUNT(*) as total, SUM(status="active") as active FROM class_sessions');
    const [attend]   = await query('SELECT COUNT(*) as total FROM attendance');

    res.json({ success: true, data: { users, courses, sections, sessions, attend } });
  } catch (err) { next(err); }
};

// ── Get profile ────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const [user] = await query(
      'SELECT id, university_id, email, first_name, last_name, middle_name, role, department, profile_photo, is_active, email_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// ── Update own profile ─────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, middleName, department, universityId } = req.body;
    await query(
      `UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name),
       middle_name=COALESCE(?,middle_name), department=COALESCE(?,department),
       university_id=COALESCE(?,university_id) WHERE id=?`,
      [firstName, lastName, middleName, department, universityId, req.user.id]
    );
    const [user] = await query('SELECT * FROM users WHERE id=?', [req.user.id]);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// ── Change password ────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { currentPassword, newPassword } = req.body;
    const [user] = await query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) { next(err); }
};

// ── Get my enrollments ─────────────────────────────────────────
exports.getMyEnrollments = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT cl.*, cl.section_name as sectionName, co.course_code as courseCode, co.course_name as courseName,
              u.first_name as instructorFirst, u.last_name as instructorLast, e.status as enrollmentStatus
       FROM enrollments e
       JOIN class_sections cl ON e.class_section_id = cl.id
       JOIN courses co ON cl.course_id = co.id
       JOIN users u ON cl.instructor_id = u.id
       WHERE e.student_id = ? AND e.status IN ('active', 'pending') AND cl.is_active = TRUE`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
