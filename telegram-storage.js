/* =========================================== */
/* Телеграм Storage - управление localStorage */
/* Модуль для Telegram Sender WebApp */
/* =========================================== */

class TelegramStorage {
    constructor(telegramSender) {
        this.sender = telegramSender; // Ссылка на основной класс
        console.log('💾 TelegramStorage module initialized');
    }

    // ==================== ЗАГРУЗКА ИЗ LOCALSTORAGE ====================

    /**
     * ЗАГРУЗКА ШАБЛОНОВ СООБЩЕНИЙ ИЗ localStorage
     */
    loadTemplates() {
        try {
            const data = localStorage.getItem('telegram_sender_templates');
            this.sender.templates = data ? JSON.parse(data) : [];
            console.log('📋 Loaded templates:', this.sender.templates.length);
        } catch (error) {
            console.warn('❌ Failed to load templates:', error);
            this.sender.templates = [];
        }
    }

    /**
     * ЗАГРУЗКА ШАБЛОНОВ ССЫЛОК ИЗ localStorage
     */
    loadLinkTemplates() {
        try {
            const data = localStorage.getItem('telegram_sender_link_templates');
            this.sender.linkTemplates = data ? JSON.parse(data) : [];
            console.log('🔗 Loaded link templates:', this.sender.linkTemplates.length);
        } catch (error) {
            console.warn('❌ Failed to load link templates:', error);
            this.sender.linkTemplates = [];
        }
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
     * ЗАГРУЗКА ИСТОРИИ РАССЫЛОК ИЗ localStorage
     */
    loadBroadcastHistory() {
        try {
            const data = localStorage.getItem('telegram_sender_history');
            this.sender.broadcastHistory = data ? JSON.parse(data) : [];
            console.log('📜 Loaded broadcast history:', this.sender.broadcastHistory.length, 'entries');
        } catch (error) {
            console.warn('❌ Failed to load broadcast history:', error);
            this.sender.broadcastHistory = [];
        }
    }

    /**
     * ЗАГРУЗКА ИСТОРИИ СООБЩЕНИЙ ПОЛЬЗОВАТЕЛЕЙ
     */
    loadUserMessageHistory() {
        try {
            const data = localStorage.getItem('telegram_sender_user_history');
            this.sender.userMessageHistory = data ? JSON.parse(data) : {};
            console.log('💬 Loaded user message history for', Object.keys(this.sender.userMessageHistory).length, 'users');
        } catch (error) {
            console.warn('❌ Failed to load user message history:', error);
            this.sender.userMessageHistory = {};
        }
    }

    /**
     * ЗАГРУЗКА НАСТРОЕК ЗВУКА ИЗ localStorage
     */
    loadSoundSettings() {
        try {
            const data = localStorage.getItem('telegram_sender_sound_settings');
            this.sender.notificationSoundSettings = data ? JSON.parse(data) : {
                frequency: 800,
                duration: 300,
                waveType: 'sine',
                volume: 10
            };
            console.log('🔊 Sound settings loaded');
        } catch (error) {
            console.warn('❌ Failed to load sound settings:', error);
            this.sender.notificationSoundSettings = {
                frequency: 800,
                duration: 300,
                waveType: 'sine',
                volume: 10
            };
        }
    }

    /**
     * ЗАГРУЗКА СОХРАНЕННОЙ ТЕМЫ
     */
    loadSavedTheme() {
        try {
            const theme = localStorage.getItem('telegram_sender_theme') || 'light';
            this.sender.setTheme(theme);
            // Устанавливаем селектор на сохраненное значение
            const themeSwitcher = document.querySelector('#themeSwitcher');
            if (themeSwitcher) {
                themeSwitcher.value = theme;
            }
            console.log('🎨 Loaded theme:', theme);
        } catch (error) {
            console.warn('❌ Failed to load theme:', error);
        }
    }

    /**
     * ЗАГРУЗКА НАСТРОЙКИ АВТОСОХРАНЕНИЯ ССЫЛОК
     */
    loadLinkAutoSave() {
        try {
            const saved = localStorage.getItem('telegram_sender_link_autosave');
            this.sender.linkAutoSave = saved ? JSON.parse(saved) : true;
            console.log('🔄 Link auto-save setting loaded:', this.sender.linkAutoSave);
        } catch (error) {
            console.warn('❌ Failed to load link auto-save setting:', error);
            this.sender.linkAutoSave = true;
        }
    }

    /**
     * МИГРАЦИЯ ДАННЫХ ПРИ ОБНОВЛЕНИИ
     */
    migrateDataOnStartup() {
        try {
            // При необходимости добавьте сюда миграции данных
            console.log('🔄 Data migration completed');
        } catch (error) {
            console.warn('⚠️ Data migration failed:', error);
        }
    }

    // ==================== СОХРАНЕНИЕ В LOCALSTORAGE ====================

    /**
     * СОХРАНЕНИЕ ШАБЛОНОВ СООБЩЕНИЙ В localStorage
     */
    saveTemplates() {
        try {
            localStorage.setItem('telegram_sender_templates', JSON.stringify(this.sender.templates));
            console.log('💾 Templates saved');
        } catch (error) {
            console.error('❌ Failed to save templates:', error);
        }
    }

    /**
     * СОХРАНЕНИЕ ШАБЛОНОВ ССЫЛОК В localStorage
     */
    saveLinkTemplates() {
        try {
            localStorage.setItem('telegram_sender_link_templates', JSON.stringify(this.sender.linkTemplates));
            console.log('💾 Link templates saved');
        } catch (error) {
            console.error('❌ Failed to save link templates:', error);
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
     * СОХРАНЕНИЕ ИСТОРИИ РАССЫЛОК В localStorage
     */
    saveBroadcastHistory() {
        try {
            localStorage.setItem('telegram_sender_history', JSON.stringify(this.sender.broadcastHistory));
            console.log('💾 Broadcast history saved');
        } catch (error) {
            console.error('❌ Failed to save broadcast history:', error);
        }
    }

    /**
     * СОХРАНЕНИЕ ИСТОРИИ СООБЩЕНИЙ ПОЛЬЗОВАТЕЛЕЙ
     */
    saveUserMessageHistory() {
        try {
            localStorage.setItem('telegram_sender_user_history', JSON.stringify(this.sender.userMessageHistory));
            console.log('💾 User message history saved');
        } catch (error) {
            console.error('❌ Failed to save user message history:', error);
        }
    }

    /**
     * СОХРАНЕНИЕ НАСТРОЕК ЗВУКА В localStorage
     */
    saveSoundSettings() {
        try {
            localStorage.setItem('telegram_sender_sound_settings', JSON.stringify(this.sender.notificationSoundSettings));
            console.log('💾 Sound settings saved');
        } catch (error) {
            console.error('❌ Failed to save sound settings:', error);
        }
    }

    /**
     * СОХРАНЕНИЕ ТЕМЫ В localStorage
     */
    saveTheme(theme) {
        try {
            localStorage.setItem('telegram_sender_theme', theme);
            console.log('💾 Theme saved:', theme);
        } catch (error) {
            console.error('❌ Failed to save theme:', error);
        }
    }

    // ==================== ДОСТУП К localStorage ====================

    /**
     * ПОЛУЧЕНИЕ ДАННЫХ ИЗ localStorage
     */
    getItem(key) {
        try {
            return localStorage.getItem(`telegram_sender_${key}`);
        } catch (error) {
            console.warn(`❌ Failed to get item ${key}:`, error);
            return null;
        }
    }

    /**
     * УСТАНОВКА ДАННЫХ В localStorage
     */
    setItem(key, value) {
        try {
            localStorage.setItem(`telegram_sender_${key}`, value);
            console.log(`💾 Item saved: ${key}`);
        } catch (error) {
            console.error(`❌ Failed to set item ${key}:`, error);
        }
    }

    /**
     * УДАЛЕНИЕ ДАННЫХ ИЗ localStorage
     */
    removeItem(key) {
        try {
            localStorage.removeItem(`telegram_sender_${key}`);
            console.log(`🗑️ Item removed: ${key}`);
        } catch (error) {
            console.error(`❌ Failed to remove item ${key}:`, error);
        }
    }

    /**
     * ДИАГНОСТИКА localStorage
     */
    diagnoseStorage() {
        const telegramKeys = [];
        const keys = ['telegram_sender_bots', 'telegram_sender_history', 'telegram_sender_sound_settings', 'telegram_sender_templates', 'telegram_sender_link_templates', 'telegram_sender_user_history', 'telegram_sender_theme', 'telegram_sender_link_autosave', 'telegram_sender_current_bot', 'telegram_sender_current_sheet'];

        keys.forEach(key => {
            try {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    telegramKeys.push(key);
                    console.log(`📋 ${key}: ${value.substring(0, 50)}...`);
                }
            } catch (error) {
                console.warn(`⚠️ Error accessing ${key}:`, error);
            }
        });

        console.log('🔍 Storage diagnosis:', {
            totalKeys: telegramKeys.length,
            keys: telegramKeys
        });

        return telegramKeys;
    }

    /**
     * ОЧИСТКА ВСЕХ ДАННЫХ
     */
    clearAllData() {
        const keys = [
            'telegram_sender_bots',
            'telegram_sender_history',
            'telegram_sender_sound_settings',
            'telegram_sender_templates',
            'telegram_sender_link_templates',
            'telegram_sender_user_history',
            'telegram_sender_theme',
            'telegram_sender_link_autosave',
            'telegram_sender_current_bot',
            'telegram_sender_current_sheet'
        ];

        const cleared = [];
        keys.forEach(key => {
            try {
                localStorage.removeItem(key);
                cleared.push(key);
            } catch (error) {
                console.warn(`⚠️ Failed to clear ${key}:`, error);
            }
        });

        console.log('🧹 Cleared all data:', cleared.length, 'keys');
        this.sender.addToLog(`Очищено ${cleared.length} ключей данных`);
    }
}

// Экспорт для браузерной среды
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramStorage;
} else {
    // Для браузера - регистрируем глобально
    window.TelegramStorage = TelegramStorage;
}
