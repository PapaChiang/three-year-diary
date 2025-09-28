const express = require('express');
const cors = require('cors');
const postgres = require('postgres');
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
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '已設定' : '未設定'}`);

// Google OAuth 客戶端
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// PostgreSQL 連接
const sql = postgres(process.env.DATABASE_URL || 'postgres://localhost:5432/diary', {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false
});

// 資料庫初始化
async function initDatabase() {
    try {
        console.log('🔄 正在初始化資料庫...');
        
        // 建立用戶表
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                picture TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('✅ 用戶表建立完成');

        // 建立日記表
        await sql`
            CREATE TABLE IF NOT EXISTS entries (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                date TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date)
            )
        `;
        console.log('✅ 日記表建立完成');
        
        console.log('✅ 資料庫初始化完成');
    } catch (err) {
        console.error('❌ 資料庫初始化失敗:', err);
    }
}

// 健康檢查端點
app.get('/health', async (req, res) => {
    try {
        const [result] = await sql`SELECT NOW()`;
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            port: PORT,
            env: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            database: 'connected',
            db_time: result.now
        });
    } catch (err) {
        res.status(503).json({ 
            status: 'ERROR', 
            database: 'disconnected',
            error: err.message 
        });
    }
});

// 根路徑
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
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

        // 測試模式
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
        const existingUser = await sql`
            SELECT * FROM users WHERE google_id = ${googleId} OR email = ${email}
        `;

        if (existingUser.length > 0) {
            // 用戶已存在，直接登入
            const user = existingUser[0];
            const token = jwt.sign({
                id: user.id,
                googleId: user.google_id,
                email: user.email
            }, JWT_SECRET);

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    picture: user.picture
                }
            });
        } else {
            // 新用戶，創建帳號
            const [user] = await sql`
                INSERT INTO users (google_id, email, name, picture) 
                VALUES (${googleId}, ${email}, ${name}, ${picture}) 
                RETURNING *
            `;

            const token = jwt.sign({
                id: user.id,
                googleId,
                email
            }, JWT_SECRET);

            res.json({
                token,
                user: {
                    id: user.id,
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
app.get('/api/entries', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let result;

        if (startDate && endDate) {
            result = await sql`
                SELECT date, content FROM entries 
                WHERE user_id = ${req.user.id} 
                AND date BETWEEN ${startDate} AND ${endDate}
                ORDER BY date DESC
            `;
        } else {
            result = await sql`
                SELECT date, content FROM entries 
                WHERE user_id = ${req.user.id} 
                ORDER BY date DESC
            `;
        }

        res.json(result);
    } catch (err) {
        console.error('獲取日記失敗:', err);
        res.status(500).json({ error: '獲取日記失敗' });
    }
});

// 獲取特定日期的日記
app.get('/api/entries/:date', authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const result = await sql`
            SELECT content FROM entries 
            WHERE user_id = ${req.user.id} AND date = ${date}
        `;
        
        res.json(result.length > 0 ? result[0] : { content: '' });
    } catch (err) {
        console.error('獲取日記失敗:', err);
        res.status(500).json({ error: '獲取日記失敗' });
    }
});

// 儲存或更新日記
app.post('/api/entries', authenticateToken, async (req, res) => {
    try {
        const { date, content } = req.body;

        if (!date) {
            return res.status(400).json({ error: '日期不能為空' });
        }

        if (!content || content.trim() === '') {
            // 如果內容為空，刪除該日記
            await sql`
                DELETE FROM entries 
                WHERE user_id = ${req.user.id} AND date = ${date}
            `;
            res.json({ message: '日記已刪除' });
            return;
        }

        // 使用 UPSERT (INSERT ... ON CONFLICT)
        await sql`
            INSERT INTO entries (user_id, date, content, updated_at) 
            VALUES (${req.user.id}, ${date}, ${content.trim()}, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, date) 
            DO UPDATE SET content = ${content.trim()}, updated_at = CURRENT_TIMESTAMP
        `;

        res.json({ message: '日記已儲存', date, content: content.trim() });
    } catch (err) {
        console.error('儲存日記失敗:', err);
        res.status(500).json({ error: '儲存日記失敗' });
    }
});

// 刪除日記
app.delete('/api/entries/:date', authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        await sql`
            DELETE FROM entries 
            WHERE user_id = ${req.user.id} AND date = ${date}
        `;
        res.json({ message: '日記已刪除' });
    } catch (err) {
        console.error('刪除日記失敗:', err);
        res.status(500).json({ error: '刪除日記失敗' });
    }
});

// 獲取統計資訊
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const result = await sql`
            SELECT 
                COUNT(*) as total_entries,
                MIN(date) as first_entry_date,
                MAX(date) as last_entry_date,
                EXTRACT(YEAR FROM date::date) as year,
                COUNT(*) as entries_per_year
            FROM entries 
            WHERE user_id = ${req.user.id} 
            GROUP BY EXTRACT(YEAR FROM date::date)
            ORDER BY year DESC
        `;
        
        res.json(result);
    } catch (err) {
        console.error('獲取統計失敗:', err);
        res.status(500).json({ error: '獲取統計失敗' });
    }
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

// 啟動伺服器
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, async () => {
    console.log(`✅ 伺服器成功啟動`);
    console.log(`🌐 Host: ${HOST}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
    
    // 初始化資料庫
    await initDatabase();
});

// 錯誤處理
server.on('error', (err) => {
    console.error('伺服器錯誤:', err);
});

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('📴 收到 SIGTERM 信號，正在關閉伺服器...');
    server.close(async () => {
        console.log('✅ 伺服器已關閉');
        await sql.end();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 收到 SIGINT 信號，正在關閉伺服器...');
    server.close(async () => {
        console.log('✅ 伺服器已關閉');
        await sql.end();
        process.exit(0);
    });
});

module.exports = app;