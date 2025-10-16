/* =========================================== */
/* Телеграм Боты - управление ботами и таблицами */
/* Модуль для Telegram Sender WebApp */
/* =========================================== */

class TelegramBots {
    constructor(telegramSender) {
        this.sender = telegramSender; // Ссылка на основной класс
        console.log('🤖 TelegramBots module initialized');
    }

    /**
     * ДОБАВЛЕНИЕ НОВОГО БОТА
     */
    addBot(name, token) {
        if (!name || !token) {
            alert('Заполните название бота и API токен!');
            return null;
        }

        // Проверяем уникальность токена
        if (this.sender.bots.some(bot => bot.token === token)) {
            alert('Бот с таким токеном уже добавлен!');
            return null;
        }

        const bot = {
            id: 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            token: token.trim(),
            sheets: [], // Таблицы этого бота
            created: new Date().toISOString()
        };

        this.sender.bots.push(bot);
        this.saveBots();

        console.log('🤖 Added bot:', bot.name);
        this.sender.addToLog(`Добавлен бот: ${bot.name}`);

        return bot;
    }

    /**
     * УДАЛЕНИЕ БОТА
     */
    deleteBot(botId) {
        const botIndex = this.sender.bots.findIndex(bot => bot.id === botId);
        if (botIndex === -1) {
            console.warn('Бот не найден:', botId);
            return false;
        }

        // Если удаляем текущего выбранного бота, сбрасываем выбор
        if (this.sender.currentBot && this.sender.currentBot.id === botId) {
            this.sender.currentBot = null;
            this.sender.currentSheet = null;
            this.updateBotSelectionUI();
        }

        const botName = this.sender.bots[botIndex].name;
        this.sender.bots.splice(botIndex, 1);
        this.saveBots();

        console.log('❌ Bot deleted:', botName);
        this.sender.addToLog(`Удален бот: ${botName}`);

        return true;
    }

    /**
     * ДОБАВЛЕНИЕ ТАБЛИЦЫ К БОТУ
     */
    addSheetToBot(botId, name, sheetId) {
        const bot = this.sender.bots.find(b => b.id === botId);
        if (!bot) {
            console.warn('Бот не найден:', botId);
            return null;
        }

        if (!name || !sheetId) {
            alert('Заполните название и Google Sheet ID!');
            return null;
        }

        // Проверяем уникальность ID таблицы в рамках этого бота
        if (bot.sheets.some(sheet => sheet.sheetId === sheetId)) {
            alert('Таблица с таким ID уже добавлена этому боту!');
            return null;
        }

        const sheet = {
            id: 'sheet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            sheetId: sheetId.trim(),
            created: new Date().toISOString()
        };

        bot.sheets.push(sheet);
        this.saveBots();

        console.log('📊 Added sheet to bot:', bot.name, '-', sheet.name);
        this.sender.addToLog(`Добавлена таблица "${sheet.name}" боту "${bot.name}"`);

        return sheet;
    }

    /**
     * УДАЛЕНИЕ ТАБЛИЦЫ У БОТА
     */
    deleteSheetFromBot(botId, sheetId) {
        const bot = this.sender.bots.find(b => b.id === botId);
        if (!bot) return false;

        const sheetIndex = bot.sheets.findIndex(sheet => sheet.id === sheetId);
        if (sheetIndex === -1) return false;

        // Если удаляем текущую выбранную таблицу, сбрасываем выбор
        if (this.sender.currentSheet && this.sender.currentSheet.id === sheetId) {
            this.sender.currentSheet = null;
            this.updateSheetSelectionUI();
        }

        const sheetName = bot.sheets[sheetIndex].name;
        bot.sheets.splice(sheetIndex, 1);
        this.saveBots();

        console.log('❌ Sheet deleted:', sheetName);
        this.sender.addToLog(`Удалена таблица "${sheetName}"`);

        return true;
    }

