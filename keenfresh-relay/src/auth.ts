import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db';

const router = express.Router();
export const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_keenfresh_key_change_in_prod';

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        
        const token = jwt.sign({ userId: this.lastID, email }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, email });
      }
    );
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row: any) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: row.id, email: row.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, email: row.email });
  });
});

import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Configure standard SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row: any) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) {
      // Security best practice: don't reveal if email exists, just return success
      return res.json({ message: 'If an account exists, a reset link was sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    db.run(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt.toISOString()],
      (err) => {
        if (err) return res.status(500).json({ error: 'Error generating reset token' });

        const resetUrl = `https://app.keenfresh.com/reset-password?token=${token}`;
        
        // Only attempt to send if SMTP credentials are provided, otherwise log for dev
        if (process.env.SMTP_USER) {
          transporter.sendMail({
            from: '"KeenFresh Support" <' + process.env.SMTP_USER + '>',
            to: email,
            subject: 'KeenFresh Password Reset',
            text: `You requested a password reset. Click here to reset: ${resetUrl}`,
            html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour.</p>`
          }).catch(console.error);
        } else {
          console.log(`[DEV MODE] Password reset URL for ${email}: ${resetUrl}`);
        }

        res.json({ message: 'If an account exists, a reset link was sent.' });
      }
    );
  });
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

  db.get('SELECT * FROM password_resets WHERE token = ?', [token], async (err, row: any) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    if (!row || new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const email = row.email;
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run('UPDATE users SET password_hash = ? WHERE email = ?', [hashedPassword, email], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        
        // Invalidate token
        db.run('DELETE FROM password_resets WHERE token = ?', [token]);
        
        res.json({ message: 'Password successfully reset' });
      });
    } catch (e) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
};

export default router;
