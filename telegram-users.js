/**
 * TelegramSender Users Module
 * Функционал для работы с пользователями и их данными
 */

class TelegramUsers {
    constructor(parent) {
        this.parent = parent; // Ссылка на основной класс TelegramSender
    }

    /**
     * ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ ИЗ GOOGLE SHEETS
     */
    async loadUsersData() {
        this.parent.showStatus('Загружаю данные пользователей...', 'info');

        const config = window.CONFIG;

        // Проверка настроек бота и таблицы
        if (!this.hasBotAndSheetConfigured()) {
            console.log('⚠️ No bot/sheet configuration found in localStorage');
            this.parent.showStatus('Настройки бота и таблицы не найдены. Настройте через ⚙️', 'warning');
            this.parent.addToLog('❌ Не настроены бот и таблица - данные не загружены');
            return;
        }

        try {
            // Запрос к Google Sheets API (CSV формат)
            let url;
            if (config.SHEET_ID.startsWith('2PACX-')) {
                // Новый формат публикации
                url = `https://docs.google.com/spreadsheets/d/e/${config.SHEET_ID}/pub?gid=0&single=true&output=csv`;
            } else {
                // Старый формат (обычный sheet ID)
                url = `https://docs.google.com/spreadsheets/d/${config.SHEET_ID}/gviz/tq?tqx=out:csv`;
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
            this.parent.usersData = this.parseCSV(csvText);

            // Фильтруем валидные записи
            this.parent.usersData = this.parent.usersData.filter(user =>
                user.user_id &&
                user.user_id.toString().trim() !== ''
            );

            console.log('✅ Loaded users data:', this.parent.usersData.length, 'valid records');

            // Применяем фильтры и обновляем интерфейс
            this.applyFilters();
            this.updateUsersCount();

            // Синхронизируем списки пользователей с обновленными данными
            if (this.parent.userLists) {
                this.parent.userLists.syncWithUserData();
                console.log('📋 User lists synchronized with fresh data');
            }

            this.parent.showStatus(`Загружено ${this.parent.usersData.length} пользователей`, 'success');

        } catch (error) {
            console.error('❌ Failed to load users data:', error);
            this.parent.showStatus(`Ошибка загрузки: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Парсер CSV текста в массив объектов
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV файл пустой или содержит меньше двух строк');
        }

        // Первая строка - заголовки
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

        console.log('📊 CSV headers found:', headers);

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
     * Парсер одной строки CSV
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
     * ПРИМЕНЕНИЕ ФИЛЬТРОВ К ДАННЫМ
     */
    applyFilters() {
        // Получаем текст фильтра
        const searchFilter = (document.getElementById('searchFilter')?.value || '').toLowerCase();

        // Получаем выбранные статусы
        const selectedStatuses = [];
        const statusCheckboxes = ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked'];
        statusCheckboxes.forEach(statusId => {
            const checkbox = document.getElementById(statusId);
            if (checkbox && checkbox.checked) {
                selectedStatuses.push(statusId.replace('status', '').toLowerCase());
            }
        });

        // Получаем выбранные языки
        const selectedLanguages = [];
        const languageCheckboxes = ['languageEn', 'languageRu', 'languageDe', 'languageFr', 'languageEs', 'languageIt', 'languagePt', 'languagePl', 'languageTr', 'languageZh', 'languageJa', 'languageKo', 'languageAr', 'languageHi', 'languageOther'];
        languageCheckboxes.forEach(langId => {
            const checkbox = document.getElementById(langId);
            if (checkbox && checkbox.checked) {
                const lang = langId.replace('language', '').toLowerCase();
                selectedLanguages.push(lang === 'en' ? 'english' : lang === 'ru' ? 'russian' : lang === 'de' ? 'german' : lang === 'fr' ? 'french' : lang === 'es' ? 'spanish' : lang === 'it' ? 'italian' : lang === 'pt' ? 'portuguese' : lang === 'pl' ? 'polish' : lang === 'tr' ? 'turkish' : lang === 'zh' ? 'chinese' : lang === 'ja' ? 'japanese' : lang === 'ko' ? 'korean' : lang === 'ar' ? 'arabic' : lang === 'hi' ? 'hindi' : 'other');
            }
        });

        // Получаем выбранные фильтры Trial Calls
        const selectedTrialFilters = [];
        const trialFilterCheckboxes = ['trialCallsLess0', 'trialCallsLess5', 'trialCallsMid', 'trialCallsGreater20', 'trialCallsEquals20'];
        trialFilterCheckboxes.forEach(filterId => {
            const checkbox = document.getElementById(filterId);
            if (checkbox && checkbox.checked) {
                selectedTrialFilters.push(filterId.replace('trialCalls', '').toLowerCase());
            }
        });

        // Получаем выбранные фильтры по дате
        const selectedDateFilters = [];
        const dateFilterCheckboxes = ['dateToday', 'dateWeek', 'dateMonth', 'dateQuarter', 'dateYear', 'dateOld'];
        dateFilterCheckboxes.forEach(filterId => {
            const checkbox = document.getElementById(filterId);
            if (checkbox && checkbox.checked) {
                selectedDateFilters.push(filterId.replace('date', '').toLowerCase());
            }
        });

        console.log('🔍 Applying filters:', {
            searchFilter,
            selectedStatuses,
            selectedLanguages,
            totalUsersInDB: this.parent.usersData.length
        });

        this.parent.filteredUsers = this.parent.usersData.filter(user => {
            // ТЕКСТОВЫЙ ПОИСК - УЛУЧШЕННАЯ ВЕРСИЯ
            if (searchFilter && searchFilter.trim()) {
                const query = searchFilter.trim().toLowerCase();

                // Собираем все текстовые поля пользователя для поиска
                const searchableFields = [
                    String(user.user_id || ''),
                    String(user.username || ''),
                    String(user.first_name || ''),
                    String(user.last_name || ''),
                    String(user.tag || ''),
                    String(user.status || ''),
                    String(user.language || ''),
                    String(user.email || ''),
                    String(user.phone || ''),
                    String(user.premium || ''),
                    String(user.traffic_from || ''),
                    String(user.trial_calls || ''),
                    // Преобразуем объект пользователя в строку всех значений для полнотекстового поиска
                    Object.values(user).filter(val => val !== null && val !== undefined).join(' ')
                ];

                const searchableText = searchableFields.join(' ').toLowerCase();

                // Используем более надежное сравнение - проверяем содержит ли текст запрос
                const matches = searchableText.includes(query);



                if (!matches) {
                    return false;
                }
            }

            // ФИЛЬТР ПО СТАТУСУ - если выбраны статусы, проверяем соответствие
            if (selectedStatuses.length > 0) {
                const userStatus = (user.status || 'unknown').toLowerCase();
                let statusMatches = false;

                for (const selectedStatus of selectedStatuses) {
                    if (selectedStatus === 'trial' && (userStatus.includes('trial') || userStatus === 'unknown')) {
                        statusMatches = true;
                        break;
                    }
                    if (selectedStatus === 'newsub' && userStatus.includes('new')) {
                        statusMatches = true;
                        break;
                    }
                    if (selectedStatus === 'canceled' && userStatus.includes('cancel')) {
                        statusMatches = true;
                        break;
                    }
                    if (selectedStatus === 'kicked' && userStatus.includes('kick')) {
                        statusMatches = true;
                        break;
                    }
                }

                if (!statusMatches) {
                    return false;
                }
            }

            // ФИЛЬТР ПО ЯЗЫКУ - если выбраны языки, проверяем соответствие
            if (selectedLanguages.length > 0) {
                const userLang = (user.language || '').toLowerCase();
                let langMatches = false;

                for (const selectedLang of selectedLanguages) {
                    if (selectedLang === 'other' && (!userLang || userLang === '')) {
                        langMatches = true;
                        break;
                    }
                    if (userLang.includes(selectedLang.substring(0, 2))) {
                        langMatches = true;
                        break;
                    }
                    if (selectedLang === userLang || userLang.startsWith(selectedLang.substring(0, 2))) {
                        langMatches = true;
                        break;
                    }
                }

                if (!langMatches) {
                    return false;
                }
            }

            // ФИЛЬТР ПО TRIAL CALLS - если выбраны фильтры, проверяем численное значение
            if (selectedTrialFilters.length > 0) {
                // Проверяем различные возможные поля для trial calls
                const trialCallsFields = ['trial_img_gen_calls', 'triall img gen calls', 'trial_calls', 'trial_img_calls', 'img_gen_calls', 'trial', 'trial_gen_calls', 'img_calls', 'gen_calls'];
                let trialCallsValue = null;
                let foundField = '';
                let rawValue = '';

                for (const field of trialCallsFields) {
                    if (user[field] !== undefined && user[field] !== '' && user[field] !== null) {
                        rawValue = user[field];
                        const cleanValue = String(rawValue).trim().replace(/[^\d.-]/g, '');
                        const parsed = parseFloat(cleanValue);
                        if (!isNaN(parsed)) {
                            trialCallsValue = parsed;
                            foundField = field;
                            break;
                        }
                    }
                }

                // Логирование для отладки
                console.log(`🎨 Trial filter for user ${user.user_id}:`, {
                    field: foundField,
                    rawValue: rawValue,
                    parsedValue: trialCallsValue,
                    selectedFilters: selectedTrialFilters,
                    allFields: Object.keys(user).filter(k => k.includes('trial') || k.includes('img') || k.includes('gen') || k.includes('call')).slice(0, 5) // Показать потенциально релевантные поля
                });

                if (!foundField || trialCallsValue === null) {
                    // Если фильтр выбран, но поле не найдено - исключаем пользователя
                    console.warn(`❌ Trial calls field not found for user ${user.user_id}. Available trial-related fields:`,
                        Object.keys(user).filter(k => k.toLowerCase().includes('trial') || k.toLowerCase().includes('img') || k.toLowerCase().includes('gen') || k.toLowerCase().includes('call'))
                    );
                    return false;
                }

                let trialMatches = false;

                for (const filter of selectedTrialFilters) {
                    if (filter === 'less0' && trialCallsValue < 0) {
                        trialMatches = true;
                        console.log(`✅ User ${user.user_id} matches filter 'less0': ${trialCallsValue} < 0`);
                        break;
                    }
                    if (filter === 'less5' && trialCallsValue < 5) {
                        trialMatches = true;
                        console.log(`✅ User ${user.user_id} matches filter 'less5': ${trialCallsValue} < 5`);
                        break;
                    }
                    if (filter === 'mid' && trialCallsValue > 0 && trialCallsValue < 19.9) {
                        trialMatches = true;
                        console.log(`✅ User ${user.user_id} matches filter 'mid': 0 < ${trialCallsValue} < 19.9`);
                        break;
                    }
                    if (filter === 'greater20' && trialCallsValue > 20.1) {
                        trialMatches = true;
                        console.log(`✅ User ${user.user_id} matches filter 'greater20': ${trialCallsValue} > 20.1`);
                        break;
                    }
                    if (filter === 'equals20' && Math.abs(trialCallsValue - 20) < 0.01) {
                        trialMatches = true;
                        console.log(`✅ User ${user.user_id} matches filter 'equals20': ${trialCallsValue} ≈ 20`);
                        break;
                    }
                }

                if (trialMatches) {
                    console.log(`🎯 User ${user.user_id} PASSED trial calls filter (value: ${trialCallsValue}, filters: ${selectedTrialFilters.join(', ')})`);
                } else {
                    console.log(`❌ User ${user.user_id} FAILED trial calls filter (value: ${trialCallsValue}, filters: ${selectedTrialFilters.join(', ')})`);
                    return false;
                }
            }

            // ФИЛЬТР ПО ДАТЕ ДОБАВЛЕНИЯ - если выбраны фильтры, проверяем дату
            if (selectedDateFilters.length > 0) {
                // Ищем дату в возможных полях
                const dateFields = ['date_added', 'created_at', 'registration_date', 'join_date', 'added_date', 'first_seen', 'date', 'created', 'timestamp', 'time'];
                let userDateStr = '';
                let foundDateField = '';

                for (const field of dateFields) {
                    if (user[field] && user[field].toString().trim() !== '') {
                        userDateStr = user[field].toString().trim();
                        foundDateField = field;
                        break;
                    }
                }

                // Если дата не найдена, исключаем пользователя из фильтра
                if (!userDateStr) {
                    console.warn('Date field not found for user:', user.user_id, 'Available fields:', Object.keys(user));
                    return false;
                }

                const userDate = this.parseDate(userDateStr);
                if (!userDate) {
                    console.warn('Date parsing failed for user:', user.user_id, 'Field:', foundDateField, 'Value:', userDateStr);
                    return false;
                }

                const now = new Date();
                const diffTime = now.getTime() - userDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                // Для отладки: логируем даты
                console.log(`User ${user.user_id}: date field "${foundDateField}", value "${userDateStr}", parsed ${userDate.toISOString()}, diff ${diffDays} days`);

                let dateMatches = false;

                for (const filter of selectedDateFilters) {
                    if (filter === 'today' && diffDays === 0) {
                        dateMatches = true;
                        break;
                    }
                    if (filter === 'week' && diffDays >= 0 && diffDays <= 7) {
                        dateMatches = true;
                        break;
                    }
                    if (filter === 'month' && diffDays >= 0 && diffDays <= 30) {
                        dateMatches = true;
                        break;
                    }
                    if (filter === 'quarter' && diffDays >= 0 && diffDays <= 90) {
                        dateMatches = true;
                        break;
                    }
                    if (filter === 'year' && diffDays >= 0 && diffDays <= 365) {
                        dateMatches = true;
                        break;
                    }
                    if (filter === 'old' && diffDays > 365) {
                        dateMatches = true;
                        break;
                    }
                }

                if (!dateMatches) {
                    return false;
                }
            }

            return true;
        });

        console.log('🔍 Filtered users:', this.parent.filteredUsers.length, 'of', this.parent.usersData.length);

        // ОБНОВЛЯЕМ ЭЛЕМЕНТЫ
        this.renderUsersTable();
        this.updateUsersCount();

        // ЛОГ ФИЛЬТРАЦИИ
        const filterSummary = [];
        if (searchFilter) filterSummary.push(`поиск: "${searchFilter}"`);
        if (selectedStatuses.length > 0) filterSummary.push(`статусы: ${selectedStatuses.join(', ')}`);
        if (selectedLanguages.length > 0) filterSummary.push(`языки: ${selectedLanguages.join(', ')}`);

        this.parent.addToLog(`Фильтр применен${filterSummary.length > 0 ? ' (' + filterSummary.join(', ') + ')' : ''} - найдено ${this.parent.filteredUsers.length} пользователей`);
    }

    /**
     * РЕНДЕР ТАБЛИЦЫ ПОЛЬЗОВАТЕЛЕЙ
     */
    renderUsersTable() {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        console.log(`📋 RENDERING TABLE: ${this.parent.filteredUsers.length} users`);

        if (this.parent.filteredUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 40px; color: #6c757d;">
                        👥 Пользователи не найдены. Попробуйте изменить фильтры или очистить поиск.
                    </td>
                </tr>
            `;
            this.updateUsersCount();
            return;
        }

        // Генерируем строки таблицы (все отфильтрованные пользователи)
        const rows = this.parent.filteredUsers.map(user => {
            const isSelected = this.parent.selectedUsers.has(user.user_id);
            const checkboxChecked = isSelected ? 'checked' : '';

            return `
                <tr data-user-id="${user.user_id}" class="user-row">
                    <td style="text-align: center;">
                        <input type="checkbox" class="user-checkbox" ${checkboxChecked} data-user-id="${user.user_id}">
                    </td>
                    <td>
                        <code style="background:#f8f9fa;color:#000;padding:1px 4px;border-radius:2px;font-size:11px;user-select:none;">${user.user_id}</code>
                    </td>
                    <td style="color: #000;">${this.parent.messaging.getFirstNameDisplay(user)}</td>
                    <td style="color: #000;">${this.parent.messaging.getLastNameDisplay(user)}</td>
                    <td style="color: #2563eb;">
                        ${user.username ? `<a href="https://t.me/${user.username}" target="_blank">@${user.username}</a>` : '—'}
                    </td>
                    <td>
                        <span class="status-pill" style="color: #000 !important;">
                            ${user.status || 'unknown'}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold;">
                            ${user.language || '—'}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <strong style="color: #dc3545; background: #f8d7da; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: bold;">${user.premium ? 'PREMIUM' : 'STANDARD'}</strong>
                    </td>
                    <td style="text-align: center;">
                        <strong style="color: #28a745; background: #d4edda; padding: 2px 6px; border-radius: 4px; display: inline-block;">${user.traffic_from || '—'}</strong>
                    </td>
                    <td style="text-align: center;">
                        <span style="background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; border: 2px solid #ff9900;">
                            <strong>${user.trial_calls || user.trial_img_gen_calls || 0}</strong>
                        </span>
                    </td>
                    <td style="text-align: center;">
                        ${user.tag || ''}
                    </td>
                    <td style="text-align: center;">
                        <button onclick="showUserMessageHistory('${user.user_id}')" style="font-size: 11px; padding: 2px 4px; border: 1px solid #6c757d; border-radius: 3px; cursor: pointer; background: #f8f9fa; margin-right: 5px;">📄 История</button>
                        <span style="color: #666; font-size: 11px; display: block; margin-top: 2px;">
                            ${this.parent.messaging.getLastSentDisplay(user).replace(/<[^>]*>/g, '').trim()}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows;

        // Настраиваем чекбоксы после рендера
        this.setupUserCheckboxes();

        this.updateUsersCount();
        console.log('✅ Users table rendered successfully');
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ЧЕКБОКСОВ ПОЛЬЗОВАТЕЛЕЙ
     */
    setupUserCheckboxes() {
        // Мастер-чекбокс
        const masterCheckbox = document.getElementById('masterUserCheckbox');
        if (masterCheckbox) {
            masterCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                this.toggleAllUsersSelection(isChecked);
            });
        }

        // Отдельные чекбоксы
        document.querySelectorAll('.user-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const userId = e.target.dataset.userId;
                const isChecked = e.target.checked;

                if (isChecked) {
                    this.parent.selectedUsers.add(userId);
                } else {
                    this.parent.selectedUsers.delete(userId);
                }

                this.updateSelectedCount();
            });
        });
    }

    /**
     * ОБНОВЛЕНИЕ СЧЕТЧИКА ПОЛЬЗОВАТЕЛЕЙ
     */
    updateUsersCount() {
        const usersCountElements = [
            document.querySelector('#usersCount span'),
            document.getElementById('usersCountBadge')
        ];

        usersCountElements.forEach(el => {
            if (el) {
                if (el.id === 'usersCountBadge') {
                    el.textContent = `👥 ${this.parent.filteredUsers.length} пользователей`;
                } else {
                    el.textContent = `Пользователей: ${this.parent.filteredUsers.length}`;
                }
            }
        });

        const selectedElements = [
            document.getElementById('usersSelectedInfo'),
            document.getElementById('usersSelectedBadge')
        ];

        selectedElements.forEach(el => {
            if (el) {
                if (el.id === 'usersSelectedBadge') {
                    el.textContent = `✅ Выбрано: ${this.parent.selectedUsers.size}`;
                } else {
                    el.textContent = `Выбрано: ${this.parent.selectedUsers.size}`;
                }
            }
        });

        // ОБНОВЛЯЕМ ТАКЖЕ ПЛАВАЮЩИЕ СЧЕТЧИКИ
        if (this.parent.updateFloatingCounters) {
            this.parent.updateFloatingCounters();
        }
    }

    /**
     * Обновление счетчика выбранных пользователей
     */
    updateSelectedCount() {
        const selectedInfoEl = document.getElementById('usersSelectedInfo');
        if (selectedInfoEl) {
            selectedInfoEl.textContent = `Выбрано: ${this.parent.selectedUsers.size}`;
        }

        if (this.parent.selectedUsers.size > 0) {
            this.parent.addToLog(`Выбрано пользователей: ${this.parent.selectedUsers.size}`);
        }
    }

    /**
     * ОБЪЕДИНЕНИЕ ВЫБОРА ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
     */
    toggleAllUsersSelection(select = true) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        const masterCheckbox = document.getElementById('masterUserCheckbox');

        if (select) {
            this.parent.selectedUsers.clear();
            checkboxes.forEach(cb => {
                this.parent.selectedUsers.add(cb.dataset.userId);
                cb.checked = true;
            });
        } else {
            this.parent.selectedUsers.clear();
            checkboxes.forEach(cb => {
                cb.checked = false;
            });
        }

        // Обновляем мастер-чекбокс
        if (masterCheckbox) {
            masterCheckbox.checked = select;
        }

        this.updateSelectedCount();
        this.parent.addToLog(select ? 'Выбраны все пользователи' : 'Снята выборка всех пользователей');
    }

    /**
     * СОРТИРОВКА ПОЛЬЗОВАТЕЛЕЙ ПО ПОЛЮ
     */
    sortUsersBy(field) {
        if (!this.parent.currentSort || this.parent.currentSort.field !== field) {
            this.parent.currentSort = { field, direction: 'asc' };
        } else if (this.parent.currentSort.direction === 'asc') {
            this.parent.currentSort.direction = 'desc';
        } else {
            this.parent.currentSort = null;
        }

        // Обновляем индикаторы сортировки
        this.updateSortIndicators();

        // Перерендериваем таблицу
        this.renderUsersTable();

        console.log('🔄 Sort users by:', field, this.parent.currentSort?.direction);
        this.parent.addToLog(`Сортировка по: ${field} ${this.parent.currentSort?.direction || 'сброшена'}`);
    }

    /**
     * ОБНОВЛЕНИЕ ИНДИКАТОРОВ СОРТИРОВКИ
     */
    updateSortIndicators() {
        // Для упрощения убрал индикаторы сортировки
        console.log('🔄 Sort indicators updated');
    }

    /**
     * ПЕРЕЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ
     */
    async reloadUsersData() {
        try {
            await this.loadUsersData();
            this.parent.showStatus('Данные обновлены', 'success');
        } catch (error) {
            this.parent.showStatus('Не удалось обновить данные', 'error');
        }
    }

    /**
     * НАСТРОЙКА СОРТИРОВКИ ТАБЛИЦЫ
     */
    setupTableSorting() {
        console.log('🔧 Setting up table sorting...');

        // Обработчики для заголовков таблицы
        document.querySelectorAll('#usersTable th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (field) {
                    this.sortUsersBy(field);
                }
            });
        });

        console.log('✅ Table sorting setup completed');
    }

    /**
     * ОБРАБОТКА ИМПОРТА ПОЛЬЗОВАТЕЛЕЙ
     */
    handleImportUsers(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            alert('Выберите CSV файл!');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const importedUsers = this.parseCSV(csvText);

                this.parent.usersData = [...this.parent.usersData, ...importedUsers];
                this.applyFilters();

                this.parent.addToLog(`Импортировано ${importedUsers.length} пользователей`);
                alert(`Импортировано ${importedUsers.length} пользователей!`);

                // Сброс input
                event.target.value = '';
            } catch (error) {
                console.error('Ошибка импорта:', error);
                alert('Ошибка импорта: ' + error.message);
            }
        };

        reader.readAsText(file);
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ФИЛЬТРОВ
     */
    setupFilterEventListeners() {
        console.log('🔍 Setting up filter event listeners...');

        // Общие фильтры
        const filters = [
            'searchFilter', 'tagFilter', // Текстовые фильтры
            'statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked', 'invertStatus', // Статусы
            'languageEn', 'languageRu', 'languageDe', 'languageFr', 'languageEs', 'languageIt',
            'languagePt', 'languagePl', 'languageTr', 'languageZh', 'languageJa', 'languageKo',
            'languageAr', 'languageHi', 'languageOther', // Языки
            'trialCallsLess0', 'trialCallsLess5', 'trialCallsMid', 'trialCallsGreater20', 'trialCallsEquals20', // Trial Calls
            'dateToday', 'dateWeek', 'dateMonth', 'dateQuarter', 'dateYear', 'dateOld' // Дата фильтры
        ];

        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('input', () => {
                    this.applyFilters();
                    this.parent.addToLog(`Фильтр "${filterId}" изменен`);
                });

                element.addEventListener('change', () => {
                    this.applyFilters();
                    this.parent.addToLog(`Фильтр "${filterId}" изменен`);
                });
            }
        });

        // Кнопки управления фильтрами
        const filterButtons = ['resetFilters', 'selectAllStatuses', 'checkDataFields'];
        filterButtons.forEach(btnId => {
            const button = document.getElementById(btnId);
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();

                    if (btnId === 'resetFilters') {
                        this.resetFilters();
                    } else if (btnId === 'selectAllStatuses') {
                        this.selectAllStatuses();
                    } else if (btnId === 'checkDataFields') {
                        this.getDataFieldInfo();
                    }
                });
            }
        });

        // Делаем функцию доступной глобально
        window.checkDataFieldInfo = () => {
            if (this.parent && this.parent.users && this.parent.users.getDataFieldInfo) {
                this.parent.users.getDataFieldInfo();
            }
        };

        console.log('✅ Filter event listeners setup completed');
    }

    /**
     * СБРОС ВСЕХ ФИЛЬТРОВ
     */
    resetFilters() {
        // Сброс текстовых фильтров
        const textFilters = ['searchFilter', 'tagFilter'];
        textFilters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        // Сброс чекбоксов статусов
        const statusCheckboxes = ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked', 'invertStatus'];
        statusCheckboxes.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = false;
            }
        });

        // Сброс чекбоксов языков
        const languageCheckboxes = ['languageEn', 'languageRu', 'languageDe', 'languageFr', 'languageEs', 'languageIt', 'languagePt', 'languagePl', 'languageTr', 'languageZh', 'languageJa', 'languageKo', 'languageAr', 'languageHi', 'languageOther'];
        languageCheckboxes.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = false;
            }
        });

        // Сброс чекбоксов фильтров Trial Calls
        const trialCallsCheckboxes = ['trialCallsLess0', 'trialCallsLess5', 'trialCallsMid', 'trialCallsGreater20', 'trialCallsEquals20'];
        trialCallsCheckboxes.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = false;
            }
        });

        // Сброс чекбоксов фильтров по дате
        const dateCheckboxes = ['dateToday', 'dateWeek', 'dateMonth', 'dateQuarter', 'dateYear', 'dateOld'];
        dateCheckboxes.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = false;
            }
        });

        this.applyFilters();
        this.parent.addToLog('Все фильтры сброшены');
        alert('Все фильтры сброшены!');
    }

    /**
     * ВЫБОР ВСЕХ СТАТУСОВ
     */
    selectAllStatuses() {
        const statusCheckboxes = ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked'];
        const isCurrentlyAllSelected = statusCheckboxes.every(id => {
            const element = document.getElementById(id);
            return element && element.checked;
        });

        statusCheckboxes.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = !isCurrentlyAllSelected;
            }
        });

        this.applyFilters();
        this.parent.addToLog(`${isCurrentlyAllSelected ? 'Снята' : 'Установлена'} выборка всех статусов`);
    }

    /**
     * ПАРСИНГ ДАТЫ ИЗ РАЗЛИЧНЫХ ФОРМАТОВ
     */
    parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            return null;
        }

        const trimmed = dateStr.trim();

        // Проверка на пустую строку
        if (!trimmed) {
            return null;
        }

        try {
            // Попытка 1: Стандартный ISO формат (YYYY-MM-DDTHH:mm:ss.sssZ или YYYY-MM-DDTHH:mm:ss)
            if (trimmed.includes('T') || (trimmed.match(/\d{4}-\d{2}-\d{2}/) && (trimmed.includes(':') || trimmed.endsWith('Z')))) {
                const date = new Date(trimmed);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }

            // Попытка 2: Формы вроде DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, YYYY/MM/DD
            const datePatterns = [
                /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, // DD/MM/YYYY или DD-MM-YYYY
                /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // YYYY/MM/DD
                /^(\d{1,2})[\/\-](\d{4})[\/\-](\d{1,2})$/, // MM/YYYY/DD (редко)
            ];

            for (const pattern of datePatterns) {
                const match = trimmed.match(pattern);
                if (match) {
                    const [full, part1, part2, part3] = match;

                    // Определяем порядок: DD/MM/YYYY или MM/DD/YYYY или YYYY/MM/DD
                    if (part1 > 31 && part1 <= 9999) {
                        // Первый компонент - год (YYYY/MM/DD или YYYY-MM-DD)
                        return new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
                    } else if (part2 > 12) {
                        // Второй компонент > 12, значит первый - день, второй - год (неправильный формат)
                        continue;
                    } else if (part1 > 12) {
                        // Первый компонент > 12, значит это день, формат DD/MM/YYYY
                        return new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
                    } else {
                        // Первый компонент <= 12, пробуем MM/DD/YYYY сначала, потом DD/MM/YYYY
                        const asMDY = new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2));
                        const asDMY = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));

                        // Простая эвристика: если месяц выглядит правдоподобно для MM/DD/YYYY, используем его
                        if (parseInt(part1) <= 12 && parseInt(part2) <= 31) {
                            return asDMY; // Предпочитаем формат, часто используемый в Европе/Азии
                        }
                        return asMDY;
                    }
                }
            }

            // Попытка 3: Только дата без времени (YYYY-MM-DD или DD-MM-YYYY)
            if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = trimmed.split('-').map(n => parseInt(n, 10));
                if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    return new Date(year, month - 1, day);
                }
            }

            // Попытка 4: Формат YYYYMMDD (без разделителей)
            if (trimmed.match(/^\d{8}$/) && trimmed.length === 8) {
                const year = parseInt(trimmed.substring(0, 4), 10);
                const month = parseInt(trimmed.substring(4, 6), 10);
                const day = parseInt(trimmed.substring(6, 8), 10);
                if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    return new Date(year, month - 1, day);
                }
            }

            // Попытка 5: Unix timestamp (числовая строка)
            if (trimmed.match(/^\d+$/) && trimmed.length >= 10) {
                const timestamp = parseInt(trimmed, 10);
                // Если timestamp кажется секундным (секунды с 1970), конвертируем в миллисекунды
                const date = new Date(timestamp < 1e10 ? timestamp * 1000 : timestamp);
                if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
                    return date;
                }
            }

            // Ничего не подошло
            return null;

        } catch (error) {
            console.warn('Failed to parse date:', trimmed, error);
            return null;
        }
    }

    /**
     * ДИАГНОСТИКА СТРУКТУРЫ ПОЛЕЙ ДАННЫХ
     */
    getDataFieldInfo() {
        const fieldStats = {};

        if (!this.parent.usersData || this.parent.usersData.length === 0) {
            alert('❌ Нет загруженных данных пользователей');
            return;
        }

        // Анализируем первые 5 пользователей для получения статистики
        const sampleUsers = this.parent.usersData.slice(0, 5);

        sampleUsers.forEach(user => {
            Object.keys(user).forEach(field => {
                if (!fieldStats[field]) {
                    fieldStats[field] = {
                        count: 0,
                        hasValue: 0,
                        sampleValues: []
                    };
                }

                fieldStats[field].count++;

                const value = user[field];
                if (value !== undefined && value !== '' && value !== null) {
                    fieldStats[field].hasValue++;

                    // Собираем до 3 уникальных значений для примера
                    if (fieldStats[field].sampleValues.length < 3 &&
                        !fieldStats[field].sampleValues.includes(String(value))) {
                        fieldStats[field].sampleValues.push(String(value));
                    }
                }
            });
        });

        // Форматируем отчет
        let report = `📊 АНАЛИЗ ПОЛЕЙ ДАННЫХ (${sampleUsers.length} пользователей)\n\n`;
        report += 'Найденные поля и их заполненность:\n\n';

        Object.keys(fieldStats).sort().forEach(field => {
            const stat = fieldStats[field];
            const fillRate = Math.round((stat.hasValue / stat.count) * 100);
            report += `📍 ${field}\n`;
            report += `   Заполнено: ${stat.hasValue}/${stat.count} (${fillRate}%)\n`;

            if (stat.sampleValues.length > 0) {
                report += `   Примеры: ${stat.sampleValues.slice(0, 3).join(', ')}\n`;
            }
            report += '\n';
        });

        // Специальные рекомендации
        report += '🔍 РЕКОМЕНДАЦИИ ДЛЯ ФИЛЬТРОВ:\n\n';

        // Для Trial Calls
        const trialCallFields = ['trial_img_gen_calls', 'triall img gen calls', 'trial_calls', 'trial_img_calls', 'img_gen_calls', 'trial'];
        const availableTrialFields = trialCallFields.filter(field => fieldStats[field]);

        if (availableTrialFields.length > 0) {
            report += `🎨 Trial Calls: Используются поля: ${availableTrialFields.join(', ')}\n`;
        } else {
            report += `🎨 Trial Calls: Поле не найдено! Возможные поля: ${trialCallFields.join(', ')}\n`;
        }

        // Для дат
        const dateFields = ['date_added', 'created_at', 'registration_date', 'join_date', 'added_date', 'first_seen', 'date', 'created', 'timestamp', 'time'];
        const availableDateFields = dateFields.filter(field => fieldStats[field]);

        if (availableDateFields.length > 0) {
            report += `📅 Дата фильтры: Используются поля: ${availableDateFields.join(', ')}\n`;
        } else {
            report += `📅 Дата фильтры: Поле не найдено! Возможные поля: ${dateFields.join(', ')}\n`;
        }

        // Выводим результаты
        console.log(report);
        alert(report);

        // Также добавляем в лог приложения
        this.parent.addToLog('🛠️ Создана диагностика полей данных (см. консоль)');
    }



    /**
     * ПРОВЕРКА НАЛИЧИЯ НАСТРОЕННЫХ БОТА И ТАБЛИЦЫ
     */
    hasBotAndSheetConfigured() {
        try {
            // Проверяем наличие storage модуля
            if (!this.parent.storage) {
                console.log('❌ hasBotAndSheetConfigured: Storage not initialized');
                return false;
            }

            // Проверяем наличие бота в storage
            const botsDataStr = localStorage.getItem('telegram_sender_bots');
            const botsData = botsDataStr ? JSON.parse(botsDataStr) : [];

            const currentBotIdStr = localStorage.getItem('telegram_sender_current_bot');
            const currentBotId = currentBotIdStr ? currentBotIdStr : null;

            // Проверяем наличие таблицы
            const sheetsDataStr = localStorage.getItem('telegram_sender_sheets');
            const sheetsData = sheetsDataStr ? JSON.parse(sheetsDataStr) : [];

            const currentSheetIdStr = localStorage.getItem('telegram_sender_current_sheet');
            const currentSheetId = currentSheetIdStr ? currentSheetIdStr : null;

            // Более детальная диагностика
            console.log('🔍 DETAILED localStorage check:');
            console.log('   Raw bots data:', botsDataStr ? botsDataStr.substring(0, 100) + '...' : 'null');
            console.log('   Parsed bots data:', botsData);
            console.log('   Current bot ID:', currentBotId);

            console.log('   Raw sheets data:', sheetsDataStr ? sheetsDataStr.substring(0, 100) + '...' : 'null');
            console.log('   Parsed sheets data:', sheetsData);
            console.log('   Current sheet ID:', currentSheetId);

            const hasBot = botsData && botsData.length > 0 && currentBotId;
            const hasSheet = sheetsData && sheetsData.length > 0 && currentSheetId;

            console.log('🔍 Bot and sheet configuration result:', {
                botsCount: botsData?.length || 0,
                hasBot: hasBot,
                hasCurrentBotId: !!currentBotId,
                sheetsCount: sheetsData?.length || 0,
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



    /**
     * ПОЛУЧЕНИЕ СПИСКА ВЫБРАННЫХ ПОЛЬЗОВАТЕЛЕЙ
     */
    getSelectedUsers() {
        const selectedUsers = [];
        for (const userId of this.parent.selectedUsers) {
            // Находим пользователя по ID среди отфильтрованных данных
            const user = this.parent.filteredUsers.find(u => u.user_id == userId);
            if (user) {
                selectedUsers.push(user);
            }
        }
        return selectedUsers;
    }
}
