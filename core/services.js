// core/services.js - Контейнер зависимостей и фабрика сервисов

import { AppStateManager } from '../store/app-state.js';
import { eventBus } from '../events/event-bus.js';

// Сервис Telegram
class TelegramService {
    constructor(appStateManager, eventBus) {
        this.appState = appStateManager;
        this.eventBus = eventBus;
        this.tg = null;

        // Подписываемся на события о завершении генерации
        this.eventBus.on('generation:completed', this._handleGenerationCompleted.bind(this));
    }

    // Инициализация Telegram WebApp
    async initialize() {
        console.log('📱 Initializing Telegram WebApp service');

        // 🔥 ИЗМЕНЕНИЕ: ЭТО ЖЕНСТАЯ АВТОРИЗАЦИЯ - ОБЯЗАТЕЛЬНО ПОЛУЧАЕМ СВЕЖИЕ ДАННЫЕ ОТ TELEGRAM
        // Сохраненные данные используются ТОЛЬКО если Telegram недоступен (fallback для сессий)

        // Ждем доступности Telegram SDK с большими задержками
        console.log('⏳ Waiting for Telegram SDK to load...');

        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 25; // 5 секунд максимум (25 * 200ms = 5000ms)
            const retryDelay = 200; // каждые 200мс

            const checkWebApp = () => {
                attempts++;
                console.log(`🔍 WebApp check attempt ${attempts}/${maxAttempts}`);

                // Проверяем доступность Telegram SDK
                if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                    console.log('📱 WebApp detected, initializing...');

                    this.tg = window.Telegram.WebApp;
                    this.tg.ready();
                    this.tg.expand();

                    // 🔥 ДОБАВЛЕНО: Сохраняем Telegram объект в appState для использования в webhook
                    this.appState.setTg(this.tg);

                    console.log('📱 WebApp available, initDataUnsafe:', {
                        hasInitData: !!this.tg.initDataUnsafe,
                        hasUser: !!this.tg.initDataUnsafe?.user,
                        userId: this.tg.initDataUnsafe?.user?.id,
                        userFirstName: this.tg.initDataUnsafe?.user?.first_name
                    });

                    // Функция для загрузки пользователя из initDataUnsafe
                    const loadUserFromInitData = () => {
                        if (this.tg.initDataUnsafe?.user) {
                            const user = this.tg.initDataUnsafe.user;
                            this.appState.setUser({
                                id: user.id.toString(),
                                name: user.first_name + (user.last_name ? ' ' + user.last_name : ''),
                                username: user.username || null,
                                language: user.language_code || 'en',
                                isPremium: user.is_premium || false
                            });

                            // 🔥 РЕМОВЕР: УБРАНА ЛОГИКА ИЗМЕНЕНИЯ ЯЗЫКА
                            // DictionaryManager.determineAndSetBaseLanguage() сам решит какой язык использовать
                            console.log(`📱 Telegram language detected: ${user.language_code} (DictionaryManager will decide priority)`);

                            console.log('✅ Telegram user data loaded:', this.appState.user);

                            // 🔥 ДОБАВИЛИ: Обновляем отображение имени и баланса
                            setTimeout(() => {
                                if (window.updateUserNameDisplay) {
                                    window.updateUserNameDisplay();
                                }
                                if (window.updateUserBalanceDisplay && this.appState.user?.credits) {
                                    window.updateUserBalanceDisplay(this.appState.user.credits);
                                }
                            }, 100);

                            // Сохраняем данные для будущих сессий
                            localStorage.setItem('telegram_auth_completed', 'true');
                            localStorage.setItem('telegram_auth_token', 'webapp_' + Date.now());
                            localStorage.setItem('telegram_user_data', JSON.stringify(user));
                            localStorage.setItem('telegram_auth_timestamp', Date.now().toString());

                            return true;
                        }
                        return false;
                    };

                    // Пытаемся загрузить сразу
                    if (loadUserFromInitData()) {
                        resolve(true);
                        return;
                    }

                    // Если initDataUnsafe.user пустой, проверяем URL параметры (fallback)
                    const urlParams = new URLSearchParams(window.location.search);
                    const urlUserId = urlParams.get('user_id');
                    const urlUserData = urlParams.get('user_data');

                    if (urlUserId && urlUserData) {
                        try {
                            console.log('📡 User data from URL params detected');
                            const parsedUserData = JSON.parse(decodeURIComponent(urlUserData));

                            this.appState.setUser({
                                id: parsedUserData.id.toString(),
                                name: parsedUserData.first_name + (parsedUserData.last_name ? ' ' + parsedUserData.last_name : ''),
                                username: parsedUserData.username || null,
                                language: parsedUserData.language_code || 'en',
                                isPremium: parsedUserData.is_premium || false
                            });

                            console.log('✅ Telegram user data loaded from URL:', this.appState.user);

                            // Сохраняем данные
                            localStorage.setItem('telegram_auth_completed', 'true');
                            localStorage.setItem('telegram_auth_token', 'url_' + Date.now());
                            localStorage.setItem('telegram_user_data', JSON.stringify(parsedUserData));
                            localStorage.setItem('telegram_auth_timestamp', Date.now().toString());

                            // Очищаем URL параметры
                            const cleanUrl = window.location.pathname + window.location.hash;
                            window.history.replaceState({}, document.title, cleanUrl);

                            resolve(true);
                            return;
                        } catch (error) {
                            console.error('❌ Error parsing URL user data:', error);
                        }
                    }

                    // Если данных нет ни в initDataUnsafe, ни в URL - пробуем с дополнительными проверками
                    console.log('⏳ No user data found, trying with retry delay');

                    // Начинаем internal retry внутри уже найденного WebApp
                    let internalAttempts = 0;
                    const internalMaxAttempts = 10;

                    const checkWithDelay = () => {
                        internalAttempts++;
                        console.log(`🔄 Internal retry ${internalAttempts}/${internalMaxAttempts}`);

                        if (loadUserFromInitData()) {
                            resolve(true);
                            return;
                        }

                        if (internalAttempts >= internalMaxAttempts) {
                            console.warn('❌ No user data after internal retries');
                            resolve(false); // ПОКАЗАТЬ AUTH SCREEN
                        } else {
                            setTimeout(checkWithDelay, retryDelay);
                        }
                    };

                    setTimeout(checkWithDelay, retryDelay);

                } else if (attempts >= maxAttempts) {
                    console.warn('❌ Telegram WebApp not available after max attempts');
                    resolve(false); // ПОКАЗАТЬ AUTH SCREEN
                } else {
                    setTimeout(checkWebApp, retryDelay);
                }
            };

