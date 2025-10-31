// 🔥 LAZY LOADING словарей - только текущий язык загружается по требованию

// ✅ НОВЫЕ: Импорт сервисов вместо прямых зависимостей
import { initializeGlobalServices } from './core/services.js';
import { AppStateManager } from './store/app-state.js';
import { showScreen, showApp, showResult, displayFullResult, showResultToast, showProcessing, showAuth } from './screen-manager.js';
import { dictionaryManager } from './dictionary-manager.js';

// Импорт ScreenManager для работы с авторизацией
import { updateUserNameDisplay, updateUserBalanceDisplay, showSubscriptionNotice, showWarningAboutNoImage, toggleModeDetails, showHistory, initStyleCarousel } from './navigation-manager.js';
import { readFileAsDataURL, maybeCompressImage, sanitizeJsonString, generateUUIDv4, isIOS, downloadOrShareImage, triggerHapticFeedback } from './utils.js';
import { createCoachButton, initAICoach, createChatButton } from './ai-coach.js';
import { updateHistoryItemWithImage, createLoadingHistoryItem, viewHistoryItem } from './history-manager.js';
import { generationManager } from './parallel-generation.js';
// Import mode management functions with lazy loading support
let modeCardsExports = null;
let costBadgeModule = null;

async function getSelectedModeFromComponent() {
    if (modeCardsExports) {
        return modeCardsExports.getSelectedMode();
    }

    try {
        modeCardsExports = await import('./mode-cards.js');
        return modeCardsExports.getSelectedMode();
    } catch (error) {
        console.error('❌ Failed to load mode-cards to get selected mode:', error);
        // Fallback only to default mode since old select is gone
        return 'photo_session';
    }
}

// ===== Функция для получения текущего выбранного режима =====
async function getCurrentSelectedMode() {
    try {
        return await getSelectedModeFromComponent();
    } catch (error) {
        console.error('❌ Failed to get current selected mode:', error);
        // Fallback - check DOM element as backup
        return document.getElementById('modeSelect')?.value || 'photo_session';
    }
}


// 🚀 Modern AI Image Generator WebApp

/**
 * BYPASS AUTH FLAG
 *
 * 🚧 TEMPORARY WORKAROUND FOR TESTING 🚧
 *
 * Set to true to skip authentication for development/testing.
 * Set back to false before production deployment.
 */
const BYPASS_AUTH = true; // CHANGE TO FALSE BEFORE DEPLOYMENT!

// Configuration
const CONFIG = {
    WEBHOOK_URL: 'https://hook.us2.make.com/x2hgl6ocask8hearbpwo3ch7pdwpdlrk', // ⚠️ ЗАМЕНИТЕ НА ВАШ WEBHOOK!
    CHAT_WEBHOOK_URL: 'https://hook.us2.make.com/xsj1a14x1qaterd8fcxrs8e91xwhvjh6', // ⚠️ ЗАМЕНИТЕ НА WEBHOOK ДЛЯ ЧАТА!
    TIMEOUT: 120000, // 120 секунд
    LANGUAGES: ['en', 'ru', 'es', 'fr', 'de', 'zh', 'pt', 'ar', 'hi', 'ja', 'it', 'ko', 'tr', 'pl', 'vi', 'th'],
    DEFAULT_LANGUAGE: 'en',
    DEFAULT_THEME: 'dark', // 'light', 'dark', 'auto'
    IMGBB_API_KEY: '34627904ae4633713e1fee94a243794e', // только для тестов/прототипа (deprecated - используем Runware)
    RUNWARE_API_KEY: 'jOXX5kq8n10wWpcRFnnScQ0hsNJKWsg2', // ⚠️ ЗАМЕНИТЕ НА ВАШ RUNWARE API KEY!
    MAX_IMAGE_MB: 10,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    PREVIEW_MAX_W: 1024,
    PREVIEW_MAX_H: 1024,
    PREVIEW_JPEG_QUALITY: 0.9,
    TELEGRAM_BOT_URL: 'https://t.me/pixPLaceBot?start=user_shared', // Замените на ссылку вашего бота
    SHARE_DEFAULT_HASHTAGS: '#pixPLaceBot #Telegram #Ai',
    MAINTENANCE_MODE: false // Режим технического обслуживания
};

// 🚀 Экспорт CONFIG для доступа из других модулей (ai-coach.js)
window.CONFIG = CONFIG;

// 🔥 АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ MAINTENANCE_MODE В LOCALSTORAGE ДЛЯ ДОСТУПА ИЗ ДРУГИХ СТРАНИЦ
try {
    localStorage.setItem('pixplace_maintenance_mode', CONFIG.MAINTENANCE_MODE ? 'true' : 'false');
    console.log('💾 Maintenance mode saved to localStorage:', CONFIG.MAINTENANCE_MODE);
} catch (error) {
    console.warn('❌ Could not save maintenance mode to localStorage:', error);
}

// 🎯 Global state - теперь используем AppStateManager из модуля store/app-state.js
const appState = new AppStateManager();

// Экспортируем appState в window для доступа из параллельной генерации
window.appState = appState;

    // 🔥 ДОБАВЛЕНИЕ: Инициализация дефолтных значений в localStorage при первом запуске
appState.initializeDefaults();

// 🔥 ПЕРЕНОСИМ loadSettings ПОЗЖЕ: загружаем настройки ПЕРЕД ПОКАЗОМ UI
// appState.loadSettings(); // УБРАНО СЮДА - NOW AFTER DOM LOADED



// 🔥 ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ЯЗЫКА И ПЕРЕВОДОВ (будет вызвана синхронно до показа UI)
async function initBaseLanguageAndTranslations() {
    try {
        console.log('🚀 Starting app initialization with centralized language detection...');

        // 🔥 ЦЕНТРАЛИЗОВАННЫЙ МЕТОД: ОПРЕДЕЛЯЕМ И УСТАНАВЛИВАЕМ БАЗОВЫЙ ЯЗЫК ОДИН РАЗ
        const baseLanguage = await dictionaryManager.determineAndSetBaseLanguage();

        console.log('✅ Base translations initialized centrally for language:', baseLanguage);

        // 🔥 ПРОВЕРКА: Проверим что заполнилось в window.TRANSLATIONS
        console.log('🔍 window.TRANSLATIONS check:', {
            hasTRANSLATIONS: !!window.TRANSLATIONS,
            languages: window.TRANSLATIONS ? Object.keys(window.TRANSLATIONS) : [],
            currentLang: dictionaryManager.currentLanguage,
            translationsCount: window.TRANSLATIONS?.[dictionaryManager.currentLanguage]
                ? Object.keys(window.TRANSLATIONS[dictionaryManager.currentLanguage]).length
                : 0
        });

        // 🔥 ОБНОВИТЬ ПЕРЕВОДЫ НЕМЕДЛЕННО после установки языка
        dictionaryManager.updateTranslations();
        console.log('✅ Translations updated after base language set');

    } catch (error) {
        console.error('❌ Failed to initialize base translations centrally:', error);
        // В крайнем случае - хотя бы English
        try {
            await dictionaryManager.setLanguage('en');
            dictionaryManager.updateTranslations();
        } catch (fallbackError) {
            console.error('❌ Even fallback language failed:', fallbackError);
        }
    }
}

// ⚡ Ultra-Fast Global Image Loading Manager - Max Performance
class GlobalHistoryLoader {
    constructor() {
        // Singleton pattern - only one Observer per app
        if (GlobalHistoryLoader.instance) {
            return GlobalHistoryLoader.instance;
        }

        this.imageObserver = new IntersectionObserver(
            this.handleIntersection.bind(this),
            {
                rootMargin: '150px', // еще шире для гарантированного захвата видимых элементов
                threshold: [0.01, 0.005, 0.001], // ультра-агрессивные пороги для любого намека видимости
                root: null, // viewport
            }
        );

        // Оптимизированные registry с Map для O(1) доступа
        this.observedImages = new Map();
        this.loadingQueue = new Set();
        this.maxConcurrent = 12; // ограничиваем одновременные загрузки (увеличено для максимальной скорости)
        this.pendingQueue = []; // очередь ожидающих загрузки
        this.logout = false;

        // Новое: конфигурация для eager loading маленьких списков
        this.eagerLoadingLimit = 50; // для списков до 50 изображений - eager loading

        GlobalHistoryLoader.instance = this;
        console.log('🚀 Ultra-Fast Global History Loader initialized with aggressive loading');
    }

    handleIntersection(entries, observer) {
        if (this.logout) return;

        // Убираем спам - логируем только если много записей (предупреждение о перегрузке)
        if (entries.length > 10) {
            console.warn('⚡ IntersectionObserver triggered:', entries.length, 'entries - performance warning');
        }

        // Оптимизированная обработка с агрессивными порогами для максимальной скорости загрузки
        const highPriorityEntries = [];
        const normalPriorityEntries = [];
        const lowPriorityEntries = [];
        const invisibleEntries = [];

        for (const entry of entries) {
            // Убираем спам - логируем только в 2% случаев и только базовую информацию
            if (Math.random() < 0.02) {
                console.log('📊 Entry intersection:', entry.intersectionRatio.toFixed(3));
            }

            if (entry.isIntersecting) {
                // Высокий приоритет - изображения даже с минимальной видимостью (1%+ для скорости)
                if (entry.intersectionRatio >= 0.01) {
                    highPriorityEntries.push(entry);
                }
                // Нормальный приоритет - очень слабая видимость (0.5%+)
                else if (entry.intersectionRatio >= 0.005) {
                    normalPriorityEntries.push(entry);
                }
                // Низкий приоритет - минимальная видимость (0.1%+)
                else if (entry.intersectionRatio > 0.001) {
                    lowPriorityEntries.push(entry);
                }
            } else {
                invisibleEntries.push(entry);
            }
        }

        // Обрабатываем с высоким приоритетом вначале
        if (highPriorityEntries.length > 0 || normalPriorityEntries.length > 0) {
            console.log('🎯 Processing high/normal priority images:', highPriorityEntries.length + normalPriorityEntries.length);
            this.processVisibleImages([...highPriorityEntries, ...normalPriorityEntries]);
        }

        // Низкий приоритет обрабатываем с задержкой
        if (lowPriorityEntries.length > 0) {
            setTimeout(() => {
                console.log('🎯 Processing low priority images:', lowPriorityEntries.length);
                this.processVisibleImages(lowPriorityEntries);
            }, 200);
        }

        // Очищаем невидимые изображения (низкий приоритет)
        if (invisibleEntries.length > 0) {
            setTimeout(() => {
                this.cleanupInvisibleImages(invisibleEntries);
            }, 1000); // отложенная очистка
        }
    }

    processVisibleImages(entries) {
        console.log(`👁️ Processing ${entries.length} visible images`);

        for (const entry of entries) {
            const img = entry.target;

            // Быстрая проверка через Map
            if (!this.observedImages.has(img)) continue;

            // Уже загруженные пропускаем
            if (img.src && !img.dataset.src) {
                this.safeUnobserve(img);
                continue;
            }

            // Ленивая загрузка только если есть src для загрузки
            if (img.dataset.src && !this.loadingQueue.has(img)) {
                this.startLoading(img);
            }
        }
    }

    startLoading(img) {
        const container = img.closest('.history-mini');

        // Пропускаем загрузку если контейнер поврежден или еще загружается
        if (!container || container.classList.contains('history-loading')) {
            return;
        }

        // Если превышен лимит параллельных загрузок - добавляем в очередь
        if (this.loadingQueue.size >= this.maxConcurrent) {
            this.pendingQueue.push(img);
            return;
        }

        this.loadingQueue.add(img);

        // Установка src с обработкой ошибок
        const loadPromise = new Promise((resolve, reject) => {
            img.onload = () => {
                img.classList.add('loaded');
                delete img.dataset.src; // очищаем data-src
                console.log('✅ Image loaded successfully');
                resolve();
            };

            img.onerror = () => {
                console.warn('❌ Image load failed - showing placeholder');
                const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMvb3JnLzIwMDAvc3ZnIj4KPGRlZnM+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+LmV4cGlyZWQtdGV4dHtiYTpnZW5lcmFsIFNhbnMsQXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7Zm9udC1zaXplOiAxNHB4O2ZpbGw6ICM5OTk5OTk7fTwvc3R5bGU+CjwvZGVmcz4KPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y0ZjRmNCIvPgo8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZHk9Ii4zNWVtIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBjbGFzcz0iZXhwaXJlZC10ZXh0IiBzdHlsZT0iYXVjLWFncmlkLXJvd3M6IHNwYW4gMS8yOyB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlOyBvcGFjaXR5OiAwLjg7Ij5FeHBpcmVkPC90ZXh0PiAKPC9zdmc+';
                img.src = placeholder;
                resolve();
            };

            // Запуск загрузки
            img.src = img.dataset.src;
        });

        loadPromise.finally(() => {
            this.loadingQueue.delete(img);
            this.safeUnobserve(img);

            // Обработать следующий из очереди, если есть место
            if (this.pendingQueue.length > 0 && this.loadingQueue.size < this.maxConcurrent) {
                const nextImg = this.pendingQueue.shift();
                this.startLoading(nextImg);
            }
        });
    }

    cleanupInvisibleImages(entries) {
        for (const entry of entries) {
            const img = entry.target;

            // Оставляем наблюдаемыми если изображение еще не загрузилось
            if (img.dataset.src && !img.src) {
                continue;
            }

            // Оставляем наблюдаемыми если они в очереди загрузки
            if (this.loadingQueue.has(img)) {
                continue;
            }

            // Безопасное отключение наблюдения
            this.safeUnobserve(img);
        }
    }

    // 🔧 ДОБАВЛЕНИЕ: Метод для eager загрузки изображений на первой странице
    loadEagerForElement(element) {
        if (!element) return;

        const img = element.querySelector('img[data-src]');
        if (!img || !img.dataset.src) return;

        // Немедленная загрузка без IntersectionObserver
        this.startLoading(img);

        console.log(`⚡ Eager loaded image: ${img.dataset.src}`);
    }