    /**
     * ВЫБОР БОТА
     */
    selectBot(botId) {
        if (!botId) {
            this.sender.currentBot = null;
            this.sender.currentSheet = null;
        } else {
            this.sender.currentBot = this.sender.bots.find(bot => bot.id === botId) || null;
            this.sender.currentSheet = null; // Сбрасываем таблицу при смене бота
        }

        // Сохраняем выбор в localStorage
        localStorage.setItem('telegram_sender_current_bot', this.sender.currentBot ? this.sender.currentBot.id : '');

        // Если выбран бот, обновляем токен в config
        if (this.sender.currentBot && window.CONFIG) {
            window.CONFIG.BOT_TOKEN = this.sender.currentBot.token;
            console.log('🤖 Updated config BOT_TOKEN to:', this.sender.currentBot.token.slice(0, 8) + '...');
        }

        this.updateBotSelectionUI();
        this.updateSheetSelectionUI(); // Перерендериваем таблицы для нового бота

        console.log('🤖 Selected bot:', this.sender.currentBot?.name || 'None');
        this.sender.addToLog(`Выбран бот: ${this.sender.currentBot?.name || 'Нет'}`);
    }

    /**
     * ВЫБОР ЛИСТА (ТАБЛИЦЫ)
     */
    async selectSheet(sheetId) {
        if (!this.sender.currentBot || !sheetId) {
            this.sender.currentSheet = null;
        } else {
            this.sender.currentSheet = this.sender.currentBot.sheets.find(sheet => sheet.id === sheetId) || null;

            // Сохраняем выбор в localStorage
            localStorage.setItem('telegram_sender_current_sheet', this.sender.currentSheet ? this.sender.currentSheet.id : '');

            // Если выбрана таблица, обновляем SHEET_ID в config и загружаем пользователей
            if (this.sender.currentSheet && window.CONFIG) {
                window.CONFIG.SHEET_ID = this.sender.currentSheet.sheetId;
                console.log('📊 Updated config SHEET_ID to:', this.sender.currentSheet.sheetId);

                // Автоматическая загрузка пользователей при выборе таблицы
                try {
                    console.log('🔄 Автоматическая загрузка пользователей...');
                    await this.sender.loadUsersData();
                    console.log('✅ Автоматическая загрузка завершилась успешно');
                } catch (error) {
                    console.error('❌ Ошибка автоматической загрузки:', error);
                    this.sender.showStatus('Ошибка автоматической загрузки пользователей', 'error');
                }
            }
        }

        this.updateSheetSelectionUI();
        console.log('📊 Selected sheet:', this.sender.currentSheet?.name || 'None');
        this.sender.addToLog(`Выбрана таблица: ${this.sender.currentSheet?.name || 'Нет'}${this.sender.currentSheet ? ' - загрузка выполнена' : ''}`);
    }

    /**
     * ЗАГРУЗКА НАСТРОЕК БОТОВ ИЗ localStorage
     */
    loadBots() {
        try {
            const data = localStorage.getItem('telegram_sender_bots');
            this.sender.bots = data ? JSON.parse(data) : [];
            console.log('🤖 Loaded bots:', this.sender.bots.length);
        } catch (error) {
            console.warn('❌ Failed to load bots:', error);
            this.sender.bots = [];
        }
    }

    /**
     * СОХРАНЕНИЕ БОТОВ В localStorage
     */
    saveBots() {
        try {
            localStorage.setItem('telegram_sender_bots', JSON.stringify(this.sender.bots));
            console.log('💾 Bots saved');
        } catch (error) {
            console.error('❌ Failed to save bots:', error);
        }
    }

    /**
     * РЕНДЕР СПИСКА БОТОВ В СЕЛЕКТЕ
     */
    renderBotsDropdown() {
        const botsList = document.getElementById('botsList');
        if (!botsList) return;

        // Очищаем текущие опции кроме первой
        while (botsList.options.length > 1) {
            botsList.remove(1);
        }

        // Добавляем всех ботов
        this.sender.bots.forEach(bot => {
            const option = document.createElement('option');
            option.value = bot.id;
            option.textContent = `🤖 ${bot.name} (${bot.sheets.length} таблиц)`;
            botsList.appendChild(option);
        });

        // Устанавливаем текущий выбор
        if (this.sender.currentBot) {
            botsList.value = this.sender.currentBot.id;
        } else {
            botsList.value = '';
        }
    }

