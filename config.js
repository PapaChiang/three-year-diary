// Google OAuth 設定
const GOOGLE_CONFIG = {
    // 請替換為你的 Google Client ID
    CLIENT_ID: '437493976435-fe5de3r309f68vabbogr59vgnsbt00t3.apps.googleusercontent.com',
    
    // 開發環境可以使用這個測試 Client ID (僅供測試，請勿用於生產環境)
    // 或者設定你自己的 Client ID
    get clientId() {
        // 如果在 localhost 且沒有設定真實的 Client ID，使用測試模式
        if (window.location.hostname === 'localhost' && this.CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            console.warn('使用測試模式，請設定真實的 Google Client ID');
            return null; // 返回 null 會啟用測試模式
        }
        return this.CLIENT_ID;
    }
};

window.GOOGLE_CONFIG = GOOGLE_CONFIG;