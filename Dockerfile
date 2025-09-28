FROM node:18-alpine

WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製應用程式碼
COPY . .

# 建立資料庫目錄
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 啟動應用
CMD ["npm", "start"]