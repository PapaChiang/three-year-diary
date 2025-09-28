# 🚂 Railway 部署指南

## 步驟 1: 推送到 GitHub

```bash
# 如果還沒有 GitHub 倉庫，先建立一個
# 然後執行以下指令：

git remote add origin https://github.com/PapaChiang/three-year-diary.git
git branch -M main
git push -u origin main
```

## 步驟 2: Railway 部署

### 2.1 註冊 Railway
1. 前往 [railway.app](https://railway.app)
2. 點擊 "Start a New Project"
3. 使用 GitHub 帳號登入

### 2.2 連接 GitHub 倉庫
1. 選擇 "Deploy from GitHub repo"
2. 選擇你的三年日記倉庫
3. 點擊 "Deploy Now"

### 2.3 設定環境變數
在 Railway 專案設定中添加以下環境變數：

**必要變數：**
```
NODE_ENV=production
JWT_SECRET=你的超強密碼123456789
```

**可選變數（Google 登入）：**
```
GOOGLE_CLIENT_ID=你的Google客戶端ID
```

### 2.4 自動部署
- Railway 會自動偵測 Node.js 專案
- 使用 `npm start` 啟動應用
- 每次推送到 main 分支都會自動重新部署

## 步驟 3: 設定自訂網域（可選）

1. 在 Railway 專案中點擊 "Settings"
2. 找到 "Domains" 區段
3. 點擊 "Generate Domain" 獲得免費子網域
4. 或添加你自己的網域

## 步驟 4: Google OAuth 設定（可選）

如果要使用 Google 登入：

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立新專案或選擇現有專案
3. 啟用 "Google+ API"
4. 建立 OAuth 2.0 客戶端 ID
5. 在 "授權的 JavaScript 來源" 添加：
   - `https://你的railway網域.railway.app`
6. 在 "授權的重新導向 URI" 添加：
   - `https://你的railway網域.railway.app`
7. 複製客戶端 ID 到 Railway 環境變數

## 步驟 5: 測試部署

部署完成後：
1. 訪問 Railway 提供的網址
2. 測試登入功能（測試模式或 Google 登入）
3. 嘗試寫日記並儲存
4. 檢查三年對比功能

## 🎉 完成！

你的三年日記現在已經在線上運行了！

### 重要提醒：
- Railway 免費方案每月有 $5 美元額度
- 資料庫檔案會持久保存
- 支援自動 HTTPS
- 可以設定自訂網域

### 故障排除：
- 如果部署失敗，檢查 Railway 的建置日誌
- 確保環境變數設定正確
- 檢查 package.json 中的 start 腳本

### 更新應用：
只需要推送新的程式碼到 GitHub，Railway 會自動重新部署：
```bash
git add .
git commit -m "更新功能"
git push
```