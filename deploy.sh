#!/bin/bash

echo "🚂 準備部署到 Railway..."

# 檢查是否有未提交的變更
if [[ -n $(git status -s) ]]; then
    echo "📝 發現未提交的變更，正在提交..."
    git add .
    echo "請輸入提交訊息 (按 Enter 使用預設訊息):"
    read commit_message
    if [ -z "$commit_message" ]; then
        commit_message="更新應用 $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    git commit -m "$commit_message"
fi

# 推送到 GitHub
echo "🚀 推送到 GitHub..."
git push

echo "✅ 部署完成！Railway 會自動偵測變更並重新部署。"
echo "📱 請到 Railway 控制台查看部署狀態：https://railway.app/dashboard"