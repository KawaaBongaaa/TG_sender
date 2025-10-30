// ===== STYLE MANAGEMENT MODULE =====
// Handles style selection checkbox and carousel visibility
// pixPLace Project

/**
 * Обрабатывает изменение чекбокса выбора стилей
 */
export function handleStyleCheckboxChange() {
    const styleCheckbox = document.getElementById('styleCheckbox');
    if (!styleCheckbox) {
        console.warn('⚠️ styleCheckbox не найден');
        return;
    }

    const styleGrid = document.getElementById('styleGrid');
    if (!styleGrid) {
        console.warn('⚠️ .style-grid не найден');
        return;
    }

    if (styleCheckbox.checked) {
        // Показываем карусель стилей
        styleGrid.style.display = 'block';
        styleGrid.classList.remove('hidden');
        console.log('📝 Style selection shown');
    } else {
        // Скрываем карусель стилей и сбрасываем выбранный стиль
        styleGrid.style.setProperty('display', 'none', 'important');
        styleGrid.classList.add('hidden');
        unselectAllStyles();
        console.log('🚫 Style selection hidden - no style selected');
    }

    // Обновляем стоимость если есть функция
    if (window.updateCostBadge) {
        window.updateCostBadge();
    }
}

/**
 * Снимает выделение со всех стилей и очищает состояние
 */
export function unselectAllStyles() {
    const activeCards = document.querySelectorAll('.carousel-2d-item.active');
    activeCards.forEach(card => card.classList.remove('active'));
    console.log('✅ All style selections cleared');

    // Очищаем переменную selectedStyle если она существует глобально
    if (typeof window.selectedStyle !== 'undefined') {
        window.selectedStyle = '';
    }

    // Очищаем в appState если доступно
    if (window.appState && window.appState.selectedStyle) {
        window.appState.selectedStyle = '';
    }
}

/**
 * Инициализирует обработчик чекбокса стилей
 */
export function initStyleCheckboxHandler() {
    const styleCheckbox = document.getElementById('styleCheckbox');
    console.log('🔍 Looking for styleCheckbox:', styleCheckbox);

    // Временная отладка - найдём все чекбоксы на странице
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    console.log('🔍 Found all checkboxes on page:', allCheckboxes.length, Array.from(allCheckboxes).map(cb => ({ id: cb.id, name: cb.name, checked: cb.checked })));

    // Найдем контейнер чекбокса стиля
    const checkboxContainer = document.querySelector('.style-checkbox-container');
    console.log('🔍 Style checkbox container found:', checkboxContainer);
    if (checkboxContainer) {
        console.log('🔍 Container HTML:', checkboxContainer.innerHTML.slice(0, 200) + '...');
    }

    if (styleCheckbox) {
        styleCheckbox.addEventListener('change', handleStyleCheckboxChange);
        console.log('✅ Style checkbox handler initialized');

        // По умолчанию скрываем карусель стилей
        const styleGrid = document.getElementById('styleGrid');
        if (styleGrid) {
            styleGrid.style.setProperty('display', 'none', 'important');
            styleGrid.classList.add('hidden');
            console.log('📝 Style grid hidden by default');
        }
    } else {
        console.warn('❌ styleCheckbox не найден при инициализации. Элементы DOM:', document.querySelectorAll('[id]').length);
        // Добавим небольшую задержку для поиска
        setTimeout(() => {
            console.log('⏰ Повторный поиск styleCheckbox...');
            initStyleCheckboxHandler();
        }, 500);
    }
}

// Экспортируем функции для глобального доступа
window.handleStyleCheckboxChange = handleStyleCheckboxChange;
window.unselectAllStyles = unselectAllStyles;
