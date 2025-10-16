/**
 * TelegramSender Messaging Module
 * Функционал для отправки сообщений и обработки ссылок
 */

class TelegramMessaging {
    constructor(parent) {
        this.parent = parent; // Ссылка на основной класс TelegramSender
    }

    /**
     * ОТПРАВКА СООБЩЕНИЯ КОНКРЕТНОМУ ПОЛЬЗОВАТЕЛЮ
     */
    async sendMessageToUser(user, message, buttons = null) {
        // ОБРАБАТЫВАЕМ И СОХРАНЯЕМ ССЫЛКИ ИЗ СООБЩЕНИЯ
        const savedLinks = this.processAndSaveLinksFromMessage(message);
        if (savedLinks.length > 0) {
            console.log(`🔗 Processed and saved ${savedLinks.length} links from message for user ${user.user_id}`);
            // Обновляем интерфейс немедленно
            if (this.parent.renderLinkTemplatesDropdown) this.parent.renderLinkTemplatesDropdown();
            if (this.parent.renderLinkTemplatesManagement) this.parent.renderLinkTemplatesManagement();
        }

        // Продолжаем стандартный процесс отправки
        const config = window.CONFIG;
        const botToken = config.BOT_TOKEN;
        const userId = user.user_id;

        if (!botToken) {
            throw new Error('BOT_TOKEN не настроен');
        }

        // Формируем URL для запроса
        let url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        // Для безопасности можно использовать прокси
        if (config.PROXY_URL) {
            url = config.PROXY_URL;
        }

        const requestBody = {
            chat_id: userId,
            text: message,
            parse_mode: 'HTML'
        };

        // Добавляем кнопки если есть - получаем из модуля buttons
        const inlineKeyboard = this.parent.buttons.getInlineKeyboardButtons();
        if (inlineKeyboard) {
            requestBody.reply_markup = {
                inline_keyboard: inlineKeyboard
            };
        }

        console.log('📤 Sending to user', userId + ':', message.substring(0, 50) + '...');

        // Применяем timeout между сообщениями если задан
        if (this.parent.sendSchedule && this.parent.sendSchedule.messageTimeout > 0) {
            await this.parent.delay(this.parent.messageTimeout);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
            throw new Error(result.description || `HTTP ${response.status}`);
        }

        console.log('✅ Sent to user', userId, 'successfully');

        // СОХРАНЯЕМ ИСТОРИЮ СООБЩЕНИЙ ДЛЯ ПОЛЬЗОВАТЕЛЯ
        this.saveMessageToUserHistory(user.user_id, message, 'delivered');

        // Обновляем last_sent в данных пользователя
        user.last_sent = new Date().toISOString();

        // Обновляем историю сообщений через storage модуль
        this.parent.storage.saveUserMessageHistory();

        return result;
    }

    /**
     * МЕТОД ДЛЯ ОТОБРАЖЕНИЯ ИМЕНИ ПОЛЬЗОВАТЕЛЯ В ТАБЛИЦЕ
     */
    getFirstNameDisplay(user) {
        // Расширим поиск полей для имен - включая наиболее распространенные варианты
        const nameFields = ['first name', 'first_name', 'firstname', 'имя', 'name', 'fname', 'first', 'given_name', 'Имя', 'Имя пользователя', 'Имя клиента'];
        for (const field of nameFields) {
            const value = user[field];
            if (value !== undefined && value !== null) {
                const trimmed = value.toString().trim();
                if (trimmed !== '') {
                    console.log(`✅ Found first name "${trimmed}" in field "${field}" for user ${user.user_id || 'unknown'}`);
                    return trimmed;
                }
            }
        }
        console.log(`❌ First name not found for user ${user.user_id || 'unknown'}. Available fields:`, Object.keys(user));
        return '—';
    }

