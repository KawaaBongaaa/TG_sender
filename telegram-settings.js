/**
 * TelegramSender Settings Module
 * Функционал для настроек и сохранения данных
 */

class TelegramSettings {
    constructor(parent) {
        this.parent = parent; // Ссылка на основной класс TelegramSender
        console.log('⚙️ TelegramSettings module initialized');
    }

    /**
     * ЗАГРУЗКА НАСТРОЕК ЗВУКА УВЕДОМЛЕНИЙ ИЗ localStorage
     */
    loadSoundSettings() {
        try {
            const saved = localStorage.getItem('telegram_sender_sound_settings');
            if (saved) {
                const savedSettings = JSON.parse(saved);
                this.parent.notificationSoundSettings = { ...this.parent.notificationSoundSettings, ...savedSettings };
                console.log('🔊 Loaded sound settings:', this.parent.notificationSoundSettings);
            }
        } catch (error) {
            console.error('❌ Failed to load sound settings:', error);
            // Используем настройки по умолчанию
        }
    }

    /**
     * СОХРАНЕНИЕ НАСТРОЕК ЗВУКА УВЕДОМЛЕНИЙ В localStorage
     */
    saveSoundSettings() {
        try {
            localStorage.setItem('telegram_sender_sound_settings', JSON.stringify(this.parent.notificationSoundSettings));
            console.log('💾 Sound settings saved');
        } catch (error) {
            console.error('❌ Failed to save sound settings:', error);
        }
    }

