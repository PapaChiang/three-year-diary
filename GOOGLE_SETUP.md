# Google OAuth 設定指南

## 1. 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊右上角的「選取專案」，然後點擊「新增專案」
3. 輸入專案名稱（例如：「三年日記應用」）
4. 點擊「建立」

## 2. 啟用必要的 API

1. 在 Google Cloud Console 中，前往「APIs & Services」>「Library」
2. 搜尋並啟用「Google+ API」或「Google Identity API」

## 3. 設定 OAuth 同意畫面

1. 前往「APIs & Services」>「OAuth consent screen」
2. 選擇「External」（外部）
3. 填寫必要資訊：
   - 應用程式名稱：「三年日記」
   - 用戶支援電子郵件：你的電子郵件
   - 開發人員聯絡資訊：你的電子郵件
4. 點擊「儲存並繼續」
5. 在「Scopes」頁面，點擊「儲存並繼續」
6. 在「Test users」頁面，可以新增測試用戶（可選）
7. 點擊「儲存並繼續」

## 4. 建立 OAuth 2.0 憑證

1. 前往「APIs & Services」>「Credentials」
2. 點擊「+ CREATE CREDENTIALS」>「OAuth 2.0 Client IDs」
3. 選擇「Web application」
4. 設定名稱：「三年日記 Web 客戶端」
5. 在「Authorized JavaScript origins」中新增：
   - `http://localhost:3000` (開發環境)
   - `https://yourdomain.com` (生產環境，替換為你的實際網域)
6. 在「Authorized redirect URIs」中新增：
   - `http://localhost:3000` (開發環境)
   - `https://yourdomain.com` (生產環境，替換為你的實際網域)
7. 點擊「建立」
8. **重要：複製產生的 Client ID**

## 5. 更新應用程式設定

### 方法 1: 更新 config.js 檔案（推薦）
1. 開啟 `config.js` 檔案
2. 找到這行：
   ```javascript
   CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_HERE',
   ```
3. 替換成你的實際 Google Client ID：
   ```javascript
   CLIENT_ID: '你的Google客戶端ID.apps.googleusercontent.com',
   ```

### 方法 2: 使用環境變數（可選）
1. 複製 `.env.example` 為 `.env`：
   ```bash
   cp .env.example .env
   ```
2. 在 `.env` 檔案中設定：
   ```env
   GOOGLE_CLIENT_ID=你的Google客戶端ID.apps.googleusercontent.com
   ```
3. 修改 `config.js` 使用環境變數（需要後端支援）

## 6. 測試設定

1. 啟動應用程式：
   ```bash
   npm install
   npm start
   ```

2. 在瀏覽器中開啟 `http://localhost:3000`

3. 你應該會看到 Google 登入按鈕而不是「測試模式」按鈕

4. 點擊 Google 登入按鈕測試

## 7. 常見問題排除

### 問題 1: 仍然顯示「測試模式」
- 檢查 `config.js` 中的 `CLIENT_ID` 是否正確設定
- 確保瀏覽器已重新載入頁面
- 檢查瀏覽器控制台是否有錯誤訊息

### 問題 2: 登入時出現「redirect_uri_mismatch」錯誤
- 檢查 Google Cloud Console 中的「Authorized redirect URIs」設定
- 確保 URI 完全匹配（包括 http/https 和埠號）

### 問題 3: 登入時出現「origin_mismatch」錯誤
- 檢查 Google Cloud Console 中的「Authorized JavaScript origins」設定
- 確保包含正確的網域和埠號

## 8. 生產環境部署

1. 在 Google Cloud Console 中更新授權網域：
   - 新增你的生產環境網域到「Authorized JavaScript origins」
   - 新增你的生產環境網域到「Authorized redirect URIs」

2. 更新生產環境的 `config.js` 或使用環境變數

3. 確保使用 HTTPS 連線（Google OAuth 在生產環境要求 HTTPS）

## 9. 安全注意事項

- Google Client ID 可以公開（它設計為前端使用）
- 但仍建議限制授權網域以提高安全性
- 定期檢查和更新 OAuth 設定
- 監控異常的登入活動

## 10. 進階設定

### 自訂登入按鈕樣式
可以在 `script.js` 的 `initGoogleLogin()` 函數中修改按鈕樣式：
```javascript
window.google.accounts.id.renderButton(
    googleContainer,
    {
        type: 'standard',        // 'standard' 或 'icon'
        shape: 'rectangular',    // 'rectangular' 或 'pill' 或 'circle'
        theme: 'outline',        // 'outline' 或 'filled_blue' 或 'filled_black'
        text: 'signin_with',     // 'signin_with' 或 'signup_with' 或 'continue_with'
        size: 'large',          // 'large' 或 'medium' 或 'small'
        logo_alignment: 'left'   // 'left' 或 'center'
    }
);
```