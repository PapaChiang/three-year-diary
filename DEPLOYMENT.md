# 三年日記 - 部署指南

## 快速部署選項

### 1. Vercel 部署 (推薦 - 免費)

1. 註冊 [Vercel](https://vercel.com) 帳號
2. 安裝 Vercel CLI: `npm i -g vercel`
3. 在專案目錄執行: `vercel`
4. 跟隨指示完成部署

**優點**: 免費、簡單、自動 HTTPS
**缺點**: SQLite 資料庫會在每次部署時重置

### 2. Railway 部署 (推薦 - 持久資料庫)

1. 註冊 [Railway](https://railway.app) 帳號
2. 連接你的 GitHub 倉庫
3. 設定環境變數 (見下方)
4. 自動部署

**優點**: 持久資料庫、免費額度、簡單
**缺點**: 免費額度有限制

### 3. Render 部署

1. 註冊 [Render](https://render.com) 帳號
2. 連接 GitHub 倉庫
3. 選擇 "Web Service"
4. 設定環境變數

### 4. Heroku 部署

1. 註冊 [Heroku](https://heroku.com) 帳號
2. 安裝 Heroku CLI
3. 執行部署指令

## 環境變數設定

在部署平台設定以下環境變數：

```
NODE_ENV=production
JWT_SECRET=你的超強密碼
GOOGLE_CLIENT_ID=你的Google客戶端ID (可選)
```

## Google OAuth 設定 (可選)

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立新專案或選擇現有專案
3. 啟用 Google+ API
4. 建立 OAuth 2.0 客戶端 ID
5. 設定授權的 JavaScript 來源和重新導向 URI
6. 將客戶端 ID 設定為環境變數

## 資料庫注意事項

- **Vercel**: SQLite 資料庫會在每次部署時重置，適合測試
- **Railway/Render**: 支援持久檔案系統，資料不會遺失
- **生產環境**: 建議使用 PostgreSQL 或 MySQL

## 測試部署

部署完成後，訪問你的網站：
- 測試登入功能
- 測試日記儲存
- 檢查三年對比功能

## 故障排除

1. **500 錯誤**: 檢查環境變數是否正確設定
2. **登入失敗**: 檢查 Google Client ID 設定
3. **資料遺失**: 確認使用支援持久儲存的平台

## 自訂網域 (可選)

大部分平台都支援自訂網域：
1. 在平台設定中添加你的網域
2. 設定 DNS 記錄指向平台提供的地址
3. 等待 SSL 憑證自動配置