    /**
     * РЕНДЕР СПИСКА ТАБЛИЦ В СЕЛЕКТЕ
     */
    renderSheetsDropdown() {
        const sheetsList = document.getElementById('sheetsList');
        if (!sheetsList) return;

        // Очищаем текущие опции кроме первой
        while (sheetsList.options.length > 1) {
            sheetsList.remove(1);
        }

        if (this.sender.currentBot && this.sender.currentBot.sheets.length > 0) {
            // Добавляем таблицы текущего бота
            this.sender.currentBot.sheets.forEach(sheet => {
                const option = document.createElement('option');
                option.value = sheet.id;
                option.textContent = `📊 ${sheet.name}`;
                sheetsList.appendChild(option);
            });

            // Включаем селект
            sheetsList.disabled = false;

            // Устанавливаем текущий выбор
            if (this.sender.currentSheet) {
                sheetsList.value = this.sender.currentSheet.id;
            } else {
                sheetsList.value = '';
            }
        } else {
            // Нет таблиц - отключаем селект
            sheetsList.disabled = true;
            sheetsList.value = '';
        }
    }

    /**
     * ОБНОВЛЕНИЕ UI ПРИ ВЫБОРЕ БОТА
     */
    updateBotSelectionUI() {
        const currentBotInfo = document.getElementById('currentBotInfo');
        if (currentBotInfo) {
            if (this.sender.currentBot) {
                currentBotInfo.innerHTML = `
                    <strong>${this.sender.currentBot.name}</strong><br>
                    Таблиц: ${this.sender.currentBot.sheets.length}<br>
                    <small>Токен: ${this.sender.currentBot.token.substring(0, 8)}...${this.sender.currentBot.token.substring(-3)}</small>
                `;
                currentBotInfo.style.background = '#e8f5e8';
            } else {
                currentBotInfo.innerHTML = 'Нет выбранного бота';
                currentBotInfo.style.background = '#f0f0f0';
            }
        }

        // Обновляем селект ботов
        this.renderBotsDropdown();
    }

