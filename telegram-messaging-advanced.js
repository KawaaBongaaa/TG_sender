/* =========================================== */
/* ОБЕДИНЕННЫЙ МОДУЛЬ СООБЩЕНИЙ, ШАБЛОНОВ И ПЛАНИРОВЩИКА */
/* Telegram Messaging Advanced Module */
/* =========================================== */

class TelegramMessagingAdvanced {
    constructor(mainApp) {
        this.mainApp = mainApp;

        // ПЛАНИРОВЩИК
        this.sendSchedule = null;
        this.messageTimeout = 1111; // Таймаут между сообщениями в мс (по умолчанию 1 сек)
        this.isSchedulerInitialized = false;

        // ОСНОВНЫЕ СВОЙСТВА РАССЫЛОК
        this.isSending = false;
        this.sendProgress = 0;
        this.sendResults = [];

        // МЕДИА ФАЙЛЫ
        this.mediaFile = null;
        this.mediaType = 'auto';

        // ШАБЛОНЫ ССЫЛОК
        this.linkTemplates = [];

        // ШАБЛОНЫ РАССЫЛОК
        this.broadcastTemplates = []; // Шаблоны рассылок с настройками повторов

        // АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ ССЫЛОК
        this.linkAutoSave = true;

        // ИСТОРИЯ ОТПРАВОК ПО РАССЫЛКАМ
        this.broadcastHistory = {};

        console.log('📨🔄⏰ TelegramMessagingAdvanced module created');
    }

    /**
     * ЗАГРУЗКА ШАБЛОНОВ РАССЫЛОК ИЗ LOCALSTORAGE
     */
    loadBroadcastTemplates() {
        try {
            const data = localStorage.getItem('telegram_sender_broadcast_templates');
            this.broadcastTemplates = data ? JSON.parse(data) : [];
            console.log('📢 Loaded broadcast templates:', this.broadcastTemplates.length);
        } catch (error) {
            console.warn('❌ Failed to load broadcast templates:', error);
            this.broadcastTemplates = [];
        }
    }

    /**
     * СОХРАНЕНИЕ ШАБЛОНОВ РАССЫЛОК В LOCALSTORAGE
     */
    saveBroadcastTemplates() {
        try {
            localStorage.setItem('telegram_sender_broadcast_templates', JSON.stringify(this.broadcastTemplates));
            console.log('💾 Broadcast templates saved');
        } catch (error) {
            console.error('❌ Failed to save broadcast templates:', error);
        }
    }

    /**
     * ПОЛУЧИТЬ ШАБЛОН РАССЫЛКИ ПО НАЗВАНИЮ
     */
    getBroadcastTemplateByName(name) {
        if (!name) return null;
        return this.broadcastTemplates.find(t => t.name.toLowerCase() === name.toLowerCase()) || null;
    }

    /**
     * ДОБАВИТЬ ШАБЛОН РАССЫЛКИ
     */
    addBroadcastTemplate(name, maxRepeats, minDaysBetween, description = '') {
        if (!name) {
            console.error('❌ Broadcast template name required');
            return null;
        }

        // Проверяем, существует ли шаблон с таким названием
        if (this.getBroadcastTemplateByName(name)) {
            console.error(`❌ Broadcast template "${name}" already exists`);
            return null;
        }

        const template = {
            id: 'broadcast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            maxRepeats: parseInt(maxRepeats) || 1,
            minDaysBetween: parseInt(minDaysBetween) || 0,
            description: description.trim(),
            // Сохраняем текущее сообщение и кнопки для полного восстановления
            message: document.getElementById('messageInput')?.value || '',
            buttons: this.mainApp.modules?.buttons?.messageButtons || [],
            created: new Date().toISOString()
        };

        this.broadcastTemplates.push(template);
        this.saveBroadcastTemplates();
        this.renderBroadcastTemplatesDropdown();

        console.log('📢 Added broadcast template:', template.name);
        this.mainApp.addToLog(`Шаблон рассылки "${template.name}" добавлен`);

        return template;
    }

    /**
     * ОТМЕНИТЬ ЗАПЛАНИРОВАННУЮ РАССЫЛКУ
     */
    cancelScheduledBroadcast() {
        // Очищаем таймер если есть
        if (this.sendSchedule.timerId) {
            clearTimeout(this.sendSchedule.timerId);
            this.sendSchedule.timerId = null;
        }

        this.sendSchedule = null;

        // Удаляем из localStorage
        localStorage.removeItem('telegram_sender_scheduled_broadcast');

        this.mainApp.addToLog('Запланированная рассылка отменена');
        alert('Запланированная рассылка отменена!');
    }

    /**
     * ВЫПОЛНИТЬ ЗАПЛАНИРОВАННУЮ РАССЫЛКУ
     */
    async executeScheduledBroadcast() {
        console.log('⏰ Executing scheduled broadcast...');

        if (!this.sendSchedule) {
            console.warn('No scheduled broadcast found');
            return;
        }

        const schedule = this.sendSchedule;

        // Показываем уведомление о начале планируемой рассылки
        if (Notification.permission === 'granted') {
            new Notification('Запланированная рассылка', {
                body: `Начинается отправка ${schedule.selectedUsers.length} сообщения(ий)`,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAyQzEzLjEwNDYgMiAxNCAyLjk4OTU1IDE0IDRDMTQgNS4xMDQ2IDEzLjEwNDYgNiAxMiA2QzEwLjg5NTQgNiAxMCA1LjEwNDYgMTAgNEMxMCAyLjk4OTU1IDEwLjg5NTQgMiAxMiAyWk0yMSAxOVYyMEgzVjE5SDE3VjE2SjE5IDE4VjE2SDE5VjE4Wk04IDE2SDhWMThIOFYxNloiIGZpbGw9IiMxOTc2RDIiLz4KPHBhdGggZD0iTTkgMkQ5IDIuNUQ5LjQgM0E5IDkgMCAwMTkgNUMxOS44IDEwLjEwNDYgMjAuNyAxMSA5IDExQzEwLjEwNDYgMTEgOSAxMC4xMDQ2IDkgOUM5IDYuODk1NCA5Ljg5NTQgNiAxMSA2QzEyLjEwNDYgNiAxOSA4Ljk4OTU1IDE5IDlDMTkgMTEuMTI5IDE1LjUyIDIxIDkgMjFaIiBmaWxsPSIjMTk3NkQyIi8+Cjwvc3ZnPgo='
            });
        }

        this.mainApp.addToLog(`🚀 Начинается выполнение запланированной рассылки`);

        // Фильтруем пользователей по выбранным ID
        const selectedUsers = this.mainApp.usersData.filter(user =>
            schedule.selectedUsers.includes(user.user_id)
        );

        if (selectedUsers.length === 0) {
            this.mainApp.addToLog('❌ Нет пользователей для запланированной рассылки');
            return;
        }

        // Устанавливаем сообщение в input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = schedule.message;
        }

        // Запускаем стандартный процесс рассылки
        await this.startBroadcastToUsers(selectedUsers, schedule.message, schedule.timeout);

