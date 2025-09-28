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

// 調試信息
console.log('🚀 應用程式啟動中...');
console.log(`📊 環境變數檢查:`);
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   JWT_SECRET: ${JWT_SECRET ? '已設定' : '未設定'}`);
console.log(`   GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? '已設定' : '未設定'}`);

// Google OAuth 客戶端
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 健康檢查端點
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
    });
});

// 根路徑重定向到首頁
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// 資料庫初始化
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('資料庫連接失敗:', err);
        // 不要立即退出，讓應用繼續運行
    } else {
        console.log('✅ 資料庫連接成功 (內存模式)');
    }
});

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
    )`, (err) => {
        if (err) console.error('建立用戶表失敗:', err);
        else console.log('✅ 用戶表建立完成');
    });

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
    )`, (err) => {
        if (err) console.error('建立日記表失敗:', err);
        else console.log('✅ 日記表建立完成');
    });
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
            function (err, existingUser) {
                if (err) {
                    console.error('查詢用戶失敗:', err);
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
                        function (err) {
                            if (err) {
                                console.error('創建用戶失敗:', err);
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
            console.error('獲取日記失敗:', err);
            return res.status(500).json({ error: '獲取日記失敗' });
        }
        res.json(entries || []);
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
                console.error('獲取日記失敗:', err);
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
            function (err) {
                if (err) {
                    console.error('刪除日記失敗:', err);
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
        function (err) {
            if (err) {
                console.error('儲存日記失敗:', err);
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
        function (err) {
            if (err) {
                console.error('刪除日記失敗:', err);
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
                console.error('獲取統計失敗:', err);
                return res.status(500).json({ error: '獲取統計失敗' });
            }
            res.json(stats || []);
        }
    );
});

// 全域錯誤處理
app.use((err, req, res, next) => {
    console.error('伺服器錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({ error: '找不到頁面' });
});

// Railway 需要監聽特定的 host 和 port
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
    console.log(`✅ 伺服器成功啟動`);
    console.log(`🌐 Host: ${HOST}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 JWT_SECRET 已設定: ${JWT_SECRET ? '是' : '否'}`);
    console.log(`📱 Google Client ID 已設定: ${GOOGLE_CLIENT_ID ? '是' : '否'}`);
});

// 錯誤處理
server.on('error', (err) => {
    console.error('伺服器錯誤:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} 已被使用`);
    } else if (err.code === 'EACCES') {
        console.error(`❌ 沒有權限監聽 port ${PORT}`);
    }
});

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('📴 收到 SIGTERM 信號，正在關閉伺服器...');
    server.close(() => {
        console.log('✅ 伺服器已關閉');
        if (db) {
            db.close();
        }
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 收到 SIGINT 信號，正在關閉伺服器...');
    server.close(() => {
        console.log('✅ 伺服器已關閉');
        if (db) {
            db.close();
        }
        process.exit(0);
    });
});

// 未捕獲的異常處理
process.on('uncaughtException', (err) => {
    console.error('❌ 未捕獲的異常:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未處理的 Promise 拒絕:', reason);
    process.exit(1);
});