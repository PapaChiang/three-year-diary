#!/usr/bin/env node

/**
 * Google OAuth 快速設定腳本
 * 使用方法: node setup-google.js YOUR_GOOGLE_CLIENT_ID
 */

const fs = require('fs');
const path = require('path');

function updateGoogleClientId(clientId) {
    if (!clientId) {
        console.error('❌ 請提供 Google Client ID');
        console.log('使用方法: node setup-google.js YOUR_GOOGLE_CLIENT_ID');
        process.exit(1);
    }

    // 驗證 Client ID 格式
    if (!clientId.includes('.apps.googleusercontent.com')) {
        console.warn('⚠️  警告: Client ID 格式可能不正確');
        console.log('正確格式應該是: xxxxxxxxx.apps.googleusercontent.com');
    }

    try {
        // 更新 config.js
        const configPath = path.join(__dirname, 'config.js');
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        configContent = configContent.replace(
            /CLIENT_ID:\s*['"`]YOUR_GOOGLE_CLIENT_ID_HERE['"`]/,
            `CLIENT_ID: '${clientId}'`
        );
        
        fs.writeFileSync(configPath, configContent);
        console.log('✅ 已更新 config.js');

        // 更新 .env 檔案（如果存在）
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            if (envContent.includes('GOOGLE_CLIENT_ID=')) {
                envContent = envContent.replace(
                    /GOOGLE_CLIENT_ID=.*/,
                    `GOOGLE_CLIENT_ID=${clientId}`
                );
            } else {
                envContent += `\nGOOGLE_CLIENT_ID=${clientId}\n`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log('✅ 已更新 .env');
        } else {
            // 建立 .env 檔案
            const envExamplePath = path.join(__dirname, '.env.example');
            if (fs.existsSync(envExamplePath)) {
                let envContent = fs.readFileSync(envExamplePath, 'utf8');
                envContent = envContent.replace(
                    /GOOGLE_CLIENT_ID=.*/,
                    `GOOGLE_CLIENT_ID=${clientId}`
                );
                fs.writeFileSync(envPath, envContent);
                console.log('✅ 已建立 .env 檔案');
            }
        }

        console.log('\n🎉 Google OAuth 設定完成！');
        console.log('\n下一步：');
        console.log('1. 啟動應用程式: npm start');
        console.log('2. 開啟瀏覽器: http://localhost:3000');
        console.log('3. 測試 Google 登入功能');
        
    } catch (error) {
        console.error('❌ 設定失敗:', error.message);
        process.exit(1);
    }
}

// 從命令列參數獲取 Client ID
const clientId = process.argv[2];
updateGoogleClientId(clientId);