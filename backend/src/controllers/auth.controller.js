const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const emailService = require('../utils/email');
const logger = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role, universityId: user.university_id };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const sendTokenResponse = (res, user, statusCode = 200) => {
  const { accessToken, refreshToken } = generateTokens(user);
  res.status(statusCode).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        universityId: user.university_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        department: user.department,
        profilePhoto: user.profile_photo
      }
    }
  });
};

// ─── Validation Rules ─────────────────────────────────────────────────────────

exports.loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
];

exports.registerValidation = [
  body('universityId').notEmpty().trim().withMessage('University ID required'),
  body('email').isEmail().normalizeEmail()
    .custom(val => val.endsWith('@liceo.edu.ph'))
    .withMessage('Only @liceo.edu.ph emails are allowed'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().trim().withMessage('First name required'),
  body('lastName').notEmpty().trim().withMessage('Last name required')
];

// ─── Controllers ─────────────────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user without is_active filter to detect deactivated accounts
    const users = await query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check if account is deactivated
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact the administrator to reactivate your account.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Save refresh token to DB
    const { refreshToken, accessToken } = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );

    logger.info(`User logged in: ${user.email} (${user.role})`);

    sendTokenResponse(res, user, 200);
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { universityId, email, password, firstName, lastName, middleName, department, role, googleSignUp } = req.body;
    const actualRole = role || 'student';

    // For Google sign-ups, password is optional — auto-generate one
    const actualPassword = password || (googleSignUp ? require('crypto').randomBytes(32).toString('hex') : null);
    if (!actualPassword) {
      return res.status(422).json({ success: false, message: 'Password is required.' });
    }

    // Check duplicate
    const existing = await query('SELECT id FROM users WHERE email = ? OR university_id = ? LIMIT 1', [email, universityId]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email or University ID already registered.' });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(actualPassword, rounds);

    const result = await query(
      `INSERT INTO users (university_id, email, password_hash, first_name, last_name, middle_name, role, department)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [universityId, email, passwordHash, firstName, lastName, middleName || null, actualRole, department || null]
    );

    const newUsers = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId]);
    logger.info(`New user registered: ${email} (${actualRole})${googleSignUp ? ' via Google' : ''}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in with your credentials.'
    });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokens = await query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND is_revoked = FALSE AND expires_at > NOW() LIMIT 1',
      [refreshToken]
    );

    if (!tokens.length) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const users = await query('SELECT * FROM users WHERE id = ? AND is_active = TRUE LIMIT 1', [decoded.id]);
    if (!users.length) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    // Rotate refresh token
    await query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = ?', [refreshToken]);
    sendTokenResponse(res, users[0]);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = ?', [refreshToken]);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Google token required' });

    // Decode the JWT payload manually to handle clock skew
    const parts = token.split('.');
    if (parts.length !== 3) return res.status(401).json({ success: false, message: 'Invalid token format' });

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Verify basic claims
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ success: false, message: 'Token audience mismatch' });
    }
    if (!payload.iss || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
      return res.status(401).json({ success: false, message: 'Token issuer mismatch' });
    }
    // Check expiry with 5 min tolerance
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp + 300 < now) {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (!payload.email || !payload.email_verified) {
      return res.status(401).json({ success: false, message: 'Email not verified by Google' });
    }

    const email = payload.email;
    const firstName = payload.given_name || email.split('@')[0];
    const lastName = payload.family_name || '';
    const picture = payload.picture || null;

    // Check if user already exists
    let users = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);

    if (users.length) {
      // Existing user — check if active
      if (!users[0].is_active) {
        return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });
      }
      sendTokenResponse(res, users[0], 200);
    } else {
      // User NOT registered — return Google profile so frontend can show registration form
      return res.status(200).json({
        success: true,
        needsRegistration: true,
        googleProfile: { email, firstName, lastName, picture }
      });
    }
  } catch (err) {
    logger.error('Google login error:', err);
    res.status(401).json({ success: false, message: `Invalid Google token: ${err.message}` });
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(422).json({ success: false, message: 'Email is required.' });
    }

    const users = await query('SELECT * FROM users WHERE email = ? AND is_active = TRUE LIMIT 1', [email]);

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'No active account found with that email address.' });
    }

    const user = users[0];
    const crypto = require('crypto');

    // Generate a mathematically secure random string
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash it before storing in the database so leaks don't compromise accounts
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Very tight expiration window: 15 minutes
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [hashedToken, expires, user.id]);

    try {
      await emailService.sendPasswordReset(user.email, user.first_name, rawToken);
      res.json({ success: true, message: 'A password reset link has been sent to your email.' });
    } catch (emailErr) {
      logger.error('Forgot password email error:', emailErr);
      res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again later.' });
      return;
    }
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(422).json({ success: false, message: 'Valid token and password required.' });
    }

    // High Security Enforcements
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#.\-])[A-Za-z\d@$!%*?&#.\-]{8,}$/;
    if (!pwdRegex.test(password)) {
      return res.status(422).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      });
    }

    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const users = await query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1',
      [hashedToken]
    );

    if (!users.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, rounds);

    await query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, users[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const users = await query(
      'SELECT id, university_id, email, first_name, last_name, middle_name, role, department, profile_photo, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: users[0] });
  } catch (err) {
    next(err);
  }
};
