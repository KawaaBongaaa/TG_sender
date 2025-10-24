/* =========================================== */
/* Телеграм Sender - ПОЛНАЯ ВОССТАНОВЛЕННАЯ ВЕРСИЯ */
/* GitHub Pages compatible */
/* =========================================== */

class TelegramSender {
    constructor() {
        console.log('🚀 Initializing TelegramSender...');

        // Базовые свойства
        this.isAdmin = false;
        this.isInited = false;
        this.sdkReady = false;
        this.config = window.CONFIG || {};

        // Данные
        this.users = [];
        this.filteredUsers = [];
        this.selectedUsers = new Set();
        this.templates = [];
        this.linkTemplates = [];
        this.bots = [];
        this.currentBot = null;
        this.currentSheet = null;
        this.broadcastHistory = [];
        this.userMessageHistory = {};
        this.notificationSoundSettings = {
            frequency: 800,
            duration: 300,
            waveType: 'sine',
            volume: 0.1
        };
        this.linkAutoSave = true;

        // Модули
        this.modules = {};

        // Инициализация модулей
        this.initModules();
        this.initTelegram();
    }

    initModules() {
        // Регистрация всех модулей в правильном порядке по HTML порядку
        this.register('storage', TelegramStorage);
        this.register('messaging', TelegramMessagingAdvanced);
        this.register('users', TelegramUsersAdvanced); // Используем продвинутую версию
        this.register('userlists', TelegramUserLists);
        this.register('bots', TelegramBots);
        this.register('links', TelegramLinks);
        this.register('buttons', TelegramButtons);
        this.register('settings', TelegramSettings);
        this.register('notifications', TelegramNotifications);

        console.log(`📦 Registered ${Object.keys(this.modules).length} modules`);
    }

    register(name, cls) {
        try {
            this.modules[name] = new cls(this);
            console.log(`✅ Module ${name} loaded`);
        } catch (error) {
            console.error(`❌ Failed to load ${name}:`, error);
        }
    }

    initTelegram() {
        this.checkTelegramSDK()
            .then(() => this.checkAdminAccess())
            .then(() => this.initUI())
            .then(() => this.loadInitialData())
            .then(() => {
                this.isInited = true;
                console.log('✅ TelegramSender fully initialized');
            })
            .catch(error => {
                console.error('❌ Initialization failed:', error);
                this.showError('Ошибка инициализации: ' + error.message);
            });
    }