        // Очищаем планировщик после выполнения
        this.cancelScheduledBroadcast();
    }

    /**
     * ПРОБЕРКА ЗАПЛАНИРОВАННЫХ РАССЫЛОК ПРИ ЗАПУСКЕ ПРИЛОЖЕНИЯ
     */
    checkScheduledBroadcasts() {
        try {
            const savedSchedule = localStorage.getItem('telegram_sender_scheduled_broadcast');
            if (!savedSchedule) return;

            const schedule = JSON.parse(savedSchedule);
            const now = Date.now();

            if (schedule.scheduledTime <= now) {
                // Время вышло - выполняем немедленно
                this.sendSchedule = schedule;

                // Небольшая задержка чтобы приложение успело загрузиться
                setTimeout(() => {
                    this.executeScheduledBroadcast();
                }, 2000);

                this.mainApp.addToLog('⏰ Найдена просроченная запланированная рассылка - выполняем');
            } else {
                // Время не вышло - восстанавливаем таймер
                this.sendSchedule = schedule;

                const timeUntilExecution = schedule.scheduledTime - now;
                this.sendSchedule.timerId = setTimeout(() => {
                    this.executeScheduledBroadcast();
                }, timeUntilExecution);

                this.mainApp.addToLog(`⏰ Восстановлена запланированная рассылка на ${new Date(schedule.scheduledTime).toLocaleString()}`);
            }
        } catch (error) {
            console.error('❌ Error checking scheduled broadcasts:', error);
            localStorage.removeItem('telegram_sender_scheduled_broadcast');
        }
    }

    /**
     * СОХРАНЕНИЕ ЗАПЛАНИРОВАННОЙ РАССЫЛКИ В LOCALSTORAGE
     */
    saveScheduledBroadcast() {
        if (!this.sendSchedule) return;

        try {
            localStorage.setItem('telegram_sender_scheduled_broadcast',
                JSON.stringify({
                    scheduledTime: this.sendSchedule.scheduledTime,
                    message: this.sendSchedule.message,
                    selectedUsers: this.sendSchedule.selectedUsers,
                    timeout: this.sendSchedule.timeout
                })
            );
        } catch (error) {
            console.error('❌ Error saving scheduled broadcast:', error);
        }
    }

    /* ===================== ОСНОВНЫЕ ФУНКЦИИ СОБЩЕНИЙ ===================== */

    /**
     * ЗАМЕНА ПЛЕЙСХОЛДЕРОВ В ТЕКСТЕ ДАННЫМИ ПОЛЬЗОВАТЕЛЯ
     */
    replacePlaceholders(text, user) {
        if (!text || !user) return text;

        return text
            .replace(/\{first_name\}/g, user.first_name || '')
            .replace(/\{last_name\}/g, user.last_name || '')
            .replace(/\{user_id\}/g, user.user_id || '')
            .replace(/\{username\}/g, user.username || '');
    }

    /**
     * ЗАМЕНА ПЛЕЙСХОЛДЕРОВ В КНОПКАХ
     */
    replacePlaceholdersInButtons(buttons, user) {
        if (!buttons || !Array.isArray(buttons)) return buttons;

        return buttons.map(row => {
            if (!Array.isArray(row)) return row;

            return row.map(button => {
                if (!button || typeof button !== 'object') return button;

                const processedButton = { ...button };

                // Заменяем плейсхолдеры в тексте кнопки
                if (processedButton.text) {
                    processedButton.text = this.replacePlaceholders(processedButton.text, user);
                }

                // Заменяем плейсхолдеры в URL (для url-кнопок)
                if (processedButton.url) {
                    processedButton.url = this.replacePlaceholders(processedButton.url, user);
                }

                // Заменяем плейсхолдеры в callback_data (для callback-кнопок)
                if (processedButton.callback_data) {
                    processedButton.callback_data = this.replacePlaceholders(processedButton.callback_data, user);
                }

                return processedButton;
            });
        });
    }

    /**
     * ПОЛУЧЕНИЕ ОТОБРАЖЕНИЯ ИМЕНИ
     */
    getFirstNameDisplay(user) {
        return user.first_name || user.username || user.user_id || '—';
    }

    /**
     * ПОЛУЧЕНИЕ ОТОБРАЖЕНИЯ ФАМИЛИИ
     */
    getLastNameDisplay(user) {
        return user.last_name || '—';
    }

    /**
     * ПОЛУЧЕНИЕ ОТОБРАЖЕНИЯ ПОСЛЕДНЕЙ ОТПРАВКИ
     */
    getLastSentDisplay(user) {
        const dateFields = ['last_sent', 'last_send', 'последняя отправка', 'sent_at', 'last_message'];
        for (const field of dateFields) {
            const value = user[field];
            if (value !== undefined && value !== null && value.toString().trim() !== '') {
                return value.toString().trim();
            }
        }
        return 'Никогда';
    }

    /**
     * ЗАПУСК МАССОВОЙ РАССЫЛКИ
     */
    async startMassBroadcast() {
        console.log('📢 Mass broadcast button clicked');

        if (this.isSending) {
            alert('Рассылка уже идет! Дождитесь завершения.');
            return;
        }

        const selectedUsers = this.getSelectedUsersForBroadcast();
        if (selectedUsers.length === 0) {
            alert('Выберите хотя бы одного пользователя!');
            return;
        }

        const message = document.getElementById('messageInput')?.value?.trim();
        if (!message && !this.hasMediaToSend()) {
            alert('Введите текст сообщения или выберите медиа файл!');
            return;
        }

        if (confirm(`Отправить сообщение ${selectedUsers.length} пользователям?`)) {
            await this.startBroadcastToUsers(selectedUsers, message, this.messageTimeout);
        }
    }

    /**
     * ОТМЕНА ТЕКУЩЕЙ РАССЫЛКИ
     */
    cancelCurrentBroadcast() {
        if (!this.isSending) return;

        this.isSending = false;
        this.sendProgress = 0;

        this.mainApp.showStatus('Рассылка отменена', 'error');
        this.mainApp.addToLog('❌ Рассылка отменена пользователем');

        console.log('❌ Broadcast cancelled');
    }

    /**
     * ПОЛУЧЕНИЕ ВЫБРАННЫХ ПОЛЬЗОВАТЕЛЕЙ ДЛЯ РАССЫЛКИ - УНИФИЦИРОВАННЫЙ МЕТОД
     */
    getSelectedUsersForBroadcast() {
        // Сначала проверяем, используем ли новый модуль пользователей
        const usersModule = this.mainApp.modules?.users;
        if (usersModule && window.TelegramUsersAdvanced && typeof usersModule.getSelectedUsersForMessaging === 'function') {
            console.log('📋 Using advanced users module for selection');

            try {
                // Используем новый модуль пользователей
                const advancedSelected = usersModule.getSelectedUsersForMessaging();
                console.log('📋 Advanced module selected users:', advancedSelected.length);

                return advancedSelected;
            } catch (error) {
                console.error('📋 Error getting advanced users, falling back:', error.message);
            }
        }

        // Fallback: используем старый способ
        console.log('📋 Using legacy user selection method');
        return this.mainApp.filteredUsers.filter(user =>
            this.mainApp.selectedUsers.has(user.user_id)
        );
    }

    /**
     * ЗАПУСК ПРОСТОЙ РАССЫЛКИ
     */
    async startSimpleBroadcast() {
        console.log('[MessagingAdvanced] 🧪 Starting simple broadcast test...');

        try {
            // Получаем выбранных пользователей
            const selectedUsers = this.getSelectedUsersForBroadcast();
            console.log('[MessagingAdvanced] ✅ Got selected users:', selectedUsers.length, selectedUsers);

            if (selectedUsers.length === 0) {
                alert('Выберите хотя бы одного пользователя!');
                return;
            }

            const message = document.getElementById('messageInput')?.value?.trim();
            console.log('[MessagingAdvanced] 📝 Message:', message ? `"${message.substring(0, 50)}..."` : 'NONE');

            if (!message && !this.hasMediaToSend()) {
                alert('Введите текст сообщения или выберите медиа файл!');
                return;
            }

            // Проверяем конфигурацию бота
            const config = window.CONFIG;
            console.log('[MessagingAdvanced] 🤖 Bot config:', {
                hasBotToken: !!config?.BOT_TOKEN,
                botTokenLength: config?.BOT_TOKEN?.length || 0,
                proxy: config?.PROXY_URL
            });

            if (!config?.BOT_TOKEN) {
                alert('❌ BOT_TOKEN не настроен! Выберите бота через меню управления ботами.');
                return;
            }

            this.mainApp.addToLog('🧪 Начинается тестовая отправка...');
            await this.startBroadcastToUsers(selectedUsers, message, this.messageTimeout);

        } catch (error) {
            console.error('[MessagingAdvanced] ❌ Simple broadcast error:', error);
            this.mainApp.addToLog(`❌ Ошибка тестовой отправки: ${error.message}`);
            alert(`❌ Ошибка тестовой отправки:\n\n${error.message}`);
        }
    }

    /**
     * ЗАПУСК РАССЫЛКИ ПО СПИСКУ ПОЛЬЗОВАТЕЛЕЙ с учетом фильтрции по настройкам рассылки
     */
    async startBroadcastToUsers(users, message, timeout) {
        if (this.isSending) {
            console.warn('Broadcast already in progress');
            return;
        }

        // Получаем настройки текущей рассылки
        const broadcastSettings = this.getCurrentBroadcastSettings();
        console.log('📢 Broadcasting with settings:', broadcastSettings);

        if (broadcastSettings) {
            this.mainApp.addToLog(`📢 Рассылка "${broadcastSettings.name}" (макс ${broadcastSettings.maxRepeats} повторов, ${broadcastSettings.minDaysBetween} дней между отправками)`);
        }

        this.isSending = true;
        this.sendProgress = 0;
        this.sendResults = [];
        this.mainApp.sendResults = []; // Синхронизация с main app

        // ФИЛЬТРУЕМ ПОЛЬЗОВАТЕЛЕЙ ПО НАСТРОЙКАМ РАССЫЛКИ
        const filteredUsers = [];
        for (const user of users) {
            if (this.canSendToUser(user.user_id, broadcastSettings)) {
                filteredUsers.push(user);
            } else {
                // Пропускаем пользователя из-за ограничений
                const result = {
                    user_id: user.user_id,
                    success: false,
                    error: 'Пропущен по правилам рассылки (лимит повторов/интервал)',
                    skipped: true
                };
                this.sendResults.push(result);
                this.mainApp.addToLog(`⏭️ Пропущен: ${this.getFirstNameDisplay(user)} (${user.user_id}) - правила рассылки`);
            }
        }

        console.log(`📤 Starting broadcast to ${filteredUsers.length}/${users.length} users with timeout ${timeout}ms`);
        this.mainApp.showStatus(`Отправка 0/${filteredUsers.length}...`, 'info');

        // Отправка сообщений с таймаутом
        for (let i = 0; i < filteredUsers.length; i++) {
            if (!this.isSending) break; // Проверка на отмену

            const user = filteredUsers[i];
            try {
                // Подставляем плейсхолдеры в сообщение для конкретного пользователя
                const personalizedMessage = this.replacePlaceholders(message, user);

                // Получаем и подставляем плейсхолдеры в кнопках
                let personalizedButtons = null;
                const inlineKeyboard = this.mainApp.modules?.buttons?.getInlineKeyboardButtons();
                if (inlineKeyboard) {
                    personalizedButtons = this.replacePlaceholdersInButtons(inlineKeyboard, user);
                }

                await this.sendMessageToUser(user, personalizedMessage, personalizedButtons);

                const result = { user_id: user.user_id, success: true, error: null };
                this.sendResults.push(result);

                console.log(`✅ Message sent to user ${user.user_id} (${i + 1}/${filteredUsers.length})`);
                this.mainApp.addToLog(`✅ ${this.getFirstNameDisplay(user)} ${this.getLastNameDisplay(user)} (${user.user_id})`);

            } catch (error) {
                const result = { user_id: user.user_id, success: false, error: error.message };
                this.sendResults.push(result);

                console.error(`❌ Failed to send to user ${user.user_id}:`, error);
                this.mainApp.addToLog(`❌ ${this.getFirstNameDisplay(user)} ${this.getLastNameDisplay(user)} (${user.user_id}): ${error.message}`);
            }

            this.sendProgress = ((i + 1) / filteredUsers.length) * 100;
            this.mainApp.sendProgress = this.sendProgress; // Синхронизация

            this.mainApp.showStatus(`Отправка ${i + 1}/${filteredUsers.length}... (${Math.round(100 - this.sendProgress)}% осталось)`, 'info');

            // Таймаут между сообщениями (кроме последнего)
            if (i < filteredUsers.length - 1 && timeout > 0) {
                await this.mainApp.delay(timeout);
            }
        }

        this.finishBroadcast();
    }

    /**
     * ЗАВЕРШЕНИЕ РАССЫЛКИ
     */
    finishBroadcast() {
        this.isSending = false;

        const successCount = this.sendResults.filter(r => r.success).length;
        const totalCount = this.sendResults.length;

        this.mainApp.showStatus(`Рассылка завершена: ${successCount}/${totalCount} успешных`, successCount === totalCount ? 'success' : 'warning');
        this.mainApp.addToLog(`📊 Рассылка завершена: ${successCount}/${totalCount} успешных отправок`);

        console.log(`📊 Broadcast finished: ${successCount}/${totalCount} successful`);

        // Показываем уведомление если рассылка успешная
        if (Notification.permission === 'granted' && successCount > 0) {
            new Notification('Рассылка завершена', {
                body: `${successCount} из ${totalCount} сообщений отправлены успешно`,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMkQ5IDIuNUQ5LjQgM0E5IDkgMCAwMTkgNUMxOS44IDEwLjEwNDYgMjAuNyAxMSA5IDExQzEwLjEwNDYgMTEgOSAxMC4xMDQ2IDkgOUM5IDYuODk1NCA5Ljg5NTQgNiAxMSA2QzEyLjEwNDYgNiAxOSA4Ljk4OTU1IDE5IDlDMTkgMTEuMTI5IDE1LjUyIDIxIDkgMjFaIiBmaWxsPSIjMTk3NkQyIi8+Cjwvc3ZnPgo='
            });
        }

        // Сохраняем статистику в историю
        this.saveBroadcastToHistory();
    }

    /**
     * СОХРАНЕНИЕ РАССЫЛКИ В ИСТОРИЮ
     */
    saveBroadcastToHistory() {
        // Проверяем, что у нас есть результаты для сохранения
        if (!Array.isArray(this.sendResults) || this.sendResults.length === 0) {
            console.log('📊 No broadcast results to save');
            return;
        }

        const historyItem = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            message: document.getElementById('messageInput')?.value || '',
            sentTo: this.sendResults.filter(r => r.success).length,
            totalUsers: this.sendResults.length,
            status: this.sendResults.filter(r => r.success).length === this.sendResults.length ? 'success' : 'partial',
            results: this.sendResults,
            // Добавляем список получателей для совместимости с поиском в showUserDetails
            recipients: this.sendResults.map(r => r.user_id)
        };

        // Используем storage модуль вместо прямого доступа к localStorage
        if (!Array.isArray(this.mainApp.broadcastHistory)) {
            this.mainApp.broadcastHistory = [];
        }

        // Добавляем новую запись в память
        this.mainApp.broadcastHistory.push(historyItem);

        // Ограничиваем историю 50 записями
        if (this.mainApp.broadcastHistory.length > 50) {
            this.mainApp.broadcastHistory = this.mainApp.broadcastHistory.slice(-50);
        }

        // Сохраняем через storage модуль
        if (this.mainApp.modules?.storage?.saveBroadcastHistory) {
            this.mainApp.modules.storage.saveBroadcastHistory();
        }

        console.log('📊 Broadcast saved to history using storage module');
    }

    /**
     * ОБРАБОТКА И СОХРАНЕНИЕ ССЫЛОК ИЗ СООБЩЕНИЯ
     */
    processAndSaveLinksFromMessage(message) {
        if (!this.linkAutoSave || !message) return;

        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = message.match(urlRegex);

        if (urls) {
            urls.forEach(url => {
                this.autoSaveLinkOnInsert(url, url);
            });
        }
    }

    /**
     * АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ ССЫЛКИ ПРИ ВСТАВКЕ
     */
    autoSaveLinkOnInsert(text, url) {
        if (!this.linkAutoSave) return;

        // Проверяем, есть ли уже такая ссылка
        const exists = this.linkTemplates.some(link =>
            link.url === url || link.text === text
        );

        if (!exists) {
            const linkTemplate = {
                id: 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                text: text,
                url: url,
                created: new Date().toISOString()
            };

            this.linkTemplates.push(linkTemplate);
            this.saveLinkTemplates();

            console.log('🔗 Auto-saved link:', text, '->', url);
        }
    }

    /**
     * ЗАГРУЗКА ШАБЛОНОВ ССЫЛОК ИЗ LOCALSTORAGE
     */
    loadLinkTemplates() {
        try {
            const data = localStorage.getItem('telegram_sender_link_templates');
            this.linkTemplates = data ? JSON.parse(data) : [];
            console.log('🔗 Loaded link templates:', this.linkTemplates.length);
        } catch (error) {
            console.warn('❌ Failed to load link templates:', error);
            this.linkTemplates = [];
        }
    }

    /**
     * СОХРАНЕНИЕ ШАБЛОНОВ ССЫЛОК В LOCALSTORAGE
     */
    saveLinkTemplates() {
        try {
            localStorage.setItem('telegram_sender_link_templates', JSON.stringify(this.linkTemplates));
            console.log('💾 Link templates saved');
        } catch (error) {
            console.error('❌ Failed to save link templates:', error);
        }
    }

    /**
     * ДОБАВЛЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    addLinkTemplate(text, url, name = '') {
        const template = {
            id: 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name || text.substring(0, 30),
            text: text.trim(),
            url: url.trim(),
            created: new Date().toISOString()
        };

        this.linkTemplates.push(template);
        this.saveLinkTemplates();
        this.renderLinkTemplatesDropdown();

        console.log('🔗 Added link template:', template.name);
        this.mainApp.addToLog(`Добавлена ссылка: ${template.name}`);

        return template;
    }

    /**
     * УДАЛЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    deleteLinkTemplate(templateId) {
        const index = this.linkTemplates.findIndex(t => t.id === templateId);
        if (index >= 0) {
            const removed = this.linkTemplates.splice(index, 1)[0];
            this.saveLinkTemplates();
            this.renderLinkTemplatesDropdown();

            this.mainApp.addToLog(`Удалена ссылка: ${removed.name}`);
            return true;
        }
        return false;
    }

    /**
     * ПРИМЕНЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    applyLinkTemplate(templateId) {
        const template = this.linkTemplates.find(t => t.id === templateId);
        if (!template) return false;

        // Вставка ссылки в сообщение
        this.insertLinkIntoMessage(template.text, template.url);
        return true;
    }

    /**
     * ВСТАВКА ССЫЛКИ В СООБЩЕНИЕ
     */
    insertLinkIntoMessage(text, url) {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;

        const currentText = messageInput.value;
        const htmlLink = `<a href='${url}'>${text}</a>`;
        messageInput.value = currentText + htmlLink + ' ';
        messageInput.focus();

        this.autoSaveLinkOnInsert(text, url);

        console.log('🔗 Link inserted into message');
        this.mainApp.addToLog(`Вставлена ссылка: ${text}`);
    }

    /**
     * РЕНДЕР ШАБЛОНОВ ССЫЛОК В СЕЛЕКТЕ
     */
    renderLinkTemplatesDropdown() {
        const container = document.getElementById('linkTemplatesListContainer');
        if (!container) return;

        if (this.linkTemplates.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); font-style: italic;">Сначала сохраните ссылку, чтобы увидеть её здесь</div>';
            return;
        }

        const html = this.linkTemplates.map(template => `
            <div style="padding: 4px; border: 1px solid var(--border); border-radius: 3px; margin: 2px 0; background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1; overflow: hidden;">
                        <small style="font-weight: 600; color: var(--text-primary);">${template.name}</small>
                        <div style="font-size: 10px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${template.url}
                        </div>
                    </div>
                    <div style="margin-left: 4px;">
                        <button onclick="window.telegramSender.messagingAdvanced.applyLinkTemplate('${template.id}')"
                                style="background: var(--accent-success); color: white; border: none; border-radius: 2px; padding: 2px 4px; font-size: 10px; cursor: pointer;">
                            +
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * УСТАНОВКА МЕДИАФАЙЛА
     */
    setMediaFile(file) {
        if (!file) {
            this.clearMediaFile();
            return;
        }

        this.mediaFile = file;
        this.mediaType = this.detectMediaType(file);

        console.log(`📎 Media file set: ${file.name} (${this.mediaType})`);
        this.mainApp.addToLog(`Выбран файл: ${file.name} (${this.formatFileSize(file.size)})`);

        // Очищаем предварительный просмотр
        this.updateMediaPreview();
    }

    /**
     * УСТАНОВКА ТИПА МЕДИА
     */
    setMediaType(type) {
        this.mediaType = type;
        console.log(`📎 Media type set to: ${type}`);
    }

    /**
     * ОЧИСТКА МЕДИАФАЙЛА
     */
    clearMediaFile() {
        this.mediaFile = null;
        this.mediaType = 'auto';

        // Очищаем все input элементы медиа
        ['mediaFileInput', 'mediaTypeSelect'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        this.updateMediaPreview();

        console.log('🗑️ Media file cleared');
        this.mainApp.addToLog('Медиа файл очищен');
    }

    /**
     * ОПРЕДЕЛЕНИЕ ТИПА МЕДИА ПО ФАЙЛУ
     */
    detectMediaType(file) {
        if (!file) return 'auto';

        const type = file.type.toLowerCase();

        if (type.startsWith('image/')) return 'photo';
        if (type.startsWith('video/')) return 'video';
        if (type.startsWith('audio/')) return 'audio';
        if (type.includes('pdf') || type.includes('document')) return 'document';

        // По расширению файла
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'photo';
        if (['mp4', 'avi', 'mov', 'webm'].includes(ext)) return 'video';
        if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return 'document';

        return 'document';
    }

    /**
     * ПОЛУЧЕНИЕ ИНФОРМАЦИИ О МЕДИАФАЙЛЕ
     */
    getMediaFileInfo() {
        if (!this.mediaFile) return null;

        return {
            file: this.mediaFile,
            name: this.mediaFile.name,
            size: this.mediaFile.size,
            sizeFormatted: this.formatFileSize(this.mediaFile.size),
            type: this.mediaFile.type,
            mediaType: this.mediaType
        };
    }

    /**
     * ФОРМАТИРОВАНИЕ РАЗМЕРА ФАЙЛА
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * ПРОВЕРКА НАЛИЧИЯ МЕДИА ДЛЯ ОТПРАВКИ
     */
    hasMediaToSend() {
        return !!this.mediaFile;
    }

    /**
     * ПОЛУЧЕНИЕ АВТОРИЗАЦИОННЫХ ДАННЫХ И ПРОКСИ URL
     */
    getAuthHeaders() {
        const config = window.CONFIG;
        if (!config || !config.BOT_TOKEN) {
            throw new Error('BOT_TOKEN не настроен! Проверьте конфигурацию.');
        }
        return {
            'Content-Type': 'application/json'
        };
    }

    /**
     * ПОЛУЧЕНИЕ БАЗОВОГО URL ДЛЯ API ЗАПРОСОВ
     */
    getTelegramApiUrl(endpoint) {
        const config = window.CONFIG;
        if (!config || !config.BOT_TOKEN) {
            throw new Error('BOT_TOKEN не настроен!');
        }

        // Для Telegram API всегда используем прямой доступ
        // Прокси только для Google Sheets если нужен для CORS
        const baseUrl = 'https://api.telegram.org/bot';

        // Используем прокси только если специально настроен для Telegram
        if (config.PROXY_URL && config.PROXY_URL !== 'https://api.allorigins.win/raw?url=') {
            return `${config.PROXY_URL}${config.BOT_TOKEN}/${endpoint}`;
        }

        return `${baseUrl}${config.BOT_TOKEN}/${endpoint}`;
    }

    /**
     * ОТПРАВКА МЕДИА СООБЩЕНИЯ ПОЛЬЗОВАТЕЛЮ
     */
    async sendMediaToUser(user, message = '', buttons = null) {
        const mediaInfo = this.getMediaFileInfo();
        if (!mediaInfo) {
            throw new Error('Нет медиа файла для отправки');
        }

        const config = window.CONFIG;
        if (!config || !config.BOT_TOKEN) {
            throw new Error('BOT_TOKEN не настроен!');
        }

        const formData = new FormData();
        formData.append('chat_id', user.user_id);

        if (message && message.trim()) {
            formData.append('caption', message.trim());
        }

        if (buttons && Array.isArray(buttons)) {
            formData.append('reply_markup', JSON.stringify({
                inline_keyboard: buttons
            }));
        }

        // Определяем endpoint и поле для файла
        let endpoint, fileField;

        switch (this.mediaType) {
            case 'photo':
                endpoint = 'sendPhoto';
                fileField = 'photo';
                break;
            case 'video':
                endpoint = 'sendVideo';
                fileField = 'video';
                break;
            case 'audio':
                endpoint = 'sendAudio';
                fileField = 'audio';
                break;
            case 'document':
            default:
                endpoint = 'sendDocument';
                fileField = 'document';
                break;
        }

        formData.append(fileField, mediaInfo.file);

        const url = this.getTelegramApiUrl(endpoint);

        console.log(`📤 Sending ${this.mediaType} to ${user.user_id}...`);

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('📤 Media send error response:', errorData);
            throw new Error(`Ошибка отправки ${this.mediaType}: ${errorData.description || response.statusText}`);
        }

        const result = await response.json();
        if (!result.ok) {
            console.error('📤 Media send error result:', result);
            throw new Error(`Telegram API ошибка: ${result.description}`);
        }

        console.log(`📤 ${this.mediaType} sent successfully to ${user.user_id}`);

        // Сохраняем историю отправки
        this.saveMessageToUserHistory(user.user_id, message || `📎 ${mediaInfo.name}`, 'delivered');

        // Записываем историю рассылок для фильтрации повторов
        const currentBroadcastSettings = this.getCurrentBroadcastSettings();
        if (currentBroadcastSettings && currentBroadcastSettings.name) {
            this.recordBroadcastSent(user.user_id, currentBroadcastSettings.name);
        }

        // Обновляем время последней отправки
        this.updateUserLastSent(user.user_id);

        return result;
    }

    /**
     * ПОДГОТОВКА ЗАПРОСА МЕДИА
     */
    prepareMediaRequest(userId, message = '', buttons = null) {
        const mediaInfo = this.getMediaFileInfo();
        if (!mediaInfo) return null;

        const config = window.CONFIG;
        if (!config || !config.BOT_TOKEN) return null;

        let endpoint, fileField;
        switch (this.mediaType) {
            case 'photo':
                endpoint = 'sendPhoto';
                fileField = 'photo';
                break;
            case 'video':
                endpoint = 'sendVideo';
                fileField = 'video';
                break;
            case 'audio':
                endpoint = 'sendAudio';
                fileField = 'audio';
                break;
            case 'document':
            default:
                endpoint = 'sendDocument';
                fileField = 'document';
                break;
        }

        return {
            url: this.getTelegramApiUrl(endpoint),
            body: null, // Для FormData мы используем отдельную логику
            headers: this.getAuthHeaders(),
            endpoint,
            fileField,
            mediaInfo
        };
    }

    /**
     * ОТПРАВКА ТЕКСТОВОГО СООБЩЕНИЯ ПОЛЬЗОВАТЕЛЮ
     */
    async sendMessageToUser(user, message, buttons = null) {
        // Сначала обрабатываем и сохраняем ссылки из сообщения
        this.processAndSaveLinksFromMessage(message);

        const config = window.CONFIG;
        if (!config || !config.BOT_TOKEN) {
            throw new Error('BOT_TOKEN не настроен! Проверьте конфигурацию.');
        }

        // Записываем историю рассылок для фильтрации повторов (для текстовых сообщений)
        const currentBroadcastSettings = this.getCurrentBroadcastSettings();
        if (currentBroadcastSettings && currentBroadcastSettings.name) {
            this.recordBroadcastSent(user.user_id, currentBroadcastSettings.name);
        }

        // Сценарий 1: Есть медиа файл - отправляем медиа
        if (this.hasMediaToSend()) {
            return await this.sendMediaToUser(user, message, buttons);
        }

        // Сценарий 2: Только текстовое сообщение
        const url = this.getTelegramApiUrl('sendMessage');

        const requestData = {
            chat_id: user.user_id,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: false
        };

        if (buttons && Array.isArray(buttons)) {
            requestData.reply_markup = {
                inline_keyboard: buttons
            };
        } else {
            // Добавляем кнопки если есть - получаем из модуля buttons
            const inlineKeyboard = this.mainApp.modules?.buttons?.getInlineKeyboardButtons();
            if (inlineKeyboard) {
                requestData.reply_markup = {
                    inline_keyboard: inlineKeyboard
                };
            }
        }

        console.log(`📤 Sending text message to ${user.user_id}...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('📤 Send error response:', errorData);
            throw new Error(`Ошибка отправки сообщения: ${errorData.description || response.statusText}`);
        }

        const result = await response.json().catch(() => {
            console.error('📤 Failed to parse JSON response from Telegram API');
            throw new Error('Не удалось получить ответ от Telegram API (битый JSON)');
        });
        if (!result.ok) {
            console.error('📤 Send error result:', result);
            throw new Error(`Telegram API ошибка: ${result.description}`);
        }

        console.log(`📤 Message sent successfully to ${user.user_id}`);

        // Сохраняем историю отправки
        this.saveMessageToUserHistory(user.user_id, message, 'delivered');

        // Обновляем время последней отправки
        this.updateUserLastSent(user.user_id);

        return result;
    }

    /**
     * СОХРАНЕНИЕ СООБЩЕНИЯ В ИСТОРИЮ ПОЛЬЗОВАТЕЛЯ
     */
    saveMessageToUserHistory(userId, message, status) {
        if (!this.mainApp.userMessageHistory) {
            this.mainApp.userMessageHistory = {};
        }

        if (!this.mainApp.userMessageHistory[userId]) {
            this.mainApp.userMessageHistory[userId] = [];
        }

        this.mainApp.userMessageHistory[userId].push({
            timestamp: new Date().toISOString(),
            message: message,
            status: status
        });

        // Ограничиваем историю 50 сообщениями на пользователя
        if (this.mainApp.userMessageHistory[userId].length > 50) {
            this.mainApp.userMessageHistory[userId] = this.mainApp.userMessageHistory[userId].slice(-50);
        }

        // Сохраняем историю в localStorage через storage модуль
        if (this.mainApp.modules?.storage?.saveUserMessageHistory) {
            this.mainApp.modules.storage.saveUserMessageHistory();
        }

        console.log(`📝 Message history saved for user ${userId}`);
    }

    /**
     * ОБНОВЛЕНИЕ ВРЕМЕНИ ПОСЛЕДНЕЙ ОТПРАВКИ ПОЛЬЗОВАТЕЛЮ
     */
    updateUserLastSent(userId) {
        // Проверяем модуль пользователей
        const usersModule = this.mainApp.modules?.users;
        if (usersModule && usersModule.users instanceof Map) {
            // Используем Map из UsersAdvanced модуля
            const user = usersModule.users.get(userId.toString());
            if (user) {
                user.last_sent = new Date().toISOString();
                usersModule.saveUsersToStorage(); // Сохраняем изменения
                console.log(`📅 Updated last sent for user ${userId} in users module`);
                return;
            }
        }

        // Fallback: ищем в mainApp.usersData если он существует
        if (this.mainApp.usersData) {
            const userIndex = this.mainApp.usersData.findIndex(u => u.user_id == userId);
            if (userIndex >= 0) {
                this.mainApp.usersData[userIndex].last_sent = new Date().toISOString();
                console.log(`📅 Updated last sent for user ${userId} in usersData fallback`);
            }
        }

        // Также обновляем в filteredUsers если там есть этот пользователь (для обратной совместимости)
        if (this.mainApp.filteredUsers) {
            const filteredIndex = this.mainApp.filteredUsers.findIndex(u => u.user_id == userId);
            if (filteredIndex >= 0) {
                this.mainApp.filteredUsers[filteredIndex].last_sent = new Date().toISOString();
            }
        }
    }

    /**
     * ОБНОВЛЕНИЕ ПРЕДВАРИТЕЛЬНОГО ПРОСМОТРА МЕДИА
     */
    updateMediaPreview() {
        const mediaPreview = document.getElementById('mediaPreview');
        if (!mediaPreview) return;

        const mediaInfo = this.getMediaFileInfo();

        if (!mediaInfo) {
            mediaPreview.innerHTML = '<small style="color: var(--text-secondary);">Нет файла</small>';
            mediaPreview.style.display = 'none';
            return;
        }

        const typeIcons = {
            photo: '🖼️',
            video: '🎥',
            audio: '🎵',
            document: '📄'
        };

        const icon = typeIcons[mediaInfo.mediaType] || '📎';

        mediaPreview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">${icon}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${mediaInfo.name}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 10px;">
                        ${mediaInfo.sizeFormatted} • ${mediaInfo.mediaType}
                    </div>
                </div>
            </div>
        `;

        mediaPreview.style.display = 'block';
        console.log('🖼️ Media preview updated:', mediaInfo);
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ К МЕДИАФАЙЛАМ
     */
    setupMediaEventListeners() {
        console.log('📎 Setting up media event listeners...');

        // Медиа файлы
        const mediaFileInput = document.getElementById('mediaFileInput');
        if (mediaFileInput) {
            mediaFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.setMediaFile(e.target.files[0]);
                    this.updateMediaPreview();
                }
            });
            console.log('✅ Media file input listener added');
        }

        const mediaTypeSelect = document.getElementById('mediaTypeSelect');
        if (mediaTypeSelect) {
            mediaTypeSelect.addEventListener('change', (e) => {
                this.setMediaType(e.target.value);
                this.updateMediaPreview();
            });
            console.log('✅ Media type select listener added');
        }

        const clearMediaBtn = document.getElementById('clearMediaBtn');
        if (clearMediaBtn) {
            clearMediaBtn.addEventListener('click', () => {
                this.clearMediaFile();
                // Очищаем input элемент
                const mediaFileInput = document.getElementById('mediaFileInput');
                if (mediaFileInput) {
                    mediaFileInput.value = '';
                }
            });
            console.log('✅ Clear media button listener added');
        }

        console.log('✅ Media event listeners setup completed');
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ШАБЛОНОВ СООБЩЕНИЙ (ОСНОВНЫЕ)
     */
    setupTemplateEventListeners() {
        console.log('📋 Setting up template event listeners...');

        // Обработчик применения шаблона сообщений из селекта
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                const templateId = e.target.value;
                if (templateId) {
                    this.applyTemplate(templateId);
                    e.target.value = ''; // Сбрасываем выбор после применения
                }
            });
            console.log('✅ Template select listener added');
        }

        console.log('✅ Template event listeners setup completed');
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ДЛЯ ШАБЛОНОВ И ССЫЛОК
     */
    setupTemplatesAndLinksListeners() {
        console.log('📋🔗 Setting up templates and links event listeners...');

        // ДОБАВЛЕНИЕ ОБРАБОТЧИКА КНОПКИ ШАБЛОНОВ СООБЩЕНИЙ
        const addTemplateBtn = document.getElementById('addTemplateBtn');
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => {
                this.addTemplateFromWizard();
            });
            console.log('✅ Add template button listener added');
        }

        const cancelTemplateWizardBtn = document.getElementById('cancelTemplateWizardBtn');
        if (cancelTemplateWizardBtn) {
            cancelTemplateWizardBtn.addEventListener('click', () => {
                this.hideTemplatesWizard();
            });
            console.log('✅ Cancel template wizard button listener added');
        }

        // Шаблоны сообщений
        const editTemplatesBtn = document.getElementById('editTemplatesBtn');
        if (editTemplatesBtn) {
            editTemplatesBtn.addEventListener('click', () => {
                this.mainApp.showModalWithBackdrop('templateWizard');
            });
            console.log('✅ Edit templates button listener added');
        }

        // Обработчик применения шаблона сообщений (уже добавлен в setupTemplateEventListeners)

        // Вставка ссылок
        const insertLinkBtn = document.getElementById('insertLinkBtn');
        if (insertLinkBtn) {
            insertLinkBtn.addEventListener('click', () => {
                this.mainApp.showModalWithBackdrop('linkWizard');
            });
            console.log('✅ Insert link button listener added');
        }

        console.log('✅ Templates and links event listeners setup completed');
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ДЛЯ ПЛАНИРОВЩИКА
     */
    setupSchedulerListeners() {
        console.log('⏰ Setting up scheduler event listeners...');

        const scheduleBroadcastBtn = document.getElementById('scheduleBroadcastBtn');
        if (scheduleBroadcastBtn) {
            scheduleBroadcastBtn.addEventListener('click', () => {
                this.scheduleCurrentBroadcast();
            });
            console.log('✅ Schedule broadcast button listener added');
        }

        const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
        if (cancelScheduleBtn) {
            cancelScheduleBtn.addEventListener('click', () => {
                this.cancelScheduledBroadcast();
            });
            console.log('✅ Cancel schedule button listener added');
        }

        const setTimeoutBtn = document.getElementById('setTimeoutBtn');
        if (setTimeoutBtn) {
            setTimeoutBtn.addEventListener('click', () => {
                this.setMessageTimeout();
            });
            console.log('✅ Set timeout button listener added');
        }

        console.log('✅ Scheduler event listeners setup completed');
    }

    /**
     * ОБЩАЯ НАСТРОЙКА ВСЕХ ОБРАБОТЧИКОВ СОБЫТИЙ
     */
    setupAllEventListeners() {
        console.log('📨🔄⏰ Setting up all messaging advanced event listeners...');

        // Основные кнопки рассылки
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                console.log('📤 Simple send button clicked');
                this.mainApp.addToLog('Отправка тестового сообщения...');
                this.startSimpleBroadcast();
            });
            console.log('✅ Simple send button listener added');
        }

        const sendMassBtn = document.getElementById('sendMassBtn');
        if (sendMassBtn) {
            sendMassBtn.addEventListener('click', () => {
                console.log('📢 Mass broadcast button clicked');
                this.startMassBroadcast();
            });
            console.log('✅ Mass broadcast button listener added');
        }

        // Настраиваем все под-системы
        this.setupMediaEventListeners();
        this.setupTemplatesAndLinksListeners();
        this.setupTemplateEventListeners(); // Добавлен вызов основного метода шаблонов
        this.setupSchedulerListeners();

        // ШАБЛОНЫ РАССЫЛОК
        this.setupTemplatesAndBroadcastsListeners();

        console.log('✅ All messaging advanced event listeners setup completed');
    }

    /**
     * ПОКАЗАТЬ МОДАЛЬНОЕ ОКНО НАСТРОЕК ШАБЛОНА РАССЫЛКИ
     */
    showBroadcastWizard() {
        const wizard = document.getElementById('broadcastWizard');
        if (!wizard) return;

        // Предзаполняем название из поля ввода
        const broadcastNameInput = document.getElementById('broadcastNameInput');
        const wizardNameInput = document.getElementById('broadcastTemplateName');

        if (broadcastNameInput && wizardNameInput && broadcastNameInput.value.trim()) {
            wizardNameInput.value = broadcastNameInput.value.trim();
        }

        wizard.style.display = 'block';
        console.log('📢 Broadcast wizard shown');
    }

    /**
     * СОЗДАТЬ ШАБЛОН РАССЫЛКИ ИЗ МОДАЛЬНОГО ОКНА
     */
    createBroadcastTemplateFromWizard() {
        const nameInput = document.getElementById('broadcastTemplateName');
        const maxRepeatsInput = document.getElementById('broadcastTemplateMaxRepeats');
        const minDaysInput = document.getElementById('broadcastTemplateMinDays');
        const descriptionInput = document.getElementById('broadcastTemplateDescription');

        if (!nameInput || !maxRepeatsInput || !minDaysInput) {
            alert('Ошибка: отсутствуют обязательные поля!');
            return;
        }

        const name = nameInput.value.trim();
        const maxRepeats = parseInt(maxRepeatsInput.value);
        const minDaysBetween = parseInt(minDaysInput.value);
        const description = descriptionInput ? descriptionInput.value.trim() : '';

        if (!name) {
            alert('Введите название рассылки!');
            return;
        }

        // Создаем шаблон с указанными настройками
        const template = this.addBroadcastTemplate(name, maxRepeats, minDaysBetween, description);
        if (template) {
            this.mainApp.addToLog(`Шаблон рассылки "${name}" создан: макс ${template.maxRepeats} повторов, ${template.minDaysBetween} дней интервал`);

            // Обновляем поле названия в интерфейсе
            const broadcastNameInput = document.getElementById('broadcastNameInput');
            if (broadcastNameInput) {
                broadcastNameInput.value = name;
            }

            // Обновляем дропдаун
            this.renderBroadcastTemplatesDropdown();

            // Закрываем модальное окно
            document.getElementById('broadcastWizard').style.display = 'none';

            alert('Шаблон рассылки создан успешно!');
        }
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ДЛЯ ШАБЛОНОВ РАССЫЛОК
     */
    setupTemplatesAndBroadcastsListeners() {
        console.log('📢 Setting up broadcast templates event listeners...');

        // Кнопка сохранения шаблона рассылки - открывает wizard
        const saveBroadcastTemplateBtn = document.getElementById('saveBroadcastTemplateBtn');
        if (saveBroadcastTemplateBtn) {
            saveBroadcastTemplateBtn.addEventListener('click', () => {
                this.showBroadcastWizard();
            });
            console.log('✅ Save broadcast template button listener added');
        }

        // Кнопки в модальном окне
        const createTemplateBtn = document.getElementById('createBroadcastTemplateBtn');
        if (createTemplateBtn) {
            createTemplateBtn.addEventListener('click', () => {
                this.createBroadcastTemplateFromWizard();
            });
            console.log('✅ Create broadcast template button listener added');
        }

        const cancelTemplateBtn = document.getElementById('cancelBroadcastWizardBtn');
        if (cancelTemplateBtn) {
            cancelTemplateBtn.addEventListener('click', () => {
                document.getElementById('broadcastWizard').style.display = 'none';
            });
            console.log('✅ Cancel broadcast template button listener added');
        }

        // Обработчик изменения выбора шаблона рассылки
        const broadcastTemplateSelect = document.getElementById('broadcastTemplateSelect');
        if (broadcastTemplateSelect) {
            broadcastTemplateSelect.addEventListener('change', (e) => {
                const templateName = e.target.value;
                if (!templateName) return;

                const template = this.getBroadcastTemplateByName(templateName);
                if (template) {
                    // Восстанавливаем название рассылки
                    const broadcastNameInput = document.getElementById('broadcastNameInput');
                    if (broadcastNameInput) {
                        broadcastNameInput.value = template.name;
                    }

                    // Восстанавливаем текст сообщения
                    const messageInput = document.getElementById('messageInput');
                    if (messageInput && template.message) {
                        messageInput.value = template.message;
                    }

                    // Восстанавливаем кнопки
                    if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
                        // Если есть модуль кнопок, восстанавливаем его состояние
                        if (this.mainApp.modules?.buttons) {
                            this.mainApp.modules.buttons.messageButtons = [...template.buttons];
                            // Сохраняем кнопки локально
                            this.mainApp.modules.buttons.saveButtons();
                            // Обновляем интерфейс с небольшой задержкой для гарантии
                            setTimeout(() => {
                                if (this.mainApp.modules?.buttons) {
                                    this.mainApp.modules.buttons.renderMessageButtons();
                                }
                            }, 10);
                        }
                    }

                    // Восстанавливаем медиа файлы
                    if (template.media) {
                        // Для медиа файлов нам нужно восстановить информацию, но не сам файл
                        // (файлы хранятся только локально в браузере)
                        this.mainApp.addToLog(`⚠️ Медиа файл шаблона "${template.media.name}" не может быть восстановлен - выберите файл заново`);
                    }

                    this.mainApp.addToLog(`Применен шаблон рассылки "${template.name}" (сообщение + кнопки + настройки восстановлены)`);
                }
            });
            console.log('✅ Broadcast template select listener added');
        }

        console.log('✅ Broadcast templates event listeners setup completed');
    }

    /**
     * РЕНДЕР ШАБЛОНОВ РАССЫЛОК В DROPDOWN
     */
    renderBroadcastTemplatesDropdown() {
        const container = document.getElementById('broadcastTemplateSelect');
        if (!container) return;

        // Сохраняем текущее значение
        const currentValue = container.value;

        // Очищаем текущие опции кроме первой
        while (container.options.length > 1) {
            container.remove(1);
        }

        // Добавляем шаблоны
        this.broadcastTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.name;
            option.textContent = `📢 ${template.name} (макс ${template.maxRepeats}×, ${template.minDaysBetween}д)`;
            container.appendChild(option);
        });

        // Восстанавливаем выбранное значение если оно существует
        if (currentValue && container.querySelector(`option[value="${currentValue}"]`)) {
            container.value = currentValue;
        }

        console.log('📢 Broadcast templates dropdown updated:', this.broadcastTemplates.length, 'templates');
    }

    /**
     * ПОЛУЧИТЬ ТЕКУЩЕЕ НАЗВАНИЕ РАССЫЛКИ
     */
    getCurrentBroadcastName() {
        const broadcastNameInput = document.getElementById('broadcastNameInput');
        return broadcastNameInput ? broadcastNameInput.value.trim() : '';
    }

    /**
     * ПОЛУЧИТЬ НАСТРОЙКИ ТЕКУЩЕЙ РАССЫЛКИ (ИЗ ШАБЛОНА ИЛИ ДЕФОЛТНЫЕ)
     */
    getCurrentBroadcastSettings() {
        const broadcastName = this.getCurrentBroadcastName();
        if (!broadcastName) return null;

        // Ищем шаблон с таким именем
        const template = this.getBroadcastTemplateByName(broadcastName);
        if (template) {
            return {
                name: template.name,
                maxRepeats: template.maxRepeats,
                minDaysBetween: template.minDaysBetween,
                description: template.description
            };
        }

        // Если шаблона нет, используем дефолтные настройки
        return {
            name: broadcastName,
            maxRepeats: 1,        // Только 1 отправка по умолчанию
            minDaysBetween: 0,    // Без временных ограничений
            description: ''
        };
    }

    /**
     * ЗАГРУЗИТЬ ИСТОРИЮ ОТПРАВОК ПОЛЬЗОВАТЕЛЯМ
     */
    loadBroadcastHistory() {
        try {
            const data = localStorage.getItem('telegram_sender_broadcast_history');
            this.broadcastHistory = data ? JSON.parse(data) : {};
            console.log('📊 Loaded broadcast history for', Object.keys(this.broadcastHistory).length, 'users');
        } catch (error) {
            console.warn('❌ Failed to load broadcast history:', error);
            this.broadcastHistory = {};
        }
    }

    /**
     * СОХРАНИТЬ ИСТОРИЮ ОТПРАВОК ПОЛЬЗОВАТЕЛЯМ
     */
    saveBroadcastHistory() {
        try {
            localStorage.setItem('telegram_sender_broadcast_history', JSON.stringify(this.broadcastHistory));
            console.log('💾 Broadcast history saved');
        } catch (error) {
            console.error('❌ Failed to save broadcast history:', error);
        }
    }

    /**
     * ПОЛУЧИТЬ ИСТОРИЮ ОТПРАВОК ПОЛЬЗОВАТЕЛЮ ПО КОНКРЕТНОЙ РАССЫЛКЕ
     */
    getUserBroadcastHistory(userId, broadcastName) {
        if (!this.broadcastHistory[userId]) return [];
        if (!this.broadcastHistory[userId][broadcastName]) return [];

        return this.broadcastHistory[userId][broadcastName];
    }

    /**
     * МОЖНО ЛИ ОТПРАВИТЬ РАССЫЛКУ ПОЛЬЗОВАТЕЛЮ (ПРОВЕРКА НА ПОВТОРЫ И ИНТЕРВАЛЫ)
     */
    canSendToUser(userId, broadcastSettings) {
        if (!broadcastSettings) return true; // Если настроек нет - всегда можно отправлять

        const history = this.getUserBroadcastHistory(userId, broadcastSettings.name);
        const now = new Date();

        // Проверяем количество повторов
        if (history.length >= broadcastSettings.maxRepeats) {
            console.log(`⛔ User ${userId} exceeded max repeats (${broadcastSettings.maxRepeats}) for '${broadcastSettings.name}'`);
            return false;
        }

        // Если уже было отправлено, проверяем интервал
        if (history.length > 0 && broadcastSettings.minDaysBetween > 0) {
            const lastSent = new Date(history[history.length - 1].timestamp);
            const daysSinceLastSent = (now - lastSent) / (1000 * 60 * 60 * 24);

            if (daysSinceLastSent < broadcastSettings.minDaysBetween) {
                console.log(`⏳ User ${userId} too soon for '${broadcastSettings.name}' (${daysSinceLastSent.toFixed(1)} days < ${broadcastSettings.minDaysBetween} days)`);
                return false;
            }
        }

        return true;
    }

    /**
     * ЗАПИСАТЬ ОТПРАВКУ РАССЫЛКИ ПОЛЬЗОВАТЕЛЮ В ИСТОРИЮ
     */
    recordBroadcastSent(userId, broadcastName) {
        if (!this.broadcastHistory[userId]) {
            this.broadcastHistory[userId] = {};
        }

        if (!this.broadcastHistory[userId][broadcastName]) {
            this.broadcastHistory[userId][broadcastName] = [];
        }

        // Добавляем запись
        this.broadcastHistory[userId][broadcastName].push({
            timestamp: new Date().toISOString(),
            count: this.broadcastHistory[userId][broadcastName].length + 1
        });

        // Ограничиваем историю 20 записями на рассылку
        if (this.broadcastHistory[userId][broadcastName].length > 20) {
            this.broadcastHistory[userId][broadcastName] = this.broadcastHistory[userId][broadcastName].slice(-20);
        }

        this.saveBroadcastHistory();
    }

    /**
     * ДОБАВИТЬ КНОПКУ К СООБЩЕНИЮ (ПРОКСИ К МОДУЛЮ BUTTONS)
     */
    addMessageButton(text, url) {
        if (this.mainApp.modules?.buttons?.addMessageButton) {
            return this.mainApp.modules.buttons.addMessageButton(text, url);
        } else {
            alert('Модуль кнопок не инициализирован');
            console.error('❌ addMessageButton method not found in buttons module');
            return null;
        }
    }

    /**
     * ИНИЦИАЛИЗАЦИЯ ПЛАНИРОВЩИКА
     */
    initScheduler() {
        if (this.isSchedulerInitialized) return;

        this.isSchedulerInitialized = true;

        // Проверяем, есть ли запланированные рассылки при запуске
        this.checkScheduledBroadcasts();

        console.log('⏰ Scheduler initialized');
    }

    /**
     * ГЛАВНАЯ ИНИЦИАЛИЗАЦИЯ МОДУЛЯ
     */
    init() {
        console.log('📨🔄⏰ Initializing TelegramMessagingAdvanced...');

        // Загружаем данные
        this.loadBroadcastTemplates();
        this.loadLinkTemplates();
        this.loadBroadcastHistory(); // Загружаем историю рассылок

        // Загружаем настройки
        try {
            const saved = localStorage.getItem('telegram_sender_link_auto_save');
            this.linkAutoSave = saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            this.linkAutoSave = true;
        }

        // Инициализируем планировщик
        this.initScheduler();

        // Настраиваем обработчики событий через небольшой таймаут
        setTimeout(() => {
            this.setupAllEventListeners();
            this.renderBroadcastTemplatesDropdown(); // Рендерим шаблоны рассылок
        }, 100);

        console.log('✅ TelegramMessagingAdvanced initialized successfully');
    }
}

// Экспорт для браузерной среды
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramMessagingAdvanced;
} else {
    // Для браузера - регистрируем глобально
    window.TelegramMessagingAdvanced = TelegramMessagingAdvanced;
}
