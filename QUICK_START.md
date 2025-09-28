# 快速開始指南

## 立即測試（無需 Google 設定）

1. **啟動伺服器**：
   ```bash
   npm install
   npm run dev
   ```

2. **開啟瀏覽器**：
   前往 `http://localhost:3000`

3. **測試登入**：
   - 會看到「測試模式」按鈕
   - 點擊「測試登入」即可開始使用

## 設定真實 Google 登入

### 步驟 1: 建立 Google 專案
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案
3. 啟用「Google+ API」

### 步驟 2: 建立 OAuth 憑證
1. 前往「APIs & Services」>「Credentials」
2. 點擊「Create Credentials」>「OAuth 2.0 Client IDs」
3. 選擇「Web application」
4. 設定授權來源：
   - `http://localhost:3000`
   - 你的網域（如果有）

### 步驟 3: 更新設定
1. 複製 Client ID
2. 編輯 `config.js`：
   ```javascript
   const GOOGLE_CONFIG = {
       CLIENT_ID: '你的Google Client ID',
       // ...
   };
   ```

### 步驟 4: 重新載入
重新整理瀏覽器，現在會顯示真正的 Google 登入按鈕。

## 常見問題

**Q: 看到 400 錯誤怎麼辦？**
A: 檢查 Google Client ID 是否正確設定，或使用測試模式。

**Q: 測試模式安全嗎？**
A: 測試模式僅供開發使用，生產環境請務必設定真實的 Google OAuth。

**Q: 如何切換到生產模式？**
A: 設定正確的 `GOOGLE_CLIENT_ID` 並重新載入頁面。