    // 🆕 ДОБАВЛЕНИЕ: Принудительная загрузка всех видимых превью истории
    forceLoadVisibleHistoryPreviews() {
        const historyList = document.getElementById('historyList');
        if (!historyList || historyList.classList.contains('hidden')) {
            console.log('📋 История истории скрыта или не найдена, пропускаем force load');
            return;
        }

        // Найдём все img[data-src] в видимых элементах истории
        const visibleImages = historyList.querySelectorAll('.history-mini img[data-src]');
        if (visibleImages.length === 0) {
            console.log('📋 Нет превью для загрузки в истории');
            return;
        }

        console.log(`🎯 Force loading ${visibleImages.length} history previews`);

        // Загрузим все подряд, игнорируя лимит concurrent
        visibleImages.forEach(img => {
            if (img.dataset.src && !img.src) {
                this.startLoading(img);
            }
        });

        console.log('✅ Force load completed');
    }

    observe(img) {
        if (!img || img.nodeType !== 1) return; // проверка что элемент существует

        // Быстрая проверка через Map
        if (this.observedImages.has(img)) return;

        this.imageObserver.observe(img);
        this.observedImages.set(img, true);

        console.log(`👁️ Started observing image: ${img.src || img.dataset.src}`);
    }

    safeUnobserve(img) {
        if (!img || !this.observedImages.has(img)) return;

        try {
            this.imageObserver.unobserve(img);
            this.observedImages.delete(img);
        } catch (error) {
            console.warn('Failed to unobserve image:', error);
        }
    }

    // 🔧 ДОБАВЛЕНИЕ: Оптимизированная массовая очистка с улучшенной проверкой
    massCleanup() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        const currentImages = historyList.querySelectorAll('.history-mini img');
        const validImageSet = new WeakSet(Array.from(currentImages));

        let cleanupCount = 0;
        let maxObserversExceeded = 0;

        // 🔧 ИСПРАВЛЕНИЕ: Ограничение количества активных наблюдателей для производительности
        const MAX_ACTIVE_OBSERVERS = 40; // увеличено до 40 для больших страниц

        // Проходим по всем наблюдаемым элементам
        for (const [img] of this.observedImages) {
            // Удаляем если элемент больше не существует или не в истории
            if (!img || !img.isConnected || !validImageSet.has(img)) {
                this.safeUnobserve(img);
                cleanupCount++;
            } else if (this.observedImages.size > MAX_ACTIVE_OBSERVERS && !img.dataset.src) {
                // 🔧 ИСПРАВЛЕНИЕ: Уменьшаем количество активных наблюдателей для производительности (только загруженные)
                this.safeUnobserve(img);
                maxObserversExceeded++;
            }
        }

        // Очищаем очередь загрузки от несуществующих элементов
        for (const img of this.loadingQueue) {
            if (!img || !img.isConnected) {
                this.loadingQueue.delete(img);
                cleanupCount++;
            }
        }

        if (cleanupCount > 0 || maxObserversExceeded > 0) {
            console.log(`🧹 Enhanced Mass cleanup: ${cleanupCount} elements removed, ${maxObserversExceeded} observers trimmed (max: ${MAX_ACTIVE_OBSERVERS})`);
        }
    }

    // 🔧 ДОБАВЛЕНИЕ: Метод для полного уничтожения и очистки всех ресурсов
    destroy() {
        // Отключаем IntersectionObserver
        if (this.imageObserver) {
            this.imageObserver.disconnect();
            console.log('🎯 IntersectionObserver disconnected');
        }

        // Очищаем все наблюдаемые изображения
        for (const [img] of this.observedImages) {
            this.safeUnobserve(img);
        }

        this.observedImages.clear();
        this.loadingQueue.clear();
        this.pendingQueue = [];
        this.logout = true;

        console.log('🧹 GlobalHistoryLoader fully destroyed');
    }
}

// Global instance
const globalHistoryLoader = new GlobalHistoryLoader();

// ⚡ Smart History Management with Virtualization
class HistoryManager {
    static PAGE_SIZE = 20; // количество элементов на страницу
    static CACHE_SIZE = 100; // размер кэша DOM элементов

    // Кэш DOM элементов для переиспользования
    static elementCache = new Map();
    static currentPage = 0;
    static maxLoadedPage = 0;
    static isLoadingPage = false;

    static getVisibleItems(limit = 15) {
        // Фильтруем только элементы с валидными результатами (исключаем undefined/null)
        const validItems = appState.generationHistory.filter(item =>
            item.result &&
            typeof item.result === 'string' &&
            item.result.trim() !== '' &&
            item.result !== 'undefined'
        );

        return validItems.slice(0, limit);
    }

    static getValidItemsOnly() {
        return appState.generationHistory.filter(item =>
            item.result &&
            typeof item.result === 'string' &&
            item.result.trim() !== '' &&
            item.result !== 'undefined'
        );
    }

    static getItemsForPage(page) {
        const validItems = this.getValidItemsOnly();
        const start = page * this.PAGE_SIZE;
        const end = start + this.PAGE_SIZE;
        return validItems.slice(start, end);
    }

    static getTotalPages() {
        const validCount = this.getValidItemsOnly().length;
        return Math.ceil(validCount / this.PAGE_SIZE);
    }

    static hasMorePages(page) {
        return page < this.getTotalPages() - 1;
    }

    // 🔧 ДОБАВЛЕНИЕ: функция для проверки, есть ли еще элементы после текущей страницы для показа кнопки
    static hasMoreItemsAfter(page, itemsPerPage, validItems) {
        const currentEndIndex = (page + 1) * itemsPerPage; // индекс конца текущей страницы (например page=0, itemsPerPage=6 -> индекс 6)
        return currentEndIndex < validItems.length; // проверяем есть ли элементы дальше
    }

    static getTotalCount() {
        return appState.generationHistory.length;
    }

    static needsShowMore(limit = 15) {
        const validCount = this.getValidItemsOnly().length;
        return validCount > limit;
    }

    static getValidTotalCount() {
        return this.getValidItemsOnly().length;
    }

    // Метод для создания/получения кэшированного DOM элемента с защитой от утечек
    static createHistoryItemElement(item, forceNoCache = false) {
        // 🔧 ИСПРАВЛЕНИЕ: Упрощенная генерация cacheKey для избежания лишних промахов кеша
        // Используем только основные данные: ID и результат (без лишних параметров)
        const cacheKey = `hist_${item.id}_${item.result || 'no-result'}`;

        // Убираем спам логирования - логируем только в 1% случаев для отладки
        if (Math.random() < 0.01) {
            console.log(`🔑 Generated cacheKey: ${cacheKey} for item ${item.id}`);
        }

        // Сначала проверяем кэш (если кэширование не отключено)
        if (!forceNoCache && this.elementCache.has(cacheKey)) {
            // Убираем спам в консоль - логируем только в 1% случаев
            if (Math.random() < 0.01) {
                console.log(`✅ Cache hit for item ${item.id}`);
            }
            return this.elementCache.get(cacheKey).cloneNode(true);
        }

        // Убираем спам логирования - только в 5% случаев для отслеживания промахов
        if (Math.random() < 0.05) {
            console.log(`📦 Cache miss for item ${item.id}, creating new element`);
        }

        // Создаем новый элемент
        const element = this.createHistoryItemElementFromScratch(item);

        // Добавляем в кэш если статус финальный (success/error) и кэширование не отключено
        if (!forceNoCache && (item.status === 'success' || item.status === 'error')) {
            // 🔧 ИСПРАВЛЕНИЕ: Автоматическая очистка при 80% заполнения (раньше было > CACHE_SIZE)
            if (this.elementCache.size >= Math.floor(this.CACHE_SIZE * 0.8)) {
                this.autoCleanupCache();
            }

            this.elementCache.set(cacheKey, element.cloneNode(true));

            // 🔧 ИСПРАВЛЕНИЕ: Очищаем уже существующие кэшированные элементы чтобы избежать переполнения
            if (this.elementCache.size > this.CACHE_SIZE) {
                this.forceCleanupOldElements(5); // очищаем 5 самых старых элементов
            }

            console.log(`💾 Cached element for ${cacheKey}, cache size: ${this.elementCache.size}/${this.CACHE_SIZE}`);
        }

        return element;
    }

    // 🔧 ДОБАВЛЕНИЕ: Автоматическая очистка кэша элементов по LRU принципу
    static autoCleanupCache() {
        const currentSize = this.elementCache.size;
        if (currentSize < Math.floor(this.CACHE_SIZE * 0.7)) return; // не очищаем если меньше 70%

        const keysToRemove = Math.floor(currentSize * 0.2); // очищаем 20% самых старых
        this.forceCleanupOldElements(keysToRemove);

        console.log(`🧹 Auto-cleaned history cache: ${currentSize} → ${this.elementCache.size}`);
    }

    // 🔧 ДОБАВЛЕНИЕ: Принудительная очистка старых элементов кэша
    static forceCleanupOldElements(count = 1) {
        const keys = Array.from(this.elementCache.keys());
        for (let i = 0; i < Math.min(count, keys.length); i++) {
            this.elementCache.delete(keys[i]);
        }
    }

    static createHistoryItemElementFromScratch(item) {
        const element = document.createElement('div');
        element.className = 'history-mini';
        element.id = `history-${item.id}`;
        element.onclick = () => viewHistoryItem(item.id);

        element.innerHTML = `
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIj48L3JlY3Q+PC9zdmc+"
                 data-src="${item.result || ''}"
                 alt="Generated"
                 class="lazy-loading"
                 loading="lazy"
                 decoding="async"
                 ${item.result ? '' : 'style="opacity: 0.7;"'}
                 />
            <p class="history-caption">${new Date(item.timestamp).toLocaleDateString()} | ${appState.translate('style_' + item.style)} | ${appState.translate('mode_' + item.mode)}</p>
        `;

        return element;
    }

    // Метод для очистки кэша
    static clearCache() {
        this.elementCache.clear();
        this.currentPage = 0;
        this.maxLoadedPage = 0;
        this.isLoadingPage = false;
        console.log('🧹 History cache cleared');
    }
}



// 🎯 Utility Functions
// showToast функция теперь импортируется из screen-manager.js

    // Экспортируем другие функции для параллельной генерации
    // window.showResult убираем - теперь используем только showResultToast и displayFullResult
    window.showResultToast = showResultToast;
    window.sendToWebhook = sendToWebhook;

    // Показ результатов через ScreenManager

    // Удаляем дубликаты функций, которые теперь в history-manager.js

    // Проверяем импортированные функции на доступность
    console.log('🔧 Checking imported functions availability:');
    console.log('- showWarningAboutNoImage:', typeof showWarningAboutNoImage);
    console.log('- showScreen, showApp, showResult, displayFullResult:', typeof showScreen, typeof showApp, typeof showResult, typeof displayFullResult);
    console.log('- updateUserNameDisplay, updateUserBalanceDisplay:', typeof updateUserNameDisplay, typeof updateUserBalanceDisplay);
    console.log('- readFileAsDataURL, maybeCompressImage:', typeof readFileAsDataURL, typeof maybeCompressImage);
    console.log('- updateHistoryItemWithImage:', typeof updateHistoryItemWithImage);
    console.log('- createLoadingHistoryItem:', typeof createLoadingHistoryItem);
    console.log('- viewHistoryItem:', typeof viewHistoryItem);

    // 🔥 ИНИЦИАЛИЗАЦИЯ ТЕКСТА КНОПКИ ИСТОРИИ
    setTimeout(() => {
        const historyBtn = document.getElementById('historyToggleBtn');
        if (historyBtn && appState && appState.translate) {
            historyBtn.textContent = appState.translate('history_toggle');
            console.log('✅ History button text initialized:', historyBtn.textContent);
        }
    }, 100);

function triggerHaptic(type) {
    if (appState.tg?.HapticFeedback) {
        switch (type) {
            case 'light':
                appState.tg.HapticFeedback.impactOccurred('light');
                break;
            case 'medium':
                appState.tg.HapticFeedback.impactOccurred('medium');
                break;
            case 'heavy':
                appState.tg.HapticFeedback.impactOccurred('heavy');
                break;
            case 'success':
                appState.tg.HapticFeedback.notificationOccurred('success');
                break;
            case 'error':
                appState.tg.HapticFeedback.notificationOccurred('error');
                break;
        }
    }
}


// 📊 Processing Animation
function updateProgressBar(elapsed) {
    const progressBar = document.querySelector('.progress-bar');
    const progressFill = document.querySelector('.progress-fill');

    if (progressBar && progressFill) {
        // Примерный прогресс на основе времени (0-100%)
        const maxTime = 60; // максимальное ожидаемое время в секундах
        const progress = Math.min((elapsed / maxTime) * 100, 100);
        progressFill.style.width = progress + '%';
    }

    // Обновить круговой прогресс, если есть
    const progressCircle = document.querySelector('.progress-circle');
    if (progressCircle) {
        const circumference = 283; // окружность круга
        const progress = Math.min((elapsed / 60) * 100, 100);
        const offset = circumference - (progress / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }
}
function startTimer() {
    const elapsedTimeElement = document.getElementById('elapsedTime');
    let step = 1;

    appState.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - appState.startTime) / 1000);
        if (elapsedTimeElement) {
            elapsedTimeElement.textContent = elapsed + 's';
        }
        updateProgressBar(elapsed);
        // Update steps based on time

    }, 1000);
}

function stopTimer() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
}

// 📋 History Management moved to history-manager.js

// And all history-related functions moved to history-manager.js module

// 🖼️ UI Initialization
// 🎬 Screen Management with cleanup
let carouselCleanup = null;

const showLoadingScreen = () => {
    document.getElementById('loadingScreen').classList.add('active');
};

const hideLoadingScreen = () => {
    document.getElementById('loadingScreen').classList.remove('active');
};

// Cleanup function for memory leaks
function cleanupMemoryLeaks() {
    // Disconnect Global History Loader
    if (globalHistoryLoader) {
        globalHistoryLoader.destroy();
    }

    // Clear any pending timers
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }

    // Remove carousel event listeners
    if (carouselCleanup) {
        carouselCleanup();
        carouselCleanup = null;
    }

    console.log('🧹 Memory leaks cleaned up successfully - including global history loader');
}

// Call cleanup on page unload
window.addEventListener('beforeunload', cleanupMemoryLeaks);

/* Фунция showApp была вынесена в screen-manager.js */





// ⚡ ТОСТ-НОТИФИКАЦИИ ДЛЯ НОВЫХ РЕЗУЛЬТАТОВ (БЕЗ ПРЕРЫВАНИЯ ПОЛНОГО ПРОСМОТРА)
let pendingResults = []; // Ожидающие результаты для показа в тостах

