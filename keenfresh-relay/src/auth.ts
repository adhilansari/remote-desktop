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

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
};

export default router;
