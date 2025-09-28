# 三年日記應用

一個支援多種檢視模式的日記應用，可以記錄每天的心情和想法，並查看歷年同日的記錄。

## 🚀 快速部署

### 一鍵部署到 Railway (推薦)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/PapaChiang/three-year-diary)

### 一鍵部署到 Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PapaChiang/three-year-diary)

### 一鍵部署到 Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/PapaChiang/three-year-diary)

## 功能特色

- 📝 **今天檢視** - 專注寫今天的日記，查看歷史同日記錄
- 📅 **日檢視** - 以週為單位，顯示7天的日記預覽
- 📊 **週檢視** - 詳細的週檢視，每天有更多空間顯示內容
- 🗓️ **月檢視** - 月曆格式，快速瀏覽整個月的記錄狀況
- 👤 **Google 登入** - 使用 Google 帳號安全登入
- 💾 **雲端同步** - 資料儲存在後端，多裝置同步
- 🔒 **安全性** - JWT 認證，密碼加密

## 技術架構

### 前端
- 純 HTML/CSS/JavaScript
- 響應式設計
- 本地快取優化

### 後端
- Node.js + Express
- SQLite 資料庫
- JWT 認證
- bcrypt 密碼加密

## 安裝與執行

### 1. 安裝依賴
```bash
npm install
```

### 2. 設定 Google OAuth
請參考 `GOOGLE_SETUP.md` 設定 Google OAuth 憑證

### 3. 設定環境變數
複製 `.env` 檔案並修改設定：
```bash
cp .env.example .env
```
更新 `GOOGLE_CLIENT_ID` 為你的 Google 客戶端 ID

### 4. 啟動後端伺服器
```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

### 5. 開啟前端
在瀏覽器中開啟 `index.html` 或將前端檔案部署到網頁伺服器。

## API 文檔

### 認證相關
- `POST /api/auth/google` - Google OAuth 登入

### 日記相關
- `GET /api/entries` - 獲取日記列表
- `GET /api/entries/:date` - 獲取特定日期日記
- `POST /api/entries` - 儲存日記
- `DELETE /api/entries/:date` - 刪除日記

### 統計相關
- `GET /api/stats` - 獲取統計資訊

## 資料庫結構

### users 表
- id (主鍵)
- google_id (Google ID，唯一)
- email (電子郵件，唯一)
- name (姓名)
- picture (頭像 URL)
- created_at (建立時間)

### entries 表
- id (主鍵)
- user_id (用戶ID，外鍵)
- date (日期，格式：YYYY-MM-DD)
- content (日記內容)
- created_at (建立時間)
- updated_at (更新時間)

## 部署建議

### 開發環境
1. 使用 `npm run dev` 啟動開發伺服器
2. 前端直接開啟 `index.html`

### 生產環境
1. 設定正確的環境變數
2. 使用 PM2 或類似工具管理 Node.js 程序
3. 使用 Nginx 作為反向代理
4. 考慮使用 PostgreSQL 或 MySQL 替代 SQLite

## 安全注意事項

1. 修改 `.env` 中的 `JWT_SECRET`
2. 在生產環境中使用 HTTPS
3. 設定適當的 CORS 政策
4. 定期備份資料庫
5. 考慮實施速率限制

## 授權

MIT License