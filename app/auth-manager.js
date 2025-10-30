/**
 * 🔐 Auth Manager - Менеджер авторизации
 * Реализует Telegram Login Widget вместо старой системы с ботом
 */

export class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.widgetInitialized = false;

        // DOM элементы
        this.authModal = null;
        this.authOverlay = null;

        console.log('🔐 Auth Manager created');
    }

    /**
     * Инициализация авторизации
     */
    async initialize() {
        console.log('🔐 Initializing authentication...');

        // Инициализация Telegram Login Widget
        this.initializeTelegramWidget();

        // Проверка существующей авторизации
        await this.checkStoredAuth();

        console.log('✅ Auth Manager initialized');
    }

    /**
     * Финальная инициализация (после готовности DOM)
     */
    async finalizeInitialization() {
        console.log('🔐 Finalizing auth initialization...');

        // Создание модала авторизации после готовности DOM
        this.createAuthModal();

        console.log('✅ Auth finalization complete');
    }

    /**
     * Проверка начальной авторизации
     */
    async checkInitialAuth() {
        try {
            const authCompleted = localStorage.getItem('telegram_auth_completed');
            const userData = localStorage.getItem('telegram_user');

            if (authCompleted === 'true' && userData) {
                const user = JSON.parse(userData);
                console.log('✅ Stored auth found for:', user.first_name);
                this.setAuthenticatedUser(user);
                return;
            }
        } catch (error) {
            console.error('❌ Stored auth check failed:', error);
        }
    }

    /**
     * Инициализация Telegram Login Widget
     */
    initializeTelegramWidget() {
        console.log('🎯 Initializing Telegram Login Widget...');

        // Глобальная функция обратного вызова для настоящего Telegram widget
        window.onTelegramAuth = (user) => {
            console.log('🎉 Real Telegram widget auth callback:', user);
            this.handleWidgetAuth(user);
        };

        this.widgetInitialized = true;
        console.log('✅ Telegram Login Widget initialized');
    }

    /**
     * Обработка авторизации через Login Widget
     */
    handleWidgetAuth(user) {
        console.log('🎉 Widget auth callback received:', user);

        try {
            // Валидация данных пользователя
            if (!this.validateUserData(user)) {
                console.error('❌ Invalid user data from widget');
                return;
            }

            // Сохранение данных
            this.saveAuthData(user);

            // Установка авторизованного пользователя
            this.setAuthenticatedUser(user);

            // Скрытие модала авторизации
            this.hideAuthModal();

            console.log('✅ Widget authentication successful');

        } catch (error) {
            console.error('❌ Widget auth processing failed:', error);
        }
    }

    /**
     * Валидация данных пользователя от widget
     */
    validateUserData(user) {
        if (!user) return false;
        if (!user.id || typeof user.id !== 'number') return false;
        if (!user.first_name && !user.username) return false;

        // Проверка что данные не устаревшие (не старше 24 часов)
        const now = Math.floor(Date.now() / 1000);
        const authDate = user.auth_date || 0;
        if (now - authDate > 24 * 60 * 60) {
            console.warn('⚠️ Auth data is too old');
            return false;
        }

        return true;
    }

    /**
     * Сохранение данных авторизации
     */
    saveAuthData(user) {
        try {
            localStorage.setItem('telegram_auth_completed', 'true');
            localStorage.setItem('telegram_auth_token', user.hash || 'widget_' + Date.now());
            localStorage.setItem('telegram_auth_timestamp', Date.now().toString());
            localStorage.setItem('telegram_user', JSON.stringify(user));

            console.log('💾 Auth data saved to localStorage');
        } catch (error) {
            console.error('❌ Failed to save auth data:', error);
        }
    }

    /**
     * Установка авторизованного пользователя
     */
    setAuthenticatedUser(user) {
        this.currentUser = user;
        this.isAuthenticated = true;

        // Синхронизация с глобальным appState
        if (window.appState) {
            window.appState.userId = user.id;
            window.appState.userName = user.first_name || user.username;
        }

        console.log('👤 User authenticated:', user.first_name || user.username);
    }

    /**
     * Показ модала авторизации
     */
    showAuthModal() {
        console.log('🔐 Showing auth modal...');

        if (this.authModal && this.authOverlay) {
            this.authModal.style.display = 'block';
            this.authOverlay.style.display = 'block';
            document.body.classList.add('auth-modal-open');

            console.log('✅ Auth modal shown with Telegram widget');
        } else {
            console.error('❌ Auth modal not found');
        }
    }

    /**
     * Скрытие модала авторизации
     */
    hideAuthModal() {
        if (this.authModal && this.authOverlay) {
            this.authModal.style.display = 'none';
            this.authOverlay.style.display = 'none';
            document.body.classList.remove('auth-modal-open');

            console.log('✅ Auth modal hidden');
        }
    }

    /**
     * Создание модала авторизации
     */
    createAuthModal() {
        try {
            console.log('🪟 Creating auth modal...');

            // Создание overlay (фон)
            this.authOverlay = document.createElement('div');
            this.authOverlay.className = 'auth-overlay';
            this.authOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                z-index: 9999;
                display: none;
                backdrop-filter: blur(5px);
                cursor: pointer;
            `;

            // Создание модала
            this.authModal = document.createElement('div');
            this.authModal.className = 'auth-modal';
            this.authModal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-primary, #fff);
                border-radius: 20px;
                padding: 40px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                z-index: 10000;
                display: none;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                border: 1px solid var(--border-primary, #e1e1e1);
            `;

            // Контент модала
            this.authModal.innerHTML = `
                <div style="margin-bottom: 30px;">
                    <svg class="logo-img" style="width:80px; height:80px; margin: 0 auto 20px;">
                        <use xlink:href="#pixplace-logo" />
                    </svg>
                    <h2 style="color: var(--text-primary, #333); margin: 0 0 10px 0; font-size: 24px;">
                        Welcome to pixPLace
                    </h2>
                    <p style="color: var(--text-secondary, #666); margin: 0 0 30px 0;">
                        Sign in with Telegram to start creating amazing images
                    </p>
                </div>

                <div class="telegram-login-widget" style="margin: 20px 0;">
                    <!-- Official Telegram Login Widget -->
                    <script async src="https://telegram.org/js/telegram-widget.js?22"
                        data-telegram-login="pixPLacebot"
                        data-size="large"
                        data-radius="15"
                        data-request-access="write"
                        data-onauth="onTelegramAuth(user)"></script>
                </div>

                <div style="margin-top: 30px;">
                    <p style="color: var(--text-secondary, #888); font-size: 14px; margin: 0;">
                        🔒 Your data is secure and private
                    </p>
                </div>
            `;

            // Добавление в DOM
            document.body.appendChild(this.authOverlay);
            document.body.appendChild(this.authModal);

            // Добавление обработчиков закрытия
            this.setupModalCloseHandlers();

            console.log('✅ Auth modal created and added to DOM');

        } catch (error) {
            console.error('❌ Failed to create auth modal:', error);
        }
    }



    /**
     * Настройка обработчиков закрытия модала
     */
    setupModalCloseHandlers() {
        // Закрытие по клику на overlay
        if (this.authOverlay) {
            this.authOverlay.addEventListener('click', (e) => {
                if (e.target === this.authOverlay) {
                    this.hideAuthModal();
                }
            });
        }

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.authModal && this.authModal.style.display !== 'none') {
                this.hideAuthModal();
            }
        });

        console.log('🎯 Modal close handlers set up');
    }

    /**
     * Выход из аккаунта
     */
    logout() {
        console.log('🚪 Logging out...');

        // Очистка данных
        localStorage.removeItem('telegram_auth_completed');
        localStorage.removeItem('telegram_auth_token');
        localStorage.removeItem('telegram_auth_timestamp');
        localStorage.removeItem('telegram_user');

        // Сброс состояния
        this.isAuthenticated = false;
        this.currentUser = null;

        // Перезагрузка страницы для полного сброса
        window.location.reload();
    }

    /**
     * Получение текущего пользователя
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Проверка статуса авторизации
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * Shutdown менеджера
     */
    async shutdown() {
        console.log('🛑 Auth Manager shutting down...');

        // Скрытие модала
        this.hideAuthModal();

        console.log('✅ Auth Manager shutdown complete');
    }
}

// Экспорт для глобального доступа
window.AuthManagerInstance = null;
