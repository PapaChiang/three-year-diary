const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Google OAuth 客戶端
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 資料庫初始化
const db = new sqlite3.Database('diary.db');

// 建立資料表
db.serialize(() => {
    // 用戶表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        picture TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 日記表
    db.run(`CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, date)
    )`);
});

// JWT 驗證中間件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '需要登入' });
    }

    // 測試模式
    if (token === 'test_token_123' && process.env.NODE_ENV === 'development') {
        req.user = { id: 'test_user_123', email: 'test@example.com' };
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '無效的 token' });
        }
        req.user = user;
        next();
    });
};

// Google 登入
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'Google credential 不能為空' });
    }

    try {
        let googleId, email, name, picture;

        // 測試模式 - 跳過 Google 驗證
        if (credential === 'test_credential' && process.env.NODE_ENV === 'development') {
            googleId = 'test_google_id_123';
            email = 'test@example.com';
            name = '測試用戶';
            picture = null;
        } else {
            // 正常 Google 驗證
            if (!GOOGLE_CLIENT_ID) {
                return res.status(500).json({ error: 'Google Client ID 未設定' });
            }

            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            ({ sub: googleId, email, name, picture } = payload);
        }

        // 檢查用戶是否已存在
        db.get(
            'SELECT * FROM users WHERE google_id = ? OR email = ?',
            [googleId, email],
            function(err, existingUser) {
                if (err) {
                    return res.status(500).json({ error: '伺服器錯誤' });
                }

                if (existingUser) {
                    // 用戶已存在，直接登入
                    const token = jwt.sign({ 
                        id: existingUser.id, 
                        googleId: existingUser.google_id,
                        email: existingUser.email 
                    }, JWT_SECRET);
                    
                    res.json({ 
                        token, 
                        user: { 
                            id: existingUser.id, 
                            name: existingUser.name,
                            email: existingUser.email,
                            picture: existingUser.picture
                        } 
                    });
                } else {
                    // 新用戶，創建帳號
                    db.run(
                        'INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)',
                        [googleId, email, name, picture],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: '創建用戶失敗' });
                            }
                            
                            const token = jwt.sign({ 
                                id: this.lastID, 
                                googleId,
                                email 
                            }, JWT_SECRET);
                            
                            res.json({ 
                                token, 
                                user: { 
                                    id: this.lastID, 
                                    name,
                                    email,
                                    picture
                                } 
                            });
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.error('Google 認證錯誤:', error);
        res.status(400).json({ error: 'Google 認證失敗: ' + error.message });
    }
});

// 獲取日記列表
app.get('/api/entries', authenticateToken, (req, res) => {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT date, content FROM entries WHERE user_id = ?';
    let params = [req.user.id];
    
    if (startDate && endDate) {
        query += ' AND date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    
    query += ' ORDER BY date DESC';

    db.all(query, params, (err, entries) => {
        if (err) {
            return res.status(500).json({ error: '獲取日記失敗' });
        }
        res.json(entries);
    });
});

// 獲取特定日期的日記
app.get('/api/entries/:date', authenticateToken, (req, res) => {
    const { date } = req.params;

    db.get(
        'SELECT content FROM entries WHERE user_id = ? AND date = ?',
        [req.user.id, date],
        (err, entry) => {
            if (err) {
                return res.status(500).json({ error: '獲取日記失敗' });
            }
            res.json(entry || { content: '' });
        }
    );
});

// 儲存或更新日記
app.post('/api/entries', authenticateToken, (req, res) => {
    const { date, content } = req.body;

    if (!date) {
        return res.status(400).json({ error: '日期不能為空' });
    }

    if (!content || content.trim() === '') {
        // 如果內容為空，刪除該日記
        db.run(
            'DELETE FROM entries WHERE user_id = ? AND date = ?',
            [req.user.id, date],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: '刪除日記失敗' });
                }
                res.json({ message: '日記已刪除' });
            }
        );
        return;
    }

    db.run(
        `INSERT OR REPLACE INTO entries (user_id, date, content, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, date, content.trim()],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '儲存日記失敗' });
            }
            res.json({ message: '日記已儲存', date, content: content.trim() });
        }
    );
});

// 刪除日記
app.delete('/api/entries/:date', authenticateToken, (req, res) => {
    const { date } = req.params;

    db.run(
        'DELETE FROM entries WHERE user_id = ? AND date = ?',
        [req.user.id, date],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '刪除日記失敗' });
            }
            res.json({ message: '日記已刪除' });
        }
    );
});

// 獲取統計資訊
app.get('/api/stats', authenticateToken, (req, res) => {
    db.all(
        `SELECT 
            COUNT(*) as total_entries,
            MIN(date) as first_entry_date,
            MAX(date) as last_entry_date,
            strftime('%Y', date) as year,
            COUNT(*) as entries_per_year
         FROM entries 
         WHERE user_id = ? 
         GROUP BY strftime('%Y', date)
         ORDER BY year DESC`,
        [req.user.id],
        (err, stats) => {
            if (err) {
                return res.status(500).json({ error: '獲取統計失敗' });
            }
            res.json(stats);
        }
    );
});

app.listen(PORT, () => {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
});