    /**
     * МЕТОД ДЛЯ ОТОБРАЖЕНИЯ ФАМИЛИИ ПОЛЬЗОВАТЕЛЯ В ТАБЛИЦЕ
     */
    getLastNameDisplay(user) {
        // Расширим поиск полей для фамилий - включая наиболее распространенные варианты
        const lastNameFields = ['last name', 'last_name', 'lastname', 'фамилия', 'surname', 'lname', 'last', 'family_name', 'Фамилия', 'Фамилия пользователя', 'Фамилия клиента'];
        for (const field of lastNameFields) {
            const value = user[field];
            if (value !== undefined && value !== null) {
                const trimmed = value.toString().trim();
                if (trimmed !== '') {
                    console.log(`✅ Found last name "${trimmed}" in field "${field}"`);
                    return trimmed;
                }
            }
        }
        console.log(`❌ Last name not found for user ${user.user_id || 'unknown'}`);
        return '—';
    }

    /**
     * ОТОБРАЖЕНИЕ ПОСЛЕДНЕЙ ОТПРАВКИ С ИСТОРИИ СООБЩЕНИЙ
     */
    getLastSentDisplay(user) {
        // Сначала проверим историю сообщений пользователя
        const userHistory = this.parent.userMessageHistory?.[user.user_id];
        if (userHistory && Array.isArray(userHistory) && userHistory.length > 0) {
            // Найти последние отправленные сообщения (не "delivered", а именно отправленных)
            const sentMessages = userHistory
                .filter(entry => entry.status === 'delivered')
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            if (sentMessages.length > 0) {
                const lastSent = sentMessages[0].timestamp; // Самая свежая отправка
                const lastMessageDate = new Date(lastSent);

                // Форматируем дату
                const now = new Date();
                const diffInDays = (now - lastMessageDate) / (1000 * 60 * 60 * 24);

                let timeText = '';
                if (diffInDays < 1) {
                    timeText = lastMessageDate.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                } else if (diffInDays < 7) {
                    const daysAgo = Math.floor(diffInDays);
                    timeText = `${daysAgo} д. назад`;
                } else {
                    timeText = lastMessageDate.toLocaleDateString('ru-RU');
                }

                // Создаем кнопки истории с информацией
                const buttonHtml = `
                    <button onclick="showUserMessageHistory('${user.user_id}')" class="history-btn" style="font-size: 11px; padding: 2px 4px; border: 1px solid #6c757d; background: #fff; border-radius: 3px; cursor: pointer; margin-left: 5px;"
                    title="Показать историю сообщений пользователя">
                        📄${sentMessages.length > 1 ? `(${sentMessages.length})` : ''}
                    </button>
                `;

                // Возвращаем время + кнопку истории с контрастным цветом
                return `<span style="color: #007bff; font-weight: bold;">${timeText}</span>${buttonHtml}`;
            }
        }

        // Если история пустая, проверим поле last_sent из CSV
        const dateFields = ['last_sent', 'last_send', 'последняя отправка', 'sent_at', 'last_message'];
        for (const field of dateFields) {
            const value = user[field];
            if (value !== undefined && value !== null && value.toString().trim() !== '') {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    const diffInDays = (new Date() - date) / (1000 * 60 * 60 * 24);
                    let timeText = '';
                    if (diffInDays < 1) {
                        timeText = date.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                    } else if (diffInDays < 7) {
                        const daysAgo = Math.floor(diffInDays);
                        timeText = `${daysAgo} д. назад`;
                    } else {
                        timeText = date.toLocaleDateString('ru-RU');
                    }

                    return `<span style="color: #dc3545;">${timeText}</span>`;
                }
            }
        }

