// COST BADGE MODULE - Модуль для отображения стоимости генерации в кнопке Generate
// Современный, минималистичный дизайн с прозрачным фоном и едва заметным текстом
// Использует lazy loading CSS для лучшей производительности

// Глобальные ссылки на состояния (будут инициализированы)
let modeCardsModule = null;
let userImageState = null;
let cssLoaded = false; // Флаг загрузки CSS

/**
 * Расчет стоимости генерации в зависимости от режима и наличия изображений
 * @param {string} mode - текущий режим генерации
 * @param {boolean} hasImages - есть ли загруженные изображения
 * @returns {string} - стоимость в формате "~XX credits" или "0 credits"
 */
function calculateGenerationCost(mode, hasImages) {
    // Логика стоимости по режимам
    const costMap = {
        'photo_session': hasImages ? '~10 credits' : '~5 credits',  // Nano Banana
        'pixplace_pro': '~4 credits',                                // Flux Advanced Pro
        'print_maker': '~3 credits',                                 // Print on Demand
        'upscale_image': '~10 credits',                              // Upscale
        'fast_generation': '~2 credits',                             // Flux Fast
        'background_removal': '0 credits',                           // Remove Background
        'dreamshaper_xl': '0 credits'                                // DreamShaper XL
    };

    return costMap[mode] || '~5 credits'; // дефолт для неизвестных режимов
}

/**
 * Динамическая загрузка CSS файла для бейджа (lazy loading)
 * @returns {Promise} - промис загрузки CSS
 */
function loadCostBadgeCSS() {
    return new Promise((resolve, reject) => {
        if (cssLoaded) {
            resolve(); // CSS уже загружен
            return;
        }

        // Создаем ссылку на CSS файл
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'css/cost-badge.css';
        cssLink.onload = () => {
            cssLoaded = true;
            console.log('✅ Cost Badge CSS loaded successfully');
            resolve();
        };
        cssLink.onerror = () => {
            console.warn('❌ Failed to load Cost Badge CSS, using inline styles');
            reject(new Error('CSS load failed'));
        };

        // Добавляем в head
        document.head.appendChild(cssLink);
    });
}

/**
 * Создание элемента бейджа стоимости
 * @param {string} costText - текст стоимости
 * @returns {HTMLElement} - элемент бейджа
 */
function createCostBadge(costText) {
    // Проверяем, существует ли уже бейдж
    const existingBadge = document.querySelector('.cost-badge');
    if (existingBadge) {
        existingBadge.remove();
    }

    // Создаем новый бейдж
    const badge = document.createElement('div');
    badge.className = 'cost-badge';
    badge.textContent = costText;
    badge.setAttribute('data-cost', costText);

    // Добавляем анимацию появления
    setTimeout(() => {
        badge.classList.add('fade-in');
    }, 10);

    return badge;
}

/**
 * Обновление бейджа стоимости
 */
function updateCostBadge() {
    try {
        // Получаем текущий режим
        const currentMode = modeCardsModule ? modeCardsModule.getSelectedMode() : 'photo_session';

        // Проверяем наличие изображений
        const hasImages = userImageState && userImageState.images && userImageState.images.length > 0;

        // Рассчитываем стоимость
        const costText = calculateGenerationCost(currentMode, hasImages);
        console.log(`🔹 Cost Badge: mode=${currentMode}, hasImages=${hasImages}, cost=${costText}`);

        // Находим кнопку Generate
        const generateBtn = document.getElementById('generateBtn');
        if (!generateBtn) {
            console.warn('⚠️ Generate button not found for cost badge');
            return;
        }

        // Создаем и добавляем бейдж
        const badge = createCostBadge(costText);
        generateBtn.style.position = 'relative'; // обеспечиваем абсолютное позиционирование бейджа
        generateBtn.appendChild(badge);

    } catch (error) {
        console.error('❌ Error updating cost badge:', error);
    }
}

/**
 * Инициализация модуля бейджа стоимости
 * @param {object} options - опции инициализации
 */
export async function initCostBadge(options = {}) {
    console.log('🚀 Initializing Cost Badge module...');

    try {
        // Загружаем CSS файл (lazy loading)
        await loadCostBadgeCSS();

        // Получаем ссылки на состояния
        modeCardsModule = options.modeCardsModule;
        userImageState = options.userImageState || window.userImageState;

        // Запускаем начальное обновление после загрузки CSS
        updateCostBadge();

        // Слушаем изменения режима
        document.addEventListener('mode:changed', () => {
            setTimeout(updateCostBadge, 50); // небольшая задержка для синхронизации
        });

        // Слушаем изменения изображений через мутацию userImageState
        if (window.userImageState) {
            let imageCountCache = window.userImageState.images ? window.userImageState.images.length : 0;

            // Периодическая проверка изменений изображений
            setInterval(() => {
                const currentCount = window.userImageState.images ? window.userImageState.images.length : 0;
                if (currentCount !== imageCountCache) {
                    imageCountCache = currentCount;
                    updateCostBadge();
                }
            }, 300); // проверка каждые 300мс

            // Также слушаем изменения через глобальные функции обновления UI
            const originalUpdateImageUploadVisibility = window.updateImageUploadVisibility;
            if (originalUpdateImageUploadVisibility) {
                window.updateImageUploadVisibility = function() {
                    originalUpdateImageUploadVisibility.apply(this, arguments);
                    setTimeout(updateCostBadge, 100);
                };
            }
        }

        console.log('✅ Cost Badge module initialized successfully');

    } catch (error) {
        console.error('❌ Failed to initialize Cost Badge module:', error);
    }
}

/**
 * Экспорт функций для внешнего использования
 */
export { updateCostBadge as refreshCostBadge, calculateGenerationCost };

// Автоматическая инициализация при загрузке страницы (fallback)
document.addEventListener('DOMContentLoaded', () => {
    // Ждем немного для загрузки других модулей
    setTimeout(() => {
        if (!document.querySelector('.cost-badge') && window.userImageState) {
            console.log('🔄 Auto-initializing Cost Badge...');
            initCostBadge({
                userImageState: window.userImageState
            });
        }
    }, 1000);
});