            // Начальная задержка 1500ms перед первой проверкой (больше времени на загрузку SDK)
            setTimeout(checkWebApp, 1500);
        });
    }

    // Обработчик завершения генерации
    _handleGenerationCompleted(data) {
        console.log('🎯 TelegramService: Generation completed, checking share options');

        // В Telegram можно предложить поделиться результатом
        if (this.tg && data?.image_url) {
            // Отправляем событие о готовности к шарингу
            this.eventBus.emit('telegram:share_ready', {
                imageUrl: data.image_url,
                prompt: data.prompt,
                canShare: this.tg?.platform === 'android' || this.tg?.platform === 'ios'
            });
        }
    }

    // Получение текущего пользователя
    getCurrentUser() {
        return this.appState.user;
    }

    // Проверка премиум статуса
    isPremium() {
        return this.appState.user.isPremium || false;
    }
}

// Сервис локального хранилища
class StorageService {
    constructor(appStateManager) {
        this.appState = appStateManager;
    }

    // Сохранение настроек
    saveSettings() {
        try {
            const data = this.appState.serialize();
            localStorage.setItem('appSettings', JSON.stringify(data));
            console.log('💾 Settings saved to localStorage');
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
        }
    }

    // Загрузка настроек - УПРОЩЕННАЯ! Теперь только получает готовые данные от AppState
    loadSettings() {
        console.log('📋 Services loadSettings: using AppState data (theme already loaded):', this.appState.theme);
        // 🔥 РЕМОВЕР: НЕ ЗАГРУЖАЕМ ТЕМУ СНОВА - AppState уже загрузил её
        // Тема и язык теперь управляются централизованно через AppState
    }