        return `<span style="color: #6c757d; font-style: italic;">никогда</span>`;
    }

    /**
     * МАССОВАЯ РАССЫЛКА ВСЕМ ВЫБРАННЫМ ПОЛЬЗОВАТЕЛЯМ
     */
    async startMassBroadcast() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput?.value?.trim() || '';

        if (!message) {
            alert('Введите текст сообщения!');
            return;
        }

        // Получаем выбранных пользователей
        const selectedUsers = this.parent.users.getSelectedUsers();
        if (selectedUsers.length === 0) {
            alert('Выберите пользователей для рассылки!');
            return;
        }

        // Проверим настройки бота
        const config = window.CONFIG;
        if (!config.BOT_TOKEN || config.BOT_TOKEN === "PLACEHOLDER_BOT_TOKEN") {
            alert('❌ BOT_TOKEN не настроен! Установите валидный токен бота в config.js');
            return;
        }

        // Подтверждение массовой рассылки
        const confirmMessage = `Отправить сообщение ${selectedUsers.length} пользователям?\n\n⚠️ Это действие нельзя отменить!`;
        if (!confirm(confirmMessage)) {
            return;
        }

        this.parent.addToLog(`📤 Начинаем массовую рассылку ${selectedUsers.length} пользователям...`);
        this.parent.isSending = true;
        let successCount = 0;
        let errorCount = 0;

        // Сохраняем результаты для каждого пользователя
        this.parent.sendResults = [];

        try {
            for (let i = 0; i < selectedUsers.length; i++) {
                const user = selectedUsers[i];

                try {
                    this.parent.addToLog(`[${i+1}/${selectedUsers.length}] Отправка пользователю ${user.user_id}...`);

                    await this.sendMessageToUser(user, message, null);

                    successCount++;
                    this.parent.sendResults.push({
                        user_id: user.user_id,
                        success: true
                    });

                    this.parent.addToLog(`✅ Успешно отправлено пользователю ${user.user_id}`);

                    // Прогресс
                    this.parent.sendProgress = Math.round(((i + 1) / selectedUsers.length) * 100);

                } catch (userError) {
                    errorCount++;
                    this.parent.sendResults.push({
                        user_id: user.user_id,
                        success: false,
                        error: userError.message
                    });

                    this.parent.addToLog(`❌ Ошибка отправки пользователю ${user.user_id}: ${userError.message}`);
                    console.error(`User ${user.user_id} error:`, userError);
                }
            }

            // Финальный отчет
            const reportMessage = `🎯 РАССЫЛКА ЗАВЕРШЕНА!\n\n` +
                `📊 Результаты:\n` +
                `✅ Отправлено: ${successCount} из ${selectedUsers.length}\n` +
                `❌ Ошибок: ${errorCount}\n\n` +
                `${errorCount > 0 ? 'Проверьте логи для деталей об ошибках.' : 'Все сообщения доставлены!'}`;

            this.parent.addToLog(reportMessage);
            alert(reportMessage);

            // Обновляем интерфейс
            if (this.parent.users && this.parent.users.applyFilters) {
                this.parent.users.applyFilters();
            }

        } catch (error) {
            console.error('❌ Критическая ошибка массовой рассылки:', error);
            this.parent.addToLog('❌ Критическая ошибка массовой рассылки: ' + error.message);
            alert('❌ Критическая ошибка при массовой рассылке:\n\n' + error.message);
        }

        this.parent.isSending = false;
        this.parent.sendProgress = 0;
    }

    /**
     * ОТМЕНА ТЕКУЩЕЙ ОТПРАВКИ
     */
    cancelCurrentBroadcast() {
        if (!this.parent.isSending) {
            alert('Нет активной рассылки для отмены');
            return;
        }

        this.parent.addToLog('⚠️ Отмена отправки...');
        this.parent.isSending = false;
        this.parent.sendProgress = 0;

        setTimeout(() => {
            this.parent.addToLog('❌ Отправка отменена');
            alert('Отправка отменена пользователем');
        }, 500);
    }

    /**
     * ПОЛУЧЕНИЕ ВЫБРАННЫХ ПОЛЬЗОВАТЕЛЕЙ ДЛЯ РАССЫЛКИ
     */
    getSelectedUsersForBroadcast() {
        if (!this.parent.users) return [];

        // Используем метод из модуля users
        return this.parent.users.getSelectedUsers();
    }

    /**
     * ОТПРАВКА ПРОСТОГО СООБЩЕНИЯ
     */
    async startSimpleBroadcast() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput?.value?.trim() || '';

        if (!message) {
            alert('Введите текст сообщения!');
            return;
        }

        if (this.parent.filteredUsers.length === 0) {
            alert('Нет пользователей для отправки!');
            return;
        }

        // Проверим настройки бота
        const config = window.CONFIG;
        if (!config.BOT_TOKEN || config.BOT_TOKEN === "PLACEHOLDER_BOT_TOKEN") {
            alert('❌ BOT_TOKEN не настроен! Установите валидный токен бота в config.js');
            return;
        }

        // Проверим пользователя
        if (!this.parent.filteredUsers[0]?.user_id) {
            alert('❌ Неверные данные пользователя. Проверьте загрузку данных.');
            return;
        }

        // Покажем текущие настройки для диагностики
        console.log('🎯 Настройки отправки:', {
            botToken: config.BOT_TOKEN ? 'установлен' : 'не установлен',
            proxy: config.PROXY_URL || 'нет',
            adminId: config.ADMIN_ID,
            userCount: this.parent.filteredUsers.length,
            firstUserId: this.parent.filteredUsers[0].user_id,
            messageLength: message.length
        });

        // ОБРАБАТЫВАЕМ ССЫЛКИ В СООБЩЕНИИ ПЕРЕД ОТПРАВКОЙ
        const savedLinks = this.processAndSaveLinksFromMessage(message);
        if (savedLinks.length > 0) {
            this.parent.addToLog(`🔗 Сохранено ссылок при отправке: ${savedLinks.length}`);
            this.parent.renderLinkTemplatesDropdown();
            this.parent.renderLinkTemplatesManagement();
        }

        this.parent.addToLog('📤 Отправка тестового сообщения...');
        this.parent.isSending = true;

        try {
            const testUser = this.parent.filteredUsers[0]; // Первый пользователь как тест
            this.parent.addToLog(`🎯 Цель: пользователь ID ${testUser.user_id}`);

            await this.sendMessageToUser(testUser, message, null);

            this.parent.addToLog('✅ Сообщение успешно отправлено!');
            alert(`✅ ГОТОВО! Сообщение отправлено пользователю ${testUser.user_id}\n\nПроверьте: сообщение должно прийти в Telegram`);

            // Обновляем last_sent для тестового пользователя
            if (this.parent.users && this.parent.users.applyFilters) {
                this.parent.users.applyFilters();
            }

        } catch (error) {
            console.error('❌ Полная ошибка отправки:', error);
            this.parent.addToLog('❌ Ошибка отправки: ' + error.message);

            // Подробный анализ ошибки
            if (error.message.includes('Unauthorized')) {
                alert('❌ Ошибка авторизации бота!\n\nПроверьте:\n1. BOT_TOKEN в config.js правильный\n2. Бот запущен и активен в Telegram\n3. Токен копирован полностью без пробелов');
            } else if (error.message.includes('Bad Request')) {
                alert('❌ Неверные параметры запроса:\n\n' + error.message);
            } else if (error.message.includes('Forbidden')) {
                alert('❌ Бот заблокирован пользователем или у бота нет прав');
            } else {
                alert('❌ Неизвестная ошибка:\n\n' + error.message);
            }
        }

        this.parent.isSending = false;
    }

    /**
     * ОБРАБОТКА ССЫЛОК ИЗ СООБЩЕНИЙ
     */
    processAndSaveLinksFromMessage(message) {
        if (!message || !this.parent.linkAutoSave) return [];

        const savedLinks = [];

        // Регулярное выражение для поиска HTML ссылок
        const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
        let match;

        while ((match = linkRegex.exec(message)) !== null) {
            const url = match[1].trim();
            const text = match[2].trim();

            // Проверяем, является ли это валидной ссылкой
            try {
                new URL(url);

                // Сохраняем ссылку как шаблон
                const savedTemplate = this.autoSaveLinkOnInsert(text, url);
                if (savedTemplate) {
                    savedLinks.push(savedTemplate);
                }
            } catch (error) {
                console.warn('Невалидная ссылка в сообщении:', url);
            }
        }

        return savedLinks;
    }

    /**
     * АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ ССЫЛКИ
     */
    autoSaveLinkOnInsert(text, url) {
        // Проверяем, существует ли уже такая ссылка
        const existingIndex = this.parent.linkTemplates.findIndex(link =>
            link.text === text && link.url === url
        );

        if (existingIndex >= 0) {
            console.log('🔗 Link template already exists, skipping auto-save');
            return null;
        }

        // Создаем имя шаблона автоматически
        const templateName = text.length > 20 ? text.substring(0, 20) + '...' : text;

        // Проверяем название на уникальность
        let uniqueName = templateName;
        let counter = 1;
        while (this.parent.linkTemplates.some(link => link.name === uniqueName)) {
            uniqueName = `${templateName} (${counter})`;
            counter++;
        }

        const template = {
            id: 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: uniqueName,
            text: text,
            url: url,
            created: new Date().toISOString(),
            usage_count: 0
        };

        this.parent.linkTemplates.push(template);
        this.parent.saveLinkTemplates();

        console.log('🔗 Auto-saved link template:', template.name);
        this.parent.addToLog(`Автоматически сохранен шаблон ссылки: ${template.name}`);

        return template;
    }

    /**
     * СОХРАНЕНИЕ СООБЩЕНИЯ В ИСТОРИЮ ПОЛЬЗОВАТЕЛЯ
     */
    saveMessageToUserHistory(userId, message, status) {
        if (!this.parent.userMessageHistory[userId]) {
            this.parent.userMessageHistory[userId] = [];
        }

        this.parent.userMessageHistory[userId].push({
            timestamp: new Date().toISOString(),
            message: message,
            status: status
        });

        // Сохраняем историю через storage модуль
        if (this.parent.storage && this.parent.storage.saveUserMessageHistory) {
            this.parent.storage.saveUserMessageHistory();
        }
    }

    /**
     * ДОБАВЛЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    addLinkTemplate(text, url, name = '') {
        if (!text || !url) {
            alert('Заполните текст и URL ссылки!');
            return null;
        }

        try {
            new URL(url);
        } catch (error) {
            alert('Введите корректный URL (с http:// или https://)!');
            return null;
        }

        const templateName = name.trim() || (text.length > 20 ? text.substring(0, 20) + '...' : text);

        // Проверяем уникальность
        const existingIndex = this.parent.linkTemplates.findIndex(link =>
            link.text === text && link.url === url
        );

        if (existingIndex >= 0) {
            alert('Такая ссылка уже сохранена!');
            return null;
        }

        const template = {
            id: 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: templateName,
            text: text.trim(),
            url: url.trim(),
            created: new Date().toISOString(),
            usage_count: 0
        };

        this.parent.linkTemplates.push(template);
        this.parent.saveLinkTemplates();

        console.log('🔗 Added link template:', template.name);
        this.parent.addToLog(`Сохранен шаблон ссылки: ${template.name}`);

        return template;
    }

    /**
     * УДАЛЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    deleteLinkTemplate(templateId) {
        const index = this.parent.linkTemplates.findIndex(link => link.id === templateId);
        if (index === -1) return false;

        const templateName = this.parent.linkTemplates[index].name;
        this.parent.linkTemplates.splice(index, 1);
        this.parent.saveLinkTemplates();

        console.log('❌ Link template deleted:', templateName);
        this.parent.addToLog(`Удален шаблон ссылки: ${templateName}`);

        return true;
    }

    /**
     * ПРИМЕНЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    applyLinkTemplate(templateId) {
        const template = this.parent.linkTemplates.find(link => link.id === templateId);
        if (!template) {
            console.warn('Link template not found:', templateId);
            return false;
        }

        // Увеличиваем счетчик использования
        template.usage_count = (template.usage_count || 0) + 1;
        this.parent.saveLinkTemplates();

        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            const currentText = messageInput.value;
            const cursorPos = messageInput.selectionStart;
            const textBefore = currentText.substring(0, cursorPos);
            const textAfter = currentText.substring(cursorPos);

            // Создаем HTML ссылку
            const htmlLink = `<a href="${template.url}">${template.text}</a>`;

            // Множественная вставка - если повторяемая ссылка с той же позиции курсора
            if (textBefore.endsWith(htmlLink)) {
                // Вместо вставки повторяемой ссылки, просто вставляем новую строку или разделитель
                messageInput.value = textBefore + textAfter;
                messageInput.setSelectionRange(cursorPos, cursorPos);
            } else {
                // Обычная вставка
                messageInput.value = textBefore + htmlLink + textAfter;
                const newCursorPos = cursorPos + htmlLink.length;
                messageInput.setSelectionRange(newCursorPos, newCursorPos);
            }

            messageInput.focus();

            console.log('🔗 Applied link template:', template.name);
            this.parent.addToLog(`Применен шаблон ссылки: ${template.name}`);

            return true;
        }
        return false;
    }
}
