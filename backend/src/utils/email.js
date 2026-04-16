const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { Resend } = require('resend');
const logger = require('./logger');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const getResend = () => process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY.trim()) : null;

// Dev fallback: log to console when no SMTP configured
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: (process.env.SMTP_USER || '').trim(),
      pass: (process.env.SMTP_PASS || '').trim()
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
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
  const resend = getResend();
  
  try {
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.SMTP_FROM || 'onboarding@resend.dev',
          to: email,
          subject: `Password Reset [Ref: ${Math.random().toString(36).substring(7).toUpperCase()}] – Liceo Attendance System`,
          html
        });
        logger.info(`Password reset email sent (via Resend) to ${email}`);
        return;
      } catch (err) {
        throw new Error(`Resend Error: ${err.message}`);
      }
    }

    if (process.env.SENDGRID_API_KEY) {
      try {
        await sgMail.send({
          to: email,
          from: process.env.SMTP_FROM || 'no-reply@liceo.edu.ph',
          subject: `Password Reset [Ref: ${Math.random().toString(36).substring(7).toUpperCase()}] – Liceo Attendance System`,
          html
        });
        logger.info(`Password reset email sent (via SendGrid) to ${email}`);
        return;
      } catch (err) {
        throw new Error(`SendGrid Error: ${err.message}`);
      }
    }

    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        from: `"Liceo Attendance System" <${(process.env.SMTP_USER || '').trim()}>`,
        to: email,
        subject: `Password Reset [Ref: ${Math.random().toString(36).substring(7).toUpperCase()}] – Liceo Attendance System`,
        html
      });
      logger.info(`Password reset email sent (via Gmail) to ${email}`);
    } catch (err) {
      throw new Error(`Gmail Error (Fallback): ${err.message}`);
    }
  } catch (err) {
    logger.error('Email delivery failed:', err);
    throw err;
  }
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

  const resend = getResend();

  try {
    if (resend) {
      await resend.emails.send({
        from: process.env.SMTP_FROM || 'onboarding@resend.dev',
        to: email,
        subject: 'Welcome to Liceo Attendance System',
        html
      });
      logger.info(`Welcome email sent (via Resend) to ${email}`);
      return;
    }

    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send({
        to: email,
        from: process.env.SMTP_FROM || 'no-reply@liceo.edu.ph',
        subject: 'Welcome to Liceo Attendance System',
        html
      });
      logger.info(`Welcome email sent (via SendGrid) to ${email}`);
      return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Liceo Attendance System" <${(process.env.SMTP_USER || '').trim()}>`,
      to: email,
      subject: 'Welcome to Liceo Attendance System',
      html
    });
    logger.info(`Welcome email sent (via Gmail) to ${email}`);
  } catch (err) {
    logger.error('Welcome email failed:', err);
    throw err;
  }
};
