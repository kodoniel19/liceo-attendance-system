const nodemailer = require('nodemailer');
const logger = require('./logger');

// Dev fallback: log to console when no SMTP configured
const isEmailConfigured = () => !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

const getTransporter = () => {
  if (!isEmailConfigured()) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { 
      user: process.env.SMTP_USER?.trim(), 
      pass: process.env.SMTP_PASS?.trim() 
    },
    tls: { rejectUnauthorized: false }
  });
};

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #8B1A1A; padding: 30px; text-align: center; }
    .header h1 { color: #C9A227; margin: 0; font-size: 20px; }
    .header p { color: #fff; margin: 8px 0 0; font-size: 13px; }
    .body { padding: 30px; color: #333; line-height: 1.6; }
    .btn { display: inline-block; background: #8B1A1A; color: #fff !important; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Liceo de Cagayan University</h1>
      <p>QR Code Attendance Management System</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      © ${new Date().getFullYear()} Liceo de Cagayan University. All rights reserved.<br>
      This is an automated message. Please do not reply to this email.
    </div>
  </div>
</body>
</html>
`;

exports.sendPasswordReset = async (email, firstName, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = baseTemplate(`
    <h2>Password Reset Request</h2>
    <p>Hello, <strong>${firstName}</strong>!</p>
    <p>We received a request to reset your password for your Liceo Attendance account.</p>
    <p>Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
    <div style="text-align:center;">
      <a href="${resetUrl}" class="btn">Reset My Password</a>
    </div>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p style="font-size:12px;color:#999;">If the button doesn't work, copy this link:<br>${resetUrl}</p>
  `);

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Liceo Attendance System" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Password Reset [Ref: ${Math.random().toString(36).substring(7).toUpperCase()}] – Liceo Attendance System`,
    html
  });

  logger.info(`Password reset email sent to ${email}`);
};

exports.sendWelcome = async (email, firstName, role) => {
  const html = baseTemplate(`
    <h2>Welcome to Liceo Attendance System!</h2>
    <p>Hello, <strong>${firstName}</strong>!</p>
    <p>Your account has been successfully created with the role of <strong>${role}</strong>.</p>
    <p>You can now login at:</p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}/login" class="btn">Login Now</a>
    </div>
  `);

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Liceo Attendance System" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Welcome to Liceo Attendance System',
    html
  });
};
