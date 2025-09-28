# Google OAuth 設定指南

## 1. 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 Google+ API

## 2. 設定 OAuth 2.0 憑證

1. 在 Google Cloud Console 中，前往「APIs & Services」>「Credentials」
2. 點擊「Create Credentials」>「OAuth 2.0 Client IDs」
3. 選擇「Web application」
4. 設定授權的 JavaScript 來源：
   - `http://localhost:3000` (開發環境)
   - 你的網域 (生產環境)
5. 設定授權的重新導向 URI：
   - `http://localhost:3000` (開發環境)
   - 你的網域 (生產環境)

## 3. 更新設定檔

### 更新 .env 檔案
```env
GOOGLE_CLIENT_ID=你的Google客戶端ID
```

### 更新 index.html
在 `index.html` 中找到這行：
```html
data-client_id="YOUR_GOOGLE_CLIENT_ID"
```
替換成你的實際 Google Client ID：
```html
data-client_id="你的Google客戶端ID"
```

## 4. 測試設定

1. 啟動後端伺服器：
   ```bash
   npm install
   npm run dev
   ```

2. 在瀏覽器中開啟 `http://localhost:3000`

3. 點擊 Google 登入按鈕測試

## 5. 生產環境部署

1. 在 Google Cloud Console 中更新授權網域
2. 更新環境變數中的 `GOOGLE_CLIENT_ID`
3. 確保 HTTPS 連線（Google OAuth 要求）

## 安全注意事項

- 不要將 Google Client ID 提交到公開的程式碼庫
- 在生產環境中使用環境變數
- 定期檢查和更新 OAuth 設定
- 限制授權網域以提高安全性