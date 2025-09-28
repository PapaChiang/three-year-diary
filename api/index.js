const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Google OAuth 客戶端
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// 中間件
app.use(cors());
app.use(express.json());

// 靜態檔案服務
app.use(express.static(path.join(__dirname, '..')));

// 內存儲存 (簡化版，適合展示)
let users = [];
let entries = [];
let userIdCounter = 1;

// 健康檢查端點
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        platform: 'Vercel',
        users: users.length,
        entries: entries.length
    });
});

// 根路徑
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// JWT 驗證中間件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '需要登入' });
    }

    // 測試模式
    if (token === 'test_token_123') {
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

        // 測試模式
        if (credential === 'test_credential') {
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
        let existingUser = users.find(u => u.google_id === googleId || u.email === email);

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
            const newUser = {
                id: userIdCounter++,
                google_id: googleId,
                email,
                name,
                picture,
                created_at: new Date().toISOString()
            };
            users.push(newUser);

            const token = jwt.sign({
                id: newUser.id,
                googleId,
                email
            }, JWT_SECRET);

            res.json({
                token,
                user: {
                    id: newUser.id,
                    name,
                    email,
                    picture
                }
            });
        }
    } catch (error) {
        console.error('Google 認證錯誤:', error);
        res.status(400).json({ error: 'Google 認證失敗: ' + error.message });
    }
});

// 獲取日記列表
app.get('/api/entries', authenticateToken, (req, res) => {
    const { startDate, endDate } = req.query;
    let userEntries = entries.filter(e => e.user_id == req.user.id);

    if (startDate && endDate) {
        userEntries = userEntries.filter(e => e.date >= startDate && e.date <= endDate);
    }

    userEntries.sort((a, b) => b.date.localeCompare(a.date));
    res.json(userEntries.map(e => ({ date: e.date, content: e.content })));
});

// 獲取特定日期的日記
app.get('/api/entries/:date', authenticateToken, (req, res) => {
    const { date } = req.params;
    const entry = entries.find(e => e.user_id == req.user.id && e.date === date);
    res.json(entry ? { content: entry.content } : { content: '' });
});

// 儲存或更新日記
app.post('/api/entries', authenticateToken, (req, res) => {
    const { date, content } = req.body;

    if (!date) {
        return res.status(400).json({ error: '日期不能為空' });
    }

    const existingIndex = entries.findIndex(e => e.user_id == req.user.id && e.date === date);

    if (!content || content.trim() === '') {
        // 刪除日記
        if (existingIndex !== -1) {
            entries.splice(existingIndex, 1);
        }
        res.json({ message: '日記已刪除' });
        return;
    }

    const entryData = {
        user_id: req.user.id,
        date,
        content: content.trim(),
        updated_at: new Date().toISOString()
    };

    if (existingIndex !== -1) {
        // 更新現有日記
        entries[existingIndex] = { ...entries[existingIndex], ...entryData };
    } else {
        // 新增日記
        entries.push({ id: Date.now(), created_at: new Date().toISOString(), ...entryData });
    }

    res.json({ message: '日記已儲存', date, content: content.trim() });
});

// 刪除日記
app.delete('/api/entries/:date', authenticateToken, (req, res) => {
    const { date } = req.params;
    const index = entries.findIndex(e => e.user_id == req.user.id && e.date === date);
    
    if (index !== -1) {
        entries.splice(index, 1);
    }
    
    res.json({ message: '日記已刪除' });
});

// 獲取統計資訊
app.get('/api/stats', authenticateToken, (req, res) => {
    const userEntries = entries.filter(e => e.user_id == req.user.id);
    const stats = [];
    
    if (userEntries.length > 0) {
        const years = [...new Set(userEntries.map(e => e.date.substring(0, 4)))];
        years.forEach(year => {
            const yearEntries = userEntries.filter(e => e.date.startsWith(year));
            stats.push({
                year,
                entries_per_year: yearEntries.length,
                total_entries: userEntries.length,
                first_entry_date: userEntries[userEntries.length - 1]?.date,
                last_entry_date: userEntries[0]?.date
            });
        });
    }
    
    res.json(stats);
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({ error: '找不到頁面' });
});

// 錯誤處理
app.use((err, req, res, next) => {
    console.error('伺服器錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
});

module.exports = app;