// 🔥 ЭКСПОРТ КРИТИЧЕСКОЙ ФУНКЦИИ onUserImageChange ДЛЯ ДОСТУПА ИЗ ДРУГИХ МОДУЛЕЙ
window.onUserImageChange = onUserImageChange;

console.log('✅ onUserImageChange exported to global window scope');

// 🔥 ЭКСПОРТ createPreviewItem ДЛЯ ДОСТУПА ИЗ user-account.js
window.createPreviewItem = createPreviewItem;

console.log('✅ createPreviewItem exported to global window scope');


function showGeneration() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });

    const gen = document.getElementById('generationScreen');
    if (!gen) {
        console.warn('generationScreen не найден');
        return;
    }

    gen.classList.remove('hidden');
    gen.classList.add('active');

    showBackButton(false);

    // 🆕 ДОБАВЛЕНИЕ: Обновление отображения истории для принудительной загрузки превью при возврате на генерацию
    // Используем функцию из history-manager.js
    import('./history-manager.js').then(module => {
        module.updateHistoryDisplay();
    });

    // Принудительная загрузка превью истории при возврате на генерацию
    setTimeout(() => {
        if (globalHistoryLoader) {
            globalHistoryLoader.forceLoadVisibleHistoryPreviews();
        }
    }, 50);
}


// 🎨 UI Initialization with Lazy Loading
async function initializeUI() {
    // Character counter for prompt
    const promptInput = document.getElementById('promptInput');
    const charCounter = document.getElementById('charCounter');

    if (promptInput && charCounter) {
        promptInput.addEventListener('input', function () {
            charCounter.textContent = this.value.length;

            // Auto-resize
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }

    // Character counter for negative prompt
    const negativePromptInput = document.getElementById('negativePromptInput');
    const negativeCharCounter = document.getElementById('negativeCharCounter');

    if (negativePromptInput && negativeCharCounter) {
        negativePromptInput.addEventListener('input', function () {
            negativeCharCounter.textContent = this.value.length;

            // Auto-resize (smaller maximum for negative prompt)
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px'; // Max 120px height
        });
    }

    // Form submission
    const form = document.querySelector('.generation-form');
    if (form) {
        form.addEventListener('submit', generateImage);
    }

    // 🎯 LAZY LOAD: Initialize Mode Cards Component and Cost Badge
    try {
        console.log('🎯 Lazy loading Mode Cards component...');
        const modeCardsModule = await import('./mode-cards.js');
        modeCardsExports = modeCardsModule; // Сохраняем ссылку на модуль
        const { initOnDemand } = modeCardsModule;
        initOnDemand();
        console.log('✅ Mode Cards component loaded and initialized');

        // 🎯 LAZY LOAD: Initialize Cost Badge Module
        console.log('💰 Lazy loading Cost Badge module...');
        const costBadgeModule = await import('./cost-badge.js');
        await costBadgeModule.initCostBadge({
            modeCardsModule: { getSelectedMode: modeCardsExports.getSelectedMode },
            userImageState: userImageState
        });
        console.log('✅ Cost Badge module loaded and initialized');

        // 🎯 LAZY LOAD: Initialize Style Management Module
        console.log('🎨 Lazy loading Style Management module...');
        const styleManagementModule = await import('./style-management.js');
        styleManagementModule.initStyleCheckboxHandler();
        console.log('✅ Style Management module loaded and initialized');

        // 🎯 LAZY LOAD: Initialize Style Carousel
        console.log('🎨 Lazy loading Style Carousel...');
        await initStyleCarousel();
        console.log('✅ Style Carousel initialized with lazy loading');

    } catch (error) {
        console.error('❌ Failed to load Mode Cards or Cost Badge components:', error);
        // Fallback to legacy initialization
        console.log('🔄 Fallback: trying legacy mode carousel initialization');
        try {
            initModeCarousel();
        } catch (legacyError) {
            console.error('❌ Legacy mode carousel also failed:', legacyError);
        }
    }

    // 🚀 Initialize user account and update mode selection
    if (window.initUserAccount) {
        window.initUserAccount();
    }

    // 🔧 Обновление функции updateModeSelection из navigation-manager после инициализации UI
    if (modeCardsExports && modeCardsExports.getSelectedMode) {
        try {
            const currentMode = modeCardsExports.getSelectedMode();
            if (currentMode && window.updateModeSelection) {
                window.updateModeSelection(currentMode);
                console.log('✅ updateModeSelection called with current mode:', currentMode);
            }
        } catch (error) {
            console.error('❌ Failed to get current mode for updateModeSelection:', error);
        }
    }

    console.log('✅ UI initialized with lazy loading');
}



// ===== Пользовательское изображение: состояние =====
const userImageState = {
    images: [] // массив объектов {id, file, dataUrl, uploadedUrl} - до 4 изображений
};

// 🔥 ЭКСПОРТ СОСТОЯНИЯ ДЛЯ ДОСТУПА ИЗ ДРУГИХ МОДУЛЕЙ
window.userImageState = userImageState;
console.log('✅ userImageState exported to window scope');

// ===== Функции проверки лимитов изображений =====
function getImageLimitForMode(mode) {
    switch (mode) {
        case 'photo_session':
            return 4; // до 4 изображений для nano banana
        case 'fast_generation':
            return 0; // вообще не допускаются изображения для flux shnel
        default:
            return 1; // все остальные режимы - максимум 1 изображение
    }
}

function canUploadMoreImages(mode, currentCount) {
    const limit = getImageLimitForMode(mode);
    return currentCount < limit;
}


// ===== Глобальная функция для обновления видимости UI загрузки изображений =====
function updateImageUploadVisibility() {
    const chooseBtn = document.getElementById('chooseUserImage');
    const preview = document.getElementById('userImagePreview');
    const imageCount = userImageState.images.length;
    const hasImages = imageCount > 0;

    const modeSelect = document.getElementById('modeSelect');
    let shouldShowUploadButton, shouldShowPreview;

    if (modeSelect) {
        const currentMode = modeSelect.value;

        // 🔥 ИСПРАВЛЕНИЕ: снимаем моргание кнопки! Она должна скрыться сразу как появляется превью
        shouldShowUploadButton = !hasImages && (currentMode !== 'fast_generation');

        if (currentMode === 'fast_generation') {
            // Flux Shnel: кнопку и превью НЕ видим всегда
            shouldShowPreview = false;

            // УДАЛЯЕМ ВСЕ ИЗОБРАЖЕНИЯ при переключении на этот режим
            if (hasImages) {
                console.log('🗑️ Удаляем все изображения в режиме Fast Generation');
                clearAllImages();
                return; // повторим вызов функции после очистки
            }

            console.log(`⚡ Flux Shnel режим: кнопка скрыта, превью скрыто (удалены все изображения)`);
        } else if (currentMode === 'photo_session') {
            // Nano Banana: превью видно с изображениями
            shouldShowPreview = hasImages;
            console.log(`${!hasImages ? '📸' : '❌'} Photo Session режим: кнопка ${shouldShowUploadButton ? 'видна' : 'скрыта'} (пока нет превью)`);
        } else {
            // Другие режимы: превью видно с изображениями
            shouldShowPreview = hasImages;

            // УДАЛЯЕМ ЛИШНИЕ ИЗОБРАЖЕНИЯ до лимита 1 при переключении на эти режимы
            if (imageCount > 1) {
                console.log(`🗑️ Удаляем лишние изображения в режиме ${currentMode} (оставляем только 1)`);
                trimImagesToLimit(1);
                return; // повторим вызов функции после очистки
            }

            console.log(`${!hasImages ? '🎨' : '❌'} Другой режим (${currentMode}): кнопка ${shouldShowUploadButton ? 'видна' : 'скрыта'} (пока нет превью)`);
        }
    } else {
        // Без режима - кнопка видна только без изображений, превью показывается
        shouldShowUploadButton = !hasImages;
        shouldShowPreview = hasImages;
    }

    // Применяем видимость кнопки
    if (chooseBtn) {
        if (shouldShowUploadButton) {
            chooseBtn.style.setProperty('display', 'inline-flex', 'important');
            chooseBtn.classList.remove('flux-shnel-hidden');
            // 🔥 ФИКС: убираем анимацию моргания сразу как кнопка должна быть показана
            chooseBtn.style.animation = '';
            console.log('✅ Кнопка загрузки ВИДИМА (без моргания)');
        } else {
            chooseBtn.style.setProperty('display', 'none', 'important');
            chooseBtn.classList.add('flux-shnel-hidden');
            // 🔥 ФИКС: убираем анимацию моргания сразу как кнопка скрыта
            chooseBtn.style.animation = '';
            console.log('🚫 Кнопка загрузки СКРЫТА (удалили моргание)');
        }
    }

    // Применяем видимость превью
    if (preview) {
        if (shouldShowPreview) {
            preview.classList.remove('flux-shnel-hidden', 'hidden');
            preview.style.setProperty('display', 'block', 'important');
            console.log('✅ Превью изображений ВИДИМО');
        } else {
            preview.style.setProperty('display', 'none', 'important');
            preview.classList.add('flux-shnel-hidden');
            console.log('🚫 Превью изображений СКРЫТО');
        }
    }

    console.log('📊 ИТОГОВАЯ ВИДИМОСТЬ:', {
        режим: modeSelect?.value,
        количество_изображений: userImageState.images.length, // актуальное после возможной очистки
        кнопка_видна: shouldShowUploadButton,
        превью_видно: shouldShowPreview,
        действие: 'обновлено'
    });

    // Обновляем видимость маленькой кнопки внутри превью
    updateInnerUploadButtonVisibility();
}

window.updateImageUploadVisibility = updateImageUploadVisibility;
window.updatePromptVisibility = updatePromptVisibility;
window.updateSizeSelectVisibility = updateSizeSelectVisibility;

// ===== Функция для обновления видимости поля промпта =====
async function updatePromptVisibility() {
    const promptFormGroup = document.getElementById('promptFormGroup');

    if (!promptFormGroup) {
        console.warn('❌ Элемент promptFormGroup не найден');
        return;
    }

    const currentMode = await getCurrentSelectedMode();

    // 🔧 ЛОГИКА: Скрываем поле промпта в режимах background_removal и upscale_image для более чистого UX
    const shouldHidePrompt = ['background_removal', 'upscale_image'].includes(currentMode);
    const shouldShowPrompt = !shouldHidePrompt;

    if (shouldShowPrompt) {
        promptFormGroup.style.display = 'block';
        promptFormGroup.classList.remove('hidden');
        console.log(`📝 Prompt field VISIBLE for mode: ${currentMode}`);
    } else {
        promptFormGroup.style.setProperty('display', 'none', 'important');
        promptFormGroup.classList.add('hidden');
        console.log(`🚫 Prompt field HIDDEN for mode: ${currentMode} (no prompt needed)`);
    }

    // Также обновляем видимость negative prompt поля
    await updateNegativePromptVisibility();
}

// ===== Функция для обновления видимости поля negative prompt =====
async function updateNegativePromptVisibility() {
    const negativePromptSection = document.getElementById('negativePromptSection');
    const negativePromptFormGroup = document.getElementById('negativePromptFormGroup');
    const negativePromptCheckbox = document.getElementById('negativePromptCheckbox');

    if (!negativePromptSection) {
        console.warn('❌ Элемент negativePromptSection не найден');
        return;
    }

    const currentMode = await getCurrentSelectedMode();

    // 🔧 НОВАЯ ЛОГИКА: Показываем секцию с чекбоксом ТОЛЬКО в режиме dreamshaper_xl
    const shouldShowNegativePromptSection = currentMode === 'dreamshaper_xl';

    if (shouldShowNegativePromptSection) {
        negativePromptSection.style.display = 'block';
        negativePromptSection.classList.remove('hidden');
        console.log(`📝 Negative prompt section VISIBLE for mode: ${currentMode}`);

        // Сбрасываем чекбокс в дефолтное состояние при изменении режима
        if (negativePromptCheckbox) {
            negativePromptCheckbox.checked = false;
            // Запускаем обработчик изменения для скрытия поля
            negativePromptCheckbox.dispatchEvent(new Event('change'));
        }
    } else {
        negativePromptSection.style.setProperty('display', 'none', 'important');
        negativePromptSection.classList.add('hidden');
        // Скрываем поле ввода тоже
        if (negativePromptFormGroup) {
            negativePromptFormGroup.style.setProperty('display', 'none', 'important');
            negativePromptFormGroup.classList.add('hidden');
        }
        console.log(`🚫 Negative prompt section HIDDEN for mode: ${currentMode}`);
    }
}

// ===== Функция для обновления видимости селектора размеров =====
async function updateSizeSelectVisibility() {
    const sizeSelect = document.getElementById('sizeSelect');
    const sizeGroup = sizeSelect ? sizeSelect.closest('.form-group') : null;

    if (!sizeGroup) {
        console.warn('❌ Элемент sizeGroup не найден');
        return;
    }

    const currentMode = await getCurrentSelectedMode();

    // 🔧 ЛОГИКА: Скрываем селектор размеров в режимах background_removal и upscale_image
    // В dreamshaper_xl показываем только специфические размеры
    // Для остальных режимов селектор показывается всегда (независимо от наличия изображений)
    const shouldHideSizeSelect = ['background_removal', 'upscale_image'].includes(currentMode) && currentMode !== 'dreamshaper_xl';

    if (!shouldHideSizeSelect) {
        sizeGroup.style.display = 'block';
        sizeGroup.classList.remove('hidden');

        // ДИНАМИЧЕСКОЕ ОБНОВЛЕНИЕ РАЗМЕРОВ для DreamShaper XL
        updateSizeOptionsForMode(currentMode);

        console.log(`📏 Size selector VISIBLE for mode: ${currentMode}`);
    } else {
        sizeGroup.style.setProperty('display', 'none', 'important');
        sizeGroup.classList.add('hidden');
        console.log(`🚫 Size selector HIDDEN for mode: ${currentMode} (no size selection needed)`);
    }
}

// ===== Функция для обновления опций размеров в зависимости от режима =====
function updateSizeOptionsForMode(mode) {
    const sizeSelect = document.getElementById('sizeSelect');
    if (!sizeSelect) return;

    // Очищаем текущие опции
    sizeSelect.innerHTML = '';

    if (mode === 'dreamshaper_xl') {
        // Специфические размеры для DreamShaper XL
        const dreamshaperSizes = [
            { value: 'square', label: 'Square 1:1 (1024×1024)' },
            { value: 'ultra_wide_landscape', label: 'Ultra-Wide Landscape 21:9 (1536×640)' },
            { value: 'wide_landscape', label: 'Wide Landscape 16:9 (1344×768)' },
            { value: 'standard_landscape', label: 'Standard Landscape 4:3 (1152×896)' },
            { value: 'classic_landscape', label: 'Classic Landscape 3:2 (1280×832)' },
            { value: 'classic_portrait', label: 'Classic Portrait 2:3 (832×1280)' },
            { value: 'standard_portrait', label: 'Standard Portrait 3:4 (896×1152)' },
            { value: 'tall_portrait', label: 'Tall Portrait 9:16 (768×1344)' },
            { value: 'ultra_tall_portrait', label: 'Ultra-Tall Portrait 9:21 (640×1536)' }
        ];

        dreamshaperSizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size.value;
            option.className = 'size-text';
            option.textContent = size.label;
            sizeSelect.appendChild(option);
        });

        console.log('🎨 DreamShaper XL size options loaded');
    } else {
        // Стандартные размеры для остальных режимов
        const defaultSizes = [
            { value: 'square', label: '1 : 1' },
            { value: 'portrait', label: '3 : 4' },
            { value: 'landscape', label: '4 : 3' }
        ];

        defaultSizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size.value;
            option.className = 'size-text';
            option.textContent = size.label;
            sizeSelect.appendChild(option);
        });

        console.log('🎨 Standard size options loaded');
    }
}

