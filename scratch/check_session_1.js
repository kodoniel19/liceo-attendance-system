const { query } = require('../backend/src/config/database');

async function debug() {
  try {
    const sessionId = 1;
    const records = await query(`
      SELECT a.*, u.university_id, u.first_name, u.last_name
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      WHERE a.class_session_id = ?
    `, [sessionId]);
    
    console.log(`Attendance records for Session ${sessionId}:`);
    console.table(records.map(r => ({
      stdId: r.student_id,
      name: `${r.first_name} ${r.last_name}`,
      status: r.status,
      scan_time: r.scan_time,
      ip: r.ip_address
    })));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
