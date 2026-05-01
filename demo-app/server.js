require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'demo_user',
  password: process.env.DB_PASSWORD || 'demo_password',
  database: process.env.DB_NAME     || 'demo_app',
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT id, username, role, display_name FROM users WHERE username = ? AND password = ?',
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    return res.json({
      success: true,
      user: {
        id:          user.id,
        username:    user.username,
        role:        user.role,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('DB error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    if (conn) await conn.end();
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Demo app running at http://localhost:${PORT}`));
