class ThreeYearDiary {
    constructor() {
        this.today = new Date();
        this.currentView = 'today';
        this.currentDate = new Date(this.today);
        this.api = new DiaryAPI();
        this.entriesCache = new Map();
        this.weeklyRecordsCache = new Map();
        this.currentCategory = 'exercise';
        this.currentRating = 0;
        this.googleInitialized = false;
        this.init();
    }

    async init() {
        this.bindNavigation();
        this.bindAuthEvents();
        
        if (this.api.isLoggedIn()) {
            await this.loadUserData();
        } else {
            this.showLoginModal();
        }
    }

    bindAuthEvents() {
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('testLoginBtn').addEventListener('click', () => this.handleTestLogin());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideLoginModal();
            }
        });

        window.handleGoogleSignIn = (response) => {
            this.handleGoogleLogin(response.credential);
        };
    }

    showLoginModal() {
        document.getElementById('loginModal').classList.add('show');
    }

    hideLoginModal() {
        document.getElementById('loginModal').classList.remove('show');
    }

    showLoading() {
        document.getElementById('loadingIndicator').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loadingIndicator').classList.remove('show');
    }

    showError(message) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    }

    hideError() {
        const errorDiv = document.getElementById('loginError');
        errorDiv.classList.remove('show');
    }

    initGoogleLogin() {
        const clientId = window.GOOGLE_CONFIG?.clientId;
        
        if (!clientId || !window.google) {
            const googleContainer = document.getElementById('googleLoginContainer');
            const testContainer = document.getElementById('testLoginContainer');
            
            if (googleContainer) googleContainer.style.display = 'none';
            if (testContainer) testContainer.style.display = 'block';
            return;
        }

        try {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                    this.handleGoogleLogin(response);
                },
                auto_select: false,
                cancel_on_tap_outside: false
            });

            const googleContainer = document.getElementById('googleLoginContainer');
            if (googleContainer) {
                window.google.accounts.id.renderButton(
                    googleContainer,
                    {
                        type: 'standard',
                        shape: 'rectangular',
                        theme: 'outline',
                        text: 'signin_with',
                        size: 'large',
                        logo_alignment: 'left'
                    }
                );

                googleContainer.style.display = 'block';
            }

            const testContainer = document.getElementById('testLoginContainer');
            if (testContainer) {
                testContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Google Sign-In 初始化失敗:', error);
            const googleContainer = document.getElementById('googleLoginContainer');
            const testContainer = document.getElementById('testLoginContainer');
            
            if (googleContainer) googleContainer.style.display = 'none';
            if (testContainer) testContainer.style.display = 'block';
        }
    }

    async handleGoogleLogin(response) {
        this.showLoading();
        this.hideError();

        try {
            const credential = response.credential || response;
            const result = await this.api.googleLogin(credential);
            this.hideLoginModal();
            this.showUserInfo(result.user);
            await this.loadUserData();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async handleTestLogin() {
        this.showLoading();
        this.hideError();

        try {
            const testUser = {
                id: 'test_user_123',
                name: '測試用戶',
                email: 'test@example.com',
                picture: null
            };

            this.api.setToken('test_token_123');
            localStorage.setItem('diary_user', JSON.stringify(testUser));

            this.hideLoginModal();
            this.showUserInfo(testUser);
            await this.loadUserData();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    handleLogout() {
        this.api.logout();
        this.hideUserInfo();
        this.showLoginModal();
        this.entriesCache.clear();
        
        this.clearStructuredForm();
        document.getElementById('lastYearEntry').innerHTML = '<p class="no-entry">去年的今天還沒有日記記錄</p>';
        document.getElementById('twoYearsAgoEntry').innerHTML = '<p class="no-entry">前年的今天還沒有日記記錄</p>';
    }

    showUserInfo(user) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userInfo').classList.add('show');
    }

    hideUserInfo() {
        document.getElementById('userInfo').classList.remove('show');
    }

    async loadUserData() {
        try {
            this.showLoading();
            this.entriesCache.clear();
            
            const userInfo = localStorage.getItem('diary_user');
            if (userInfo) {
                const user = JSON.parse(userInfo);
                this.showUserInfo(user);
            }
            
            await this.updateTodayView();
            this.bindEvents();
            
            if (window.google && !this.googleInitialized) {
                this.initGoogleLogin();
                this.googleInitialized = true;
            }
        } catch (error) {
            console.error('載入用戶資料失敗:', error);
            this.api.logout();
            this.hideUserInfo();
            this.showLoginModal();
        } finally {
            this.hideLoading();
        }
    }

    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
    }

    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.remove('active');
        });

        document.getElementById(`${view}View`).classList.add('active');
        this.currentView = view;

        switch(view) {
            case 'today':
                this.updateTodayView();
                break;
            case 'daily':
                this.updateDailyView();
                break;
            case 'weekly':
                this.updateWeeklyView();
                break;
            case 'monthly':
                this.updateMonthlyView();
                break;
        }
    }

    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getMonthDayKey(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}-${day}`;
    }

    formatDate(date, format = 'full') {
        const options = {
            full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
            month: { year: 'numeric', month: 'long' },
            week: { month: 'long', day: 'numeric' }
        };
        return date.toLocaleDateString('zh-TW', options[format]);
    }

    async updateTodayView() {
        document.getElementById('currentDate').textContent = this.formatDate(this.today);
        await this.loadTodayEntry();
        await this.loadHistoryEntries();
    }

    async loadTodayEntry() {
        try {
            const todayKey = this.getDateKey(this.today);
            const entry = await this.getEntryFromCacheOrAPI(todayKey);
            
            if (entry) {
                this.populateStructuredForm(entry);
            } else {
                this.clearStructuredForm();
            }
        } catch (error) {
            console.error('載入今天日記失敗:', error);
        }
    }

    populateStructuredForm(entryData) {
        try {
            const data = JSON.parse(entryData);
            
            document.getElementById('goodMoments').value = data.goodMoments || '';
            document.getElementById('achievements').value = data.achievements || '';
            document.getElementById('gratitude').value = data.gratitude || '';
            document.getElementById('learnings').value = data.learnings || '';
            document.getElementById('futureNote').value = data.futureNote || '';
        } catch (error) {
            document.getElementById('goodMoments').value = entryData || '';
            document.getElementById('achievements').value = '';
            document.getElementById('gratitude').value = '';
            document.getElementById('learnings').value = '';
            document.getElementById('futureNote').value = '';
        }
    }

    clearStructuredForm() {
        document.getElementById('goodMoments').value = '';
        document.getElementById('achievements').value = '';
        document.getElementById('gratitude').value = '';
        document.getElementById('learnings').value = '';
        document.getElementById('futureNote').value = '';
    }

    collectStructuredData() {
        return {
            goodMoments: document.getElementById('goodMoments').value.trim(),
            achievements: document.getElementById('achievements').value.trim(),
            gratitude: document.getElementById('gratitude').value.trim(),
            learnings: document.getElementById('learnings').value.trim(),
            futureNote: document.getElementById('futureNote').value.trim()
        };
    }

    async loadHistoryEntries() {
        const monthDay = this.getMonthDayKey(this.today);
        
        try {
            const lastYear = this.today.getFullYear() - 1;
            const lastYearKey = `${lastYear}-${monthDay}`;
            const lastYearEntry = await this.getEntryFromCacheOrAPI(lastYearKey);
            
            const lastYearDiv = document.getElementById('lastYearEntry');
            if (lastYearEntry) {
                lastYearDiv.innerHTML = this.formatHistoryEntry(lastYearEntry, `${lastYear}年${monthDay.replace('-', '月')}日`);
                lastYearDiv.classList.add('structured');
            } else {
                lastYearDiv.innerHTML = '<p class="no-entry">去年的今天還沒有日記記錄</p>';
                lastYearDiv.classList.remove('structured');
            }

            const twoYearsAgo = this.today.getFullYear() - 2;
            const twoYearsAgoKey = `${twoYearsAgo}-${monthDay}`;
            const twoYearsAgoEntry = await this.getEntryFromCacheOrAPI(twoYearsAgoKey);
            
            const twoYearsAgoDiv = document.getElementById('twoYearsAgoEntry');
            if (twoYearsAgoEntry) {
                twoYearsAgoDiv.innerHTML = this.formatHistoryEntry(twoYearsAgoEntry, `${twoYearsAgo}年${monthDay.replace('-', '月')}日`);
                twoYearsAgoDiv.classList.add('structured');
            } else {
                twoYearsAgoDiv.innerHTML = '<p class="no-entry">前年的今天還沒有日記記錄</p>';
                twoYearsAgoDiv.classList.remove('structured');
            }

            try {
                const lastYearData = JSON.parse(lastYearEntry || '{}');
                const nextYearDiv = document.getElementById('nextYearEntry');
                
                if (lastYearData.futureNote) {
                    nextYearDiv.innerHTML = `
                        <div class="entry-date">來自${lastYear}年的訊息</div>
                        <div class="entry-content">${lastYearData.futureNote}</div>
                    `;
                    nextYearDiv.classList.add('structured');
                } else {
                    nextYearDiv.innerHTML = '<p class="no-entry">還沒有寫給明年的訊息</p>';
                    nextYearDiv.classList.remove('structured');
                }
            } catch (error) {
                document.getElementById('nextYearEntry').innerHTML = '<p class="no-entry">還沒有寫給明年的訊息</p>';
            }
        } catch (error) {
            console.error('載入歷史日記失敗:', error);
        }
    }

    formatHistoryEntry(entryData, dateStr) {
        try {
            const data = JSON.parse(entryData);
            
            let html = `<div class="entry-date">${dateStr}</div>`;
            
            if (data.goodMoments) {
                html += `
                    <div class="history-field">
                        <div class="history-field-label">✨ 美好片刻</div>
                        <div class="history-field-content">${data.goodMoments}</div>
                    </div>
                `;
            }
            
            if (data.achievements) {
                html += `
                    <div class="history-field">
                        <div class="history-field-label">🏆 成就感</div>
                        <div class="history-field-content">${data.achievements}</div>
                    </div>
                `;
            }
            
            if (data.gratitude) {
                html += `
                    <div class="history-field">
                        <div class="history-field-label">🙏 感恩</div>
                        <div class="history-field-content">${data.gratitude}</div>
                    </div>
                `;
            }
            
            if (data.learnings) {
                html += `
                    <div class="history-field">
                        <div class="history-field-label">📚 學習</div>
                        <div class="history-field-content">${data.learnings}</div>
                    </div>
                `;
            }
            
            return html;
        } catch (error) {
            return `
                <div class="entry-date">${dateStr}</div>
                <div class="entry-content">${entryData}</div>
            `;
        }
    }

    async getEntryFromCacheOrAPI(dateKey) {
        if (this.entriesCache.has(dateKey)) {
            return this.entriesCache.get(dateKey);
        }

        try {
            const result = await this.api.getEntry(dateKey);
            const content = result.content || '';
            this.entriesCache.set(dateKey, content);
            return content;
        } catch (error) {
            console.error(`獲取 ${dateKey} 日記失敗:`, error);
            return '';
        }
    }

    updateDailyView() {
        this.bindDailyControls();
        this.renderDailyTimeline();
    }

    bindDailyControls() {
        document.getElementById('prevDay').onclick = () => {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
            this.renderDailyTimeline();
        };
        
        document.getElementById('nextDay').onclick = () => {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
            this.renderDailyTimeline();
        };
    }

    async renderDailyTimeline() {
        const currentYear = this.currentDate.getFullYear();
        const monthDay = this.getMonthDayKey(this.currentDate);
        
        document.getElementById('dailyDate').textContent = this.formatDate(this.currentDate);

        const container = document.getElementById('dailyContent');
        container.innerHTML = '';

        const timeline = document.createElement('div');
        timeline.className = 'daily-timeline';
        
        const years = [];
        for (let i = 2; i >= 0; i--) {
            years.push(currentYear - i);
        }

        const dateKeys = years.map(year => `${year}-${monthDay}`);
        await this.loadMultipleDates(dateKeys);

        for (const year of years) {
            const dateKey = `${year}-${monthDay}`;
            const entry = this.entriesCache.get(dateKey) || '';
            const isCurrentYear = year === currentYear;
            const date = new Date(year, this.currentDate.getMonth(), this.currentDate.getDate());
            
            const dayCard = document.createElement('div');
            dayCard.className = `daily-card ${entry ? 'has-entry' : ''} ${isCurrentYear ? 'current-year' : ''}`;
            
            dayCard.innerHTML = `
                <div class="daily-card-header">
                    <div class="daily-card-year">${year}年</div>
                    <div class="daily-card-date">${this.formatDate(date, 'week')}</div>
                </div>
                <div class="daily-card-content">
                    ${entry ? this.formatDailyCardContent(entry) : '<div class="no-entry-text">這天沒有記錄</div>'}
                </div>
                <div class="daily-card-footer">
                    <button class="edit-btn" onclick="window.diary.openStructuredEditor(new Date('${dateKey}'), \`${entry.replace(/`/g, '\\`')}\`)">
                        ${entry ? '編輯' : '新增'}
                    </button>
                </div>
            `;
            
            timeline.appendChild(dayCard);
        }

        container.appendChild(timeline);
        
        setTimeout(() => {
            const currentYearCard = container.querySelector('.current-year');
            if (currentYearCard) {
                currentYearCard.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
        }, 100);
    }

    async loadMultipleDates(dateKeys) {
        const promises = dateKeys.map(async (dateKey) => {
            if (!this.entriesCache.has(dateKey)) {
                try {
                    const result = await this.api.getEntry(dateKey);
                    const content = result.content || '';
                    this.entriesCache.set(dateKey, content);
                } catch (error) {
                    console.error(`獲取 ${dateKey} 日記失敗:`, error);
                    this.entriesCache.set(dateKey, '');
                }
            }
        });
        
        await Promise.all(promises);
    }

    updateWeeklyView() {
        this.bindWeeklyControls();
        this.renderWeeklyGrid();
    }

    bindWeeklyControls() {
        document.getElementById('prevWeek').onclick = () => {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
            this.renderWeeklyGrid();
        };
        
        document.getElementById('nextWeek').onclick = () => {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
            this.renderWeeklyGrid();
        };
    }

    async renderWeeklyGrid() {
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        document.getElementById('weeklyDate').textContent = 
            `${this.formatDate(startOfWeek, 'week')} - ${this.formatDate(endOfWeek, 'week')}`;

        const container = document.getElementById('weeklyContent');
        container.innerHTML = '';

        // 建立週檢視網格容器
        const weekGrid = document.createElement('div');
        weekGrid.className = 'week-grid';
        
        // 建立標題行（年份）
        const headerRow = document.createElement('div');
        headerRow.className = 'week-grid-header';
        
        const emptyCell = document.createElement('div');
        emptyCell.className = 'week-grid-cell header-cell';
        emptyCell.textContent = '日期';
        headerRow.appendChild(emptyCell);
        
        const currentYear = this.currentDate.getFullYear();
        const years = [currentYear - 2, currentYear - 1, currentYear];
        
        years.forEach(year => {
            const yearCell = document.createElement('div');
            yearCell.className = `week-grid-cell header-cell ${year === currentYear ? 'current-year' : ''}`;
            yearCell.textContent = `${year}年`;
            headerRow.appendChild(yearCell);
        });
        
        weekGrid.appendChild(headerRow);

        // 批量載入這週三年的所有日記
        const allDateKeys = [];
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + dayOffset);
            const monthDay = this.getMonthDayKey(date);
            
            years.forEach(year => {
                allDateKeys.push(`${year}-${monthDay}`);
            });
        }
        await this.loadMultipleDates(allDateKeys);

        // 建立每一天的行
        const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + dayOffset);
            const monthDay = this.getMonthDayKey(date);
            const isToday = this.getDateKey(date) === this.getDateKey(this.today);
            
            const dayRow = document.createElement('div');
            dayRow.className = `week-grid-row ${isToday ? 'today-row' : ''}`;
            
            // 日期標籤
            const dateCell = document.createElement('div');
            dateCell.className = `week-grid-cell date-cell ${isToday ? 'today' : ''}`;
            dateCell.innerHTML = `
                <div class="date-label">${weekdays[dayOffset]}</div>
                <div class="date-number">${date.getDate()}日</div>
            `;
            dayRow.appendChild(dateCell);
            
            // 三年的日記卡片
            years.forEach(year => {
                const dateKey = `${year}-${monthDay}`;
                const entry = this.entriesCache.get(dateKey) || '';
                const isCurrentYear = year === currentYear;
                
                const entryCell = document.createElement('div');
                entryCell.className = `week-grid-cell entry-cell ${entry ? 'has-entry' : ''} ${isCurrentYear ? 'current-year' : ''}`;
                
                entryCell.innerHTML = `
                    <div class="entry-preview">
                        ${entry ? this.formatWeeklyCardContent(entry) : '<div class="no-entry">無記錄</div>'}
                    </div>
                `;
                
                // 點擊編輯
                entryCell.onclick = () => {
                    const fullDate = new Date(year, date.getMonth(), date.getDate());
                    this.openStructuredEditor(fullDate, entry);
                };
                
                dayRow.appendChild(entryCell);
            });
            
            weekGrid.appendChild(dayRow);
        }

        container.appendChild(weekGrid);
    }

    formatWeeklyCardContent(entryData) {
        try {
            const data = JSON.parse(entryData);
            let content = '';
            
            if (data.goodMoments) {
                content += `✨ ${this.truncateText(data.goodMoments, 30)}\n`;
            }
            if (data.achievements) {
                content += `🏆 ${this.truncateText(data.achievements, 30)}\n`;
            }
            if (data.gratitude) {
                content += `🙏 ${this.truncateText(data.gratitude, 30)}\n`;
            }
            if (data.learnings) {
                content += `📚 ${this.truncateText(data.learnings, 30)}\n`;
            }
            if (data.futureNote) {
                content += `🔮 ${this.truncateText(data.futureNote, 30)}`;
            }
            
            return content ? `<div class="entry-text">${content}</div>` : '<div class="no-entry">無記錄</div>';
        } catch (error) {
            return `<div class="entry-text">${this.truncateText(entryData, 60)}</div>`;
        }
    }

    updateMonthlyView() {
        this.bindMonthlyControls();
        this.renderMonthlyView();
    }

    bindMonthlyControls() {
        document.getElementById('prevMonth').onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderMonthlyView();
        };
        
        document.getElementById('nextMonth').onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderMonthlyView();
        };
    }

    async renderMonthlyView() {
        document.getElementById('monthlyDate').textContent = this.formatDate(this.currentDate, 'month');

        const container = document.getElementById('monthlyContent');
        container.innerHTML = '';

        // 建立月檢視容器
        const monthlyContainer = document.createElement('div');
        monthlyContainer.className = 'monthly-container';

        // 建立活動類別選擇器
        const categorySelector = this.createCategorySelector();
        monthlyContainer.appendChild(categorySelector);

        // 建立週記錄網格
        const weeklyGrid = await this.createWeeklyGrid();
        monthlyContainer.appendChild(weeklyGrid);

        container.appendChild(monthlyContainer);
    }

    createCategorySelector() {
        const selector = document.createElement('div');
        selector.className = 'category-selector';
        
        // 獲取所有可見類別（預設 + 自訂，排除隱藏的）
        const allCategories = this.getAllCategories(false);
        
        selector.innerHTML = `
            <div class="category-header">
                <h3>習慣追蹤</h3>
                <button class="manage-categories-btn" onclick="window.diary.openCategoryManager()">
                    管理類別
                </button>
            </div>
            <div class="category-list">
                ${allCategories.map(cat => `
                    <button class="category-item ${cat.id === (this.currentCategory || 'exercise') ? 'active' : ''}" 
                            data-category="${cat.id}" 
                            style="--category-color: ${cat.color}">
                        ${cat.name}
                    </button>
                `).join('')}
            </div>
            <button class="add-category-item" onclick="window.diary.addCustomCategory()">
                ➕ 新增類別
            </button>
        `;

        // 綁定類別切換事件
        selector.querySelectorAll('.category-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selector.querySelectorAll('.category-item').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.renderWeeklyRecords();
            });
        });

        // 設定預設類別，確保選中的類別是可見的
        if (!this.currentCategory || !allCategories.find(cat => cat.id === this.currentCategory)) {
            this.currentCategory = allCategories.length > 0 ? allCategories[0].id : 'exercise';
        }
        
        return selector;
    }

    getAllCategories(includeHidden = false) {
        const defaultCategories = [
            { id: 'exercise', name: '🏃‍♂️ 運動', color: '#059669', isCustom: false },
            { id: 'music', name: '🥁 練鼓', color: '#2563eb', isCustom: false },
            { id: 'reading', name: '📚 閱讀', color: '#7c3aed', isCustom: false },
            { id: 'work', name: '💼 工作', color: '#ea580c', isCustom: false },
            { id: 'hobby', name: '🎨 興趣', color: '#db2777', isCustom: false },
            { id: 'social', name: '👥 社交', color: '#0d9488', isCustom: false },
            { id: 'health', name: '🏥 健康', color: '#dc2626', isCustom: false },
            { id: 'learning', name: '🎓 學習', color: '#475569', isCustom: false }
        ];

        const customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
        const hiddenCategories = JSON.parse(localStorage.getItem('hiddenCategories') || '[]');
        
        const allCategories = [...defaultCategories, ...customCategories.map(cat => ({ ...cat, isCustom: true }))];
        
        if (includeHidden) {
            return allCategories.map(cat => ({
                ...cat,
                isHidden: hiddenCategories.includes(cat.id)
            }));
        } else {
            return allCategories.filter(cat => !hiddenCategories.includes(cat.id));
        }
    }

    openCategoryManager() {
        const allCategories = this.getAllCategories(true); // 包含隱藏的類別
        
        const managerHtml = `
            <div class="category-manager">
                <h3>管理類別</h3>
                <p class="manager-description">控制哪些類別要顯示在習慣追蹤中</p>
                <div class="category-manager-list">
                    ${allCategories.map(cat => `
                        <div class="manager-category-item ${cat.isHidden ? 'hidden-category' : ''}" data-category-id="${cat.id}">
                            <div class="category-preview" style="--category-color: ${cat.color}">
                                <div class="category-visibility">
                                    <button class="visibility-btn ${cat.isHidden ? 'hidden' : 'visible'}" 
                                            onclick="window.diary.toggleCategoryVisibility('${cat.id}', ${cat.isHidden})"
                                            title="${cat.isHidden ? '點擊顯示' : '點擊隱藏'}">
                                        ${cat.isHidden ? '👁️‍🗨️' : '👁️'}
                                    </button>
                                </div>
                                <div class="category-color-dot" style="background: ${cat.color}"></div>
                                <span class="category-name">${cat.name}</span>
                                ${cat.isHidden ? '<span class="hidden-label">已隱藏</span>' : ''}
                            </div>
                            <div class="category-manager-actions">
                                ${cat.isCustom ? `
                                    <button onclick="window.diary.editCategoryInManager('${cat.id}')" class="edit-btn">編輯</button>
                                    <button onclick="window.diary.deleteCategoryInManager('${cat.id}')" class="delete-btn">刪除</button>
                                ` : `
                                    <span class="default-label">預設類別</span>
                                `}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="manager-actions">
                    <button onclick="window.diary.addCategoryInManager()" class="add-btn">➕ 新增類別</button>
                    <button onclick="window.diary.closeCategoryManager()" class="close-btn">關閉</button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'category-manager-modal';
        modal.innerHTML = `<div class="category-manager-content">${managerHtml}</div>`;
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }

    addCustomCategory() {
        this.showCategoryEditor();
    }

    addCategoryInManager() {
        this.showCategoryEditor(null, true);
    }

    editCategoryInManager(categoryId) {
        const customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
        const category = customCategories.find(cat => cat.id === categoryId);
        if (category) {
            this.showCategoryEditor(category, true);
        }
    }

    showCategoryEditor(category = null, inManager = false) {
        const isEdit = !!category;
        const title = isEdit ? '編輯類別' : '新增類別';
        
        const editorHtml = `
            <div class="category-editor">
                <h3>${title}</h3>
                <div class="editor-field">
                    <label>類別名稱</label>
                    <input type="text" id="category-name" placeholder="例如：🎸 吉他練習" 
                           value="${category ? category.name : ''}" maxlength="20">
                </div>
                <div class="editor-field">
                    <label>顏色</label>
                    <div class="color-picker">
                        <input type="color" id="category-color" value="${category ? category.color : '#007bff'}">
                        <div class="color-presets">
                            ${['#059669', '#2563eb', '#7c3aed', '#ea580c', '#db2777', '#0d9488', '#dc2626', '#475569'].map(color => `
                                <button type="button" class="color-preset" style="background: ${color}" 
                                        onclick="document.getElementById('category-color').value = '${color}'"></button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="editor-actions">
                    <button onclick="window.diary.saveCategoryEditor('${category ? category.id : ''}', ${inManager})" class="save-btn">
                        ${isEdit ? '更新' : '新增'}
                    </button>
                    <button onclick="window.diary.closeCategoryEditor()" class="cancel-btn">取消</button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'category-editor-modal';
        modal.innerHTML = `<div class="category-editor-content">${editorHtml}</div>`;
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }

    saveCategoryEditor(categoryId = '', inManager = false) {
        const name = document.getElementById('category-name').value.trim();
        const color = document.getElementById('category-color').value;
        
        if (!name) {
            alert('請輸入類別名稱');
            return;
        }
        
        let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
        
        if (categoryId) {
            // 編輯現有類別
            const index = customCategories.findIndex(cat => cat.id === categoryId);
            if (index !== -1) {
                customCategories[index] = { ...customCategories[index], name, color };
            }
        } else {
            // 新增類別
            const newCategory = {
                id: 'custom_' + Date.now(),
                name,
                color
            };
            customCategories.push(newCategory);
        }
        
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        
        this.closeCategoryEditor();
        
        if (inManager) {
            // 重新載入管理器
            this.closeCategoryManager();
            setTimeout(() => this.openCategoryManager(), 100);
        } else {
            // 重新渲染月檢視
            this.renderMonthlyView();
        }
        
        this.showSaveNotification(categoryId ? '類別已更新' : '類別已新增');
    }

    deleteCategoryInManager(categoryId) {
        if (confirm('確定要刪除這個類別嗎？相關的週記錄也會被刪除。')) {
            this.deleteCategoryData(categoryId);
            this.closeCategoryManager();
            setTimeout(() => this.openCategoryManager(), 100);
            this.showSaveNotification('類別已刪除');
        }
    }

    deleteCategoryData(categoryId) {
        // 刪除自訂類別
        let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
        customCategories = customCategories.filter(cat => cat.id !== categoryId);
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        
        // 刪除相關的週記錄
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes(`_${categoryId}`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
        
        // 如果刪除的是當前選中的類別，切換到預設類別
        if (this.currentCategory === categoryId) {
            this.currentCategory = 'exercise';
        }
    }

    closeCategoryEditor() {
        const modal = document.querySelector('.category-editor-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }

    toggleCategoryVisibility(categoryId, isCurrentlyHidden) {
        let hiddenCategories = JSON.parse(localStorage.getItem('hiddenCategories') || '[]');
        
        if (isCurrentlyHidden) {
            // 當前是隱藏的，要顯示 - 從隱藏列表中移除
            hiddenCategories = hiddenCategories.filter(id => id !== categoryId);
        } else {
            // 當前是顯示的，要隱藏 - 加入隱藏列表
            if (!hiddenCategories.includes(categoryId)) {
                hiddenCategories.push(categoryId);
            }
        }
        
        localStorage.setItem('hiddenCategories', JSON.stringify(hiddenCategories));
        
        // 更新管理器中的視覺狀態
        const categoryItem = document.querySelector(`[data-category-id="${categoryId}"]`);
        const visibilityBtn = categoryItem.querySelector('.visibility-btn');
        
        if (categoryItem && visibilityBtn) {
            if (isCurrentlyHidden) {
                // 顯示類別
                categoryItem.classList.remove('hidden-category');
                visibilityBtn.classList.remove('hidden');
                visibilityBtn.classList.add('visible');
                visibilityBtn.innerHTML = '👁️';
                visibilityBtn.title = '點擊隱藏';
                visibilityBtn.onclick = () => this.toggleCategoryVisibility(categoryId, false);
                
                const hiddenLabel = categoryItem.querySelector('.hidden-label');
                if (hiddenLabel) hiddenLabel.remove();
            } else {
                // 隱藏類別
                categoryItem.classList.add('hidden-category');
                visibilityBtn.classList.remove('visible');
                visibilityBtn.classList.add('hidden');
                visibilityBtn.innerHTML = '👁️‍🗨️';
                visibilityBtn.title = '點擊顯示';
                visibilityBtn.onclick = () => this.toggleCategoryVisibility(categoryId, true);
                
                const categoryName = categoryItem.querySelector('.category-name');
                if (categoryName && !categoryItem.querySelector('.hidden-label')) {
                    categoryName.insertAdjacentHTML('afterend', '<span class="hidden-label">已隱藏</span>');
                }
            }
        }
        
        // 如果隱藏的是當前選中的類別，切換到第一個可見的類別
        if (!isCurrentlyHidden && this.currentCategory === categoryId) {
            const visibleCategories = this.getAllCategories(false);
            if (visibleCategories.length > 0) {
                this.currentCategory = visibleCategories[0].id;
            }
        }
        
        this.showSaveNotification(isCurrentlyHidden ? '類別已顯示' : '類別已隱藏');
    }

    closeCategoryManager() {
        const modal = document.querySelector('.category-manager-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                // 重新渲染月檢視以反映類別變更
                this.renderMonthlyView();
            }, 300);
        }
    }

    async createWeeklyGrid() {
        const grid = document.createElement('div');
        grid.className = 'weekly-records-grid';
        grid.id = 'weeklyRecordsGrid';

        await this.renderWeeklyRecords();
        return grid;
    }

    async renderWeeklyRecords() {
        const grid = document.getElementById('weeklyRecordsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // 獲取這個月的所有週
        const weeks = this.getWeeksInMonth(year, month);
        
        // 載入所有週記錄
        const weekKeys = weeks.map(week => this.getWeekKey(week.start));
        await this.loadWeeklyRecords(weekKeys);

        weeks.forEach((week, index) => {
            const weekCard = this.createWeekCard(week, index + 1);
            grid.appendChild(weekCard);
        });
    }

    getWeeksInMonth(year, month) {
        const weeks = [];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 找到第一週的開始（週日）
        let weekStart = new Date(firstDay);
        weekStart.setDate(firstDay.getDate() - firstDay.getDay());
        
        while (weekStart <= lastDay) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            // 檢查這週是否與當前月份有重疊
            if (weekEnd >= firstDay && weekStart <= lastDay) {
                weeks.push({
                    start: new Date(weekStart),
                    end: new Date(weekEnd)
                });
            }
            
            weekStart.setDate(weekStart.getDate() + 7);
        }
        
        return weeks;
    }

    getWeekKey(weekStart) {
        return `week_${this.getDateKey(weekStart)}`;
    }

    async loadWeeklyRecords(weekKeys) {
        // 這裡可以擴展為從 API 載入週記錄
        // 目前使用 localStorage 模擬
        weekKeys.forEach(weekKey => {
            if (!this.weeklyRecordsCache) {
                this.weeklyRecordsCache = new Map();
            }
            
            const stored = localStorage.getItem(`weekly_${weekKey}_${this.currentCategory}`);
            if (stored) {
                this.weeklyRecordsCache.set(`${weekKey}_${this.currentCategory}`, JSON.parse(stored));
            }
        });
    }

    createWeekCard(week, weekNumber) {
        const weekKey = this.getWeekKey(week.start);
        const recordKey = `${weekKey}_${this.currentCategory}`;
        
        if (!this.weeklyRecordsCache) {
            this.weeklyRecordsCache = new Map();
        }
        
        const record = this.weeklyRecordsCache.get(recordKey) || {
            goals: '',
            achievements: '',
            notes: '',
            rating: 0
        };

        const isCurrentWeek = this.isCurrentWeek(week.start);
        
        const card = document.createElement('div');
        card.className = `week-card ${isCurrentWeek ? 'current-week' : ''} ${record.goals || record.achievements ? 'has-record' : ''}`;
        
        card.innerHTML = `
            <div class="week-card-header">
                <div class="week-number">第 ${weekNumber} 週</div>
                <div class="week-dates">${week.start.getDate()}/${week.start.getMonth() + 1} - ${week.end.getDate()}/${week.end.getMonth() + 1}</div>
                <div class="week-rating">${this.renderStars(record.rating)}</div>
            </div>
            <div class="week-card-content">
                <div class="record-item">
                    <label>🎯 目標</label>
                    <div class="record-text">${record.goals || '未設定目標'}</div>
                </div>
                <div class="record-item">
                    <label>✅ 成果</label>
                    <div class="record-text">${record.achievements || '未記錄成果'}</div>
                </div>

                ${record.notes ? `<div class="record-notes">💭 ${record.notes}</div>` : ''}
            </div>
            <div class="week-card-footer">
                <button class="edit-week-btn" onclick="window.diary.editWeekRecord('${weekKey}', ${weekNumber})">
                    ${record.goals || record.achievements ? '編輯' : '新增記錄'}
                </button>
            </div>
        `;

        return card;
    }

    renderStars(rating) {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(i <= rating ? '⭐' : '☆');
        }
        return stars.join('');
    }

    isCurrentWeek(weekStart) {
        const today = new Date();
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        return today >= weekStart && today <= weekEnd;
    }

    editWeekRecord(weekKey, weekNumber) {
        const recordKey = `${weekKey}_${this.currentCategory}`;
        const record = this.weeklyRecordsCache?.get(recordKey) || {
            goals: '',
            achievements: '',
            notes: '',
            rating: 0
        };

        const categoryName = document.querySelector('.category-item.active').textContent;
        
        const editorHtml = `
            <div class="week-record-editor">
                <h3>編輯第 ${weekNumber} 週 - ${categoryName}</h3>
                <div class="editor-field">
                    <label>🎯 本週目標</label>
                    <textarea id="week-goals" placeholder="這週想要達成什麼目標？">${record.goals}</textarea>
                </div>
                <div class="editor-field">
                    <label>✅ 實際成果</label>
                    <textarea id="week-achievements" placeholder="實際完成了什麼？">${record.achievements}</textarea>
                </div>

                <div class="editor-field">
                    <label>⭐ 滿意度評分</label>
                    <div class="rating-selector">
                        ${[1,2,3,4,5].map(i => `
                            <button type="button" class="star-btn ${i <= record.rating ? 'active' : ''}" 
                                    onclick="window.diary.setRating(${i})" data-rating="${i}">⭐</button>
                        `).join('')}
                    </div>
                </div>
                <div class="editor-field">
                    <label>💭 備註</label>
                    <textarea id="week-notes" placeholder="其他想記錄的事情...">${record.notes}</textarea>
                </div>
                <div class="editor-actions">
                    <button onclick="window.diary.saveWeekRecord('${weekKey}')">儲存</button>
                    <button onclick="window.diary.closeWeekEditor()">取消</button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'week-editor-modal';
        modal.innerHTML = `<div class="week-editor-content">${editorHtml}</div>`;
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }

    setRating(rating) {
        document.querySelectorAll('.star-btn').forEach((btn, index) => {
            btn.classList.toggle('active', index < rating);
        });
        this.currentRating = rating;
    }

    saveWeekRecord(weekKey) {
        const recordKey = `${weekKey}_${this.currentCategory}`;
        
        const record = {
            goals: document.getElementById('week-goals').value.trim(),
            achievements: document.getElementById('week-achievements').value.trim(),
            notes: document.getElementById('week-notes').value.trim(),
            rating: this.currentRating || 0
        };

        if (!this.weeklyRecordsCache) {
            this.weeklyRecordsCache = new Map();
        }
        
        this.weeklyRecordsCache.set(recordKey, record);
        localStorage.setItem(`weekly_${recordKey}`, JSON.stringify(record));
        
        this.closeWeekEditor();
        this.renderWeeklyRecords();
        this.showSaveNotification('週記錄已儲存');
    }

    closeWeekEditor() {
        const modal = document.querySelector('.week-editor-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }

    addCustomCategory() {
        const name = prompt('請輸入新類別名稱（可以加上表情符號）：');
        if (name && name.trim()) {
            const categoryId = 'custom_' + Date.now();
            const color = '#' + Math.floor(Math.random()*16777215).toString(16);
            
            // 這裡可以擴展為儲存到後端
            const customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
            customCategories.push({ id: categoryId, name: name.trim(), color });
            localStorage.setItem('customCategories', JSON.stringify(customCategories));
            
            // 重新渲染類別選擇器
            this.renderMonthlyView();
        }
    }

    formatDailyCardContent(entryData) {
        try {
            const data = JSON.parse(entryData);
            let html = '';
            
            if (data.goodMoments) {
                html += `<div class="card-field"><strong>✨</strong> ${this.truncateText(data.goodMoments, 50)}</div>`;
            }
            if (data.achievements) {
                html += `<div class="card-field"><strong>🏆</strong> ${this.truncateText(data.achievements, 50)}</div>`;
            }
            if (data.gratitude) {
                html += `<div class="card-field"><strong>🙏</strong> ${this.truncateText(data.gratitude, 50)}</div>`;
            }
            if (data.learnings) {
                html += `<div class="card-field"><strong>📚</strong> ${this.truncateText(data.learnings, 50)}</div>`;
            }
            if (data.futureNote) {
                html += `<div class="card-field future"><strong>🔮</strong> ${this.truncateText(data.futureNote, 50)}</div>`;
            }
            
            return html || '<div class="no-entry-text">這天沒有記錄</div>';
        } catch (error) {
            return `<div class="entry-text">${this.truncateText(entryData, 100)}</div>`;
        }
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    async openStructuredEditor(date, currentEntry) {
        let targetDate;
        if (typeof date === 'string') {
            targetDate = new Date(date);
        } else {
            targetDate = date;
        }
        
        const dateStr = this.formatDate(targetDate);
        
        const editorHtml = `
            <div class="structured-editor">
                <h3>編輯 ${dateStr} 的日記</h3>
                <div class="editor-field">
                    <label>✨ 3個美好片刻</label>
                    <textarea id="edit-goodMoments" placeholder="1. &#10;2. &#10;3. "></textarea>
                </div>
                <div class="editor-field">
                    <label>🏆 成就感</label>
                    <textarea id="edit-achievements"></textarea>
                </div>
                <div class="editor-field">
                    <label>🙏 感恩</label>
                    <textarea id="edit-gratitude"></textarea>
                </div>
                <div class="editor-field">
                    <label>📚 學習</label>
                    <textarea id="edit-learnings"></textarea>
                </div>
                <div class="editor-field">
                    <label>🔮 給明年的自己</label>
                    <textarea id="edit-futureNote"></textarea>
                </div>
                <div class="editor-actions">
                    <button onclick="window.diary.saveStructuredEditor('${this.getDateKey(targetDate)}')">儲存</button>
                    <button onclick="window.diary.closeStructuredEditor()">取消</button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'structured-editor-modal';
        modal.innerHTML = `<div class="structured-editor-content">${editorHtml}</div>`;
        document.body.appendChild(modal);
        
        try {
            const data = JSON.parse(currentEntry || '{}');
            document.getElementById('edit-goodMoments').value = data.goodMoments || '';
            document.getElementById('edit-achievements').value = data.achievements || '';
            document.getElementById('edit-gratitude').value = data.gratitude || '';
            document.getElementById('edit-learnings').value = data.learnings || '';
            document.getElementById('edit-futureNote').value = data.futureNote || '';
        } catch (error) {
            document.getElementById('edit-goodMoments').value = currentEntry || '';
        }
        
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async saveStructuredEditor(dateKey) {
        const data = {
            goodMoments: document.getElementById('edit-goodMoments').value.trim(),
            achievements: document.getElementById('edit-achievements').value.trim(),
            gratitude: document.getElementById('edit-gratitude').value.trim(),
            learnings: document.getElementById('edit-learnings').value.trim(),
            futureNote: document.getElementById('edit-futureNote').value.trim()
        };
        
        const hasContent = Object.values(data).some(value => value.length > 0);
        
        try {
            this.showLoading();
            
            if (hasContent) {
                const entryJson = JSON.stringify(data);
                await this.api.saveEntry(dateKey, entryJson);
                this.entriesCache.set(dateKey, entryJson);
            } else {
                await this.api.deleteEntry(dateKey);
                this.entriesCache.set(dateKey, '');
            }
            
            this.closeStructuredEditor();
            
            switch(this.currentView) {
                case 'today':
                    await this.updateTodayView();
                    break;
                case 'daily':
                    await this.renderDailyTimeline();
                    break;
            }
            
            this.showSaveNotification('日記已更新');
        } catch (error) {
            console.error('儲存日記失敗:', error);
            this.showSaveNotification('儲存失敗，請重試');
        } finally {
            this.hideLoading();
        }
    }

    closeStructuredEditor() {
        const modal = document.querySelector('.structured-editor-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }

    async saveEntry() {
        const todayKey = this.getDateKey(this.today);
        const structuredData = this.collectStructuredData();
        
        const hasContent = Object.values(structuredData).some(value => value.length > 0);
        
        try {
            if (hasContent) {
                const entryJson = JSON.stringify(structuredData);
                await this.api.saveEntry(todayKey, entryJson);
                this.entriesCache.set(todayKey, entryJson);
                this.showSaveNotification('📝 日記已儲存');
                
                await this.loadHistoryEntries();
            } else {
                await this.api.deleteEntry(todayKey);
                this.entriesCache.set(todayKey, '');
                this.showSaveNotification('🗑️ 空白日記已刪除');
            }
        } catch (error) {
            console.error('儲存日記失敗:', error);
            this.showSaveNotification('❌ 儲存失敗，請重試');
        }
    }

    clearForm() {
        if (confirm('確定要清空所有內容嗎？')) {
            this.clearStructuredForm();
            this.showSaveNotification('🧹 表單已清空');
        }
    }

    showSaveNotification(message) {
        const existingNotification = document.querySelector('.save-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'save-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    bindEvents() {
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveEntry();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearForm();
        });

        let saveTimeout;
        const textareas = ['goodMoments', 'achievements', 'gratitude', 'learnings', 'futureNote'];
        
        textareas.forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveEntry();
                }, 3000);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveEntry();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.diary = new ThreeYearDiary();
});