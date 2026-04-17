const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');

// Generate HMAC signature for QR token security
const signQRToken = (token, sessionId, expiresAt) => {
  const data = `${token}:${sessionId}:${expiresAt}`;
  return crypto.createHmac('sha256', process.env.QR_SECRET || 'default-secret')
    .update(data)
    .digest('hex');
};

// Generate QR Code for a class session
exports.generateQR = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const expirationMinutes = parseFloat(req.body.expirationMinutes) || parseInt(process.env.QR_DEFAULT_EXPIRY_MINUTES) || 15;
    const expirationSeconds = parseInt(req.body.expirationSeconds) || (expirationMinutes * 60);

    // Verify session exists and belongs to this instructor
    const sessions = await query(
      `SELECT cs.*, cl.instructor_id 
       FROM class_sessions cs
       JOIN class_sections cl ON cs.class_section_id = cl.id
       WHERE cs.id = ? AND cs.status IN ('active', 'ended')`, // Allow ended sessions to be resumed
      [sessionId]
    );

    if (!sessions.length) {
      return res.status(404).json({ success: false, message: 'Session not found or cancelled.' });
    }

    const session = sessions[0];

    // Auto-resume session if it was ended
    if (session.status === 'ended') {
      await query('UPDATE class_sessions SET status = "active" WHERE id = ?', [sessionId]);
      logger.info(`Session ${sessionId} auto-resumed by QR generation`);
    }

    if (req.user.role === 'instructor' && session.instructor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this session.' });
    }

    // Invalidate existing active QR for this session
    await query(
      'UPDATE qr_sessions SET is_active = FALSE WHERE class_session_id = ? AND is_active = TRUE',
      [sessionId]
    );

    // Create new QR token
    const qrToken = uuidv4();
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);
    const secret = signQRToken(qrToken, sessionId, expiresAt.toISOString());

    // Build QR payload (what the QR code encodes)
    const qrPayload = JSON.stringify({
      token: qrToken,
      sessionId: parseInt(sessionId),
      expires: expiresAt.toISOString(),
      sig: secret.substring(0, 16) // partial signature for verification hint
    });

    // Generate QR code as base64 data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'Q', // Quartile EC: Great balance between reliability and larger module size
      type: 'image/png',
      quality: 1.0,
      margin: 4,
      color: {
        dark: '#8B1A1A',
        light: '#FFFFFF'
      },
      width: 450
    });

    const result = await query(
      `INSERT INTO qr_sessions (class_session_id, qr_token, qr_secret, qr_data_url, expires_at, expiration_minutes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, qrToken, secret, qrDataUrl, expiresAt, expirationMinutes]
    );

    logger.info(`QR generated for session ${sessionId} by user ${req.user.id}, expires ${expiresAt}`);

    res.json({
      success: true,
      data: {
        id: result.insertId,
        qrSessionId: result.insertId,
        classSessionId: parseInt(sessionId),
        qrToken,
        qrDataUrl,
        expiresAt: expiresAt.toISOString(),
        expirationMinutes,
        isActive: true,
        scanCount: 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// Scan (validate) QR Code — called by student
exports.scanQR = async (req, res, next) => {
  try {
    const { token, sessionId } = req.body;
    const studentId = req.user.id;

    if (!token || !sessionId) {
      return res.status(422).json({ success: false, message: 'QR token and session ID required.' });
    }

    // 1. Find QR session
    const qrSessions = await query(
      `SELECT * FROM qr_sessions 
       WHERE qr_token = ? AND class_session_id = ? AND is_active = TRUE
       LIMIT 1`,
      [token, sessionId]
    );

    if (!qrSessions.length) {
      return res.status(400).json({
        success: false,
        code: 'QR_INVALID',
        message: 'QR code is invalid or no longer active.'
      });
    }

    const qrSession = qrSessions[0];

    // 2. Check expiration
    if (new Date() > new Date(qrSession.expires_at)) {
      return res.status(400).json({
        success: false,
        code: 'QR_EXPIRED',
        message: 'QR code has expired. Ask your instructor to generate a new one.'
      });
    }

    // 3. Check if student is enrolled
    const enrollments = await query(
      `SELECT e.* FROM enrollments e
       JOIN class_sessions cs ON e.class_section_id = cs.class_section_id
       WHERE e.student_id = ? AND cs.id = ? AND e.status = 'active'
       LIMIT 1`,
      [studentId, sessionId]
    );

    if (!enrollments.length) {
      return res.status(403).json({
        success: false,
        code: 'NOT_ENROLLED',
        message: 'You are not enrolled in this class.'
      });
    }

    // 4. Check duplicate scan
    const existing = await query(
      'SELECT * FROM attendance WHERE student_id = ? AND class_session_id = ? LIMIT 1',
      [studentId, sessionId]
    );

    if (existing.length && existing[0].status !== 'absent') {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_RECORDED',
        message: `Attendance already recorded. Status: ${existing[0].status}`
      });
    }

    // 5. Determine Present vs Late
    const classSession = await query(
      `SELECT cs.*, cl.schedule_time_start, cl.schedule_day
       FROM class_sessions cs
       JOIN class_sections cl ON cs.class_section_id = cl.id
       WHERE cs.id = ? LIMIT 1`,
      [sessionId]
    );

    // Doesn't exist should have been caught, but just in case
    if (!classSession.length) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const now = new Date();
    const scanTime = now;
    
    // Check if this is a "Reopened" or "Secondary" QR session (Instructor regenerated it)
    const qrStatsQueryResult = await query(
      'SELECT COUNT(*) as count FROM qr_sessions WHERE class_session_id = ? AND id < ?',
      [sessionId, qrSession.id]
    );
    const isSecondaryQR = qrStatsQueryResult[0].count > 0;

    const lateThreshold = classSession[0].late_threshold_minutes || 15;
    
    // Check if enough time has passed to be marked late (using DB time comparison)
    const timeCheckQueryResult = await query(
      'SELECT TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutesElapsed FROM qr_sessions WHERE id = ?',
      [qrSession.id]
    );
    const minutesElapsed = timeCheckQueryResult[0].minutesElapsed;
    
    let status = 'present';
    if (minutesElapsed >= lateThreshold || isSecondaryQR) {
      status = 'late';
    }

    // 6. Record attendance (upsert)
    await withTransaction(async (conn) => {
      if (existing.length) {
        // Update existing absent record
        await conn.execute(
          `UPDATE attendance SET status = ?, scan_time = ?, qr_session_id = ?, ip_address = ?
           WHERE student_id = ? AND class_session_id = ?`,
          [status, scanTime, qrSession.id, req.ip, studentId, sessionId]
        );
      } else {
        await conn.execute(
          `INSERT INTO attendance (student_id, class_session_id, qr_session_id, status, scan_time, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [studentId, sessionId, qrSession.id, status, scanTime, req.ip]
        );
      }

      // Increment scan count on QR session
      await conn.execute(
        'UPDATE qr_sessions SET scan_count = scan_count + 1 WHERE id = ?',
        [qrSession.id]
      );
    });

    logger.info(`Attendance recorded: student=${studentId}, session=${sessionId}, status=${status}`);

    res.json({
      success: true,
      code: 'RECORDED',
      data: {
        status,
        scanTime: scanTime.toISOString(),
        message: status === 'present'
          ? '✅ Present! Attendance recorded successfully.'
          : '⏰ Late! Attendance recorded as late.'
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get QR status for a session
exports.getQRStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const qrSessions = await query(
      `SELECT id, qr_token as token, qr_data_url as qrDataUrl, expires_at as expiresAt, 
              is_active as isActive, expiration_minutes as expirationMinutes, 
              scan_count as scanCount, created_at
       FROM qr_sessions 
       WHERE class_session_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [sessionId]
    );

    if (!qrSessions.length) {
      return res.json({ success: true, data: null });
    }

    const qr = qrSessions[0];
    const isExpired = new Date() > new Date(qr.expires_at);

    res.json({
      success: true,
      data: {
        ...qr,
        isExpired,
        isValid: qr.is_active && !isExpired
      }
    });
  } catch (err) {
    next(err);
  }
};

// Deactivate (expire) a QR session
exports.deactivateQR = async (req, res, next) => {
  try {
    const { qrSessionId } = req.params;
    await query('UPDATE qr_sessions SET is_active = FALSE WHERE id = ?', [qrSessionId]);
    res.json({ success: true, message: 'QR session deactivated.' });
  } catch (err) { next(err); }
};

// Reopen (reactivate) a QR session
exports.reopenQR = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Find the most recent QR for this session
    const qrSessions = await query(
      'SELECT * FROM qr_sessions WHERE class_session_id = ? ORDER BY created_at DESC LIMIT 1',
      [sessionId]
    );

    if (!qrSessions.length) {
      return res.status(404).json({ success: false, message: 'No QR session found. Generate a new one.' });
    }

    const qrSession = qrSessions[0];
    const expirationMinutes = parseFloat(req.body.expirationMinutes) || 15;
    const expirationSeconds = parseInt(req.body.expirationSeconds) || (expirationMinutes * 60);
    
    const newExpiry = new Date(Date.now() + expirationSeconds * 1000);
    const newQrToken = crypto.randomUUID(); // Generate fresh token for the new QR record

    // Regenerate QR design with new expiration and NEW token
    const secret = signQRToken(newQrToken, sessionId, newExpiry.toISOString());
    const qrPayload = JSON.stringify({
      token: newQrToken,
      sessionId: parseInt(sessionId),
      expires: newExpiry.toISOString(),
      sig: secret.substring(0, 16)
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'Q',
      type: 'image/png',
      quality: 1.0,
      margin: 4,
      color: { dark: '#8B1A1A', light: '#FFFFFF' },
      width: 450
    });

    // Always create a NEW QR session record when reopening
    // This ensures that our "isSecondaryQR" logic in scanQR correctly identifies this as a reopened pass.
    const result = await query(
      `INSERT INTO qr_sessions (class_session_id, qr_token, qr_secret, qr_data_url, expires_at, expiration_minutes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [sessionId, newQrToken, secret, qrDataUrl, newExpiry, expirationMinutes]
    );

    const [updated] = await query('SELECT * FROM qr_sessions WHERE id = ?', [result.insertId]);

    res.json({
      success: true,
      message: `QR session reopened for ${expirationMinutes} minutes.`,
      data: {
        id: updated.id,
        qrSessionId: updated.id,
        token: updated.qr_token,
        qrDataUrl: updated.qr_data_url,
        expiresAt: updated.expires_at,
        isActive: true,
        scanCount: 0
      }
    });
  } catch (err) { next(err); }
};

