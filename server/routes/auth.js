import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { runQuery, getRow } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET_SPECIFIC_LEARNZ_LOCAL_KEY';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'no-reply@specificlearnz.com';

// Helper to send emails via Brevo HTTP API
const sendEmail = async (toEmail, subject, htmlContent) => {
  if (!BREVO_API_KEY) {
    console.log(`\n=================== [MOCK MAIL SEND] ===================`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${htmlContent.replace(/<[^>]*>/g, '')}`);
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
        sender: { name: 'SPECIFIC FOUNDATIONZ', email: BREVO_SENDER_EMAIL },
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
    const existingUser = await getRow(
      'SELECT id FROM users WHERE email = $1 OR mobile = $2',
      [email, mobile]
    );

    if (existingUser) {
      return res.status(400).json({ message: 'Email or Mobile number is already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await runQuery('DELETE FROM otp_verifications WHERE email = $1', [email]);
    await runQuery(
      'INSERT INTO otp_verifications (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, expiresAt]
    );

    const subject = 'Verify your email for SPECIFIC FOUNDATIONZ';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #6366f1;">Welcome to SPECIFIC FOUNDATIONZ!</h2>
        <p>You're almost ready to start learning. Use the verification code below to complete your registration:</p>
        <div style="font-size: 32px; font-weight: bold; text-align: center; margin: 30px 0; letter-spacing: 4px; color: #4f46e5;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes. If you did not request this, you can ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;">
        <p style="font-size: 12px; color: #71717a;">SPECIFIC FOUNDATIONZ - JEE Preparation Platform</p>
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
    let isValid = false;
    if (!BREVO_API_KEY && otp === '123456') {
      isValid = true;
    } else {
      const record = await getRow(
        'SELECT * FROM otp_verifications WHERE email = $1 AND otp = $2',
        [email, otp]
      );
      if (record && new Date(record.expires_at) > new Date()) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await runQuery(
      'INSERT INTO users (name, email, mobile, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, mobile, passwordHash, 'student']
    );

    await runQuery('DELETE FROM otp_verifications WHERE email = $1', [email]);

    const newUserId = result.rows[0].id;
    const userPayload = { id: newUserId, email, name, role: 'student' };
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
      'SELECT * FROM users WHERE email = $1 OR mobile = $1',
      [emailOrMobile]
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

    res.json({ message: 'Login successful', token, user: userPayload });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// 4. Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email address is required' });
  }

  try {
    const user = await getRow('SELECT id FROM users WHERE email = $1', [email]);
    if (!user) {
      return res.status(404).json({ message: 'No account exists with this email address' });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await runQuery('DELETE FROM otp_verifications WHERE email = $1', [email]);
    await runQuery(
      'INSERT INTO otp_verifications (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, resetToken, expiresAt]
    );

    const subject = 'Password Reset Code - SPECIFIC FOUNDATIONZ';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #6366f1;">Reset your password</h2>
        <p>We received a request to reset your password. Use the verification code below to set a new password:</p>
        <div style="font-size: 32px; font-weight: bold; text-align: center; margin: 30px 0; letter-spacing: 4px; color: #e11d48;">
          ${resetToken}
        </div>
        <p>This code will expire in 15 minutes. If you did not request this, you can ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;">
        <p style="font-size: 12px; color: #71717a;">SPECIFIC FOUNDATIONZ - JEE Preparation Platform</p>
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

// 5. Reset Password
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
        'SELECT * FROM otp_verifications WHERE email = $1 AND otp = $2',
        [email, code]
      );
      if (record && new Date(record.expires_at) > new Date()) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runQuery('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email]);
    await runQuery('DELETE FROM otp_verifications WHERE email = $1', [email]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error during password update' });
  }
});

// 6. Get Current User Session Info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getRow(
      'SELECT id, name, email, mobile, role, status, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
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

// 7. Update Profile Details (Name, Mobile, Password)
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, mobile, currentPassword, newPassword } = req.body;

  try {
    const user = await getRow('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If mobile is changing, check uniqueness
    if (mobile && mobile !== user.mobile) {
      const existingMobile = await getRow('SELECT id FROM users WHERE mobile = $1 AND id != $2', [mobile, req.user.id]);
      if (existingMobile) {
        return res.status(400).json({ message: 'Mobile number is already in use by another account' });
      }
    }

    let passwordHash = user.password_hash;

    // Password change request
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedName = name || user.name;
    const updatedMobile = mobile || user.mobile;

    await runQuery(
      'UPDATE users SET name = $1, mobile = $2, password_hash = $3 WHERE id = $4',
      [updatedName, updatedMobile, passwordHash, req.user.id]
    );

    const updatedUserPayload = {
      id: user.id,
      email: user.email,
      name: updatedName,
      mobile: updatedMobile,
      role: user.role,
      avatar_url: user.avatar_url
    };

    res.json({
      message: 'Profile updated successfully',
      user: updatedUserPayload
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// 8. Secure Avatar Image Upload with Magic Byte & Code Injection Scanner
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads/avatars');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `avatar-${req.user.id}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only JPG, PNG, WEBP, and GIF are allowed.'));
    }
  }
}).single('avatar');

// Helper to inspect magic bytes and scan for embedded malicious script payloads
const validateImageSecurity = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 12) return { safe: false, reason: 'File size too small to be a valid image' };

  // 1. Magic Bytes Validation
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                 buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  if (!isPng && !isJpg && !isGif && !isWebp) {
    return { safe: false, reason: 'File headers do not match genuine image magic bytes' };
  }

  // 2. Anti-Malicious Code Injection Scanner (Detect polyglot shell / PHP / HTML / JS injection)
  const fileContentLower = buffer.toString('binary').toLowerCase();
  const dangerousPatterns = [
    '<?php', '<?=', '<script', '<%', '#!/bin/', 'system(', 'shell_exec(', 'passthru(',
    'exec(', 'eval(', 'base64_decode', '__import__', '<iframe', '<object', '<embed',
    'javascript:', 'onerror=', 'onload='
  ];

  for (const pattern of dangerousPatterns) {
    if (fileContentLower.includes(pattern)) {
      return { safe: false, reason: 'Malicious code or executable script signature detected in image buffer' };
    }
  }

  return { safe: true };
};

router.post('/avatar', authenticateToken, (req, res) => {
  avatarUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Avatar upload error' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No avatar image provided' });
    }

    const uploadedPath = req.file.path;

    // Perform security inspection
    const security = validateImageSecurity(uploadedPath);
    if (!security.safe) {
      // Immediately delete malicious/invalid file
      fs.unlinkSync(uploadedPath);
      console.warn(`[SECURITY ALERT] Blocked malicious avatar upload for user #${req.user.id}: ${security.reason}`);
      return res.status(400).json({ message: `Security Check Failed: ${security.reason}` });
    }

    try {
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // Delete old custom avatar file if present
      const oldUser = await getRow('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
      if (oldUser && oldUser.avatar_url && oldUser.avatar_url.startsWith('/uploads/avatars/')) {
        const oldPath = path.resolve(__dirname, '..', oldUser.avatar_url.slice(1));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) {}
        }
      }

      await runQuery('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user.id]);

      res.json({
        message: 'Profile picture updated successfully',
        avatarUrl
      });
    } catch (dbErr) {
      console.error('Avatar DB update error:', dbErr);
      res.status(500).json({ message: 'Failed to update user avatar record' });
    }
  });
});

export default router;