// ===== Инициализация UI загрузки =====
function initUserImageUpload() {
    const input = document.getElementById('userImage');
    const chooseBtn = document.getElementById('chooseUserImage');
    const removeBtn = document.getElementById('removeUserImage');

    chooseBtn?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', onUserImageChange);
    removeBtn?.addEventListener('click', clearUserImage);

    // Проверить режим при изменении
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
    // Инициализация видимости при загрузке
    updateImageUploadVisibility();
    updatePromptVisibility();
    updateNegativePromptVisibility(); // 🔥 ДОБАВЛЕНО: инициализация видимости negative prompt
    updateSizeSelectVisibility();

        // Слушать изменения режима через DOM select (для совместимости)
        modeSelect.addEventListener('change', () => {
            updateImageUploadVisibility();
            updatePromptVisibility();
            updateNegativePromptVisibility(); // 🔥 ДОБАВЛЕНО: обновление видимости negative prompt
            // Также обновляем видимость блока размеров при смене режима
            updateSizeSelectVisibility();
        });

        // 🔥 ДОБАВЛЕНО: Слушатель кастомного события изменения режима от mode-cards компонента
        document.addEventListener('mode:changed', (event) => {
            const { mode } = event.detail;
            console.log('📡 Mode changed event received:', mode);
            updateImageUploadVisibility();
            updatePromptVisibility();
            updateNegativePromptVisibility(); // 🔥 ДОБАВЛЕНО: обновление видимости negative prompt
            updateSizeSelectVisibility();
        });
    }
}

// ===== Обработчик выбора файла =====
async function onUserImageChange(e) {
    try {
        console.log('📁 onUserImageChange called with files:', e.target.files?.length || 0);

        const files = Array.from(e.target.files || []);
        const errorEl = document.getElementById('userImageError');
        const preview = document.getElementById('userImagePreview');
        const previewContainer = document.getElementById('previewContainer');
        const chooseBtn = document.getElementById('chooseUserImage');
        const optionalLabel = document.querySelector('.under-user-image-label');

        // Очищаем ошибки и проверяем наличие файлов
        if (errorEl) errorEl.textContent = '';
        if (!files.length) {
            console.log('⚠️ No files selected');
            return;
        }

        console.log('📁 Processing', files.length, 'files for upload:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

        // Проверка лимита (до 4 изображений)
        const currentCount = userImageState.images.length;
        const newCount = currentCount + files.length;
        console.log(`🎯 Current images: ${currentCount}, new total: ${newCount}`);

        if (newCount > 4) {
            if (errorEl) {
                const errorMsg = appState.translate('image_limit_error').replace('{{count}}', 4 - currentCount);
                errorEl.textContent = errorMsg;
            }
            console.warn('🚫 Too many images, remaining:', 4 - currentCount);
            return;
        }

        // Валидация каждого файла
        const validFiles = [];
        let validationErrors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`🔍 Validating file ${i+1}: ${file.name} (${file.size} bytes, ${file.type})`);

            if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
                const errorMsg = `Файл ${file.name}: недопустимый формат. Разрешено: ${CONFIG.ALLOWED_TYPES.join(', ')}`;
                console.error('❌ Invalid file type:', file.type);
                validationErrors.push(errorMsg);
                continue;
            }

            const maxBytes = CONFIG.MAX_IMAGE_MB * 1024 * 1024; // МБ в байты
            if (file.size > maxBytes) {
                const errorMsg = `Файл ${file.name}: слишком большой (макс ${CONFIG.MAX_IMAGE_MB} MB).`;
                console.error('❌ File too large:', file.size, '>', maxBytes);
                validationErrors.push(errorMsg);
                continue;
            }

            validFiles.push(file);
            console.log(`✅ File ${file.name} is valid`);
        }

        if (!validFiles.length) {
            console.log('❌ No valid files after validation');
            if (errorEl && validationErrors.length) {
                errorEl.textContent = validationErrors[0]; // Показываем первую ошибку
            }
            return;
        }

        console.log('✅ Valid files found:', validFiles.length, '/', files.length);
        if (validationErrors.length > 0) {
            console.warn('⚠️ Some files were rejected:', validationErrors.length);
        }

        // Обработка каждого файла
        let processedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];

            try {
                console.log(`📸 Processing file ${i+1}/${validFiles.length}: ${file.name}`);

                // Читаем файл как DataURL - исправлена функция чтения
                const dataUrl = await readFileAsDataURL(file);
                console.log(`✅ File ${file.name} read as DataURL, length: ${dataUrl.length}`);

                // Компрессируем изображение
                const compressed = await maybeCompressImage(
                    dataUrl,
                    CONFIG.PREVIEW_MAX_W,
                    CONFIG.PREVIEW_MAX_H,
                    CONFIG.PREVIEW_JPEG_QUALITY
                );
                console.log(`✨ File ${file.name} compressed, new length: ${compressed.length}`);

                // Создаем уникальный ID для изображения
                const imageId = Date.now() + Math.random().toString(36).substr(2, 9);
                console.log(`🆔 Created imageId: ${imageId} for ${file.name}`);

                // Добавляем в состояние
                const imageObj = {
                    id: imageId,
                    file: file,
                    dataUrl: compressed,
                    uploadedUrl: null
                };

                userImageState.images.push(imageObj);
                console.log(`📦 Added to userImageState, total images: ${userImageState.images.length}`);

                // Создаем превью элемент
                createPreviewItem(imageId, compressed, file.name);
                console.log(`🖼️ Preview created for ${file.name}`);

                processedCount++;
                console.log(`✅ Successfully processed file ${i+1}: ${file.name}`);

            } catch (error) {
                console.error(`❌ Failed to process file ${i+1} (${file.name}):`, error);
                failedCount++;

                if (errorEl) {
                    errorEl.textContent = `Ошибка обработки ${file.name}: ${error.message || 'неизвестная ошибка'}`;
                }
            }
        }

        console.log(`📊 Processing summary: ${processedCount} succeeded, ${failedCount} failed`);

        // Обновляем UI если есть успешные обработки
        if (processedCount > 0) {
            console.log('🎨 Updating UI for successful uploads');

            // Показываем превью контейнер
            if (preview) {
                preview.classList.remove('hidden', 'flux-shnel-hidden');
                console.log('✅ Preview container shown');
            }

            // Обновляем классы wrapper
            const wrapper = document.getElementById('userImageWrapper');
            if (wrapper) {
                wrapper.classList.add('has-image');
                wrapper.classList.remove('need-image');
                console.log('✅ Wrapper classes updated');
            }

            // Обновяем видимость элементов
            updateSizeSelectVisibility();
            updateImageUploadVisibility();

            // Принудительное показывание превью
            const hasImages = userImageState.images.length > 0;
            if (preview && hasImages) {
                preview.classList.remove('flux-shnel-hidden', 'hidden');
                preview.style.setProperty('display', 'block', 'important');
                console.log('✅ Forced preview visibility');
            }

            console.log(`🎯 Final state: ${userImageState.images.length} images uploaded successfully`);

            // Принудительная загрузка превью истории
            setTimeout(() => {
                const historyList = document.getElementById('historyList');
                if (historyList && !historyList.classList.contains('hidden')) {
                    console.log('🎯 Starting history preview force load');
                    globalHistoryLoader.forceLoadVisibleHistoryPreviews();
                }
            }, 100);

            // Диспатчим событие изменения изображений для обновления UI (strength slider и др.)
            document.dispatchEvent(new CustomEvent('images:updated', {
                detail: { imageCount: userImageState.images.length }
            }));

        } else {
            console.warn('⚠️ No files were processed successfully');
            if (errorEl && !errorEl.textContent) {
                errorEl.textContent = 'Не удалось обработать выбранные файлы.';
            }
        }

    } catch (globalError) {
        console.error('💥 Global error in onUserImageChange:', globalError);

        // Показываем ошибку пользователю
        const errorEl = document.getElementById('userImageError');
        if (errorEl) {
            errorEl.textContent = 'Произошла ошибка при загрузке изображений. Попробуйте снова.';
        }

        // Не даем ошибке распространиться выше
    }
}

// ===== Создание превью элемента =====
function createPreviewItem(imageId, dataUrl, fileName) {
    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) return;

    // 👉 imageUUID добавится после загрузки на Runware в generateImage()

    const itemDiv = document.createElement('div');
    itemDiv.className = 'preview-item';
    itemDiv.setAttribute('data-id', imageId);
    itemDiv.style.cssText = `
        position: relative;
        display: inline-block;
        margin: 4px;
        border: 2px solid var(--border-primary);
        border-radius: 6px;
        overflow: hidden;
        background: var(--bg-secondary);
    `;

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = fileName;
    img.style.cssText = `
        width: 60px;
        height: 60px;
        object-fit: cover;
        display: block;
    `;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-preview-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeImage(imageId);
    removeBtn.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        width: 16px;
        height: 16px;
        background: rgba(0,0,0,0.7);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Создаем маленькую кнопку "Загрузить" внутри превью
    const innerUploadBtn = document.createElement('button');
    innerUploadBtn.className = 'inner-upload-btn';
    innerUploadBtn.onclick = (e) => {
        e.preventDefault();  // предотвращаем submit формы
        e.stopPropagation(); // предотвращаем всплытие события
        const input = document.getElementById('userImage');
        if (input) input.click();
    };

    const uploadIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    uploadIcon.setAttribute('viewBox', '0 0 24 24');
    uploadIcon.setAttribute('fill', 'none');
    uploadIcon.setAttribute('stroke', 'currentColor');
    uploadIcon.setAttribute('stroke-width', '2');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M7 16a4 4 0 01-.88-7.903A4.999 4.999 0 0111 11h1V9a4 4 0 118 4.001c0-.73-.303-1.406-.88-1.923A5.002 5.002 0 0117 7a5 5 0 11-10 0v2.097A4.001 4.001 0 017 16z');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M15 19l-3-3-3 3M12 19V13');

    // Simple plus icon for upload
    const plusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    plusPath.setAttribute('d', 'M19 11H13V17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17V11H5C4.44772 11 4 10.5523 4 10C4 9.44772 4.44772 9 5 9H11V3C11 2.44772 11.4477 2 12 2C12.5523 2 13 2.44772 13 3V9H19C19.5523 9 20 9.44772 20 10C20 10.5523 19.5523 11 19 11Z');
    uploadIcon.appendChild(plusPath);
    innerUploadBtn.appendChild(uploadIcon);

    itemDiv.appendChild(img);
    itemDiv.appendChild(removeBtn);
    itemDiv.appendChild(innerUploadBtn);
    previewContainer.appendChild(itemDiv);

    // Обновляем видимость маленькой кнопки после создания
    setTimeout(() => updateInnerUploadButtonVisibility(), 50);
}


// ===== Удаление изображения =====
function removeImage(imageId) {
    // Удаляем из состояния
    userImageState.images = userImageState.images.filter(img => img.id !== imageId);

    // Удаляем превью элемент
    const previewContainer = document.getElementById('previewContainer');
    const item = previewContainer?.querySelector(`[data-id="${imageId}"]`);
    if (item) item.remove();

    // Если нет изображений, скрыть превью
    if (!userImageState.images.length) {
        const preview = document.getElementById('userImagePreview');
        if (preview) preview.classList.add('hidden');
        const wrapper = document.getElementById('userImageWrapper');
        wrapper?.classList.remove('has-image');
    }

    // Показать кнопку загрузки если меньше 4
    const chooseBtn = document.getElementById('chooseUserImage');
    if (chooseBtn && userImageState.images.length < 4) {
        chooseBtn.style.display = '';
    }

    // Обновление видимости выбора размеров
    updateSizeSelectVisibility();

    // Обновление видимости кнопки и превью согласно логике режима
    updateImageUploadVisibility();

    // 🔥 ДОБАВЛЕНИЕ: Диспатчим событие изменения изображений для обновления UI (strength slider и др.)
    document.dispatchEvent(new CustomEvent('images:updated', {
        detail: { imageCount: userImageState.images.length }
    }));
}

// ===== Удаление ВСЕХ изображений (для режима fast_generation) =====
function clearAllImages() {
    console.log('🗑️ Clearing ALL images for mode switch');

    // Очищаем состояние
    userImageState.images = [];

    // Удаляем все превью элементы
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = ''; // полная очистка контейнера
    }

    // Скрываем превью контейнер
    const preview = document.getElementById('userImagePreview');
    if (preview) {
        preview.classList.add('hidden');
    }

    // Снимаем класс has-image с wrapper
    const wrapper = document.getElementById('userImageWrapper');
    if (wrapper) {
        wrapper.classList.remove('has-image');
    }

    console.log('✅ All images cleared successfully');

    // 🔥 ДОБАВЛЕНИЕ: Обновляем видимость после очистки
    setTimeout(() => updateImageUploadVisibility(), 50);
}