    async checkTelegramSDK() {
        return new Promise((resolve, reject) => {
            if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
                // Настоящий SDK загружен
                Telegram.WebApp.ready();
                Telegram.WebApp.expand();
                this.sdkReady = true;
                resolve();
                return;
            }

            // 🛠️ ЗАГЛУШКА ДЛЯ ТЕСТИРОВАНИЯ БЕЗ SDK
            console.warn('🔧 Telegram SDK не найден - устанавливаем заглушку для тестирования');

            window.Telegram = {
                WebApp: {
                    ready: () => console.log('🔧 Mock Telegram.WebApp.ready()'),
                    expand: () => console.log('🔧 Mock Telegram.WebApp.expand()'),
                    close: () => console.log('🔧 Mock Telegram.WebApp.close()'),
                    initDataUnsafe: {
                        user: {
                            id: 123456789,        // Тестовый ID
                            username: 'test_user',
                            first_name: 'Тестовый',
                            last_name: 'Пользователь'
                        }
                    },
                    themeParams: {},
                    colorScheme: 'light'
                }
            };

            this.sdkReady = true;
            resolve();
        });
    }

    async checkAdminAccess() {
        const config = this.config;

        if (!config.ADMIN_ID) {
            throw new Error('CONFIG.ADMIN_ID не настроен');
        }

        console.warn('⚠️ DEVMODE: проверка доступа отключена');
        if (config.ADMIN_ID !== "PLACEHOLDER_ADMIN_ID") {
            this.isAdmin = true;
            console.log('✅ Admin access granted');
        } else {
            throw new Error('Доступ запрещён');
        }
    }

    initUI() {
        // Скрываем экраны загрузки/ошибки
        const loading = document.querySelector('.loading-screen');
        const error = document.querySelector('.access-denied-screen');
        const main = document.querySelector('.main-app');

        if (loading) loading.classList.add('hidden');
        if (error) error.classList.add('hidden');
        if (main) main.classList.add('animate');

        // Настройка тем
        if (this.modules.settings) {
            this.modules.settings.loadSavedTheme();
        }

        // Инициализация всех модулей
        Object.values(this.modules).forEach(mod => {
            if (mod.init) mod.init();
        });

        // Подключение интерфейса
        this.setupEventListeners();
        this.initModalEvents();

        console.log('🎨 UI initialized');
    }

    setupEventListeners() {
        // Основные кнопки
        this.bindBtn('loadUsersBtn', () => this.modules.users?.reloadUsersData?.());
        this.bindBtn('sendBtn', () => this.modules.messaging?.startSimpleBroadcast?.());
        this.bindBtn('sendMassBtn', () => this.modules.messaging?.startMassBroadcast?.());

        // Управление ботами
        this.bindBtn('editBotsBtn', () => this.modules.bots?.showBotsWizard?.());
        this.bindBtn('editSheetsBtn', () => this.modules.bots?.showSheetsWizard?.());
        this.bindBtn('saveBotBtn', () => this.saveNewBot());

        // Шаблоны и ссылки
        this.bindBtn('insertLinkBtn', () => this.showModal('linkWizard'));
        this.bindBtn('insertLinkConfirmBtn', () => this.insertLink());
        this.bindBtn('editTemplatesBtn', () => this.showModal('templateWizard'));
        this.bindBtn('addTemplateBtn', () => this.addTemplate());

        // Кнопки и медиа
        this.bindBtn('addButton', () => this.addButton());
        this.bindBtn('clearButtons', () => this.clearButtons());

        // Планировщик
        this.bindBtn('scheduleBroadcastBtn', () => this.modules.messaging?.scheduleCurrentBroadcast?.());
        this.bindBtn('cancelScheduleBtn', () => this.modules.messaging?.cancelScheduledBroadcast?.());

        // Выпадающие списки
        this.bindSelect('botsList', (e) => this.modules.bots?.selectBot?.(e.target.value));
        this.bindSelect('sheetsList', (e) => this.modules.bots?.selectSheet?.(e.target.value));
        this.bindSelect('templateSelect', (e) => this.applyTemplate(e.target.value));

        // Фильтры пользователей
        this.bindInput('searchFilter', (e) => this.applyFilters());
        this.bindStatusCheckbox('statusTrial', () => this.applyFilters());
        this.bindStatusCheckbox('statusNewSub', () => this.applyFilters());
        this.bindStatusCheckbox('statusCanceled', () => this.applyFilters());
        this.bindStatusCheckbox('statusKicked', () => this.applyFilters());

        // Фильтры по Trial Calls
        this.bindStatusCheckbox('trialCallsLess0', () => this.applyFilters());
        this.bindStatusCheckbox('trialCallsLess5', () => this.applyFilters());
        this.bindStatusCheckbox('trialCallsMid', () => this.applyFilters());
        this.bindStatusCheckbox('trialCallsGreater20', () => this.applyFilters());
        this.bindStatusCheckbox('trialCallsEquals20', () => this.applyFilters());

        // ФИЛЬТРЫ ПО ЯЗЫКАМ - ДОБАВЛЕНЫ ОБРАБОТЧИКИ
        this.bindStatusCheckbox('languageRu', () => this.applyFilters());
        this.bindStatusCheckbox('languageEn', () => this.applyFilters());
        this.bindStatusCheckbox('languageEs', () => this.applyFilters());
        this.bindStatusCheckbox('languageFr', () => this.applyFilters());
        this.bindStatusCheckbox('languageDe', () => this.applyFilters());
        this.bindStatusCheckbox('languageIt', () => this.applyFilters());
        this.bindStatusCheckbox('languagePt', () => this.applyFilters());
        this.bindStatusCheckbox('languageZh', () => this.applyFilters());
        this.bindStatusCheckbox('languageAr', () => this.applyFilters());
        this.bindStatusCheckbox('languageJa', () => this.applyFilters());
        this.bindStatusCheckbox('languagePl', () => this.applyFilters());
        this.bindStatusCheckbox('languageTr', () => this.applyFilters());
        this.bindStatusCheckbox('languageKo', () => this.applyFilters());
        this.bindStatusCheckbox('languageHi', () => this.applyFilters());
        this.bindStatusCheckbox('languageFa', () => this.applyFilters());
        this.bindStatusCheckbox('languageOther', () => this.applyFilters());
        this.bindInput('customLanguageFilter', (e) => this.applyFilters());

        // Настройки звука
        this.bindBtn('testNotificationBtn', () => this.modules.notifications?.showTestNotification?.());
        this.bindBtn('saveSoundSettingsBtn', () => this.saveSoundSettings());

        // Управление списками
        this.bindBtn('selectAllUsersBtn', () => this.selectAllUsers(true));
        this.bindBtn('clearUsersSelectionBtn', () => this.selectAllUsers(false));
        this.bindBtn('saveToListBtn', () => this.saveSelectedToList());
        this.bindBtn('manageListsBtn', () => this.showModal('userListsWizard'));

        // Экспорт/импорт
        this.bindBtn('exportHistoryCSVBtn', () => this.exportHistory('csv'));
        this.bindBtn('runLocalStorageDiagnostic', () => this.runDiagnostic());
        this.bindBtn('importUsersBtn', (e) => this.importUsers(e.target.previousElementSibling.files[0]));

        console.log('🔗 Event listeners connected');
    }

    // Вспомогательные методы привязки
    bindBtn(btnId, handler) {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', handler);
    }

    bindSelect(selId, handler) {
        const sel = document.getElementById(selId);
        if (sel) sel.addEventListener('change', handler);
    }

    bindInput(inpId, handler) {
        const inp = document.getElementById(inpId);
        if (inp) inp.addEventListener('input', handler);
    }

    bindStatusCheckbox(cbId, handler) {
        const cb = document.getElementById(cbId);
        if (cb) cb.addEventListener('change', handler);
    }

    // Загрузка начальных данных
    async loadInitialData() {
        // История и настройки
        this.modules.storage?.loadBroadcastHistory?.();
        this.modules.storage?.loadUserMessageHistory?.();
        this.modules.storage?.loadBots?.();

        // Восстановление выбора ботов
        this.restoreBotSelection();

        console.log('✅ Initial data loaded');
    }

    restoreBotSelection() {
        try {
            const savedBotId = localStorage.getItem('telegram_sender_current_bot');
            const savedSheetId = localStorage.getItem('telegram_sender_current_sheet');

            if (savedBotId && this.modules.bots) {
                this.modules.bots.selectBot(savedBotId);
                if (savedSheetId) {
                    this.modules.bots.selectSheet(savedSheetId);
                }
            }
        } catch (error) {
            console.warn('Failed to restore bot selection:', error);
        }
    }

    /**
     * ДЕЛАЙ ЗНАЧЕНИЕ ЗАДЕРЖКИ МЕЖДУ СООБЩЕНИЯМИ
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Методы управления ботами
    saveNewBot() {
        const nameInput = document.getElementById('newBotName');
        const tokenInput = document.getElementById('newBotToken');

        const name = nameInput?.value?.trim();
        const token = tokenInput?.value?.trim();

        if (!name || !token) {
            alert('Заполните все поля!');
            return;
        }

        if (this.modules.bots?.addBot) {
            this.modules.bots.addBot(name, token);
        }

        this.hideModal('botsWizard');
    }

    // Методы сообщений и шаблонов
    applyTemplate(templateId) {
        if (!templateId) return;

        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = template.text;
        }
    }

    addTemplate() {
        const nameInput = document.getElementById('newTemplateName');
        const textInput = document.getElementById('newTemplateText');

        const name = nameInput?.value?.trim();
        const text = textInput?.value?.trim();

        if (!name || !text) {
            alert('Заполните все поля!');
            return;
        }

        if (this.modules.messaging?.addTemplate) {
            this.modules.messaging.addTemplate(name, text);
        }

        this.hideModal('templateWizard');
    }

    insertLink() {
        const textInput = document.getElementById('linkText');
        const urlInput = document.getElementById('linkUrl');

        const text = textInput?.value?.trim();
        const url = urlInput?.value?.trim();

        if (!text || !url) {
            alert('Заполните все поля!');
            return;
        }

        // Добавляем шаблон ссылки
        this.modules.messaging?.addLinkTemplate?.(text, url);

        // Вставляем в сообщение
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            const htmlLink = `<a href="${url}">${text}</a>`;
            messageInput.value += htmlLink;
        }

        this.hideModal('linkWizard');
    }

    // Методы кнопок
    addButton() {
        const textInput = document.getElementById('newButtonText');
        const urlInput = document.getElementById('newButtonUrl');

        const text = textInput?.value?.trim();
        const url = urlInput?.value?.trim();

        if (!text) {
            alert('Введите текст кнопки!');
            return;
        }

        if (this.modules.messaging?.addMessageButton) {
            this.modules.messaging.addMessageButton(text, url);
        }
    }

    clearButtons() {
        if (this.modules.messaging?.clearMessageButtons) {
            this.modules.messaging.clearMessageButtons();
        }
    }

    // Методы выбора пользователей
    selectAllUsers(select = true) {
        const rows = document.querySelectorAll('#usersTableBody input[type="checkbox"]');
        rows.forEach(cb => cb.checked = select);

        this.selectedUsers.clear();
        if (select) {
            rows.forEach(cb => this.selectedUsers.add(cb.dataset.userId));
        }
    }

    saveSelectedToList() {
        const listName = prompt('Название списка:');
        if (!listName?.trim()) return;

        const selectedIds = Array.from(this.selectedUsers);
        if (selectedIds.length === 0) {
            alert('Нет выбранных пользователей!');
            return;
        }

        if (this.modules.userlists?.saveSelectedAsNewList) {
            this.modules.userlists.saveSelectedAsNewList(listName, selectedIds);
        }
    }

    // Применение фильтров
    applyFilters() {
        // Получаем все параметры фильтрации
        const search = document.getElementById('searchFilter')?.value?.toLowerCase() || '';
        const statusFilters = this.getStatusFilters();
        const trialFilters = this.getTrialFilters();
        const languageFilters = this.getLanguageFilters();

        console.log('🔍 Applying filters:', {
            search: search || 'none',
            statuses: statusFilters,
            trialCalls: trialFilters,
            languages: languageFilters
        });

        this.filteredUsers = this.users.filter(user => {
            // Поиск по имени/ID/username
            if (search) {
                const text = [
                    user.user_id || '',
                    user.first_name || '',
                    user.last_name || '',
                    user.username || ''
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                if (!text.includes(search)) return false;
            }

            // Фильтр по статусу
            if (statusFilters.length > 0 && !statusFilters.includes(user.status?.toLowerCase())) {
                return false;
            }

            // Фильтр по Trial Calls
            if (trialFilters.length > 0 && !this.matchesTrialFilter(user, trialFilters)) {
                return false;
            }

            // Фильтр по языку
            if (languageFilters.length > 0) {
                const userLang = (user.language_code || '').toLowerCase();
                if (!languageFilters.includes(userLang)) {
                    return false;
                }
            }

            return true;
        });

        // Логируем и ререндерируем
        console.log(`🔍 Filtered: ${this.filteredUsers.length}/${this.users.length} users`);
        this.updateUI();
    }

    getStatusFilters() {
        const filters = [];
        const checkboxes = ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked'];

        checkboxes.forEach(id => {
            const cb = document.getElementById(id);
            if (cb?.checked) {
                filters.push(id.replace('status', '').toLowerCase());
            }
        });

        return filters;
    }

    getTrialFilters() {
        const filters = [];
        const checkboxes = ['trialCallsLess0', 'trialCallsLess5', 'trialCallsMid', 'trialCallsGreater20', 'trialCallsEquals20'];

        checkboxes.forEach(id => {
            const cb = document.getElementById(id);
            if (cb?.checked) {
                filters.push(id.replace('trialCalls', '').toLowerCase());
            }
        });

        return filters;
    }

    getLanguageFilters() {
        const filters = [];

        // Проверяем чекбоксы популярных языков
        const languageCheckboxes = ['languageRu', 'languageEn', 'languageEs', 'languageFr', 'languageDe', 'languageIt', 'languagePt', 'languageZh', 'languageAr', 'languageJa', 'languagePl', 'languageTr', 'languageKo', 'languageHi', 'languageFa', 'languageOther'];
        languageCheckboxes.forEach(id => {
            const cb = document.getElementById(id);
            if (cb?.checked) {
                const lang = id.replace('language', '').toLowerCase();
                filters.push(lang);
            }
        });

        // Проверяем произвольный язык
        const customLanguageInput = document.getElementById('customLanguageFilter');
        if (customLanguageInput?.value?.trim()) {
            const customLang = customLanguageInput.value.trim().toLowerCase();
            filters.push(customLang);
        }

        return filters;
    }

    matchesTrialFilter(user, trialFilters) {
        if (trialFilters.length === 0) return true;

        // Используем новое поле после маппинга (всегда положительное число или 0)
        const trialCalls = parseInt(user.trial_calls) || 0;

        return trialFilters.some(filter => {
            switch (filter) {
                case 'less0':
                    return trialCalls < 0;
                case 'less5':
                    return trialCalls < 5;
                case 'mid':
                    return trialCalls >= 0 && trialCalls <= 20;
                case 'greater20':
                    return trialCalls > 20;
                case 'equals20':
                    return trialCalls === 20;
                default:
                    return false;
            }
        });
    }

    updateUI() {
        // Обновляем таблицу пользователей
        if (this.modules.users?.renderUsersTable) {
            this.modules.users.renderUsersTable();
        }

        // Обновляем счетчики
        this.updateUserCounts();

        // Обновляем мини-список выбранных
        this.updateSelectedUsersMiniList();
    }

    updateUserCounts() {
        const badgeAll = document.getElementById('usersCountBadge');
        const badgeSelected = document.getElementById('usersSelectedBadge');

        if (badgeAll) {
            badgeAll.textContent = `👥 ${this.filteredUsers.length}`;
        }

        if (badgeSelected) {
            badgeSelected.textContent = `✅ ${this.selectedUsers.size}`;
        }
    }

    updateSelectedUsersMiniList() {
        const container = document.getElementById('selectedUsersMiniList');
        if (!container) return;

        if (this.selectedUsers.size === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary);">Нет выбранных пользователей</div>';
            return;
        }

        const selectedData = this.filteredUsers.filter(u => this.selectedUsers.has(u.user_id));

        container.innerHTML = selectedData.map(user => `
            <div>${user.first_name || user.username || user.user_id}
            <button onclick="window.telegramSender.selectedUsers.delete('${user.user_id}'); window.telegramSender.updateUI()">×</button>
            </div>
        `).join('');
    }

    // Экспорт и диагностика
    exportHistory(format = 'csv') {
        if (format === 'csv') {
            this.exportCSV();
        } else if (format === 'pdf') {
            // Для PDF нужна дополнительная библиотека
            console.log('PDF export not yet implemented');
        }
    }

    exportCSV() {
        // Простой CSV экспорт истории
        const headers = ['Timestamp', 'Message', 'User Count', 'Status'];
        const rows = this.broadcastHistory.map(item => [
            new Date(item.timestamp).toLocaleString(),
            item.message.substring(0, 50) + '...',
            item.sentCount || 0,
            item.status
        ]);

        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telegram_sender_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    runDiagnostic() {
        console.log('🔍 Running diagnostic...');

        if (this.modules.storage?.diagnoseStorage) {
            this.modules.storage.diagnoseStorage();
        }

        // Проверка модулей
        console.log('📦 Module status:', Object.keys(this.modules));

        // Проверка данных
        console.log('📊 Data status:', {
            users: this.users.length,
            templates: this.templates.length,
            bots: this.bots.length,
            history: this.broadcastHistory.length
        });
    }

    async importUsers(file) {
        if (!file) return;

        console.log('📥 Importing users from file...');

        // Здесь должна быть логика парсинга CSV
        // Пока просто показываем заглушку
        console.log('CSV import not yet implemented');
    }

    // Модальные окна с системой backdrop
    showModal(modalId) {
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.classList.add('show');
        }
    }

    hideModal(modalId) {
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('show');
        }
    }

    // Сохранение настроек звука
    saveSoundSettings() {
        // Получаем значения из форм
        const frequency = parseInt(document.getElementById('frequencySlider')?.value) || 800;
        const duration = parseInt(document.getElementById('durationSlider')?.value) || 300;
        const volume = parseFloat(document.getElementById('volumeSlider')?.value) / 100 || 0.1;
        const waveType = document.getElementById('waveTypeSelect')?.value || 'sine';

        this.notificationSoundSettings = { frequency, duration, volume, waveType };

        if (this.modules.storage?.saveSoundSettings) {
            this.modules.storage.saveSoundSettings();
        }

        this.addToLog('Настройки звука сохранены');
        this.hideModal('soundSettingsWizard');
    }

    addToLog(msg) {
        const log = document.getElementById('logContainer');
        if (log) {
            const time = new Date().toLocaleTimeString();
            log.innerHTML += `<br>${time}: ${msg}`;
            log.scrollTop = log.scrollHeight;
        }
    }

    showStatus(msg, type = 'info') {
        console.log(`${type}: ${msg}`);
        // Можно добавить уведомления в интерфейсе
    }

    showError(msg) {
        this.showStatus(msg, 'error');

        const errorDiv = document.querySelector('.access-denied-screen .access-denied-text');
        if (errorDiv) {
            errorDiv.textContent = msg;
            document.querySelector('.access-denied-screen')?.classList.remove('hidden');
        }
    }

    // Дополнительные методы для обеспечения совместимости

    setTheme(theme) {
        document.body.setAttribute('data-theme', theme);

        // Обновляем кнопки тем
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach(btn => {
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    localStorageAvailable = (() => {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    })();

    // Загрузка настройки автоматического сохранения ссылок
    loadLinkAutoSave() {
        const saved = localStorage.getItem('telegram_sender_link_auto_save');
        this.linkAutoSave = saved !== 'false'; // По умолчанию true, если не установлено false
        console.log('🔗 Loaded auto-save setting:', this.linkAutoSave);
    }

    // Инициализация событий модальных окон
    initModalEvents() {
        // Закрытие модальных окон
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('wizard-close-btn')) {
                this.closeAllModals();
            }
        });

        // Клавиша Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    closeAllModals() {
        console.log('🔽 Closing all modals...');

        // Убираем класс show с backdrop
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('show');
            console.log('✅ Backdrop show class removed');
        }

        // Скрываем все модальные окна (только wizard-modal, не backdrop)
        const modals = document.querySelectorAll('.wizard-modal');
        modals.forEach(modal => modal.style.display = 'none');

        console.log('✅ All modals closed');
    }

    /**
     * ПРОКСИ МЕТОД ДЛЯ ДОБАВЛЕНИЯ ШАБЛОНА ССЫЛКИ
     * Вызывается из inline обработчика onclick в index.html
     */
    addLinkTemplate(text, url) {
        if (this.modules?.messaging && typeof this.modules.messaging.addLinkTemplate === 'function') {
            return this.modules.messaging.addLinkTemplate(text, url);
        } else {
            console.error('❌ addLinkTemplate method not found in messaging module');
            alert('Модуль отправки сообщений не инициализирован');
            return null;
        }
    }

    /**
     * ПРОКСИ МЕТОД ДЛЯ ОБНОВЛЕНИЯ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ ИЗ SHEETS
     * Для совместимости с HTML интерфейсом
     */
    reloadUsersData() {
        if (this.modules?.users && typeof this.modules.users.reloadUsersData === 'function') {
            console.log('📊 Reloading users data via main app proxy...');
            return this.modules.users.reloadUsersData();
        } else {
            console.error('❌ reloadUsersData method not found in users module');
            this.showStatus('Модуль пользователей не инициализирован', 'error');
            return null;
        }
    }
}

// Функции для доступа из HTML
function addToLog(message) { window.telegramSender?.addToLog(message); }
function showStatus(message, type) { window.telegramSender?.showStatus(message, type); }

// Глобальные функции для совместимости
window.closeAllModals = function() { window.telegramSender?.closeAllModals(); };
window.getTelegramSender = () => window.telegramSender;

// Глобальная функция для просмотра истории сообщений пользователя (совместимость)
window.showUserMessageHistory = function(userId) {
    console.log('🔗 showUserMessageHistory called with userId:', userId);

    if (window.telegramSender?.modules?.users?.showUserDetails) {
        console.log('✅ Forwarding to showUserDetails method');
        window.telegramSender.modules.users.showUserDetails(userId);
    } else {
        console.error('❌ TelegramSender users module not initialized');
        alert('Модуль пользователей не инициализирован. Попробуйте перезагрузить страницу.');
    }
};

// Автозапуск
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 Starting TelegramSender app...');
    window.telegramSender = new TelegramSender();
});

// Экспорт для отладки
window.TelegramSender = TelegramSender;
