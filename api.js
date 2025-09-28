class DiaryAPI {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('diary_token');
    }

    // 設定 token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('diary_token', token);
        } else {
            localStorage.removeItem('diary_token');
        }
    }

    // 獲取 headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // 通用請求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '請求失敗');
            }

            return data;
        } catch (error) {
            console.error('API 請求錯誤:', error);
            throw error;
        }
    }

    // Google 登入
    async googleLogin(credential) {
        // 測試模式使用假的 credential
        const testCredential = credential || 'test_credential';
        
        const data = await this.request('/auth/google', {
            method: 'POST',
            body: JSON.stringify({ credential: testCredential })
        });
        
        this.setToken(data.token);
        
        // 儲存用戶資訊
        if (data.user) {
            localStorage.setItem('diary_user', JSON.stringify(data.user));
        }
        
        return data;
    }

    // 登出
    logout() {
        this.setToken(null);
        localStorage.removeItem('diary_user');
    }

    // 檢查是否已登入
    isLoggedIn() {
        return !!this.token;
    }

    // 獲取日記列表
    async getEntries(startDate = null, endDate = null) {
        let endpoint = '/entries';
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }

        return await this.request(endpoint);
    }

    // 獲取特定日期的日記
    async getEntry(date) {
        return await this.request(`/entries/${date}`);
    }

    // 儲存日記
    async saveEntry(date, content) {
        return await this.request('/entries', {
            method: 'POST',
            body: JSON.stringify({ date, content })
        });
    }

    // 刪除日記
    async deleteEntry(date) {
        return await this.request(`/entries/${date}`, {
            method: 'DELETE'
        });
    }

    // 獲取統計資訊
    async getStats() {
        return await this.request('/stats');
    }

    // 批量獲取多個日期的日記（用於月檢視等）
    async getEntriesInRange(startDate, endDate) {
        const entries = await this.getEntries(startDate, endDate);
        const entriesMap = {};
        
        entries.forEach(entry => {
            entriesMap[entry.date] = entry.content;
        });
        
        return entriesMap;
    }
}