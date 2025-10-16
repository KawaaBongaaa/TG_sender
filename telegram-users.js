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

        if (!config || !config.SHEET_ID) {
            throw new Error('CONFIG.SHEET_ID не настроен! Заполните config.js');
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

        console.log('🔍 Applying filters:', {
            searchFilter,
            selectedStatuses,
            selectedLanguages,
            totalUsersInDB: this.parent.usersData.length
        });

        this.parent.filteredUsers = this.parent.usersData.filter(user => {
            // ТЕКСТОВЫЙ ПОИСК
            if (searchFilter) {
                const searchText = [
                    user.user_id,
                    user.username || '',
                    user.first_name || '',
                    user.last_name || '',
                    user.tag || '',
                    user.status || ''
                ].join(' ').toLowerCase();

                if (!searchText.includes(searchFilter)) {
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
                        <strong style="color: #dc3545; background: #f8d7da; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: bold;">${getPremiumDisplay(user)}</strong>
                    </td>
                    <td style="text-align: center;">
                        <strong style="color: #28a745; background: #d4edda; padding: 2px 6px; border-radius: 4px; display: inline-block;">${getTrafficSourceDisplay(user)}</strong>
                    </td>
                    <td style="text-align: center;">
                        <span style="background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; border: 2px solid #ff9900;">
                            <strong>${getTrialCallsDisplay(user)}</strong>
                        </span>
                    </td>
                    <td style="text-align: center;">
                        ${getTagDisplay(user)}
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
            'languageAr', 'languageHi', 'languageOther' // Языки
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
        const filterButtons = ['resetFilters', 'selectAllStatuses'];
        filterButtons.forEach(btnId => {
            const button = document.getElementById(btnId);
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();

                    if (btnId === 'resetFilters') {
                        this.resetFilters();
                    } else if (btnId === 'selectAllStatuses') {
                        this.selectAllStatuses();
                    }
                });
            }
        });

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