// ===== Новое функция: Обновление видимости маленькой кнопки внутри превью =====
function updateInnerUploadButtonVisibility() {
    const currentMode = document.getElementById('modeSelect').value;
    const imageCount = userImageState.images.length;
    const previewItems = document.querySelectorAll('.preview-item');

    previewItems.forEach(item => {
        const innerBtn = item.querySelector('.inner-upload-btn');
        if (!innerBtn) return;

        let shouldShowInnerBtn = false;

        if (currentMode === 'photo_session') {
            // Для Photo Session: показываем кнопку пока не достигнут лимит в 4 изображения
            shouldShowInnerBtn = imageCount < 4;
        } else if (['upscale_image', 'background_removal'].includes(currentMode)) {
            // Для других режимов, требующих изображения: показываем кнопку пока не достигнут лимит в 1 изображение
            shouldShowInnerBtn = imageCount < 1;
        }
        // Для fast_generation: горем никогда не показываем внутреннюю кнопку (нет в списке режимов)

        // Применяем видимость
        if (shouldShowInnerBtn) {
            innerBtn.style.display = 'flex';
            innerBtn.classList.remove('hidden');
        } else {
            innerBtn.style.display = 'none';
            innerBtn.classList.add('hidden');
        }
    });

    console.log(`🔘 Inner upload button visibility updated for mode: ${currentMode}, images: ${imageCount}`);
}

// ===== Удаление лишних изображений до указанного лимита =====
function trimImagesToLimit(limit) {
    if (userImageState.images.length <= limit) return;

    console.log(`🗑️ Trimming images from ${userImageState.images.length} to ${limit}`);

    // Оставляем только первые N изображений
    const imagesToRemove = userImageState.images.slice(limit);
    userImageState.images = userImageState.images.slice(0, limit);

    // Удаляем превью элементов для удалённых изображений
    const previewContainer = document.getElementById('previewContainer');
    imagesToRemove.forEach(img => {
        const item = previewContainer?.querySelector(`[data-id="${img.id}"]`);
        if (item) item.remove();
    });

    console.log(`✅ Trimmed ${imagesToRemove.length} excess images`);
}

// ===== Обновление видимости кнопки загрузки =====


// ===== Обновление положения кнопки загрузки =====
function updateUploadButtonPosition() {
    const chooseBtn = document.getElementById('chooseUserImage');
    const preview = document.getElementById('userImagePreview');
    const container = document.getElementById('userImageWrapper');
    const hasImages = userImageState.images.length > 0;
    const hasLimitReached = userImageState.images.length >= getImageLimitForMode(document.getElementById('modeSelect')?.value || 'default');

    if (!chooseBtn || !container) return;

    // Удаляем кнопку из текущего положения
    chooseBtn.remove();

    if (hasImages && !hasLimitReached) {
        // Есть изображения И еще можно загружать - вставляем внутрь превью
        if (preview) {
            preview.appendChild(chooseBtn);

            // Переключаем на стиль "внутри превью"
            chooseBtn.classList.add('inside-preview');
            chooseBtn.classList.remove('outside-upload');
            console.log('🔘 Кнопка перемещена ВНУТРЬprev превью');
        }
    } else if (!hasImages && !hasLimitReached) {
        // Нет изображений И можно загружать - вставляем снаружи
        container.appendChild(chooseBtn);

        // Переключаем на стиль "снаружи"
        chooseBtn.classList.add('outside-upload');
        chooseBtn.classList.remove('inside-preview');
        console.log('🔘 Кнопка перемещена СНАРУЖИ');
    }

    // Лимит достигнут - никак не показываем (кнопка скрыта в любом положении)
    if (hasLimitReached) {
        chooseBtn.style.display = 'none';
        console.log('🚫 Кнопка СКРЫТА - достигнут лимит');
    } else {
        chooseBtn.style.display = '';
    }
}



// ===== Загрузка изображений на Runware.ai и получение UUID =====
async function uploadToRunware(dataUrl, apiKey) {
    const key = (apiKey || '').trim();
    if (!key) {
        console.warn('Runware API key missing — skipping user image upload');
        return null;
    }

    try {
        // Убираем префикс data:image...base64, если он есть (документация требует чистый base64)
        const base64Image = String(dataUrl).replace(/^data:image\/[a-z]+;base64,/, '');

        const taskUUID = generateUUIDv4();
        console.log('📤 Starting Runware upload:', { taskUUID, base64Length: base64Image.length });

        const requestData = {
            taskType: 'imageUpload',
            taskUUID: taskUUID,
            image: base64Image
        };

        console.log('📤 Runware request data (preview):', {
            taskType: requestData.taskType,
            taskUUID: requestData.taskUUID,
            imagePreview: requestData.image.substring(0, 50) + '...'
        });

        // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: API требует Массив, а не объект!
        const requestArray = [requestData];

        console.log('📤 Runware request ARRAY format:', {
            arrayLength: requestArray.length,
            firstRequestType: requestArray[0]?.taskType
        });

        const response = await fetch('https://api.runware.ai/v1/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify(requestArray) // 🔥 ОТПРАВЛЯЕМ МАССИВ!
        });

        console.log('📥 Runware response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Runware upload failed:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });

            // Разбор ошибки для лучшей диагностики
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.errors && errorJson.errors[0]) {
                    const firstError = errorJson.errors[0];
                    console.error('❌ Runware API error details:', {
                        message: firstError.message,
                        code: firstError.extensions?.code || firstError.code,
                        type: firstError.type
                    });

                    // Специальная обработка распространенных ошибок
                    if (firstError.extensions?.code === 'UNAUTHENTICATED' ||
                        firstError.message?.includes('API key')) {
                        console.warn('🔑 Problem with API key - check RUNWARE_API_KEY config');
                    } else if (firstError.message?.includes('image') ||
                               firstError.message?.includes('base64')) {
                        console.warn('🖼️ Problem with image format - check base64 encoding');
                    }
                }
            } catch (parseError) {
                console.error('❌ Cannot parse error response:', errorText);
            }

            return null;
        }

        const result = await response.json();
        console.log('✅ Runware upload response:', result);

        // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: API возвращает массив в data, а не прямой объект
        if (result.data && Array.isArray(result.data) && result.data[0] && result.data[0].imageUUID) {
            console.log('✅ Image uploaded to Runware, UUID:', result.data[0].imageUUID);
            return result.data[0].imageUUID;
        } else {
            console.error('❌ Runware response missing imageUUID in array:', result);
            return null;
        }
    } catch (error) {
        console.error('❌ Runware upload error:', error);
        return null;
    }
}

// ===== УДАЛЕН: IMGBB ЗАГРУЗКА - полность заменена на Runware.ai =====
// Старая функция uploadToImgbb удалена - система теперь использует только Runware UUID

// Загружает все выбранные изображения - НОВАЯ ВЕРСИЯ С Runware В ПРИОРИТЕТЕ
async function uploadUserImages() {
    const images = userImageState.images;
    console.log('🚀 Starting uploadUserImages process with Runware priority:', {
        totalImages: images ? images.length : 0,
        hasImages: !!images && images.length > 0,
        runwareKey: !!(CONFIG.RUNWARE_API_KEY && CONFIG.RUNWARE_API_KEY.trim()),
        imgbbKeyFallback: !!(CONFIG.IMGBB_API_KEY && CONFIG.IMGBB_API_KEY.trim())
    });

    if (!images || images.length === 0) {
        console.log('❌ No images to upload, returning empty array');
        return [];
    }

    const uuids = []; // Теперь возвращаем UUID вместо URL

    // Загружаем все изображения параллельно с приоритетом RUNWARE
    const uploadPromises = images.map(async (image, index) => {
        console.log(`🎯 Processing image ${index + 1}/${images.length}:`, {
            hasDataUrl: !!image.dataUrl,
            hasUploadedUUID: !!image.uploadedUUID,
            hasUploadedUrl: !!image.uploadedUrl, // legacy fallback
            fileName: image.file?.name || 'unknown'
        });

        if (!image.dataUrl && !image.uploadedUrl) {
            console.warn(`⚠️ Image ${index + 1} has no dataUrl or uploadedUrl`);
            return null;
        }

        // Если уже загружено UUID (новый формат), используем его
        if (image.uploadedUUID) {
            console.log(`✅ Image ${index + 1} already uploaded UUID: ${image.uploadedUUID}`);
            return image.uploadedUUID;
        }

        // Если есть legacy URL, используем его как UUID для совместимости
        if (image.uploadedUrl && typeof image.uploadedUrl === 'string') {
            console.log(`🔄 Image ${index + 1} using legacy URL as UUID: ${image.uploadedUrl.substring(0, 36)}...`);
            image.uploadedUUID = image.uploadedUrl; // Конвертируем legacy
            return image.uploadedUrl;
        }

        try {
            // ПРИОРИТЕТ RUNWARE - используем новый API
            if (CONFIG.RUNWARE_API_KEY && CONFIG.RUNWARE_API_KEY.trim()) {
                console.log(`📤 [PRIORITY] Uploading image ${index + 1} to Runware...`);
                const uuid = await uploadToRunware(image.dataUrl, CONFIG.RUNWARE_API_KEY);
                if (uuid) {
                    image.uploadedUUID = uuid; // Сохраняем UUID
                    console.log(`✅ Runware upload success for image ${index + 1}, UUID: ${uuid}`);
                    return uuid;
                }
            }

            console.error(`❌ Runware upload failed for image ${index + 1} - no fallback available`);
            return null;

        } catch (error) {
            console.error(`❌ Upload entirely failed for image ${index + 1}:`, error);
            return null;
        }
    });

    // Ждём загрузки всех изображений
    console.log('⏳ Waiting for all uploads to complete...');
    const uploadedResults = await Promise.all(uploadPromises);
    console.log('✅ All upload promises resolved');

    // Фильтруем успешные загрузки
    const successfulResults = uploadedResults.filter(result => result !== null);
    console.log('🎯 Upload results summary:', {
        total: images.length,
        successful: successfulResults.length,
        failed: images.length - successfulResults.length,
        hasRunwareResults: successfulResults.some(uuid => typeof uuid === 'string' && uuid.length > 10 && !uuid.includes('http')),
        results: successfulResults.slice(0, 3).map(r => typeof r === 'string' ? r.substring(0, 20) + '...' : r)
    });

    return successfulResults;
}

// 📱 Telegram WebApp Integration - УДАЛЕНА: дублирующая инициализация, теперь только в services.js

function initLanguageDropdown() {
    const btn = document.getElementById('langBtn');
    const menu = document.getElementById('langMenu');
    if (!btn || !menu) return;

    // Предотвращаем двойную инициализацию
    if (menu.dataset.initialized === 'true') return;
    menu.dataset.initialized = 'true';

    // Карта языков с флагами и названиями - исправлены спорные региональные флаги
    const languageMap = {
        'en': { flag: '🇬🇧', name: 'English' },     // Великобритания как "родина" английского
        'ru': { flag: '🇷🇺', name: 'Русский' },
        'es': { flag: '🇪🇸', name: 'Español' },
        'fr': { flag: '🇫🇷', name: 'Français' },
        'de': { flag: '🇩🇪', name: 'Deutsch' },
        'zh': { flag: '🇨🇳', name: '中文' },
        'pt': { flag: '🇵🇹', name: 'Português' },   // Португалия вместо Бразилии
        'ar': { flag: '🇦🇪', name: 'العربية' },    // ОАЭ как нейтральный арабский вариант
        'hi': { flag: '🇮🇳', name: 'हिंदी' },
        'ja': { flag: '🇯🇵', name: '日本語' },
        'it': { flag: '🇮🇹', name: 'Italiano' },
        'ko': { flag: '🇰🇷', name: '한국어' },
        'vi': { flag: '🇻🇳', name: 'Tiếng Việt' },
        'th': { flag: '🇹🇭', name: 'ไทย' },
        'tr': { flag: '🇹🇷', name: 'Türkçe' },
        'pl': { flag: '🇵🇱', name: 'Polski' }
    };

    // Заполнить меню языками
    menu.innerHTML = '';
    CONFIG.LANGUAGES.forEach(l => {
        const li = document.createElement('li');
        const langInfo = languageMap[l] || { flag: l, name: l };
        li.innerHTML = `<span class="flag">${langInfo.flag}</span> <span class="lang-name">${langInfo.name}</span>`;
        li.dataset.lang = l; // сохранить код языка для поиска

        li.addEventListener('click', async (evt) => {
            evt.stopPropagation();

            try {
                // 🔥 LAZY LOADING: Загружаем словарь при выборе языка
                console.log('🌍 Loading dictionary for language:', l);
                await dictionaryManager.setLanguage(l);
                console.log('✅ Dictionary loaded and set for language:', l);
            } catch (error) {
                console.error('❌ Failed to load dictionary for language:', l, error);
                // Продолжаем с appState.setLanguage даже если загрузка словаря не удалась
            }

            appState.setLanguage(l);        // сохранится в localStorage через saveSettings()
            menu.style.display = 'none';    // скрыть после выбора
        });
        menu.appendChild(li);
    });

    // Изначально скрыто (дублируем CSS на случай задержки стилей)
    menu.style.display = 'none';

    // Открыть/закрыть по кнопке
    btn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    });

    // Закрыть при клике вне
    document.addEventListener('click', (evt) => {
        if (!menu.contains(evt.target) && !btn.contains(evt.target)) {
            menu.style.display = 'none';
        }
    });

    // Закрыть по Esc
    document.addEventListener('keydown', (evt) => {
        if (evt.key === 'Escape') {
            menu.style.display = 'none';
        }
    });

    console.log('🌍 Language dropdown initialized with flags and names');
}

