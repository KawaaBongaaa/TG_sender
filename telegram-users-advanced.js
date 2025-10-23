/**
 * TELEGRAM USERS ADVANCED MODULE
 * Расширенная функциональность управления пользователями Telegram
 * Версия: 2.0.0
 */

// Базовые импорты ошибок
if (typeof TelegramUserError === 'undefined') {
    window.TelegramUserError = class TelegramUserError extends Error {
        constructor(message, code = 'USER_ERROR') {
            super(message);
            this.name = 'TelegramUserError';
            this.code = code;
        }
    };
}

// Основной класс для управления пользователями
window.TelegramUsersAdvanced = class {
    constructor(mainApp) {
        this.mainApp = mainApp;

        // Данные
        this.users = new Map();
        this.selectedUsers = new Set();
        this.selectedUsersData = [];

        // Элементы интерфейса
        this.ui = {
            usersTable: null,
            selectedUsersList: null,
            searchInput: null,
            filterSelect: null,
            selectAllCheckbox: null,
            statsDisplay: null
        };
    }

    init() {
        console.log('[UsersAdvanced] Initializing advanced users management...');
        this.initializeUI();
        this.attachEventListeners();
        this.loadUsers();
        console.log('[UsersAdvanced] Initialized successfully');
    }

    // Инициализация UI элементов
    initializeUI() {
        try {
            // Поиск элементов интерфейса (используем правильные селекторы из HTML)
            this.ui.usersTable = document.getElementById('usersTableBody');
            this.ui.selectedUsersList = document.getElementById('selectedUsersMiniList');
            this.ui.searchInput = document.getElementById('searchFilter');
            this.ui.filterSelect = null; // Не используется в компактном интерфейсе
            this.ui.selectAllCheckbox = document.querySelector('#select-all-users');
            this.ui.statsDisplay = null; // Будет использоваться существующая статистика

            console.log('[UsersAdvanced] UI elements initialized:', {
                usersTable: !!this.ui.usersTable,
                selectedUsersList: !!this.ui.selectedUsersList,
                searchInput: !!this.ui.searchInput,
                selectAllCheckbox: !!this.ui.selectAllCheckbox
            });

        } catch (error) {
            console.error('[UsersAdvanced] Failed to initialize UI:', error);
            throw new TelegramUserError('Failed to initialize UI components', 'UI_INIT_FAILED');
        }
    }

    // Привязка обработчиков событий
    attachEventListeners() {
        // Поиск пользователей
        if (this.ui.searchInput) {
            this.ui.searchInput.addEventListener('input', (e) => {
                console.log('[UsersAdvanced] Search input changed:', e.target.value);
                this.mainApp.applyFilters();
            });
        }

        // Фильтры по статусу пользователей
        ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked'].forEach(statusId => {
            const checkbox = document.getElementById(statusId);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    console.log(`[UsersAdvanced] Status filter ${statusId} changed:`, checkbox.checked);
                    this.mainApp.applyFilters();
                });
            }
        });

        // Фильтры по Trial Calls
        ['trialCallsLess0', 'trialCallsLess5', 'trialCallsMid', 'trialCallsGreater20', 'trialCallsEquals20'].forEach(filterId => {
            const checkbox = document.getElementById(filterId);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    console.log(`[UsersAdvanced] Trial Calls filter ${filterId} changed:`, checkbox.checked);
                    this.mainApp.applyFilters();
                });
            }
        });



        // Фильтры по языкам
        const languageCheckboxes = ['languageRu', 'languageEn', 'languageEs', 'languageFr', 'languageDe', 'languageIt', 'languagePt', 'languageZh', 'languageAr', 'languageJa'];
        languageCheckboxes.forEach(langId => {
            const checkbox = document.getElementById(langId);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    console.log(`[UsersAdvanced] Language filter ${langId} changed:`, checkbox.checked);
                    this.mainApp.applyFilters();
                });
            }
        });

        // Фильтр по произвольному языку
        const customLanguageFilter = document.getElementById('customLanguageFilter');
        if (customLanguageFilter) {
            customLanguageFilter.addEventListener('input', (e) => {
                console.log('[UsersAdvanced] Custom language filter changed:', e.target.value);
                this.mainApp.applyFilters();
            });
        }

        // Кнопки управления фильтрами статусов
        const selectAllStatusesBtn = document.getElementById('selectAllStatuses');
        if (selectAllStatusesBtn) {
            selectAllStatusesBtn.addEventListener('click', () => {
                this.selectAllStatuses();
            });
        }

        const resetFiltersBtn = document.getElementById('resetFilters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetAllFilters();
            });
        }

        // Выбор всех пользователей
        if (this.ui.selectAllCheckbox) {
            this.ui.selectAllCheckbox.addEventListener('change', (e) => {
                this.selectAllUsers(e.target.checked);
            });
        }

        // Делегирование событий для таблицы пользователей
        if (this.ui.usersTable) {
            this.ui.usersTable.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox' && e.target.classList.contains('user-checkbox')) {
                    this.toggleUserSelection(e.target);
                }
            });
        }

        console.log('[UsersAdvanced] Event listeners attached');
    }

    // Выбор всех статусов
    selectAllStatuses() {
        ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = true;
                console.log(`[UsersAdvanced] Set ${id} to true`);
            }
        });
        this.mainApp.applyFilters();
        console.log('[UsersAdvanced] All statuses selected');
    }

    // Сброс всех фильтров
    resetAllFilters() {
        // Сбрасываем чекбоксы статусов
        ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });

        // Сбрасываем чекбоксы Trial Calls
        ['trialCallsLess0', 'trialCallsLess5', 'trialCallsMid', 'trialCallsGreater20', 'trialCallsEquals20'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });

        // Сбрасываем текстовые фильтры
        const searchInput = document.getElementById('searchFilter');
        if (searchInput) searchInput.value = '';

        // Сбрасываем чекбоксы языков
        const languageCheckboxes = ['languageRu', 'languageEn', 'languageEs', 'languageFr', 'languageDe', 'languageIt', 'languagePt', 'languageZh', 'languageAr', 'languageJa'];
        languageCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });

        // Сбрасываем произвольный фильтр языка
        const customLanguageInput = document.getElementById('customLanguageFilter');
        if (customLanguageInput) customLanguageInput.value = '';

        // Применяем фильтры
        this.mainApp.applyFilters();
        console.log('[UsersAdvanced] All filters reset');
    }

    // Загрузка пользователей
    loadUsers() {
        try {
            console.log('[UsersAdvanced] Loading users...');

            // Загружаем из локального хранилища или API
            const savedUsers = this.loadUsersFromStorage();

            if (savedUsers && savedUsers.length > 0) {
                savedUsers.forEach(userData => {
                    this.addUser(userData);
                });
            } else {
                console.warn('[UsersAdvanced] No users found in storage');
            }

            this.updateUI();
            console.log(`[UsersAdvanced] Loaded ${this.users.size} users`);

        } catch (error) {
            console.error('[UsersAdvanced] Failed to load users:', error);
            throw new TelegramUserError('Failed to load users from storage', 'LOAD_USERS_FAILED');
        }
    }

    // Загрузка пользователей из хранилища
    loadUsersFromStorage() {
        try {
            const stored = localStorage.getItem('telegram_users_advanced');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('[UsersAdvanced] Failed to parse stored users:', error);
            return [];
        }
    }

    // Сохранение пользователей в хранилище
    saveUsersToStorage() {
        try {
            const usersArray = Array.from(this.users.values());
            localStorage.setItem('telegram_users_advanced', JSON.stringify(usersArray));
        } catch (error) {
            console.error('[UsersAdvanced] Failed to save users to storage:', error);
        }
    }

    // Добавление пользователя
    addUser(userData) {
        if (!userData || !userData.id) {
            throw new TelegramUserError('Invalid user data: missing id', 'INVALID_USER_DATA');
        }

        const userId = userData.id.toString();
        const user = {
            id: userId,
            username: userData.username || '',
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            language_code: userData.language_code || '',
            is_bot: userData.is_bot || false,
            status: userData.status || 'active',
            added_at: userData.added_at || new Date().toISOString(),
            last_activity: userData.last_activity || new Date().toISOString(),
            message_count: userData.message_count || 0,
            selected: false
        };

        this.users.set(userId, user);
        console.log(`[UsersAdvanced] Added user: ${user.username} (${userId})`);
    }

    // Переключение выбора пользователя
    toggleUserSelection(checkbox) {
        const userId = checkbox.dataset.userId;
        const isSelected = checkbox.checked;

        console.log(`[UsersAdvanced] Toggling selection for user ${userId}: ${isSelected}`);

        if (isSelected) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }

        // Обновляем статус пользователя
        if (this.users.has(userId)) {
            this.users.get(userId).selected = isSelected;
        }

        this.updateSelectedUsersData();
        this.updateUI();

        // Обновляем чекбокс "выбрать все"
        this.updateSelectAllCheckbox();

        console.log(`[UsersAdvanced] Selected users count: ${this.selectedUsers.size}`);
    }

    // Выбор всех пользователей
    selectAllUsers(select) {
        console.log(`[UsersAdvanced] Selecting all users: ${select}`);

        this.selectedUsers.clear();

        if (select) {
            // Выбираем всех видимых пользователей
            const visibleCheckboxes = this.ui.usersTable.querySelectorAll('input.user-checkbox:not([disabled])');
            visibleCheckboxes.forEach(checkbox => {
                const userId = checkbox.dataset.userId;
                checkbox.checked = true;
                this.selectedUsers.add(userId);

                if (this.users.has(userId)) {
                    this.users.get(userId).selected = true;
                }
            });
        } else {
            // Снимаем выбор со всех
            const allCheckboxes = this.ui.usersTable.querySelectorAll('input.user-checkbox');
            allCheckboxes.forEach(checkbox => {
                const userId = checkbox.dataset.userId;
                checkbox.checked = false;
                this.selectedUsers.delete(userId);

                if (this.users.has(userId)) {
                    this.users.get(userId).selected = false;
                }
            });
        }

        this.updateSelectedUsersData();
        this.updateUI();

        console.log(`[UsersAdvanced] After select all: ${this.selectedUsers.size} users selected`);
    }

    // Обновление чекбокса "выбрать все"
    updateSelectAllCheckbox() {
        if (!this.ui.selectAllCheckbox) return;

        const visibleCheckboxes = this.ui.usersTable.querySelectorAll('input.user-checkbox:not([disabled])');
        const checkedCheckboxes = this.ui.usersTable.querySelectorAll('input.user-checkbox:checked:not([disabled])');

        if (visibleCheckboxes.length === 0) {
            this.ui.selectAllCheckbox.checked = false;
            this.ui.selectAllCheckbox.indeterminate = false;
            return;
        }

        if (checkedCheckboxes.length === 0) {
            this.ui.selectAllCheckbox.checked = false;
            this.ui.selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length === visibleCheckboxes.length) {
            this.ui.selectAllCheckbox.checked = true;
            this.ui.selectAllCheckbox.indeterminate = false;
        } else {
            this.ui.selectAllCheckbox.checked = false;
            this.ui.selectAllCheckbox.indeterminate = true;
        }
    }

    // Получение выбранных пользователей (для совместимости)
    getSelectedUsers() {
        return this.selectedUsersData;
    }

    // Обновление данных выбранных пользователей
    updateSelectedUsersData() {
        this.selectedUsersData = Array.from(this.selectedUsers)
            .map(userId => this.users.get(userId))
            .filter(user => user !== undefined);

        console.log(`[UsersAdvanced] Updated selected users data: ${this.selectedUsersData.length} users`);
    }

    // Фильтрация пользователей по поисковому запросу
    filterUsers(query) {
        const rows = this.ui.usersTable.querySelectorAll('tr');
        const searchTerm = query.toLowerCase().trim();

        rows.forEach(row => {
            // После исправления индексы колонок:
            // 0: checkbox, 1: ID, 2: first_name, 3: last_name, 4: username
            const username = row.cells[4]?.textContent?.toLowerCase() || '';
            const name = (row.cells[2]?.textContent?.toLowerCase() || '') + ' ' + (row.cells[3]?.textContent?.toLowerCase() || '');
            const id = row.cells[1]?.textContent?.toLowerCase() || '';

            const matches = username.includes(searchTerm) ||
                           name.includes(searchTerm) ||
                           id.includes(searchTerm);

            row.style.display = matches ? '' : 'none';
        });

        this.updateSelectAllCheckbox();
    }

    // Обновление интерфейса
    updateUI() {
        this.renderUsersTable();
        this.renderSelectedUsersList();
        this.updateStats();
    }

    // Рендеринг основной таблицы пользователей
    renderUsersTable() {
        if (!this.ui.usersTable) return;

        // Используем filteredUsers из mainApp вместо локального Map
        const usersArray = this.mainApp.filteredUsers || [];

        console.log(`📋 RENDERING FILTERED ADVANCED TABLE: ${usersArray.length}/${this.users.size} users`);

        if (usersArray.length === 0) {
            this.ui.usersTable.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 40px; color: #6c757d;">
                        👥 Пользователи не найдены. Попробуйте изменить фильтры или очистить поиск.
                    </td>
                </tr>
            `;
            return;
        }

        // Генерируем строки таблицы
        const rows = usersArray.map(user => {
            const isSelected = this.selectedUsers.has(user.id);
            const checkboxChecked = isSelected ? 'checked' : '';

            return `
                <tr data-user-id="${user.id}" class="user-row">
                    <td style="text-align: center;">
                        <input type="checkbox" class="user-checkbox" ${checkboxChecked} data-user-id="${user.id}">
                    </td>
                    <td>
                        <code style="background:#f8f9fa;color:#000;padding:1px 4px;border-radius:2px;font-size:11px;user-select:none;">${user.id}</code>
                    </td>
                    <td style="color: #1a1a1a; font-weight: 500; text-align: center; min-width: 80px;">${user.first_name || ''}</td>
                    <td style="color: #1a1a1a; font-weight: 500; text-align: center; min-width: 80px;">${user.last_name || ''}</td>
                    <td style="color: #2563eb;">
                        ${user.username ? `<a href="https://t.me/${user.username}" target="_blank">@${user.username}</a>` : '—'}
                    </td>
                    <td>
                        <span class="status-pill" style="color: #000 !important;">
                            ${user.status || 'active'}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold;">
                            ${user.language_code || '—'}
                        </span>
                    </td>

                    <td style="text-align: center;">
                        <strong style="color: ${user.premium ? '#28a745' : '#dc3545'}; background: ${user.premium ? '#d4edda' : '#f8d7da'}; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: bold;">${user.premium || 'STANDARD'}</strong>
                    </td>
                    <td style="text-align: center;">
                        <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold;">
                            ${user.traffic_from || '—'}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <span style="background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; border: 2px solid #ff9900;">
                            <strong>${user.trial_calls || user.trial_img_gen_calls || 0}</strong>
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <button onclick="window.telegramSender.modules.users.showUserDetails('${user.id}')" style="font-size: 11px; padding: 2px 4px; border: 1px solid #6c757d; border-radius: 3px; cursor: pointer; background: #f8f9fa; margin-right: 5px;">📄 Детали</button>
                        <span style="color: #666; font-size: 11px; display: block; margin-top: 2px;">
                            ${this.formatDate(user.added_at)}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        this.ui.usersTable.innerHTML = rows;

        // Настраиваем чекбоксы после рендера
        this.setupUserCheckboxes();
        console.log('✅ Advanced users table rendered successfully');
    }

    // Настройка обработчиков чекбоксов для таблицы
    setupUserCheckboxes() {
        if (!this.ui.usersTable) return;

        const checkboxes = this.ui.usersTable.querySelectorAll('input.user-checkbox');
        checkboxes.forEach(checkbox => {
            // Убираем старые обработчики
            checkbox.removeEventListener('change', this.handleCheckboxChange);
            // Добавляем новые
            checkbox.addEventListener('change', this.handleCheckboxChange.bind(this));
        });
    }

    // Обработчик изменения чекбокса (нужен для правильной привязки)
    handleCheckboxChange(e) {
        const checkbox = e.target;
        const userId = checkbox.dataset.userId;
        const isSelected = checkbox.checked;

        console.log(`[UsersAdvanced] Table checkbox changed for user ${userId}: ${isSelected}`);

        if (isSelected) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }

        if (this.users.has(userId)) {
            this.users.get(userId).selected = isSelected;
        }

        this.updateSelectedUsersData();
        this.updateUI();
        this.updateSelectAllCheckbox();

        console.log(`[UsersAdvanced] Table selection updated, selected count: ${this.selectedUsers.size}`);
    }

    // Форматирование даты для отображения
    formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString();
        } catch (error) {
            return dateStr;
        }
    }

    // Фильтрация пользователей по поисковому запросу (расширенная)
    filterUsers(query) {
        const rows = this.ui.usersTable.querySelectorAll('tr[data-user-id]');
        const searchTerm = query.toLowerCase().trim();

        if (!searchTerm) {
            // Показываем все строки если поиск пустой
            rows.forEach(row => {
                row.style.display = '';
            });
        } else {
            rows.forEach(row => {
                const userId = row.dataset.userId;
                const user = this.users.get(userId);

                if (user) {
                    const searchableText = [
                        user.id,
                        user.username || '',
                        user.first_name || '',
                        user.last_name || '',
                        user.status || '',
                        user.language_code || '',
                        String(user.message_count || 0)
                    ].join(' ').toLowerCase();

                    const matches = searchableText.includes(searchTerm);
                    row.style.display = matches ? '' : 'none';
                }
            });
        }

        this.updateSelectAllCheckbox();
    }

    // Отрисовка списка выбранных пользователей
    renderSelectedUsersList() {
        if (!this.ui.selectedUsersList) return;

        this.ui.selectedUsersList.innerHTML = '';

        if (this.selectedUsersData.length === 0) {
            this.ui.selectedUsersList.innerHTML = '<div class="no-selected-users">Нет выбранных пользователей</div>';
            return;
        }

        this.selectedUsersData.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'selected-user-item';
            userElement.innerHTML = `
                <span class="user-info">
                    <strong>${this.escapeHtml(user.username || 'Unknown')}</strong>
                    (${user.id})
                </span>
                <button class="remove-user-btn" data-user-id="${user.id}" title="Удалить из выбранных">
                    ✕
                </button>
            `;

            this.ui.selectedUsersList.appendChild(userElement);
        });

        // Привязываем обработчики для кнопок удаления
        this.ui.selectedUsersList.querySelectorAll('.remove-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                this.removeUserFromSelection(userId);
            });
        });
    }

    // Удаление пользователя из выбранных
    removeUserFromSelection(userId) {
        const checkbox = this.ui.usersTable.querySelector(`input.user-checkbox[data-user-id="${userId}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }

        this.selectedUsers.delete(userId);

        if (this.users.has(userId)) {
            this.users.get(userId).selected = false;
        }

        this.updateSelectedUsersData();
        this.updateUI();
        this.updateSelectAllCheckbox();

        console.log(`[UsersAdvanced] Removed user ${userId} from selection`);
    }

    // Обновление статистики
    updateStats() {
        if (!this.ui.statsDisplay) return;

        const total = this.users.size;
        const selected = this.selectedUsers.size;
        const active = Array.from(this.users.values()).filter(u => u.status === 'active').length;

        this.ui.statsDisplay.innerHTML = `
            Всего: ${total} | Выбрано: ${selected} | Активных: ${active}
        `;
    }

    // Вспомогательные функции
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // API функции для интеграции с модулями сообщений
    getSelectedUsersForMessaging() {
        if (this.selectedUsersData.length === 0) {
            throw new TelegramUserError('Необходимо выбрать хотя бы одного пользователя', 'NO_USERS_SELECTED');
        }

        return this.selectedUsersData.map(user => ({
            id: user.id,
            user_id: user.id,  // Добавлено соответствие для совместимости
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name
        }));
    }

    /**
     * ПЕРЕЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ ИЗ GOOGLE SHEETS
     */
    async reloadUsersData() {
        try {
            await this.loadUsersFromSheets();
            this.mainApp.showStatus('Данные обновлены', 'success');
        } catch (error) {
            this.mainApp.showStatus('Не удалось обновить данные', 'error');
        }
    }

    /**
     * ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ ИЗ GOOGLE SHEETS
     */
    async loadUsersFromSheets() {
        this.mainApp.showStatus('Загружаю данные пользователей...', 'info');

        const config = window.CONFIG;

        // Проверка настроек бота и таблицы
        if (!this.hasBotAndSheetConfigured()) {
            console.log('⚠️ No bot/sheet configuration found in localStorage');
            this.mainApp.showStatus('Настройки бота и таблицы не найдены. Настройте через ⚙️', 'warning');
            this.mainApp.addToLog('❌ Не настроены бот и таблица - данные не загружены');
            return;
        }

        // Проверяем тип происхождения (для корректной работы CORS)
        const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname) || location.protocol === 'file:';
        if (!isLocalhost && !config.PROXY_URL) {
            console.warn('⚠️ CORS issue detected - using Google Sheets without proxy may fail');
        }

        try {
            // Запрос к Google Sheets API (CSV формат)
            let googleSheetsUrl;
            if (config.SHEET_ID.startsWith('2PACX-')) {
                // Новый формат публикации
                googleSheetsUrl = `https://docs.google.com/spreadsheets/d/e/${config.SHEET_ID}/pub?gid=0&single=true&output=csv`;
            } else {
                // Старый формат (обычный sheet ID)
                googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${config.SHEET_ID}/gviz/tq?tqx=out:csv`;
            }

            // Используем CORS прокси если настроен
            let url = googleSheetsUrl;
            if (config.PROXY_URL) {
                url = config.PROXY_URL + encodeURIComponent(googleSheetsUrl);
            }

            console.log('📊 Loading from Google Sheets:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvText = await response.text();
            console.log('📊 Raw CSV received, length:', csvText.length);

            // Парсим CSV
            const parsedUsers = this.parseCSVData(csvText);

            // Фильтруем валидные записи и конвертируем в формат UsersAdvanced
            const validUsers = parsedUsers.filter(user =>
                user.user_id && user.user_id.toString().trim() !== ''
            ).map(user => {
                // Гибкий маппинг полей с учетом различных вариантов названий
                const { trialCallsValue, sourceValue, firstNameValue, lastNameValue, premiumValue } = this.mapUserFields(user);

                return {
                    id: user.user_id.toString(),
                    username: user.username || '',
                    first_name: firstNameValue || user.first_name || '',
                    last_name: lastNameValue || user.last_name || '',
                    language_code: user.language || '',
                    status: user.status || 'active',
                    premium: premiumValue || user.premium || user.is_premium || false,
                    traffic_from: sourceValue,
                    trial_calls: trialCallsValue,
                    added_at: user.date_added || new Date().toISOString(),
                    message_count: trialCallsValue,
                    selected: false
                };
            });

            // Обновляем данные
            this.users.clear();
            validUsers.forEach(userData => {
                this.addUser(userData);
            });

            // Синхронизируем данные с mainApp
            this.mainApp.users = validUsers;
            this.mainApp.filteredUsers = [...validUsers];
            this.mainApp.selectedUsers.clear(); // Очищаем выбор при загрузке новых данных

            console.log('✅ Loaded users data from Sheets:', validUsers.length, 'valid records');

            // Обновляем фильтры и интерфейс
            this.updateUI();
            this.mainApp.showStatus(`Загружено ${validUsers.length} пользователей`, 'success');

            // Применяем фильтры после загрузки
            this.mainApp.applyFilters();

            // Синхронизируем списки пользователей с обновленными данными
            if (this.mainApp.modules?.userlists?.syncWithUserData) {
                this.mainApp.modules.userlists.syncWithUserData();
                console.log('📋 User lists synchronized with fresh data');
            }

        } catch (error) {
            console.error('❌ Failed to load users data from Sheets:', error);

            // Специальная обработка CORS ошибок
            let errorMessage = error.message;
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Ошибка CORS. Убедитесь что:\n1. Таблица опубликована для просмотра\n2. Запросы разрешены политикой безопасности\n3. Используйте локальный прокси если нужно';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Не удалось подключиться к Google Sheets. Проверьте:\n1. URL таблицы\n2. Сетевые настройки\n3. CORS политику браузера';
            }

            this.mainApp.showStatus(`Ошибка загрузки: ${errorMessage}`, 'error');
            // Не выбрасываем ошибку дальше, чтобы не блокировать инициализацию
            // throw error;
        }
    }

    /**
     * ПАРСЕР CSV ДАННЫХ
     */
    parseCSVData(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV файл пустой или содержит меньше двух строк');
        }

        // Первая строка - заголовки
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

        console.log('📊 CSV headers found:', headers);

        // Логируем первые несколько строк данных для отладки
        console.log('📊 CSV sample data rows:');
        for (let i = 1; i < Math.min(lines.length, 4); i++) {
            const values = this.parseCSVLine(lines[i]);
            console.log(`  Row ${i}:`, values);
        }

        // Проверяем обязательные колонки
        const requiredColumns = ['user_id'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
            throw new Error(`Обязательные колонки не найдены: ${missingColumns.join(', ')}`);
        }

        // Парсим строки данных
        const users = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseCSVLine(line);

            // Создаем объект пользователя
            const user = {};
            headers.forEach((header, index) => {
                user[header] = values[index]?.replace(/"/g, '').trim() || '';
            });

            users.push(user);
        }

        return users;
    }

    /**
     * ПРЯМОЕ МАППИНГ ПОЛЕЙ ПО ОРИГИНАЛЬНЫМ НАЗВАНИЯМ ИЗ ВАШЕЙ CSV
     */
    mapUserFields(user) {
        // ПРЯМЫЕ СООТВЕТСТВИЯ ПО НАЗВАНИЯМ ИЗ ВАШИХ ДАННЫХ
        const fieldMappings = {
            // Trial calls
            'triall img gen calls': 'trial_calls',
            'trial img gen calls': 'trial_calls',
            // Источник
            'traffic from': 'traffic_from',
            'traffic_from': 'traffic_from',
            'channel_name': 'traffic_from', // альтернативный источник
            'channel name': 'traffic_from',
            // Имена
            'first_name': 'first_name',
            'first name': 'first_name',
            'last_name': 'last_name',
            'last name': 'last_name',
            'имя': 'first_name',
            'фамилия': 'last_name',
            // Премиум
            'premium': 'premium',
            // Язык
            'language': 'language_code'
        };

        // ВЫВОДИМ ВСЕ ПОЛЯ ДЛЯ ОТЛАДКИ
        console.log(`🔍 RAW CSV FIELDS for user ${user.user_id}:`);
        const availableFields = Object.keys(user);
        availableFields.forEach(field => {
            console.log(`   "${field}": "${user[field]}"`);
        });

        // ПРЯМОЕ ИЗВЛЕЧЕНИЕ ПО ТОЧНЫМ СООТВЕТСТВИЯМ
        let trialCallsValue = 0;
        let sourceValue = '';
        let firstNameValue = '';
        let lastNameValue = '';

        // Извлекаем имена напрямую из известных полей
        // Проверяем различные варианты написания
        const nameFields = ['first_name', 'first name', 'имя'];
        for (const field of nameFields) {
            if (user[field] && user[field].trim()) {
                firstNameValue = user[field].trim();
                console.log(`✅ First name found in "${field}": "${firstNameValue}"`);
                break;
            }
        }

        const surnameFields = ['last_name', 'last name', 'фамилия'];
        for (const field of surnameFields) {
            if (user[field] && user[field].trim()) {
                lastNameValue = user[field].trim();
                console.log(`✅ Last name found in "${field}": "${lastNameValue}"`);
                break;
            }
        }

        // Извлекаем trial calls напрямую из известных полей (в lowercase как после парсинга CSV)
        if (user['triall img gen calls'] && user['triall img gen calls'].trim()) {
            const parsed = parseInt(user['triall img gen calls']);
            if (!isNaN(parsed)) {
                trialCallsValue = parsed;
                console.log(`✅ Trial calls found: "${user['triall img gen calls']}" -> ${trialCallsValue}`);
            }
        }

        // Извлекаем источник напрямую из известных полей (в lowercase как после парсинга CSV)
        if (user['traffic from'] && user['traffic from'].trim()) {
            sourceValue = user['traffic from'].trim();
            console.log(`✅ Source found: "${sourceValue}"`);
        } else if (user['channel_name'] && user['channel_name'].trim()) {
            sourceValue = user['channel_name'].trim();
            console.log(`✅ Alternative source found: "${sourceValue}"`);
        }

        // Извлекаем премиум значение (теперь реальные данные вместо boolean)
        let premiumValue = '';
        if (user['premium'] && user['premium'].trim()) {
            premiumValue = user['premium'].trim();
            console.log(`✅ Premium found: "${premiumValue}"`);
        }

        console.log(`📊 FINAL RESULT for user ${user.user_id}:`);
        console.log(`   first_name = "${firstNameValue}"`);
        console.log(`   last_name = "${lastNameValue}"`);
        console.log(`   premium = "${premiumValue}"`);
        console.log(`   trial_calls = ${trialCallsValue}`);
        console.log(`   traffic_from = "${sourceValue}"`);
        console.log(`   ---`);

        return {
            trialCallsValue: trialCallsValue,
            sourceValue: sourceValue,
            firstNameValue: firstNameValue,
            lastNameValue: lastNameValue,
            premiumValue: premiumValue
        };
    }

    /**
     * ПАРСЕР ОДНОЙ СТРОКИ CSV
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * ПОКАЗАТЬ ДЕТАЛИ ПОЛЬЗОВАТЕЛЯ
     */
    showUserDetails(userId) {
        try {
            const user = this.users.get(userId.toString());
            if (!user) {
                console.error('[UsersAdvanced] User not found:', userId);
                return;
            }

            // Заполняем информацию о пользователе
            const userHistoryTitle = document.getElementById('userHistoryTitle');
            const userHistoryWizardHeader = document.getElementById('userHistoryWizardHeader');
            const userHistoryContent = document.getElementById('userHistoryContent');

            if (userHistoryTitle) {
                const displayName = user.first_name || user.username || `ID: ${user.id}`;
                userHistoryTitle.textContent = `📄 Детали пользователя: ${displayName}`;
            }

            if (userHistoryWizardHeader) {
                const statusColor = user.status === 'active' ? '#28a745' :
                                   user.status === 'inactive' ? '#6c757d' :
                                   user.status === 'kicked' ? '#dc3545' : '#007bff';

                userHistoryWizardHeader.innerHTML = `
                    <div class="user-details-grid">
                        <div><strong>🆔 ID:</strong> <code>${user.id}</code></div>
                        <div><strong>📊 Статус:</strong> <span style="color: ${statusColor}; font-weight: bold;">${user.status || 'Неизвестно'}</span></div>
                        <div><strong>👤 Имя:</strong> ${user.first_name || 'Не указано'}</div>
                        <div><strong>👤 Фамилия:</strong> ${user.last_name || 'Не указано'}</div>
                        <div><strong>👥 Username:</strong> ${user.username ? `<a href="https://t.me/${user.username}" target="_blank">@${user.username}</a>` : 'Не указано'}</div>
                        <div><strong>🌍 Язык:</strong> ${user.language_code || 'Неизвестно'}</div>
                        <div><strong>🤖 Бот:</strong> ${user.is_bot ? 'Да' : 'Нет'}</div>
                        <div><strong>⭐ Премиум:</strong> ${user.premium ? 'Да' : 'Нет'}</div>
                        <div><strong>🎨 Trial Calls:</strong> ${user.message_count || user.trial_img_gen_calls || 0}</div>
                        <div><strong>🚦 Источник:</strong> ${user.traffic_from || 'Неизвестно'}</div>
                        <div><strong>📅 Добавлен:</strong> ${this.formatDate(user.added_at)}</div>
                        <div><strong>🔄 Последняя активность:</strong> ${this.formatDate(user.last_activity)}</div>
                    </div>
                `;
            }

            if (userHistoryContent) {
                // Получаем историю сообщений для этого пользователя (если есть)
                // История сообщений - получаем по user_id (из messaging модуля) или user.id (для совместимости)
                const userMessageHistory = Array.isArray(this.mainApp?.userMessageHistory?.[user.id])
                    ? this.mainApp.userMessageHistory[user.id]
                    : Array.isArray(this.mainApp?.userMessageHistory?.[user.id.toString()])
                    ? this.mainApp.userMessageHistory[user.id.toString()]
                    : [];

                const broadcastHistory = Array.isArray(this.mainApp?.broadcastHistory)
                    ? this.mainApp.broadcastHistory : [];

                console.log('[UsersAdvanced] Debug user history:', {
                    userId: user.id,
                    userMessageHistoryCount: userMessageHistory.length,
                    broadcastHistoryCount: broadcastHistory.length,
                    broadcastHistorySample: broadcastHistory.slice(0, 3)
                });

                // Фильтруем историю рассылок для этого пользователя
                const userBroadcasts = broadcastHistory.filter(broadcast => {
                    // Отладка для каждого broadcast
                    console.log('[UsersAdvanced] Checking broadcast:', {
                        broadcast: broadcast ? {
                            id: broadcast.id,
                            recipients: broadcast.recipients,
                            hasRecipients: !!(broadcast.recipients && Array.isArray(broadcast.recipients)),
                            userId: user.id.toString(),
                            includesUser: broadcast.recipients?.includes(user.id.toString())
                        } : null
                    });

                    return broadcast &&
                           typeof broadcast === 'object' &&
                           broadcast.recipients &&
                           Array.isArray(broadcast.recipients) &&
                           broadcast.recipients.includes(user.id.toString());
                });

                console.log('[UsersAdvanced] Final userBroadcasts:', userBroadcasts.length);

                userHistoryContent.innerHTML = `
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: var(--accent-primary);">📨 История рассылок (${userBroadcasts.length})</h4>
                        ${userBroadcasts.length > 0 ? `
                            <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 5px;">
                                ${userBroadcasts.slice(0, 10).map(broadcast => {
                                    if (!broadcast) return '';
                                    const timestamp = broadcast.timestamp ? new Date(broadcast.timestamp).toLocaleString() : 'Неизвестно';
                                    const status = broadcast.status || 'unknown';
                                    const statusColor = status === 'success' ? '#28a745' : status === 'partial' ? '#ffc107' : '#dc3545';
                                    const messageText = broadcast.message || '';
                                    const messagePreview = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;

                                    // Находим результат для этого пользователя
                                    const userResult = broadcast.results?.find(result =>
                                        result.user_id && result.user_id.toString() === user.id.toString()
                                    );
                                    const userStatus = userResult ? (userResult.success ? 'отправлено' : 'ошибка') : 'неизвестно';
                                    const userStatusColor = userResult ? (userResult.success ? '#28a745' : '#dc3545') : '#666';

                                    return `
                                    <div style="padding: 8px; border-bottom: 1px solid var(--bg-tertiary); font-size: 12px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            <strong>${timestamp}</strong>
                                            <span style="color: ${userStatusColor};">${userStatus}</span>
                                        </div>
                                        <div style="color: var(--text-secondary); margin-bottom: 4px;">
                                            ${messagePreview || 'Медиа-файл или пустое сообщение'}
                                        </div>
                                    </div>`;
                                }).join('')}
                                ${userBroadcasts.length > 10 ? `<div style="padding: 8px; text-align: center; color: var(--text-secondary); font-size: 12px;">... и ещё ${userBroadcasts.length - 10} рассылок</div>` : ''}
                            </div>
                        ` : `
                            <div style="color: var(--text-secondary); padding: 20px; text-align: center; border: 1px solid var(--border); border-radius: 5px;">
                                📭 У этого пользователя пока нет истории рассылок
                            </div>
                        `}
                    </div>

                    <div>
                        <h4 style="margin: 0 0 10px 0; color: var(--accent-primary);">💬 Личные сообщения (${userMessageHistory.length})</h4>
                        ${userMessageHistory.length > 0 ? `
                            <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 5px;">
                                ${userMessageHistory.slice(0, 10).map(message => {
                                    if (!message) return '';
                                    const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleString() : 'Неизвестно';
                                    const status = message.status || 'unknown';
                                    const statusColor = status === 'sent' ? '#28a745' : '#dc3545';
                                    // Совместимость: message может быть строкой или объектом с полем text
                                    const messageText = typeof message === 'string' ? message : (message.message || message.text || '');
                                    const messagePreview = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;

                                    return `
                                    <div style="padding: 8px; border-bottom: 1px solid var(--bg-tertiary); font-size: 12px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            <strong>${timestamp}</strong>
                                            <span style="color: ${statusColor};">${status}</span>
                                        </div>
                                        <div>${messagePreview}</div>
                                    </div>`;
                                }).join('')}
                                ${userMessageHistory.length > 10 ? `<div style="padding: 8px; text-align: center; color: var(--text-secondary); font-size: 12px;">... и ещё ${userMessageHistory.length - 10} личных сообщений</div>` : ''}
                            </div>
                        ` : `
                            <div style="color: var(--text-secondary); padding: 20px; text-align: center; border: 1px solid var(--border); border-radius: 5px;">
                                💭 Личных сообщений этому пользователю пока не отправлялось
                            </div>
                        `}
                    </div>
                `;
            }

            // Показываем модальное окно
            const modal = document.getElementById('userHistoryWizard');
            if (modal) {
                modal.style.display = 'block';
                const backdrop = document.getElementById('modalBackdrop');
                if (backdrop) {
                    backdrop.style.display = 'block';
                }
            }

            console.log('[UsersAdvanced] Showing user details for:', userId);

        } catch (error) {
            console.error('[UsersAdvanced] Failed to show user details:', error);
            this.mainApp?.showStatus('Не удалось загрузить детали пользователя', 'error');
        }
    }

    /**
     * ПРОВЕРКА НАЛИЧИЯ НАСТРОЕННЫХ БОТА И ТАБЛИЦЫ
     */
    hasBotAndSheetConfigured() {
        try {
            // Проверяем наличие storage модуля
            if (!this.mainApp.modules?.storage) {
                console.log('❌ hasBotAndSheetConfigured: Storage not initialized');
                return false;
            }

            // Используем ключи из текущей конфигурации ботов
            const currentBotId = localStorage.getItem('telegram_sender_current_bot');
            const currentSheetId = localStorage.getItem('telegram_sender_current_sheet');

            const hasBot = !!window.CONFIG?.BOT_TOKEN;
            const hasSheet = !!window.CONFIG?.SHEET_ID;

            console.log('🔍 Bot and sheet configuration result:', {
                hasBot: hasBot,
                hasCurrentBotId: !!currentBotId,
                hasSheet: hasSheet,
                hasCurrentSheetId: !!currentSheetId,
                overallResult: hasBot && hasSheet
            });

            return hasBot && hasSheet;
        } catch (error) {
            console.error('❌ Error in hasBotAndSheetConfigured:', error);
            return false;
        }
    }
};

// Экспорт для модульной системы (если поддерживается)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.TelegramUsersAdvanced;
}

console.log('[UsersAdvanced] Module loaded successfully');
