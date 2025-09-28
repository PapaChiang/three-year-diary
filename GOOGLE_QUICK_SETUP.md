# Google 登入快速設定

## 🚀 5 分鐘快速設定

### 1. 建立 Google OAuth 憑證
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 前往「APIs & Services」>「Credentials」
4. 點擊「CREATE CREDENTIALS」>「OAuth 2.0 Client IDs」
5. 選擇「Web application」
6. 在「Authorized JavaScript origins」新增：
   - `http://localhost:3000`
   - 你的網域（如果有的話）
7. 點擊「建立」並複製 Client ID

### 2. 設定應用程式
使用快速設定腳本：
```bash
npm run setup-google YOUR_GOOGLE_CLIENT_ID
```

或手動編輯 `config.js`：
```javascript
CLIENT_ID: '你的Google客戶端ID.apps.googleusercontent.com',
```

### 3. 測試
```bash
npm start
```
開啟 http://localhost:3000 測試登入

## ✅ 完成！
現在你應該可以看到 Google 登入按鈕並成功登入了。

---

詳細設定說明請參考 [GOOGLE_SETUP.md](./GOOGLE_SETUP.md)