// 🚀 App Initialization
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 pixPLace Creator starting...');

    // 🔥 AUTO-UPDATE MAINTENANCE.JS CONFIG FILE (ДЕМО СИНХРОНИЗАЦИЯ)
    try {
        // Обновляем maintenance.js с актуальным CONFIG.MAINTENANCE_MODE - простой формат
        const newConfig = `// Config for maintenance mode
const MAINTENANCE_MODE = ${CONFIG.MAINTENANCE_MODE}; // Auto-updated: ${new Date().toISOString()}`;

        console.log('🔧 Maintenance mode config updated:', CONFIG.MAINTENANCE_MODE, '- remember to sync maintenance.js');
        // NOTE: В проде эта строка должна быть закомментирована и обновление делаться через API
        // Для тестирования вручную вставьтеcontent выше в maintenance.js

        // Экспортируем в глобальную область для доступа из maintenance.html
        window.CONFIG_MAINTENANCE_MODE = CONFIG.MAINTENANCE_MODE;
        window.MAINTENANCE_MODE_LAST_UPDATE = new Date().toISOString();
    } catch (error) {
        console.warn('❌ Maintenance config update error:', error);
    }

    // 🚧 ПРОВЕРКА РЕЖИМА ОБСЛУЖИВАНИЯ - Если включен, перенаправляем на maintenance.html
    if (CONFIG.MAINTENANCE_MODE) {
        console.log('🚧 Maintenance Mode enabled - redirecting to maintenance page');
        window.location.href = 'maintenance.html';
        return; // Останавливаем дальнейшую инициализацию
    }

    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: инициализируем переводы ДО показа loading screen
    console.log('🌍 Initializing language and translations BEFORE loading screen...');

    // 1. СНАЧАЛА загружаем базовый язык и словарь
    await initBaseLanguageAndTranslations();

    // 2. ПРИМЕНИМ переводы к loading screen и всей странице
    try {
        dictionaryManager.updateTranslations();
        console.log('✅ Translations applied to loading screen');
    } catch (error) {
        console.error('❌ Failed to apply initial translations:', error);
    }

    // 3. ТОЛЬКО ТЕПЕРЬ показываем loading screen (уже с переведенными текстами)
    // 🚀 ПОКАЗАТЬ LOADING SCREEN СРАЗУ (только logo, частицы - ничего не нужно переводить)
    showLoadingScreen();

    // ❄️ СНЕГОПАД: Теперь CSS-only снегопад автоматически включается через CSS :has() селекторы


    // 🔥 НЕТ ДУБЛИРОВАНИЯ - язык загружен выше

    // 🔥 НОВОЕ: Используем сервисы вместо прямого доступа к appState
    // Теперь передаем существующий appState в сервисы
    let services; // ОБЪЯВЛЕНИЕ ПЕРЕД TRY
    try {
        services = await initializeGlobalServices(appState); // ПЕРЕДАЕМ СУЩЕСТВУЮЩИЙ appState!
    } catch (error) {
        console.error('❌ Failed to initialize global services:', error);
        // Fallback - continue without services for basic functionality
        try {
            services = {
                appState: appState, // Используем существующий appState в fallback
                eventBus: null,
                telegram: null,
                storage: null,
                notifications: null,
                ui: null
            };
        } catch (fallbackError) {
            console.error('❌ Fallback services creation also failed:', fallbackError);
            services = {
                appState: appState, // По крайней мере правильный appState
                eventBus: null,
                telegram: null,
                storage: null,
                notifications: null,
                ui: null
            };
        }
    }

    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: СИНХРОНИЗИРУЕМ appState.language С dictionaryManager.currentLanguage
    if (services.appState) {
        services.appState.setLanguage(dictionaryManager.currentLanguage);
        console.log('✅ appState.language synchronized with dictionaryManager.currentLanguage:', dictionaryManager.currentLanguage);
    }

    // 🔥 ДОБАВЛЕНИЕ: ИНИЦИАЛИЗАЦИЯ NEGATIVE PROMPT ЧЕКБОКСА
    const negativePromptCheckbox = document.getElementById('negativePromptCheckbox');
    const negativePromptInput = document.getElementById('negativePromptInput');

    // Устанавливаем умолчательный текст для negative prompt
    const defaultNegativePrompt = 'blurry, low quality, deformed, ugly, mutated, extra limbs, poorly drawn face, poorly drawn hands';

    // Обработчик чекбокса для показывания/скрывания поля ввода
    if (negativePromptCheckbox && negativePromptInput) {
        negativePromptCheckbox.addEventListener('change', function() {
            const negativePromptFormGroup = document.getElementById('negativePromptFormGroup');

            if (this.checked) {
                // Показываем поле ввода и устанавливаем дефолтный текст
                negativePromptFormGroup.style.display = 'block';
                negativePromptFormGroup.classList.remove('hidden');

                if (!negativePromptInput.value.trim()) {
                    negativePromptInput.value = defaultNegativePrompt;
                    const negativeCharCounter = document.getElementById('negativeCharCounter');
                    if (negativeCharCounter) {
                        negativeCharCounter.textContent = defaultNegativePrompt.length;
                    }
                }

                console.log('📝 Negative prompt field shown and filled');
            } else {
                // Скрываем поле ввода
                negativePromptFormGroup.style.display = 'none';
                negativePromptFormGroup.classList.add('hidden');
                console.log('🚫 Negative prompt field hidden');
            }
        });

        // Инициализируем поле с плейсхолдером
        negativePromptInput.placeholder = defaultNegativePrompt;
        console.log('✅ Negative prompt checkbox handler initialized');
    }

    let telegramInitialized = false;

    try {
        // Инициализируем Telegram и проверяем результат
        telegramInitialized = await services.telegram.initialize(); // Инициализируем Telegram
        console.log('📱 Telegram initialization result:', telegramInitialized);
    } catch (error) {
        console.error('❌ Telegram initialization error:', error);
        telegramInitialized = false;
    }

    console.log('🔄 Eureka Branch:', telegramInitialized ? 'TELEGRAM OK' : 'SHOW AUTH (or TESTING without auth)');

    // 🔥 ДОБАВЛЕНО: ТОЛЬКО ЗДЕСЬ загружаем настройки! После инициализации всех сервисов
    console.log('🔄 READY TO LOAD SETTINGS - calling loadSettings()');
    console.log('🔄 Current localStorage:', {
        appSettings: localStorage.getItem('appSettings'),
        allKeys: Object.keys(localStorage)
    });
    appState.loadSettings();
    console.log('🎨 Settings loaded, current theme:', appState.theme);
    console.log('🎨 DOM theme attribute:', document.body.getAttribute('data-theme'));
    console.log('🎨 System detected theme:', appState.detectSystemTheme());
    console.log('🎨 Prefers color scheme matches:', {
        dark: window.matchMedia('(prefers-color-scheme: dark)').matches,
        light: window.matchMedia('(prefers-color-scheme: light)').matches
    });

    if (!telegramInitialized && !BYPASS_AUTH) {
        // ВРЕМЕННО ОТКЛЮЧЕНО: Если Telegram не доступен, показываем экран авторизации НЕМЕДЛЕННО
        console.log('⚠️ Telegram not available - PROCEEDING WITHOUT AUTH (TEMPORARILY DISABLED)');

        // ВРЕМЕННО ПРОДОЛЖАЕМ БЕЗ АВТОРИЗАЦИИ
        // // Импорт и вызов ScreenManager.show
        // // const screenManagerModule = await import('./screen-manager.js');
        // // Используем правильную функцию из ScreenManager
        // // ScreenManager.showAuth();

        // Скрываем loading screen
        hideLoadingScreen();

        // Обновляем глобальные ссылки для совместимости (legacy support)
        window.appState = services.appState;
        console.log('✅ Services initialized, appState bridged for compatibility');

        initializeUI();
        initUserImageUpload();
        initLanguageDropdown();

        // Личный кабинет уже инициализирован в screen-manager.js через ScreenManager
        console.log('✅ User Account initialization handled in screen-manager.js');

        const carouselImages = document.querySelectorAll('.carousel-2d-item img');
        carouselImages.forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });

        // 🔥 ЯЗЫК УЖЕ ИНИЦИАЛИЗИРОВАН ВЫШЕ

        // 🔥 ТОЧНЫЙ КОНТРОЛЬ: 2 СЕКУНДЫ - ДОСТАТОЧНО ДЛЯ ЗАВЕРШЕНИЯ АНИМАЦИЙ
        const finishLoading = () => {
            hideLoadingScreen();
            // 🔥 ПРИМЕНЯЕМ ПЕРЕВОДЫ ПОСЛЕ ПОКАЗА UI (когда элементы уже созданы)
            setTimeout(() => {
                dictionaryManager.updateTranslations();
            }, 50);
            showAuth();
            initAICoach();
            console.log('✅ Загрузочный экран скрыт через 2 секунды - показан экран авторизации');
        };

        // Принудительный таймаут 2 секунды - анимациям хватает времени завершиться
        console.log('⏳ Начинаем отсчет 2 секунд для анимаций');
        setTimeout(finishLoading, 2000);

    } else {
        // Telegram доступен - обычный поток

        // Обновляем глобальные ссылки для совместимости (legacy support)
        window.appState = services.appState;
        console.log('✅ Services initialized, appState bridged for compatibility');

        initializeUI();
        initUserImageUpload();
        initLanguageDropdown();
        // Личный кабинет уже инициализирован в screen-manager.js через ScreenManager
        console.log('✅ User Account initialization handled in screen-manager.js');

        const carouselImages = document.querySelectorAll('.carousel-2d-item img');
        carouselImages.forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });

        // 🔥 ЯЗЫК ИНИЦИАЛИЗИРОВАН - УБИРАЕМ ДУБЛИ

        // 🔥 ТОЧНЫЙ КОНТРОЛЬ: НЕМЕДЛЕННЫЙ ЗАПУСК ПОСЛЕ ИНИЦИАЛИЗАЦИИ
        const finishLoading = () => {
            hideLoadingScreen();
            // 🔥 ДОБАВЛЕНИЕ: Загрузка баланса ПОСЛЕ создания DOM элементов
            appState.loadBalanceHistory();
            // Balance loaded from localStorage after DOM ready - ready for display

            // 🔥 ПРИМЕНЯЕМ ПЕРЕВОДЫ ПОСЛЕ ПОКАЗА UI (когда элементы уже созданы)
            setTimeout(() => {
                dictionaryManager.updateTranslations();
            }, 50);
            showApp();
            updateUserBalanceDisplay(); // 🔥 ИСПРАВЛЕНИЕ: Вызываем без параметров чтобы взять актуальное значение из state
            updateUserNameDisplay(); // 🔥 ДОБАВЛЕНО: Обновление отображения имени пользователя после авторизации
            initAICoach();
            console.log('✅ Загрузочный экран скрыт немедленно - быстрый запуск');
        };

        // Принудительный немедленный запуск без задержки
        console.log('🚀 Запуск приложения немедленно');
        finishLoading();
    }
});



