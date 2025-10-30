/**
 * 🚀 Initialization Manager - Управление запуском приложения
 * Отвечает за загрузку словарей, сервисов, языков
 */

import { initializeGlobalServices } from '../core/services.js';
import { dictionaryManager } from '../dictionary-manager.js';
import { AppStateManager } from '../store/app-state.js';

export class InitializationManager {
    constructor() {
        this.services = null;
        this.appState = null;
        this.isInitialized = false;

        console.log('🚀 Initialization Manager created');
    }

    /**
     * Инициализация критических компонентов
     */
    async initializeCore() {
        console.log('🔧 Starting core initialization...');

        // Фаза 1: Инициализация базового языка и переводов
        await this.initializeBaseLanguageAndTranslations();

        // Фаза 2: Инициализация состояния приложения
        this.appState = new AppStateManager();
        this.appState.initializeDefaults();
        window.appState = this.appState;

        // Фаза 3: Инициализация глобальных сервисов
        await this.initializeGlobalServices();

        // Фаза 4: Инициализация Telegram интеграции
        await this.initializeTelegram();

        // Фаза 5: Завершающие настройки
        await this.finalizeInitialization();

        this.isInitialized = true;
        console.log('✅ Core initialization completed');
    }

    /**
     * Инициализация базового языка и словарей
     */
    async initializeBaseLanguageAndTranslations() {
        try {
            console.log('🌍 Starting language initialization...');

            // Центральзованное определение и установка базового языка
            const baseLanguage = await dictionaryManager.determineAndSetBaseLanguage();

            // Применение переводов
            dictionaryManager.updateTranslations();

            console.log('✅ Language initialized:', baseLanguage);
        } catch (error) {
            console.error('❌ Language initialization failed:', error);
            // Fallback
            try {
                await dictionaryManager.setLanguage('en');
                dictionaryManager.updateTranslations();
            } catch (fallbackError) {
                console.error('❌ Fallback language failed:', fallbackError);
            }
        }
    }

    /**
     * Инициализация глобальных сервисов
     */
    async initializeGlobalServices() {
        try {
            console.log('🔧 Initializing global services...');

            this.services = await initializeGlobalServices(this.appState);
            window.appServices = this.services;

            // Синхронизация состояния авторизации
            if (this.services.appState) {
                this.services.appState.setLanguage(dictionaryManager.currentLanguage);
                console.log('✅ Services initialized and synchronized');
            }
        } catch (error) {
            console.error('❌ Services initialization failed:', error);
            // Fallback с минимумом функциональности
            this.services = this.createFallbackServices();
        }
    }

    /**
     * Fallback сервисы если основные не загрузились
     */
    createFallbackServices() {
        return {
            appState: this.appState,
            eventBus: { emit: () => {}, on: () => {} },
            telegram: { initialize: () => Promise.resolve(false) },
            storage: { get: () => null, set: () => {} },
            notifications: { show: (type, message) => console.log(`[${type}] ${message}`) },
            ui: null
        };
    }

    /**
     * Инициализация Telegram интеграции
     */
    async initializeTelegram() {
        try {
            let telegramInitialized = false;

            if (this.services.telegram) {
                telegramInitialized = await this.services.telegram.initialize();
                console.log('📱 Telegram initialization result:', telegramInitialized);
            }

            // Инициализация негативного промпта чекбокса
            this.initializeNegativePromptCheckbox();

            return telegramInitialized;
        } catch (error) {
            console.error('❌ Telegram initialization failed:', error);
            return false;
        }
    }

    /**
     * Инициализация чекбокса негативного промпта
     */
    initializeNegativePromptCheckbox() {
        const negativePromptCheckbox = document.getElementById('negativePromptCheckbox');
        const negativePromptInput = document.getElementById('negativePromptInput');

        if (negativePromptCheckbox && negativePromptInput) {
            // Дефолтный текст для негативного промпта
            const defaultNegativePrompt = 'blurry, low quality, deformed, ugly, mutated, extra limbs, poorly drawn face, poorly drawn hands';

            negativePromptCheckbox.addEventListener('change', function() {
                const negativePromptFormGroup = document.getElementById('negativePromptFormGroup');

                if (this.checked) {
                    negativePromptFormGroup.style.display = 'block';
                    negativePromptFormGroup.classList.remove('hidden');

                    if (!negativePromptInput.value.trim()) {
                        negativePromptInput.value = defaultNegativePrompt;
                        const negativeCharCounter = document.getElementById('negativeCharCounter');
                        if (negativeCharCounter) {
                            negativeCharCounter.textContent = defaultNegativePrompt.length;
                        }
                    }
                    console.log('📝 Negative prompt field shown');
                } else {
                    negativePromptFormGroup.style.display = 'none';
                    negativePromptFormGroup.classList.add('hidden');
                    console.log('🚫 Negative prompt field hidden');
                }
            });

            negativePromptInput.placeholder = defaultNegativePrompt;
            console.log('✅ Negative prompt checkbox initialized');
        }
    }

    /**
     * Завершающая настройка инициализации
     */
    async finalizeInitialization() {
        // Загрузка сохраненных настроек (только после инициализации сервисов)
        this.appState.loadSettings();
        console.log('🎨 Settings loaded');

        // Maintenance mode проверка
        this.setupMaintenanceMode();
    }

    /**
     * Настройка режима обслуживания
     */
    setupMaintenanceMode() {
        try {
            const CONFIG = window.CONFIG || {};

            // Синхронизация режима обслуживания
            localStorage.setItem('pixplace_maintenance_mode', CONFIG.MAINTENANCE_MODE ? 'true' : 'false');

            // Экспорт для maintenance.html
            window.CONFIG_MAINTENANCE_MODE = CONFIG.MAINTENANCE_MODE;
            window.MAINTENANCE_LAST_UPDATE = new Date().toISOString();

            console.log('🔧 Maintenance mode configured:', CONFIG.MAINTENANCE_MODE);
        } catch (error) {
            console.warn('❌ Maintenance mode setup failed:', error);
        }
    }

    /**
     * Проверка готовности системы
     */
    isReady() {
        return this.isInitialized && this.services;
    }

    /**
     * Очистка ресурсов при shutdown
     */
    async shutdown() {
        console.log('🛑 Initialization Manager shutting down...');

        // TODO: Очистка инициализационных данных если нужно

        console.log('✅ Initialization Manager shutdown complete');
    }
}
