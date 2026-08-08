import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { runQuery, getRow } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET_SPECIFIC_LEARNZ_LOCAL_KEY';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Helper to send emails via Brevo HTTP API
const sendEmail = async (toEmail, subject, htmlContent) => {
  if (!BREVO_API_KEY) {
    console.log(`\n=================== [MOCK MAIL SEND] ===================`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${htmlContent.replace(/<[^>]*>/g, '')}`); // Strip HTML for console
    console.log(`========================================================\n`);
    return true;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Specific Learnz', email: 'no-reply@specificlearnz.com' },
        to: [{ email: toEmail }],
        subject: subject,
        htmlContent: htmlContent
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('Brevo API Error:', errText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send email via Brevo:', error);
    return false;
  }
};

// 1. Initiate Registration (Send OTP)
router.post('/register', async (req, res) => {
  const { name, email, mobile, password } = req.body;

  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: 'All registration fields are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await getRow(
      'SELECT id FROM users WHERE email = ? OR mobile = ?',
      [email, mobile]
    );

    if (existingUser) {
      return res.status(400).json({ message: 'Email or Mobile number is already registered' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // Save/Update OTP
    await runQuery('DELETE FROM otp_verifications WHERE email = ?', [email]);
    await runQuery(
      'INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt]
    );

    // Send email
    const subject = 'Verify your email for Specific Learnz';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #6366f1;">Welcome to Specific Learnz!</h2>
        <p>You're almost ready to start learning. Use the verification code below to complete your registration:</p>
        <div style="font-size: 32px; font-weight: bold; text-align: center; margin: 30px 0; letter-spacing: 4px; color: #4f46e5;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes. If you did not request this, you can ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;">
        <p style="font-size: 12px; color: #71717a;">Specific Learnz - JEE Preparation Platform</p>
      </div>
    `;

    const emailSent = await sendEmail(email, subject, htmlContent);

    res.json({ 
      message: emailSent ? 'OTP sent to your email' : 'OTP generation succeeded (Mock Mode)', 
      mockOtpUsed: !BREVO_API_KEY ? '123456' : undefined 
    });
  } catch (error) {
    console.error('Registration OTP error:', error);
    res.status(500).json({ message: 'Internal server error during OTP sending' });
  }
});

// 2. Verify OTP & Complete Signup
router.post('/verify-otp', async (req, res) => {
  const { name, email, mobile, password, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    // Check developer mode bypass
    let isValid = false;
    if (!BREVO_API_KEY && otp === '123456') {
      isValid = true;
    } else {
      const record = await getRow(
        'SELECT * FROM otp_verifications WHERE email = ? AND otp = ?',
        [email, otp]
      );
      if (record && new Date(record.expires_at) > new Date()) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    // Hash password & insert user
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await runQuery(
      'INSERT INTO users (name, email, mobile, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, mobile, passwordHash, 'student']
    );

    // Delete OTP
    await runQuery('DELETE FROM otp_verifications WHERE email = ?', [email]);

    // Create JWT
    const userPayload = { id: result.lastID, email, name, role: 'student' };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Account verified and created successfully',
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('OTP Verification error:', error);
    res.status(500).json({ message: 'Internal server error during user creation' });
  }
});

// 3. Login
router.post('/login', async (req, res) => {
  const { emailOrMobile, password } = req.body;

  if (!emailOrMobile || !password) {
    return res.status(400).json({ message: 'Credentials and password are required' });
  }

  try {
    const user = await getRow(
      'SELECT * FROM users WHERE email = ? OR mobile = ?',
      [emailOrMobile, emailOrMobile]
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ 
        message: `Your account has been banned. Reason: ${user.ban_reason || 'No reason provided.'}` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userPayload = { id: user.id, email: user.email, name: user.name, role: user.role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// 4. Forgot Password (Send Reset Token/Code)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email address is required' });
  }

  try {
    const user = await getRow('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ message: 'No account exists with this email address' });
    }

    // Generate 6 digit reset token (code)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // Store in otp_verifications for reset check
    await runQuery('DELETE FROM otp_verifications WHERE email = ?', [email]);
    await runQuery(
      'INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)',
      [email, resetToken, expiresAt]
    );

    const subject = 'Password Reset Code - Specific Learnz';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #6366f1;">Reset your password</h2>
        <p>We received a request to reset your password. Use the verification code below to set a new password:</p>
        <div style="font-size: 32px; font-weight: bold; text-align: center; margin: 30px 0; letter-spacing: 4px; color: #e11d48;">
          ${resetToken}
        </div>
        <p>This code will expire in 15 minutes. If you did not request this, you can ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;">
        <p style="font-size: 12px; color: #71717a;">Specific Learnz - JEE Preparation Platform</p>
      </div>
    `;

    const emailSent = await sendEmail(email, subject, htmlContent);

    res.json({
      message: emailSent ? 'Reset code sent to email' : 'Reset code generated (Mock Mode)',
      mockToken: !BREVO_API_KEY ? '123456' : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error during password reset' });
  }
});

// 5. Reset Password with Code
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }

  try {
    let isValid = false;
    if (!BREVO_API_KEY && code === '123456') {
      isValid = true;
    } else {
      const record = await getRow(
        'SELECT * FROM otp_verifications WHERE email = ? AND otp = ?',
        [email, code]
      );
      if (record && new Date(record.expires_at) > new Date()) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Reset password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runQuery('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, email]);
    await runQuery('DELETE FROM otp_verifications WHERE email = ?', [email]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error during password update' });
  }
});

// 6. Get Current User Session Info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getRow('SELECT id, name, email, mobile, role, status FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Your account is banned' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Session check failed' });
  }
});

export default router;