// 🖼️ Image Generation - ОБНОВЛЕНО ДЛЯ ПАРАЛЛЕЛЬНОЙ ГЕНЕРАЦИИ
async function generateImage(event) {
    if (event) {
        event.preventDefault();
    }

    // Добавляем taskUUID для всего задания генерации
    const taskUUID = generateUUIDv4();

    const prompt = document.getElementById('promptInput').value.trim();
    const negativePrompt = document.getElementById('negativePromptInput').value.trim();
    const mode = await getSelectedModeFromComponent();
    const size = document.getElementById('sizeSelect').value;

    // 🚨 УЛЬТРА ЛОГИНГ РЕЖИМА ПЕРЕД ОТПРАВКОЙ
    console.log('🚨 [GENERATION START]');
    console.log('🚨 getSelectedModeFromComponent():', mode);
    console.log('🚨 document.getElementById("modeSelect").value:', document.getElementById('modeSelect')?.value || 'NULL');

    // 🔥 ДОСТИЧНЫЙ ДИВОЛТИНГ РЕЖИМА изображениям
    console.log('🚨 mode-cards.js selectedMode:', await import('./mode-cards.js').then(m => m.getSelectedMode()));

    let finalMode = mode;
    const domMode = document.getElementById('modeSelect')?.value;
    console.log('🚨 RAW COMPARISON - mode:', mode, 'domMode:', domMode);

    if (domMode && domMode !== mode) {
        console.error('🚨 MODE MISMATCH DETECTED! Function:', mode, 'vs DOM:', domMode);
        finalMode = domMode; // приоритет для DOM элемента
        console.log('🚨 USING DOM MODE:', finalMode);
    } else {
        console.log('🚨 USING COMPONENT MODE:', finalMode);
    }

    console.log('🚀 Starting generation:', { prompt, style: appState.selectedStyle, mode, size });

    // 🔥 ДЕБАГ: Проверяем что передаем в generation.mode
    console.log('🔍 FINAL MODE BEFORE GENERATION OBJECT:', mode, typeof mode);

    // 🔧 ДОБАВЛЕНИЕ: Проверим userImageState
    console.log('🔍 User image state:', {
        hasImages: userImageState?.images?.length || 0,
        hasDataUrl: !!(userImageState?.images?.[0]?.dataUrl),
        hasUploadedUrl: !!(userImageState?.images?.[0]?.uploadedUrl)
    });

    // Validation
    // НЕ проверяем промпт для режимов background_removal (удаление фона) и upscale_image (улучшение качества)
    if (mode !== 'background_removal' && mode !== 'upscale_image') {
        if (!prompt) {
            showToast('error', appState.translate('error_prompt_required'));
            triggerHaptic('error');
            return;
        }

        if (prompt.length < 5) {
            showToast('error', appState.translate('error_prompt_too_short'));
            triggerHaptic('error');
            return;
        }

        // Валидация negative prompt (только для DreamShaper XL и если введён)
        if (mode === 'dreamshaper_xl' && negativePrompt.trim()) {
            const trimmedNegativePrompt = negativePrompt.trim();
            if (trimmedNegativePrompt.length < 2 || trimmedNegativePrompt.length > 3000) {
                showToast('error', 'Negative prompt must be between 2 and 3000 characters');
                triggerHaptic('error');
                return;
            }
        }
    }

    if (!CONFIG.WEBHOOK_URL || CONFIG.WEBHOOK_URL.includes('WEBHOOK')) {
        showToast('error', appState.translate('error_webhook_not_configured'));
        return;
    }

    // === GUARD: upscale, background_removal требуют загруженного фото ===
    // photo_session теперь гибридный режим (работает с/без изображения)
    const requiresImage = ['upscale_image', 'background_removal'].includes(mode);
    if (requiresImage) {
        const wrapper = document.getElementById('userImageWrapper');
        const hasLocalImage = userImageState?.images && userImageState.images.length > 0;

        if (!hasLocalImage) {
            wrapper?.classList.add('need-image');
            const messageKey = mode === 'upscale_image'
                ? 'please_upload_for_upscale'
                : mode === 'background_removal'
                    ? 'please_upload_for_background_removal'
                    : 'please_upload_photo_session';
            showToast('error', appState.translate(messageKey));
            triggerHaptic('error');
            return; // не начинаем процесс и НЕ отправляем webhook
        }
    }

    appState.startTime = Date.now();

    // Create generation record
    // 👉 Берём активную карточку из карусели и обновляем стиль
    const activeCard = document.querySelector('.carousel-2d-item.active');
    const currentStyle = (activeCard?.dataset.style || '').toLowerCase();
    appState.selectedStyle = currentStyle || appState.selectedStyle;

    // Get current strength value from slider if available
    const strengthValue = window.strengthSlider?.isVisible() ? window.strengthSlider.getValue() : null;

    const generation = {
        id: Date.now(),
        taskUUID: taskUUID,
        imageUUIDs: userImageState.images.map(img => img.uploadedUUID).filter(uuid => uuid),
        prompt: prompt,
        negativePrompt: '',
        style: appState.selectedStyle,
        mode: finalMode,
        size: size,
        strength: strengthValue, // Add strength if slider is visible
        timestamp: new Date().toISOString(),
        status: 'pending'
    };

    // 🔥 ДОБАВЛЕНИЕ: Negative prompt только если чекбокс активен И режим dreamshaper_xl
    const negativePromptCheckbox = document.getElementById('negativePromptCheckbox');
    if (finalMode === 'dreamshaper_xl' && negativePromptCheckbox && negativePromptCheckbox.checked) {
        generation.negativePrompt = negativePrompt.trim();
        console.log('📝 Negative prompt included in generation');
    } else {
        console.log('🚫 Negative prompt NOT included (checkbox not checked or wrong mode)');
    }

    // 🔥 КРИТИЧЕСКОЕ: БОЛЬШЕ НЕ ДОБАВЛЯЕМ GENERATION В ИСТОРИЮ ЗДЕСЬ - ТОЛЬКО ПРЕВЬЮ CARDS
    // Теперь генерация добавляется в историю ТОЛЬКО после получения реального результата в parallel-generation.js
    console.log('🗂️ History storage STARTED EARLY - adding to history NOW, result deferred - GEN:', generation.id);

    // 🔥 ИСПРАВЛЕНИЕ ПРОБЛЕМЫ: НЕ ДОБАВЛЯЕМ В ИСТОРИЮ СРАЗУ!
    // Загрузочные превью будут созданы без истории, история добавится только при успешном compleition
    console.log('📋 Generation object created, history will be added only on successful completion');

    // Функция создания превью карточки (доступна глобально для callback из модального окна)
    window.createPreviewForGeneration = (gen) => {
        console.log('🚀 Starting preview creation in createPreviewForGeneration - GEN:', gen.id);

        const historyList = document.getElementById('historyList');
        const historyBtn = document.getElementById('historyToggleBtn');

        console.log('✅ Elements found - historyList:', !!historyList, 'historyBtn:', !!historyBtn);

        // 📍 2. Создаем превью элемент
        console.log('🔧 Calling createLoadingHistoryItem...');
        const previewItem = createLoadingHistoryItem(gen);
        console.log('✅ Preview item created:', previewItem ? 'SUCCESS' : 'FAILED', previewItem);

        // 📍 ПРОВЕРКА: Есть ли элемент в DOM после создания?
        const checkElement = document.getElementById(`loading-${gen.id}`);
        console.log('🔍 Check - element exists in DOM:', !!checkElement);
        if (checkElement) {
            console.log('🎯 Element DOM details:', {
                id: checkElement.id,
                className: checkElement.className,
                parent: checkElement.parentElement?.id,
                childrenCount: checkElement.children?.length
            });
        }

        // 📍 3. Открываем историю если была закрыта С ПРОВЕРКОЙ НА ПОЗИЦИЮ
        let wasHidden = false;
        if (historyList && historyList.classList.contains('hidden')) {
            wasHidden = true;
            console.log('📂 History was hidden, opening it...');
            toggleHistoryList(); // Открываем историю
        } else {
            console.log('📂 History already open - keeping position and scroll!');
            // НЕ ОБНОВЛЯЕМ дисплей - чтобы позиция и скролл не сбросились!
        }

        // 📍 4. НЕМЕДЛЕННАЯ ПРОКРУТКА К НОВОМУ ПРЕВЬЮ
        setTimeout(() => {
            const finalElement = document.getElementById(`loading-${gen.id}`);
            console.log('🎯 Scrolling attempt - element exists:', !!finalElement);

            if (finalElement) {
                console.log('🎯 Final scroll to preview:', finalElement.id);
                finalElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
                console.log('📋 Scrolled to new preview successfully');
            } else {
                console.error('❌ Preview element NOT found for scrolling, generation:', gen.id);
                // ☠️ ЭКСТРЕНАЯ МЕРА: Принудительно пересоздаем элемент
                const emergencyPreview = createLoadingHistoryItem(gen);
                if (emergencyPreview) {
                    emergencyPreview.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                    console.log('🚨 Emergency scroll to recreated element');
                }
            }
        }, 300); // Ждем открытия истории

        console.log('📋 Generation preview flow completed for:', gen.id);
    };

    // Создаем превью СРАЗУ для всех режимов КРОМЕ photo_session без изображений
    if (!(mode === 'photo_session' && userImageState.images.length === 0)) {
        console.log('🎯 Creating preview immediately for mode:', mode);
        window.createPreviewForGeneration(generation);
    } else {
        console.log('⚠️ Skipping preview creation for photo_session without images - will create after modal choice');
    }

    // === ПРЕДПАРОДНАЯ ПРОВЕРКА для photo_session без изображения ===
    if (mode === 'photo_session' && userImageState.images.length === 0) {
        // 🔥 ДОБАВЛЕНО: Сохраняем generation в глобальную переменную для доступа из модального окна
        window.currentGeneration = generation;

        // Останавливаем немедленную генерацию и показываем предупреждение
        const shouldContinue = await showWarningAboutNoImage();
        if (!shouldContinue) {
            // Пользователь решил добавить изображение - прокрутка к кнопке загрузки теперь в модальном окне
            showGeneration();
            return; // НЕ отправляем webhook
        }
        // Продолжаем генерацию без изображения (text-to-image режим)
    }

    startTimer();

    // 🔥 КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ ПОСЛЕДОВАТЕЛЬНОСТИ:
    // 1) Сначала загружаем изображения (если есть)
    // 2) Только ПРИ УСПЕХЕ изображения добавляем генерацию в менеджер

    const imageUploadSuccess = await (async () => {
        // 1) Если выбрано пользовательское изображение — загрузим все на Runware как PRIORITY
        if (userImageState.images.length > 0) {
            try {
                console.log('🚀 Starting Runware image upload process with priority + fallback');

                // Используем обновленную функцию uploadUserImages (теперь с приоритетом Runware)
                const imageIds = await uploadUserImages(); // Возвращает UUID или URL legacy

                if (imageIds && imageIds.length > 0) {
                    // Всегда сохраняем в imageUUIDs - это теперь основной формат
                    generation.imageUUIDs = imageIds;
                    console.log('✅ Image upload successful, UUIDs ready for webhook:', imageIds.length, 'images');

                    // Определяем тип загруженных данных для логирования
                    const hasRunwareUUIDs = imageIds.some(uuid => typeof uuid === 'string' && uuid.length === 36 && uuid.includes('-'));
                    const hasLegacyURLs = imageIds.some(url => typeof url === 'string' && url.includes('http'));

                    if (hasRunwareUUIDs) {
                        console.log('🎯 Using Runware UUIDs (modern format)');
                    } else if (hasLegacyURLs) {
                        console.log('⚠️ Using legacy imgbb URLs (fallback mode)');
                        // Для совместимости сохраняем в старом поле тоже
                        generation.userImageUrls = imageIds;
                    }

                    return true; // 🔒 УСПЕШНАЯ ЗАГРУЗКА
                } else {
                    console.warn('⚠️ No images uploaded successfully');
                    return false;
                }
            } catch (err) {
                console.warn('❌ User images upload completely failed:', err);
                const errorEl = document.getElementById('userImageError');
                if (errorEl && !errorEl.textContent) {
                    errorEl.textContent = 'Не удалось загрузить изображения. Продолжим без них.';
                }
                return false; // 🔒 НЕУДАЧНАЯ ЗАГРУЗКА
            }
        } else {
            console.log('📷 No user images selected, proceeding with text-to-image');
            return true; // 🔒 НЕТ ИЗОБРАЖЕНИЙ - ОК
        }
    })();

    // 2) Добавляем генерацию ТОЛЬКО если изображения загружены успешно (или если изображений нет вообще)
    if (imageUploadSuccess) {
        console.log('🚀 Proceeding with generation after successful image upload');

        // Добавляем в очередь процессора генерации
        const added = generationManager.addGeneration(generation);
        if (!added) {
            console.log('⏳ Generation added to queue');
            // НЕ показываем тост "в очереди" - пользователь может быть в сомнении
        } else {
            console.log('🚀 Generation started immediately');
            // НЕ показываем тост "начата" - будет показан только результат или ошибка
        }

        // 🔥 ОТМЕНЕНО: НЕ ДОБАВЛЯЕМ В ИСТОРИЮ ЗДЕСЬ
        // Теперь генерация добавляется в историю ТОЛЬКО после успешного завершения
        console.log('📦 Generation object ready, will be stored only on completion');
    } else {
        console.error('❌ Image upload failed - generation cancelled');
        showToast('error', 'Image upload failed. Generation cancelled.');
        stopTimer();
        showGeneration();
    }
}
// 🌐 Webhook Communication
async function sendToWebhook(data) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    // LOG RAW REQUEST BODY FOR DEBUGGING
    const requestData = {
        ...data,
        prompt: sanitizeJsonString(data.prompt) // Restore sanitize for JSON safety
    };

    const requestBody = JSON.stringify(requestData);
    console.log('📤 RAW webhook request body (first 500 chars):', requestBody.substring(0, 500));

    try {
        console.log('📤 Sending webhook request:', {
            ...data,
            prompt: data.prompt.substring(0, 100) + (data.prompt.length > 100 ? '...' : '') // Логируем первые 100 символов промпта
        });

        const response = await fetch(CONFIG.WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: requestBody, // Use raw JSON.stringify, remove sanitizeJsonString
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('📥 Webhook response status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Проверяем Content-Type
        const contentType = response.headers.get('content-type');
        console.log('📄 Response content-type:', contentType);

        let result;
        try {
            const responseText = await response.text();
            console.log('📄 FULL RAW response text (first 1000 chars):', responseText.substring(0, 1000));
            console.log('📄 Response length:', responseText.length);
            console.log('📄 HTTP Status Code:', response.status);
            console.log('📄 All Response Headers:', Object.fromEntries(response.headers.entries()));

            // 🔥 ДОПОЛНИТЕЛЬНОЕ ЛОГИРОВАНИЕ: Парсим как JSON и показываем структуру если возможно
            try {
                const possibleJson = JSON.parse(responseText);
                console.log('🔍 POSSIBLE PARSED JSON STRUCTURE:', possibleJson);
                console.log('🔍 JSON keys:', Object.keys(possibleJson));
            } catch (parseError) {
                console.log('🔍 NOT VALID JSON - possibly text/html response from Make.error');
            }

            // 🔥 ПРОВЕРКА НА СЕРВЕРОМЕРОВАНЛУЮ ПЕРЕГРУЗКУ ПЕРЕД JSON ПАРСИНГОМ
            if (responseText.trim().toLowerCase() === 'accepted') {
                console.log('🚨 SERVER OVERLOADED: Backend returned "accepted" instead of JSON');
                result = { server_overloaded: true, message: appState.translate('error_server_overloaded') };
                return result; // 🔥 НЕМЕДЛЕННО ВОЗВРАЩАЕМ - НЕ ПРОДОЛЖАЕМ ОБРАБОТКУ
            }

            // 🔥 ДОБАВИЛИ ПРОВЕРКУ НА ДРУГИЕ ТЕКСТОВЫЕ ОТВЕТЫ ПЕРЕГРУЗКИ
            if (responseText.trim().includes('overload') || responseText.trim().includes('busy') ||
                responseText.trim().includes('maintenance') || responseText.trim().includes('timeout')) {
                console.log('🚨 SERVER OVERLOADED: Detected overload keywords in response');
                result = { server_overloaded: true, message: appState.translate('error_server_overloaded') };
                return result;
            }

            if (contentType && contentType.includes('application/json')) {
                result = JSON.parse(responseText);
                console.log('✅ Parsed webhook response as JSON:', result);
            } else if (contentType && contentType.includes('text/')) {
                // Сервер вернул текст (не JSON и не "accepted")
                console.log('📄 Server returned text:', responseText);
                throw new Error('Server returned text instead of JSON: ' + responseText);
            } else {
                // Неопределённый content-type — пытаемся спарсить как JSON
                console.log('📄 Unexpected content-type, trying to parse as JSON:', responseText);
                try {
                    result = JSON.parse(responseText);
                    console.log('✅ Fallback: parsed as JSON despite content-type');
                } catch (parseError) {
                    console.error('❌ Failed to parse response as JSON:', responseText);
                    throw new Error('Server returned invalid format: ' + responseText.substring(0, 100));
                }
            }
        } catch (error) {
            console.error('❌ Response processing error:', error);
            if (error instanceof SyntaxError) {
                throw new Error('Server returned malformed JSON');
            }
            throw error;
        }

        console.log('✅ Final processed webhook response:', result);
        return result;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error(appState.translate('error_timeout'));
        }

        // ДОБАВЛЕНИЕ: Детальная обработка сетевых ошибок
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Connection failed. Check your internet connection and try again.');
        }

        // ДОБАВЛЕНИЕ: Обработка ошибок сети и CORS
        if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('CORS')) {
            throw new Error('Network error. Please check your connection and try again.');
        }

        console.error('❌ Webhook error:', error);
        throw error;
    }
}