    // Сохранение истории генераций
    saveHistory() {
        try {
            localStorage.setItem('generationHistory', JSON.stringify(this.appState.generationHistory));
            console.log('💾 History saved');
        } catch (error) {
            console.error('❌ Failed to save history:', error);
            // Попытка сохранить в sessionStorage как fallback
            try {
                sessionStorage.setItem('generationHistory', JSON.stringify(this.appState.generationHistory));
            } catch (fallbackError) {
                console.error('Fallback storage also failed:', fallbackError);
            }
        }
    }

    // Загрузка истории генераций
    loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('generationHistory') || '[]');
            this.appState.setGenerationHistory(history);
            console.log('📚 History loaded:', history.length, 'items');
        } catch (error) {
            console.error('❌ Failed to load history:', error);
            this.appState.setGenerationHistory([]);
        }
    }
}

// Сервис уведомлений
class NotificationService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.eventBus.on('notification:show', this.showNotification.bind(this));
    }

    // Показать уведомление
    showNotification(type, message, duration = 3000) {
        // Создаем элемент уведомления
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close">×</button>
        `;

        // Обработчики
        toast.querySelector('.toast-close').onclick = () => this.removeToast(toast);
        toast.onclick = () => this.removeToast(toast);

        // Добавляем на страницу
        document.body.appendChild(toast);

        // Автоматическое скрытие
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }

        console.log(`🔔 Notification shown: ${type} - ${message}`);
    }

    // Удалить уведомление
    removeToast(toast) {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }
}

// Сервис UI эффектов
class UIService {
    constructor() {
        // Сервис для управления UI эффектами и анимациями
    }

    // 🎨 ЭФФЕКТЫ СТЕКЛА
    initGlassmorphismEffects() {
        const cards = document.querySelectorAll('.plan-card');

        cards.forEach((card, index) => {
            // Добавляем анимацию через CSS классы без постоянных inline стилей
            card.classList.add('glassmorphism-animate-in');
            card.style.animationDelay = `${index * 0.2}s`;

            // Через задержку убираем анимационные стили для чистоты
            setTimeout(() => {
                card.classList.remove('glassmorphism-animate-in');
                // Очищаем inline стили анимации
                card.style.animationDelay = '';
            }, 1000 + index * 200); // После завершения анимации + задержка
        });

        console.log('✨ Glassmorphism effects initialized with cleanup');
    }
}

// Фабрика сервисов - получает существующий AppStateManager
export function createAppServices(existingAppState) {
    // 🔥 ИСПРАВЛЕНИЕ: Всегда используем существующий appState, если передан
    // Не создаем новый, если передан existingAppState
    const appState = existingAppState;

    // Создаем сервис событий
    const evBus = eventBus;

    // Создаем сервисы с зависимостями
    const services = {
        appState,
        eventBus: evBus,
        telegram: new TelegramService(appState, evBus),
        storage: new StorageService(appState),
        notifications: new NotificationService(evBus),
        ui: new UIService()
    };

    // Загружаем сохраненные настройки при старте
    services.storage.loadSettings();
    services.storage.loadHistory();

    console.log('✅ App services initialized');
    return services;
}

// Экспорт глобальных экземпляров для совместимости
export let globalServices = null;

export function initializeGlobalServices(existingAppState) {
    if (!globalServices) {
        globalServices = createAppServices(existingAppState);

        // Делаем доступным глобально для legacy поддержки
        if (typeof window !== 'undefined') {
            window.appServices = globalServices;

            // Экспортируем UI функции для глобального доступа (совместимость с plans-modal.js)
            if (globalServices.ui) {
                window.initGlassmorphismEffects = globalServices.ui.initGlassmorphismEffects.bind(globalServices.ui);
            }
        }
    }
    return globalServices;
}