    /**
     * ЗАГРУЗКА СОХРАНЕННОЙ ТЕМЫ
     */
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('telegram_sender_theme');
        this.parent.currentTheme = ['light', 'dark', 'gray'].includes(savedTheme) ? savedTheme : 'light';
        console.log('🎨 Loaded theme:', this.parent.currentTheme);
    }

    /**
     * СОХРАНЕНИЕ ТЕМЫ
     */
    saveTheme(theme) {
        try {
            localStorage.setItem('telegram_sender_theme', theme);
            console.log('💾 Theme saved:', theme);
        } catch (error) {
            console.error('❌ Failed to save theme:', error);
        }
    }

    /**
     * ЗАГРУЗКА ШАБЛОНОВ СООБЩЕНИЙ ИЗ localStorage
     */
    loadTemplates() {
        try {
            const saved = localStorage.getItem('telegram_sender_templates');
            if (saved) {
                this.parent.templates = JSON.parse(saved);
                console.log('📋 Loaded message templates:', this.parent.templates.length, 'templates');
            } else {
                this.parent.templates = [];
                console.log('📋 No message templates found');
            }
        } catch (error) {
            console.error('❌ Failed to load templates:', error);
            this.parent.templates = [];
        }
    }

    /**
     * СОХРАНЕНИЕ ШАБЛОНОВ СООБЩЕНИЙ В localStorage
     */
    saveTemplates() {
        try {
            localStorage.setItem('telegram_sender_templates', JSON.stringify(this.parent.templates));
            console.log('💾 Message templates saved');
        } catch (error) {
            console.error('❌ Failed to save templates:', error);
        }
    }

    /**
     * ЗАГРУЗКА ШАБЛОНОВ ССЫЛОК ИЗ localStorage
     */
    loadLinkTemplates() {
        try {
            const saved = localStorage.getItem('telegram_sender_link_templates');
            if (saved) {
                this.parent.linkTemplates = JSON.parse(saved);
                console.log('🔗 Loaded link templates:', this.parent.linkTemplates.length, 'templates');
            } else {
                this.parent.linkTemplates = [];
                console.log('🔗 No link templates found');
            }
        } catch (error) {
            console.error('❌ Failed to load link templates:', error);
            this.parent.linkTemplates = [];
        }
    }

    /**
     * СОХРАНЕНИЕ ШАБЛОНОВ ССЫЛОК В localStorage
     */
    saveLinkTemplates() {
        try {
            localStorage.setItem('telegram_sender_link_templates', JSON.stringify(this.parent.linkTemplates));
            console.log('💾 Link templates saved:', this.parent.linkTemplates.length, 'templates');
        } catch (error) {
            console.error('❌ Failed to save link templates:', error);
        }
    }

    /**
     * ЗАГРУЗКА НАСТРОЙКИ АВТОМАТИЧЕСКОГО СОХРАНЕНИЯ
     */
    loadLinkAutoSave() {
        const saved = localStorage.getItem('telegram_sender_link_auto_save');
        this.parent.linkAutoSave = saved !== 'false'; // По умолчанию true, если не установлено false
        console.log('🔗 Loaded auto-save setting:', this.parent.linkAutoSave);
    }

    /**
     * ЗАГРУЗКА ИСТОРИИ РАССЫЛОК ИЗ localStorage
     */
    loadBroadcastHistory() {
        try {
            const saved = localStorage.getItem('telegram_sender_history');
            if (saved) {
                this.parent.broadcastHistory = JSON.parse(saved);
                console.log('📚 Loaded broadcast history:', this.parent.broadcastHistory.length, 'items');
            } else {
                this.parent.broadcastHistory = [];
                console.log('📚 No broadcast history found');
            }
        } catch (error) {
            console.error('❌ Failed to load broadcast history:', error);
            this.parent.broadcastHistory = [];
        }
    }

    /**
     * ЗАГРУЗКА ИСТОРИИ СООБЩЕНИЙ ПОЛЬЗОВАТЕЛЕЙ
     */
    loadUserMessageHistory() {
        try {
            const saved = localStorage.getItem('telegram_sender_user_history');
            if (saved) {
                this.parent.userMessageHistory = JSON.parse(saved);
                console.log('📚 Loaded user message history');
            } else {
                this.parent.userMessageHistory = {};
                console.log('📚 No user message history found');
            }
        } catch (error) {
            console.error('❌ Failed to load user message history:', error);
            this.parent.userMessageHistory = {};
        }
    }

    /**
     * СОХРАНЕНИЕ ИСТОРИИ РАССЫЛОК В localStorage
     */
    saveBroadcastHistory() {
        try {
            localStorage.setItem('telegram_sender_history', JSON.stringify(this.parent.broadcastHistory));
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
            localStorage.setItem('telegram_sender_user_history', JSON.stringify(this.parent.userMessageHistory));
            console.log('💾 User message history saved');
        } catch (error) {
            console.error('❌ Failed to save user message history:', error);
        }
    }

    /**
     * МИГРАЦИЯ ДАННЫХ из старых ключей localStorage
     */
    migrateLegacyData() {
        console.log('🔄 Checking for legacy data migration...');

        let migratedCount = 0;

        // Сохраняем старые ключи для потенциальной миграции
        const legacyKeys = {
            // Старые ключи которые могли использоваться
            'tg_sender_templates': 'telegram_sender_templates',
            'telegram_sender_history_v1': 'telegram_sender_history',
            'sound_settings': 'telegram_sender_sound_settings',
            'tg_sender_link_templates': 'telegram_sender_link_templates'
        };

        // Проверяем каждую старую настройку
        for (const [oldKey, newKey] of Object.entries(legacyKeys)) {
            try {
                const oldData = localStorage.getItem(oldKey);
                if (oldData) {
                    const parsedOldData = JSON.parse(oldData);
                    const newData = localStorage.getItem(newKey);

                    // Если новые данные пустые или старые есть, но новых нет
                    if (!newData || JSON.parse(newData).length === 0) {
                        console.log(`🔄 Migrating ${oldKey} to ${newKey}`);
                        localStorage.setItem(newKey, oldData);
                        localStorage.removeItem(oldKey); // Удаляем старый ключ после успешной миграции
                        migratedCount++;

                        // Дополнительная обработка для разных типов данных
                        if (newKey === 'telegram_sender_templates') {
                            this.parent.templates = parsedOldData;
                            this.saveTemplates();
                        } else if (newKey === 'telegram_sender_sound_settings') {
                            this.parent.notificationSoundSettings = { ...this.parent.notificationSoundSettings, ...parsedOldData };
                            this.saveSoundSettings();
                        } else if (newKey === 'telegram_sender_history') {
                            this.parent.broadcastHistory = parsedOldData;
                            this.saveBroadcastHistory();
                        } else if (newKey === 'telegram_sender_link_templates') {
                            this.parent.linkTemplates = parsedOldData;
                            this.saveLinkTemplates();
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Failed to migrate ${oldKey}:`, error);
            }
        }

        if (migratedCount > 0) {
            console.log(`✅ Successfully migrated ${migratedCount} data entries`);
            this.parent.addToLog(`Восстановлено ${migratedCount} элементов данных из предыдущей версии`);
        } else {
            console.log('✅ No migration needed - data is up to date');
        }

        // Сохраняем метку что миграция завершена
        localStorage.setItem('telegram_sender_migrated_v2', 'true');

        return migratedCount;
    }
}