// 🔄 Action Functions
function newGeneration() {
    showGeneration();
    // Clear form
    //  document.getElementById('promptInput').value = '';
    //  document.getElementById('charCounter').textContent = '0';
}

function cancelGeneration() {
    if (appState.currentGeneration) {
        appState.currentGeneration.status = 'cancelled';
        appState.currentGeneration.error = 'Cancelled by user';
        appState.saveHistory();
    }

    appState.isGenerating = false;
    stopTimer();
    showGeneration();
    triggerHapticFeedback('medium');
}

/* УДАЛЕНА: СТАРАЯ ФУНКЦИЯ downloadImage - теперь используем новую из utils.js */

// 📱 Новая оптимизированная функция скачивания/шаринга с новым API
async function downloadImage() {
    if (!appState.currentGeneration?.result) return;

    // Используем новую универсальную функцию из utils.js
    const result = await downloadOrShareImage(appState.currentGeneration.result, {
        filename: `ai-generated-${appState.currentGeneration.id}.png`
    });

    // Обновляем текущую генерацию в интерфейсе если результат получен
    if (result.success && result.method !== 'failed') {
        // Кнопка уже заблокирована, но обновим статус если нужно
        console.log('✅ Download/share completed successfully with method:', result.method);
    }

    return result;
}
/*function downloadImage() {
    if (!appState.currentGeneration?.result) return;

    const link = document.createElement('a');
    link.href = appState.currentGeneration.result;
    link.download = `ai-generated-${appState.currentGeneration.id}.png`;
    link.click();

    showToast('info', appState.translate('download_started'));
    triggerHaptic('light');
}
*/

async function shareImage() {
    const gen = appState.currentGeneration;
    if (!gen?.result) return;

    const imageUrl = gen.result;
    const prompt = (gen.prompt || 'pixPLace Image').trim();
    const botUrl = CONFIG.TELEGRAM_BOT_URL || 'https://t.me/your_bot';
    const hashtags = CONFIG.SHARE_DEFAULT_HASHTAGS || '#pixPLace';

    // Заголовок + текст публикации
    const title = prompt.length > 100 ? (prompt.slice(0, 97) + '...') : prompt;
    const postText = `${prompt}\n\nCreated with pixPLace ✨\nTry it: ${botUrl}\n${hashtags}`;

    // Функция на случай фолбэка — открыть Pinterest composer и скопировать текст
    const openPinterestFallback = async () => {
        try {
            // Откроем Pinterest Pin Builder c медиа и ссылкой на бота
            const pinUrl = `https://www.pinterest.com/pin-builder/?` +
                `media=${encodeURIComponent(imageUrl)}` +
                `&url=${encodeURIComponent(botUrl)}` +
                `&description=${encodeURIComponent(postText)}`;
            window.open(pinUrl, '_blank', 'noopener,noreferrer');

            // Параллельно скопируем текст
            try {
                await navigator.clipboard.writeText(postText);
                showToast('info', appState.translate('copied_to_clipboard'));
            } catch { }
            triggerHaptic('light');
        } catch (e) {
            console.error('Pinterest fallback error:', e);
            // Крайний фолбэк — просто копируем ссылку на бота + текст
            try {
                await navigator.clipboard.writeText(`${postText}`);
                showToast('info', appState.translate('copied_to_clipboard'));
            } catch { }
        }
    };

    // Пытаемся зашарить файл (Web Share API Level 2)
    try {
        // Скачаем изображение как blob (может упасть из-за CORS — обработаем)
        const resp = await fetch(imageUrl, { mode: 'cors' });
        const blob = await resp.blob();

        const extByType = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp',
            'image/gif': 'gif'
        };
        const ext = extByType[blob.type] || 'png';

        // Имя файла из промпта
        const safeName = (prompt || 'pixplace-image')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\-_. ]/gu, '') // оставить буквы/цифры/дефис/подчёркивание/точку/пробел
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 60) || 'pixplace-image';

        const file = new File([blob], `${safeName}.${ext}`, { type: blob.type || 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            const shareData = {
                title,
                text: postText,
                files: [file],
                // url можно добавить; некоторые шары игнорируют при наличии files
                url: botUrl
            };

            await navigator.share(shareData);
            triggerHaptic('light');
            return;
        }

        // Если canShare с файлами не поддерживается — Pinterest фолбэк
        await openPinterestFallback();
    } catch (err) {
        // Если не удалось скачать blob (часто из-за CORS) — уйдём в Pinterest фолбэк
        console.warn('Share with file failed (likely CORS). Fallback to Pinterest:', err);
        await openPinterestFallback();
    }
}



// 🌍 Global Functions
window.toggleLanguage = () => appState.toggleLanguage();
window.toggleTheme = () => appState.toggleTheme();
window.showHistory = showHistory;
window.showGeneration = showGeneration;
window.showProcessing = showProcessing;
//window.selectStyle = selectStyle;
window.selectStyle = (s) => window.setCarouselStyle(s);
window.generateImage = generateImage;
window.newGeneration = newGeneration;
window.cancelGeneration = cancelGeneration;
window.clearHistory = clearHistory;
window.downloadImage = downloadImage;
window.shareImage = shareImage;
window.showSubscriptionNotice = showSubscriptionNotice;

// 🎵 Music Functions
/*let currentWidget = null;
let isPlaying = false;

function toggleMusicDropdown() {
    const dropdown = document.getElementById('musicDropdown');
    const isVisible = dropdown.style.display === 'block';

    if (isVisible) {
    dropdown.style.display = 'none';
    } else {
    dropdown.style.display = 'block';
    }

    console.log('🎵 Music dropdown toggled:', !isVisible);
}

function playPlaylist(type) {
    const playlists = {
    lofi: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/330718027&color=%237a8fb5&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
    ambient: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/330718027&color=%237a8fb5&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
    jazz: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/330718027&color=%237a8fb5&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
    relax: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/330718027&color=%237a8fb5&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false'
    };

    const iframe = document.getElementById('musicPlayer');
    iframe.src = playlists[type];

    // Показать контролы
    const controls = document.getElementById('musicControls');
    if (controls) {
    controls.style.display = 'flex';
    }

    // Обновить кнопку
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) {
    playBtn.textContent = '▶ Play';
    playBtn.onclick = function () {
    startMusicPlayback(type);
    };
    }

    console.log(`🎵 Loading ${type} playlist`);
}

function startMusicPlayback(type) {
    const playlists = {
    lofi: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/330718027&color=%237a8fb5&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
    ambient: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/330718027&color=%237a8fb5&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
    jazz: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/330718027&color=%237a8fb5&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
    relax: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/330718027&color=%237a8fb5&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false'
    };

    const iframe = document.getElementById('musicPlayer');
    iframe.src = playlists[type];

    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) {
    playBtn.textContent = '⏸';
    playBtn.onclick = togglePlayPause;
    }

    isPlaying = true;
    console.log(`🎵 Started ${type} playlist`);
}

function togglePlayPause() {
    const playBtn = document.getElementById('playPauseBtn');
    if (isPlaying) {
    playBtn.textContent = '▶';
    isPlaying = false;
    } else {
    playBtn.textContent = '⏸';
    isPlaying = true;
    }
}

function setVolume(value) {
    console.log(`🔊 Volume set to ${value}%`);
}

// Закрытие dropdown при клике вне его
document.addEventListener('click', function (event) {
    const musicWidget = document.querySelector('.music-widget');
    const dropdown = document.getElementById('musicDropdown');

    if (musicWidget && dropdown && !musicWidget.contains(event.target)) {
    dropdown.style.display = 'none';
    }
});*/
// Удалена дублирующая функция loadTelegramSDK - инициализация происходит только в index.html

// 🧪 Debug Functions
window.getAppState = () => appState;
window.setWebhookUrl = (url) => {
    CONFIG.WEBHOOK_URL = url;
    console.log('✅ Webhook URL updated');
};



console.log('🎯 pixPLace App loaded!');
console.log('🔧 Debug commands:');
console.log('- getAppState() - get current app state');
console.log('- setWebhookUrl("url") - set webhook URL');
console.log('⚠️ Don\'t forget to set your webhook URL!');
// Добавьте в конец файла:
window.closeLimitModal = () => {
    const modal = document.getElementById('limitModal');
    if (modal) {
        modal.classList.remove('show');
        showGeneration();
    }
};

// Импортируем из модуля

// Теперь используем импортированные функции


// 🔥 КАРУСЕЛЬ ПЛАНОВ В ЛИМИТ МОДАЛ
// Глобальные переменные для управления каруселью планов
let planCarouselInterval = null;
let currentPlanSlide = 0;

function initPlansCarousel() {
    const carousel = document.querySelector('.plans-carousel');
    const indicators = document.querySelectorAll('.indicator');

    // Добавляем функцию highlight для работы с карточками планов
    function highlight(card, options = {}) {
        if (!card) return;

        // Убираем активный класс со всех карточек планов
        document.querySelectorAll('.plan-card').forEach(c => {
            c.classList.remove('active');
        });

        // Добавляем активный класс выбранной карточке
        if (card && typeof card.classList !== 'undefined') {
            card.classList.add('active');
        }

        console.log('Карточка плана выделена:', card ? 'OK' : 'null');
    }

    if (!carousel || !indicators.length) {
        console.log('Plans carousel not found, skipping init');
        return;
    }

    const cards = document.querySelectorAll('.plan-card');
    const totalSlides = Math.ceil(cards.length / 3); // 3 карточки на слайд

    // Функция для обновления индикаторов
    function updateIndicators(activeIndex) {
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === activeIndex);
        });
    }

    // Функция для прокрутки к слайду
    function scrollToSlide(slideIndex) {
        currentPlanSlide = slideIndex;
        const cardWidth = cards[0].offsetWidth;
        const gap = 16; // Расстояние между карточками в px
        const scrollLeft = slideIndex * (cardWidth * 3 + gap * 2);
        carousel.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
        updateIndicators(slideIndex);
    }

    // Убираем автопрокрутку полностью, оставляем только пользовательское управление

    // Клик по индикаторам (остался функционал)
    indicators.forEach((indicator, index) => {
        let lastClickTime = 0;

        indicator.addEventListener('click', (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastClickTime < 800) return; // предотвращаем спам клики
            lastClickTime = now;

            scrollToSlide(index);
        });
    });

    // Свайпы - чистое пользовательское управление (без задержек)
    let touchStartX = 0;
    let touchStartTime = 0;

    carousel.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
        touchStartX = e.changedTouches[0].screenX;
    });

    carousel.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;

        // Простая обработка свайпа
        if (Math.abs(diff) > 60 && touchDuration > 100) {
            if (diff > 0 && currentPlanSlide < totalSlides - 1) {
                scrollToSlide(currentPlanSlide + 1);
            } else if (diff < 0 && currentPlanSlide > 0) {
                scrollToSlide(currentPlanSlide - 1);
            }
        }
    });

    // ИНИЦИАЛИЗАЦИЯ - ПРОСТО ЦЕНТРИРУЕМ PRO КАРТУ (индекс 1)
    const centerCardIndex = 1; // Про = индекс 1 (самый популярный план)
    const centerCard = cards[centerCardIndex];

    if (centerCard) {
        setTimeout(() => {
            const containerWidth = carousel.offsetWidth;
            const cardWidth = centerCard.offsetWidth;
            const cardLeft = centerCard.offsetLeft;
            const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);
            carousel.scrollLeft = Math.max(0, scrollPosition);

            // Простое центрирование одной строкой
            setTimeout(() => {
                centerCard.scrollIntoView({
                    behavior: 'instant',
                    block: 'nearest',
                    inline: 'center'
                });
            }, 100);
        }, 50);
    }

    highlight(cards[centerCardIndex], { scroll: false });
    updateIndicators(centerCardIndex);
    console.log('🔥 Plans carousel initialized - centered on PRO plan, auto-scroll REMOVED');
}

// 🎯 ОБРАБОТЧИКИ ДЛЯ КАРТОЧЕК ПЛАНОВ
function initPlanCards() {
    const cards = document.querySelectorAll('.plan-card');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const planType = card.className.includes('lite') ? 'lite' :
                card.className.includes('pro') ? 'pro' : 'studio';

            // Анимация выбора
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            card.style.animation = 'pulse 0.6s ease-out';
            setTimeout(() => {
                card.style.animation = '';
            }, 600);

            console.log('Selected plan:', planType);
        });

        // Эффекты при наведении
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-12px) scale(1.03)';
        });

        card.addEventListener('mouseleave', () => {
            if (!card.classList.contains('selected')) {
                card.style.transform = '';
            }
        });
    });
}



// ИНИЦИАЛИЗАЦИЯ КАРУСЕЛИ ПРИ ПОКАЗЕ МОДАЛА
document.addEventListener('DOMContentLoaded', function () {
    // Наблюдатель за появлением модала лимита
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const modal = document.getElementById('limitModal');
                if (modal && modal.classList.contains('show')) {
                    // Модал появился - инициализируем карусель
                    setTimeout(() => {
                        initPlansCarousel();
                        initPlanCards();
                        // Use global services if available
                        if (window.appServices?.ui?.initGlassmorphismEffects) {
                            window.appServices.ui.initGlassmorphismEffects();
                        } else {
                            console.log('🔄 UI services not ready yet, skipping glassmorphism effects');
                        }
                    }, 100);
                }
            }
        });
    });

    const modal = document.getElementById('limitModal');
    if (modal) {
        observer.observe(modal, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// 🎨 Функция моргания кнопки загрузки для привлечения внимания (использует существующую анимацию need-image-pulse)
// 🔥 УДАЛЕНА: Функция startUploadButtonBlink больше не нужна - кнопка скрывается мгновенно
// Если где-то вызывается - просто игнорируем или перенаправляем на стандартную логику
function startUploadButtonBlink() {
    console.log('⚠️ startUploadButtonBlink вызвана, но моргание кнопки отключено - работает стандартная логика UI');
    // Обновляем видимость без моргания
    updateImageUploadVisibility();
}


// 🎯 Функции личного кабинета импортированы из модуля user-account.js
// 🎯 AI Coach инициализируется через ai-coach.js модуль

// 🔥 ФУНКЦИИ ОБРАБОТКИ ОШИБОК ОБРУБОВАНЫ В SCREEN-MANAGER (ИМПОРТ ВЫШЕ)
