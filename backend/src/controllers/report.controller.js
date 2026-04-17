const { query } = require('../config/database');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { format } = require('date-fns');

// Generate attendance report data
exports.getAttendanceReport = async (req, res, next) => {
  try {
    const { sectionId, studentId, startDate, endDate, groupBy } = req.query;

    let sql = `
      SELECT 
        u.university_id, u.first_name, u.last_name,
        co.course_code, co.course_name,
        cl.section_name, cl.academic_year, cl.semester,
        cs.session_date, cs.topic,
        a.status, a.scan_time, a.manual_override
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'instructor') {
      sql += ' AND cl.instructor_id = ?';
      params.push(req.user.id);
    }

    if (sectionId) { sql += ' AND cl.id = ?'; params.push(sectionId); }
    if (studentId) { sql += ' AND u.id = ?'; params.push(studentId); }
    if (startDate) { sql += ' AND cs.session_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND cs.session_date <= ?'; params.push(endDate); }

    sql += ' ORDER BY cs.session_date DESC, u.last_name ASC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

// Export to Excel
exports.exportExcel = async (req, res, next) => {
  try {
    const { sectionId, startDate, endDate } = req.query;
    let studentId = req.query.studentId;

    if (req.user.role === 'student') {
      studentId = req.user.id;
    }

    let sql = `
      SELECT 
        u.university_id AS 'Student ID',
        CONCAT(u.last_name, ', ', u.first_name) AS 'Student Name',
        co.course_code AS 'Course',
        cl.section_name AS 'Section',
        DATE_FORMAT(cs.session_date, '%Y-%m-%d') AS 'Date',
        cs.topic AS 'Topic',
        a.status AS 'Status',
        DATE_FORMAT(a.scan_time, '%H:%i:%s') AS 'Scan Time',
        IF(a.manual_override, 'Yes', 'No') AS 'Manual Override'
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'instructor') { sql += ' AND cl.instructor_id = ?'; params.push(req.user.id); }
    if (sectionId) { sql += ' AND cl.id = ?'; params.push(sectionId); }
    if (studentId) { sql += ' AND u.id = ?'; params.push(studentId); }
    if (startDate) { sql += ' AND cs.session_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND cs.session_date <= ?'; params.push(endDate); }
    sql += ' ORDER BY cs.session_date DESC, u.last_name ASC';

    const rows = await query(sql, params);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Style header row
    ws['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 15 },
      { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// Export to PDF
exports.exportPDF = async (req, res, next) => {
  try {
    const { sectionId, startDate, endDate } = req.query;
    let studentId = req.query.studentId;

    if (req.user.role === 'student') {
      studentId = req.user.id;
    }

    let sql = `
      SELECT 
        u.university_id, u.first_name, u.last_name,
        co.course_code, cl.section_name,
        cs.session_date, a.status, a.scan_time
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN class_sections cl ON cs.class_section_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'instructor') { sql += ' AND cl.instructor_id = ?'; params.push(req.user.id); }
    if (sectionId) { sql += ' AND cl.id = ?'; params.push(sectionId); }
    if (studentId) { sql += ' AND u.id = ?'; params.push(studentId); }
    if (startDate) { sql += ' AND cs.session_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND cs.session_date <= ?'; params.push(endDate); }
    sql += ' ORDER BY cs.session_date DESC, u.last_name ASC LIMIT 500';

    const rows = await query(sql, params);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${format(new Date(), 'yyyyMMdd')}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).fillColor('#8B1A1A').text('Liceo de Cagayan University', { align: 'center' });
    doc.fontSize(13).fillColor('#C9A227').text('Attendance Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#666').text(`Generated: ${format(new Date(), 'PPpp')}`, { align: 'right' });
    doc.moveDown();

    // Table header
    const colX = [50, 110, 240, 290, 340, 410];
    const headers = ['Univ ID', 'Student Name', 'Course', 'Section', 'Date', 'Status'];
    
    doc.fontSize(10).fillColor('#8B1A1A');
    const hY = doc.y;
    headers.forEach((h, i) => {
      doc.text(h, colX[i], hY, { width: colX[i + 1] ? colX[i + 1] - colX[i] : 100, font: 'Helvetica-Bold' });
    });
    
    // Header underline
    doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).lineWidth(1).strokeColor('#8B1A1A').stroke();
    doc.moveDown(0.8);

    // Rows
    rows.forEach((row, idx) => {
      const y = doc.y;
      if (idx % 2 === 0) {
        doc.rect(50, y, 510, 16).fill('#f1f5f9');
      }
      const statusColor = row.status === 'present' ? '#10b981' : row.status === 'late' ? '#f59e0b' : '#ef4444';
      doc.fillColor('#334155').fontSize(8);
      doc.text(row.university_id || '', colX[0], y + 3, { width: 55 });
      doc.text(`${row.last_name}, ${row.first_name}`, colX[1], y + 3, { width: 125 });
      doc.text(row.course_code || '', colX[2], y + 3, { width: 45 });
      doc.text(row.section_name || '', colX[3], y + 3, { width: 45 });
      doc.text(row.session_date ? format(new Date(row.session_date), 'MM/dd/yy') : '', colX[4], y + 3, { width: 65 });
      doc.fillColor(statusColor).text((row.status || '').toUpperCase(), colX[5], y + 3, { width: 65 });
      doc.moveDown(0.4);

      if (doc.y > 720) doc.addPage();
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

// Dashboard summary stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let stats = {};

    if (role === 'instructor') {
      const [sections, sessions, todayAttendance, sectionPerformance] = await Promise.all([
        query('SELECT COUNT(*) as count FROM class_sections WHERE instructor_id = ? AND is_active = TRUE', [userId]),
        query(`SELECT COUNT(*) as count FROM class_sessions cs
               JOIN class_sections cl ON cs.class_section_id = cl.id
               WHERE cl.instructor_id = ? AND cs.status = 'active'`, [userId]),
        query(`SELECT 
                 COUNT(*) as total,
                 SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) as present,
                 SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                 SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent
               FROM attendance a
               JOIN class_sessions cs ON a.class_session_id = cs.id
               JOIN class_sections cl ON cs.class_section_id = cl.id
               WHERE cl.instructor_id = ? AND cs.session_date = CURDATE()`, [userId]),
        query(`SELECT 
                 co.course_code as label,
                 ROUND((SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 1) as rate
               FROM class_sections cl
               JOIN courses co ON cl.course_id = co.id
               JOIN class_sessions cs ON cs.class_section_id = cl.id
               JOIN attendance a ON a.class_session_id = cs.id
               WHERE cl.instructor_id = ? AND cs.status = 'ended'
               GROUP BY cl.id
               LIMIT 10`, [userId])
      ]);

      stats = {
        totalSections: sections[0].count,
        activeSessions: sessions[0].count,
        todayStats: todayAttendance[0],
        sectionPerformance
      };
    } else if (role === 'student') {
      const [enrolled, attendanceStats] = await Promise.all([
        query('SELECT COUNT(*) as count FROM enrollments e INNER JOIN class_sections cl ON e.class_section_id = cl.id WHERE e.student_id = ? AND e.status = "active" AND cl.is_active = TRUE', [userId]),
        query(`SELECT 
                 SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                 SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                 SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
                 SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused,
                 ROUND(
                   (SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2
                 ) as rate
               FROM attendance a 
               JOIN class_sessions cs ON a.class_session_id = cs.id
               JOIN enrollments e ON e.class_section_id = cs.class_section_id AND e.student_id = a.student_id
               WHERE a.student_id = ? AND e.status = "active" AND cs.status != "cancelled"`, [userId])
      ]);

      stats = {
        enrolledCourses: enrolled[0].count,
        attendanceRate: attendanceStats[0].rate || 0,
        distribution: {
          present: attendanceStats[0].present || 0,
          late: attendanceStats[0].late || 0,
          absent: attendanceStats[0].absent || 0,
          excused: attendanceStats[0].excused || 0
        }
      };
    } else if (role === 'admin') {
      const [users, students, instructors, activeSessions, weeklySessions] = await Promise.all([
        query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'),
        query('SELECT COUNT(*) as count FROM users WHERE role = "student" AND is_active = TRUE'),
        query('SELECT COUNT(*) as count FROM users WHERE role = "instructor" AND is_active = TRUE'),
        query('SELECT COUNT(*) as count FROM class_sessions WHERE status = "active"'),
        query(`SELECT DATE_FORMAT(session_date, '%m-%d') as label, COUNT(*) as count 
               FROM class_sessions 
               WHERE session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
               GROUP BY session_date
               ORDER BY session_date ASC`)
      ]);

      stats = {
        totalUsers: users[0].count,
        totalStudents: students[0].count,
        totalInstructors: instructors[0].count,
        activeSessions: activeSessions[0].count,
        weeklySessions
      };
    }

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};