    /**
     * ОБНОВЛЕНИЕ UI ПРИ ВЫБОРЕ ТАБЛИЦЫ
     */
    updateSheetSelectionUI() {
        // Обновляем селект таблиц
        this.renderSheetsDropdown();
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ БОТОВ И ТАБЛИЦ
     */
    setupBotEventListeners() {
        console.log('🤖 Setting up bot event listeners...');

        // Селект ботов
        const botsList = document.getElementById('botsList');
        if (botsList) {
            botsList.addEventListener('change', (e) => {
                const botId = e.target.value;
                this.selectBot(botId);
            });
            console.log('✅ Bots list listener added');
        }

        // Селект таблиц
        const sheetsList = document.getElementById('sheetsList');
        if (sheetsList) {
            sheetsList.addEventListener('change', (e) => {
                const sheetId = e.target.value;
                this.selectSheet(sheetId);
            });
            console.log('✅ Sheets list listener added');
        }

        console.log('✅ Bot event listeners setup completed');
    }

    /**
     * ВОССТАНОВЛЕНИЕ СОХРАНЕННЫХ ВЫБОРОВ
     */
    restoreSavedSelections() {
        try {
            const savedBotId = localStorage.getItem('telegram_sender_current_bot');
            const savedSheetId = localStorage.getItem('telegram_sender_current_sheet');

            console.log('🔄 Restoring bot selections:', { bot: savedBotId, sheet: savedSheetId });

            if (savedBotId) {
                this.selectBot(savedBotId);
                if (savedSheetId && this.sender.currentBot) {
                    this.selectSheet(savedSheetId);
                }
            }

            console.log('✅ Bot selections restored');
        } catch (error) {
            console.error('❌ Failed to restore bot selections:', error);
        }
    }

    /**
     * ДОБАВЛЕНИЕ БОТА ЧЕРЕЗ WIZARD
     */
    addBotFromWizard() {
        const nameInput = document.getElementById('newBotName');
        const tokenInput = document.getElementById('newBotToken');

        if (!nameInput || !tokenInput) return;

        const name = nameInput.value.trim();
        const token = tokenInput.value.trim();

        if (!name || !token) {
            alert('Заполните все поля!');
            return;
        }

        const bot = this.addBot(name, token);
        if (bot) {
            nameInput.value = '';
            tokenInput.value = '';
            this.hideBotsWizard();
            this.updateBotListContainer();
        }
    }

    /**
     * СБРОС ВСЕХ НАСТРОЕК БОТОВ
     */
    resetAllBotSettings() {
        this.sender.bots = [];
        this.saveBots();
        this.sender.currentBot = null;
        this.sender.currentSheet = null;

        // Сброс конфигурации
        if (window.CONFIG) {
            window.CONFIG.BOT_TOKEN = '';
            window.CONFIG.SHEET_ID = '';
        }

        this.updateBotSelectionUI();
        this.updateSheetSelectionUI();
        this.updateBotListContainer();
        this.sender.addToLog('Все настройки ботов и таблиц сброшены');
        alert('Все настройки ботов и таблиц сброшены!');
    }

    /**
     * СКРЫТИЕ WIZARD БОТОВ
     */
    hideBotsWizard() {
        const wizard = document.getElementById('botsWizard');
        if (wizard) {
            wizard.style.display = 'none';
        }
    }

    /**
     * ДОБАВЛЕНИЕ ТАБЛИЦЫ ЧЕРЕЗ WIZARD
     */
    addSheetFromWizard() {
        if (!this.sender.currentBot) {
            alert('Сначала выберите бота!');
            return;
        }

        const nameInput = document.getElementById('newSheetName');
        const idInput = document.getElementById('newSheetId');

        if (!nameInput || !idInput) return;

        const name = nameInput.value.trim();
        const sheetId = idInput.value.trim();

        if (!name || !sheetId) {
            alert('Заполните все поля!');
            return;
        }

        const sheet = this.addSheetToBot(this.sender.currentBot.id, name, sheetId);
        if (sheet) {
            nameInput.value = '';
            idInput.value = '';
            this.hideSheetsWizard();
            this.updateSheetListContainer();
        }
    }

    /**
     * СКРЫТИЕ WIZARD ТАБЛИЦ
     */
    hideSheetsWizard() {
        const wizard = document.getElementById('sheetsWizard');
        if (wizard) {
            wizard.style.display = 'none';
        }
    }

    /**
     * ОБНОВЛЕНИЕ СПИСКА БОТОВ В КОНТЕЙНЕРЕ
     */
    updateBotListContainer() {
        const container = document.getElementById('botsListContainer');
        if (!container) return;

        if (this.sender.bots.length === 0) {
            container.innerHTML = 'Боты не добавлены';
            return;
        }

        const botsHtml = this.sender.bots.map(bot => `
            <div style="margin: 5px 0; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                <strong>${bot.name}</strong>
                <small style="color: #666;"> (${bot.sheets.length} таблиц)</small>
                <button style="float: right; background: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 11px;" onclick="if(confirm('Удалить бота и все его таблицы?')) { window.telegramSender.bots.deleteBot('${bot.id}'); window.telegramSender.bots.updateBotListContainer(); }">❌</button>
                <div style="clear: both;"></div>
            </div>
        `).join('');

        container.innerHTML = botsHtml;
    }

    /**
     * ОБНОВЛЕНИЕ СПИСКА ТАБЛИЦ В КОНТЕЙНЕРЕ
     */
    updateSheetListContainer() {
        const container = document.getElementById('sheetsListContainer');
        if (!container) return;

        if (!this.sender.currentBot || this.sender.currentBot.sheets.length === 0) {
            container.innerHTML = 'Таблицы не добавлены';
            return;
        }

        const sheetsHtml = this.sender.currentBot.sheets.map(sheet => `
            <div style="margin: 5px 0; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                <strong>${sheet.name}</strong>
                <small style="color: #666;"> (${sheet.sheetId})</small>
                <button style="float: right; background: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 11px;" onclick="if(confirm('Удалить эту таблицу?')) window.telegramSender.bots.deleteSheetFromBot('${this.sender.currentBot.id}', '${sheet.id}'); window.telegramSender.bots.updateSheetListContainer();">❌</button>
                <div style="clear: both;"></div>
            </div>
        `).join('');

        container.innerHTML = sheetsHtml;
    }

    /**
     * ПОКАЗ WIZARD БОТОВ
     */
    showBotsWizard() {
        const wizard = document.getElementById('botsWizard');
        if (wizard) {
            wizard.style.display = 'block';
            this.updateBotListContainer();
        }
    }

    /**
     * ПОКАЗ WIZARD ТАБЛИЦ
     */
    showSheetsWizard() {
        const wizard = document.getElementById('sheetsWizard');
        if (wizard) {
            const header = document.getElementById('sheetsWizardHeader');
            if (header) {
                header.innerHTML = this.sender.currentBot ?
                    `Для бота: <strong>${this.sender.currentBot.name}</strong>` :
                    'Сначала выберите бота';
            }
            wizard.style.display = 'block';
            this.updateSheetListContainer();
        }
    }
}

// Экспорт для браузерной среды
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramBots;
} else {
    // Для браузера - регистрируем глобально
    window.TelegramBots = TelegramBots;
}
