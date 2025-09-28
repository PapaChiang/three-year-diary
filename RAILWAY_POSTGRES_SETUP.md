# 🚂 Railway + PostgreSQL 部署指南

## 🎯 **持久資料庫解決方案**

這個設定使用 PostgreSQL 資料庫，確保你的日記資料永久保存。

## 📋 **部署步驟**

### 1. 推送程式碼到 GitHub

```bash
git add .
git commit -m "添加 PostgreSQL 支援的後端"
git push
```

### 2. 在 Railway 建立 PostgreSQL 資料庫

1. 前往 [railway.app](https://railway.app)
2. 登入你的帳號
3. 點擊你的專案 (three-year-diary)
4. 點擊 "New" → "Database" → "Add PostgreSQL"
5. 等待資料庫建立完成

### 3. 連接應用程式到資料庫

Railway 會自動設定 `DATABASE_URL` 環境變數，你的應用會自動連接到資料庫。

### 4. 設定環境變數

在 Railway 專案的 Variables 中確認以下變數：

**必要變數：**
```
NODE_ENV=production
JWT_SECRET=你的超強密碼123456789
DATABASE_URL=postgresql://... (Railway 自動設定)
```

**可選變數：**
```
GOOGLE_CLIENT_ID=你的Google客戶端ID
```

### 5. 重新部署

Railway 會自動偵測程式碼變更並重新部署。

## 🎉 **完成！**

現在你的應用有：
- ✅ **持久資料庫**：PostgreSQL 資料永久保存
- ✅ **自動備份**：Railway 自動備份資料庫
- ✅ **高可用性**：專業級資料庫服務
- ✅ **擴展性**：可以處理更多用戶

## 🔍 **測試步驟**

1. **健康檢查**：訪問 `/health` 端點
2. **應該看到**：
   ```json
   {
     "status": "OK",
     "database": "connected",
     "db_time": "2024-01-01T12:00:00.000Z"
   }
   ```
3. **測試功能**：
   - 註冊/登入
   - 寫日記並儲存
   - 重新整理頁面，資料應該還在

## 🔧 **資料庫管理**

### 連接到資料庫
```bash
# 在 Railway 專案中找到 DATABASE_URL
psql $DATABASE_URL
```

### 查看資料
```sql
-- 查看所有用戶
SELECT * FROM users;

-- 查看所有日記
SELECT * FROM entries;

-- 查看特定用戶的日記
SELECT u.name, e.date, e.content 
FROM users u 
JOIN entries e ON u.id = e.user_id 
WHERE u.email = 'your@email.com';
```

## 🚀 **優勢**

相比內存儲存：
- 📊 **資料持久化**：重啟不會遺失資料
- 🔒 **資料安全**：專業級資料庫備份
- 📈 **效能更好**：支援更多並發用戶
- 🔍 **可查詢**：支援複雜的資料查詢

## 💰 **費用**

- Railway PostgreSQL：免費方案包含 1GB 儲存空間
- 對個人日記應用來說綽綽有餘
- 可以升級到付費方案獲得更多空間