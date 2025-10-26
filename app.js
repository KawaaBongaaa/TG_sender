/* =========================================== */
/* LOADING MANAGER - ЦЕНТРАЛИЗОВАННОЕ УПРАВЛЕНИЕ ЗАГРУЗКОЙ */
/* =========================================== */

class LoadingManager {
    constructor() {
        this.activeLoadings = new Map();
        this.toasts = [];
        this.initializeToastContainer();
        console.log('🎯 LoadingManager initialized');
    }

    /**
     * ПОКАЗАТЬ ЗАГРУЗКУ НА КНОПКЕ
     */
    showButtonLoading(buttonElement, loadingText = 'Загрузка...') {
        if (!buttonElement) return false;

        buttonElement.classList.add('btn-loading');
        buttonElement.disabled = true;

        // Сохраняем оригинальный текст
        if (!buttonElement.dataset.originalText) {
            buttonElement.dataset.originalText = buttonElement.innerHTML;
        }

        // Добавляем текст в loading состояние
        buttonElement.innerHTML = `
            <span class="loading-text">${loadingText}</span>
            ${buttonElement.dataset.originalText}
        `;

        this.activeLoadings.set(buttonElement.id || buttonElement, Date.now());
        console.log('🎯 Button loading started:', buttonElement.id || 'button');
        return true;
    }

    /**
     * СКРЫТЬ ЗАГРУЗКУ С КНОПКИ
     */
    hideButtonLoading(buttonElement) {
        if (!buttonElement) return false;

        buttonElement.classList.remove('btn-loading');
        buttonElement.disabled = false;

        // Восстанавливаем оригинальный текст
        if (buttonElement.dataset.originalText) {
            buttonElement.innerHTML = buttonElement.dataset.originalText;
            delete buttonElement.dataset.originalText;
        }

        this.activeLoadings.delete(buttonElement.id || buttonElement);
        console.log('✅ Button loading finished:', buttonElement.id || 'button');
        return true;
    }

    /**
     * ОБНОВИТЬ ПРОГРЕСС-БАР
     */
    updateProgressBar(progressPercent, current, total, text = null) {
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (!progressContainer || !progressBar || !progressText) return false;

        // Показываем контейнер
        progressContainer.style.display = 'block';

        // Обновляем полоску прогресса
        progressBar.style.width = Math.min(progressPercent, 100) + '%';

        // Обновляем текст
        const displayText = text ||
            `${current}/${total} (${Math.round(progressPercent)}%)`;

        progressText.textContent = displayText;

        console.log('📊 Progress updated:', progressPercent, `% - ${displayText}`);
        return true;
    }

    /**
     * СКРЫТЬ ПРОГРЕСС-БАР
     */
    hideProgressBar() {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }

        // Сбрасываем прогресс
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = '0%';
        }

        console.log('📊 Progress bar hidden');
        return true;
    }

    /**
     * ИНИЦИАЛИЗАЦИЯ КОНТЕЙНЕРА TOAST УВЕДОМЛЕНИЙ
     */
    initializeToastContainer() {
        // Создаем контейнер если не существует
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    /**
     * ПОКАЗАТЬ TOAST УВЕДОМЛЕНИЕ
     */
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return false;

        // Иконки для разных типов
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        // Создаем toast элемент
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '🔵'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        // Добавляем в контейнер
        toastContainer.appendChild(toast);

        // Добавляем класс для анимации
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Удаляем через заданное время
        if (duration > 0) {
            setTimeout(() => {
                this.hideToast(toast);
            }, duration);
        }

        // Добавляем в массив активных toast'ов
        this.toasts.push(toast);

        console.log('🍞 Toast shown:', type, message);
        return toast;
    }

    /**
     * СКРЫТЬ TOAST УВЕДОМЛЕНИЕ
     */
    hideToast(toastElement) {
        if (!toastElement) return false;

        // Убираем класс показа
        toastElement.classList.remove('show');

        // Удаляем через время анимации
        setTimeout(() => {
            if (toastElement.parentElement) {
                toastElement.parentElement.removeChild(toastElement);
            }

            // Удаляем из массива активных
            const index = this.toasts.indexOf(toastElement);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);

        console.log('🍞 Toast hidden');
        return true;
    }

    /**
     * СКРЫТЬ ВСЕ TOAST УВЕДОМЛЕНИЯ
     */
    hideAllToasts() {
        this.toasts.forEach(toast => this.hideToast(toast));
        console.log('🍞 All toasts hidden');
        return true;
    }

    /**
     * ПРОВЕРИТЬ ЕСТЬ ЛИ АКТИВНАЯ ЗАГРУЗКА
     */
    hasActiveLoading() {
        return this.activeLoadings.size > 0;
    }

    /**
     * СКРЫТЬ ВСЕ АКТИВНЫЕ ЗАГРУЗКИ
     */
    clearAllLoading() {
        // Скрываем все кнопки-загрузки
        this.activeLoadings.forEach((timestamp, button) => {
            this.hideButtonLoading(button);
        });

        // Скрываем прогресс-бары
        this.hideProgressBar();

        // Скрываем все toast'ы
        this.hideAllToasts();

        console.log('🧹 All loading states cleared');
        return true;
    }
}

// Глобальный экземпляр LoadingManager
window.loadingManager = new LoadingManager();

/* =========================================== */
/* HELPSYSTEM - СИСТЕМА ПОМОЩИ ПОЛЬЗОВАТЕЛЯМ */
/* =========================================== */

class HelpSystem {
    constructor(mainApp) {
        this.mainApp = mainApp;
        this.tooltips = new Map();
        this.isHelpVisible = false;
        this.helpModal = null;
        this.helpButton = null;

        // Инициализация системы помощи
        this.init();
        console.log('🆘 HelpSystem initialized');
    }

    /**
     * ДОБАВИТЬ ПОДСКАЗКУ К ЭЛЕМЕНТУ
     */
    addTooltip(elementId, title, description = '', position = 'top') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`HelpSystem: Element ${elementId} not found`);
            return false;
        }

        // Добавляем класс tooltip
        element.classList.add('tooltip');

        // Создаем текст подсказки
        const tooltipText = document.createElement('span');
        tooltipText.className = 'tooltip-text';
        tooltipText.innerHTML = `<strong>${title}</strong>${description ? `<br>${description}` : ''}`;

        // Настраиваем позицию
        if (position === 'bottom') {
            tooltipText.style.bottom = 'auto';
            tooltipText.style.top = '125%';
        }

        element.appendChild(tooltipText);
        this.tooltips.set(elementId, { element, title, description, position });

        console.log(`💡 Tooltip added to ${elementId}: ${title}`);
        return true;
    }

    /**
     * УДАЛИТЬ ПОДСКАЗКУ С ЭЛЕМЕНТА
     */
    removeTooltip(elementId) {
        const tooltipData = this.tooltips.get(elementId);
        if (tooltipData) {
            tooltipData.element.classList.remove('tooltip');
            const tooltipText = tooltipData.element.querySelector('.tooltip-text');
            if (tooltipText) {
                tooltipData.element.removeChild(tooltipText);
            }
            this.tooltips.delete(elementId);
            console.log(`💡 Tooltip removed from ${elementId}`);
            return true;
        }
        return false;
    }

    /**
     * СОЗДАТЬ КНОПКУ ПОМОЩИ
     */
    createHelpButton() {
        // Создаем кнопку
        this.helpButton = document.createElement('button');
        this.helpButton.className = 'help-button';
        this.helpButton.innerHTML = '❓';
        this.helpButton.title = 'Показать помощь и подсказки';

        // Добавляем обработчик клика
        this.helpButton.addEventListener('click', () => this.showHelpModal());

        // Добавляем в документ
        document.body.appendChild(this.helpButton);

        console.log('🆘 Help button created');
        return this.helpButton;
    }

    /**
     * ПОКАЗАТЬ МОДАЛЬНОЕ ОКНО ПОМОЩИ
     */
    showHelpModal() {
        if (this.helpModal) {
            this.helpModal.style.display = 'block';
            return;
        }

        // Создаем модальное окно
        this.helpModal = document.createElement('div');
        this.helpModal.className = 'help-modal';

        this.helpModal.innerHTML = `
            <div class="help-header">
                <h2 class="help-title">🆘 Справка по работе с приложением</h2>
                <button class="help-close" onclick="window.helpSystem.hideHelpModal()">×</button>
            </div>

            <div class="help-content">
                <div class="help-section">
                    <h3>🤖 Боты и таблицы</h3>
                    <div class="help-item">
                        <strong>Добавление бота</strong>
                        <p>Нажмите ⚙️ рядом с селектором ботов. Введите название и API токен от @BotFather.</p>
                    </div>
                    <div class="help-item">
                        <strong>Подключение таблицы</strong>
                        <p>Выберите бота, затем ⚙️ рядом с таблицами Google Sheets. Вставьте ID из URL таблицы.</p>
                    </div>
                    <div class="help-item">
                        <strong>Загрузка пользователей</strong>
                        <p>После выбора таблицы нажмите 📥 "Загрузить пользователей" для импорта данных.</p>
                    </div>
                </div>

                <div class="help-section">
                    <h3>👥 Управление пользователями</h3>
                    <div class="help-item">
                        <strong>Фильтрация пользователей</strong>
                        <p>Используйте чекбоксы статусов, языков и Trial Calls для фильтрации списка.</p>
                    </div>
                    <div class="help-item">
                        <strong>Работа со списками</strong>
                        <p>Создавайте именованные списки пользователей с помощью ⚙️ в разделе списков.</p>
                    </div>
                    <div class="help-item">
                        <strong>Массовая рассылка</strong>
                        <p>Отметьте нужных пользователей чекбоксами и нажмите 🗂️ для сохранения в список.</p>
                    </div>
                </div>

                <div class="help-section">
                    <h3>📢 Создание рассылки</h3>
                    <div class="help-item">
                        <strong>Текст сообщения</strong>
                        <p>Напишите текст с плейсхолдерами {first_name}, {username}, {user_id}.</p>
                    </div>
                    <div class="help-item">
                        <strong>Кнопки сообщений</strong>
                        <p>Добавляйте inline-кнопки с текстом и URL, которые появятся под сообщением.</p>
                    </div>
                    <div class="help-item">
                        <strong>Медиа вложения</strong>
                        <p>Прикрепляйте фото, видео или документы. Тип определится автоматически.</p>
                    </div>
                </div>

                <div class="help-section">
                    <h3>⏰ Расписание и настройки</h3>
                    <div class="help-item">
                        <strong>Шаблоны рассылок</strong>
                        <p>Выберите название, настройте лимиты повторов и интервалы через ⚙️ шаблонов.</p>
                    </div>
                    <div class="help-item">
                        <strong>Запланированная отправка</strong>
                        <p>Укажите время и задержку между сообщениями в планировщике.</p>
                    </div>
                    <div class="help-item">
                        <strong>Восстановление рассылок</strong>
                        <p>Приложение автоматически восстановит запланированные рассылки после перезагрузки.</p>
                    </div>
                </div>

                <div class="help-section">
                    <h3>🔗 Ссылки и шаблоны</h3>
                    <div class="help-item">
                        <strong>Вставка ссылок</strong>
                        <p>Нажмите 🔗, укажите текст и URL ссылки для автоматической вставки в сообщение.</p>
                    </div>
                    <div class="help-item">
                        <strong>Шаблоны сообщений</strong>
                        <p>Создавайте готовые тексты через ⚙️ шаблонов и применяйте их повторно.</p>
                    </div>
                    <div class="help-item">
                        <strong>Автосохранение</strong>
                        <p>Ссылки из сообщений автоматически сохраняются для повторного использования.</p>
                    </div>
                </div>

                <div class="help-section">
                    <h3>⚙️ Дополнительно</h3>
                    <div class="help-item">
                        <strong>Настройки звука</strong>
                        <p>Настройте звуковые уведомления в ⚙️ разделе нижней панели.</p>
                    </div>
                    <div class="help-item">
                        <strong>Экспорт истории</strong>
                        <p>Загружайте историю рассылок в CSV или PDF для анализа результатов.</p>
                    </div>
                    <div class="help-item">
                        <strong>Диагностика</strong>
                        <p>Используйте 💾 кнопку в нижней панели для проверки состояния localStorage.</p>
                    </div>
                </div>
            </div>

            <div class="help-actions">
                <button class="help-action-btn primary" onclick="window.helpSystem.startTutorial()">
                    🚀 Быстрый старт
                </button>
                <button class="help-action-btn secondary" onclick="window.helpSystem.hideHelpModal()">
                    Понятно, спасибо
                </button>
            </div>
        `;

        document.body.appendChild(this.helpModal);

        // Добавляем обработчик закрытия по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.helpModal && this.helpModal.style.display !== 'none') {
                this.hideHelpModal();
            }
        });

        console.log('🆘 Help modal created and shown');
    }

    /**
     * СКРЫТЬ МОДАЛЬНОЕ ОКНО ПОМОЩИ
     */
    hideHelpModal() {
        if (this.helpModal) {
            this.helpModal.style.display = 'none';
            console.log('🆘 Help modal hidden');
        }
    }

    /**
     * ЗАПУСТИТЬ ТУТОРИАЛ ДЛЯ НОВИЧКОВ
     */
    startTutorial() {
        this.hideHelpModal();

        this.showTutorialStep(1, 'tutorial_welcome');

        window.loadingManager?.showToast(
            '🚀 Запущен режим обучения! Следуйте подсказкам',
            'info',
            3000
        );
    }

    /**
     * ПОКАЗАТЬ ШАГ ТУТОРИАЛА
     */
    showTutorialStep(step, stepId) {
        const steps = {
            'tutorial_welcome': {
                title: '🎯 Добро пожаловать в Telegram Sender!',
                message: 'Это приложение поможет организовать массовые рассылки в Telegram каналах и группах.',
                element: 'compact-header',
                position: 'bottom',
                action: () => this.showTutorialStep(2, 'tutorial_bot')
            },
            'tutorial_bot': {
                title: '🤖 Сначала настройте бота',
                message: 'Нажмите ⚙️ рядом с селектором ботов, чтобы добавить вашего Telegram бота.',
                element: 'editBotsBtn',
                position: 'bottom',
                action: () => this.showTutorialStep(3, 'tutorial_users')
            },
            'tutorial_users': {
                title: '👥 Загрузите пользователей',
                message: 'После настройки бота и таблицы нажмите 📥 чтобы загрузить список пользователей.',
                element: 'loadUsersBtn',
                position: 'bottom',
                action: () => this.showTutorialStep(4, 'tutorial_message')
            },
            'tutorial_message': {
                title: '📝 Создайте сообщение',
                message: 'Напишите текст рассылки. Можно использовать плейсхолдеры {first_name} для персонализации.',
                element: 'messageInput',
                position: 'top',
                action: () => this.showTutorialStep(5, 'tutorial_buttons')
            },
            'tutorial_buttons': {
                title: '🔘 Добавьте кнопки (опционально)',
                message: 'Создайте интерактивные кнопки с текстом и URL для ваших сообщений.',
                element: 'addButton',
                position: 'top',
                action: () => this.showTutorialStep(6, 'tutorial_send')
            },
            'tutorial_send': {
                title: '📤 Тестируйте и отправляйте',
                message: 'Сначала протестируйте с 1-2 пользователями, затем запустите массовую рассылку.',
                element: 'sendBtn',
                position: 'top',
                action: () => {
                    window.loadingManager?.showToast(
                        '🎉 Туториал завершен! Теперь вы готовы к работе',
                        'success',
                        5000
                    );
                }
            }
        };

        const stepInfo = steps[stepId];
        if (!stepInfo) return;

        // Создаем оверлей для туториала
        this.createTutorialOverlay(stepInfo, stepId);
    }

    /**
     * СОЗДАТЬ ОВЕРЛЕЙ ДЛЯ ШАГА ТУТОРИАЛА
     */
    createTutorialOverlay(stepInfo, stepId) {
        // Убираем предыдущий оверлей
        const existingOverlay = document.querySelector('.tutorial-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';

        overlay.innerHTML = `
            <div class="tutorial-highlight"></div>
            <div class="tutorial-dialog">
                <div class="tutorial-step">${stepInfo.title}</div>
                <div class="tutorial-message">${stepInfo.message}</div>
                <button class="tutorial-next" onclick="this.parentElement.parentElement.remove(); window.helpSystem.showTutorialStep(${parseInt(stepId.split('_')[1]) + 1}, '${stepId.replace(/\\d+/, parseInt(stepId.split('_')[1]) + 1)}')">Далее →</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Позиционируем выделение на элементе
        if (stepInfo.element) {
            const element = document.getElementById(stepInfo.element);
            if (element) {
                const rect = element.getBoundingClientRect();
                const highlight = overlay.querySelector('.tutorial-highlight');
                highlight.style.left = rect.left - 4 + 'px';
                highlight.style.top = rect.top - 4 + 'px';
                highlight.style.width = rect.width + 8 + 'px';
                highlight.style.height = rect.height + 8 + 'px';
            }
        }

        console.log(`🧑‍🏫 Tutorial step ${stepId} shown`);
    }

    /**
     * ПРОВЕРИТЬ КОНФИГУРАЦИЮ И ПОКАЗАТЬ ПРЕДУПРЕЖДЕНИЯ
     */
    checkConfiguration() {
        const config = window.CONFIG;
        const warnings = [];

        // Проверяем основные настройки
        if (!config || !config.BOT_TOKEN || config.BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") {
            warnings.push({
                type: 'bot_token',
                title: 'Настройте токен бота',
                message: 'BOT_TOKEN не настроен. Получите токен у @BotFather и добавьте в config.js',
                element: 'editBotsBtn',
                severity: 'critical'
            });
        }

        if (!config || !config.ADMIN_ID || config.ADMIN_ID === "PLACEHOLDER_ADMIN_ID") {
            warnings.push({
                type: 'admin_id',
                title: 'Укажите свой Telegram ID',
                message: 'ADMIN_ID не настроен. Запишите свой ID командой /start к боту @userinfobot',
                element: 'compact-header',
                severity: 'critical'
            });
        }

        // Проверяем наличие ботов в localStorage
        try {
            const savedBots = localStorage.getItem('telegram_sender_bots');
            const bots = savedBots ? JSON.parse(savedBots) : [];
            if (bots.length === 0) {
                warnings.push({
                    type: 'no_bots',
                    title: 'Добавьте бота для работы',
                    message: 'У вас нет добавленных ботов. Настройте хотя бы одного для отправки сообщений.',
                    element: 'editBotsBtn',
                    severity: 'high'
                });
            }
        } catch (error) {
            console.warn('Error checking saved bots:', error);
        }

        // Показываем предупреждения
        this.showConfigurationWarnings(warnings);

        console.log('🔍 Configuration check completed');
        return warnings;
    }

    /**
     * ПОКАЗАТЬ ПРЕДУПРЕЖДЕНИЯ КОНФИГУРАЦИИ
     */
    showConfigurationWarnings(warnings) {
        if (warnings.length === 0) return;

        // Находим место для вставки предупреждений (после шапки)
        const header = document.querySelector('.compact-header');
        if (!header) return;

        let warningContainer = document.querySelector('.config-warnings');
        if (!warningContainer) {
            warningContainer = document.createElement('div');
            warningContainer.className = 'config-warnings';
            header.insertAdjacentElement('afterend', warningContainer);
        }

        warningContainer.innerHTML = '';

        warnings.forEach(warning => {
            const warningDiv = document.createElement('div');
            warningDiv.className = `config-warning ${warning.severity}`;

            warningDiv.innerHTML = `
                <div class="warning-content">
                    <h4>${warning.title}</h4>
                    <p>${warning.message}</p>
                    ${warning.element ? `<button class="config-fix-btn" onclick="document.getElementById('${warning.element}').click()">Исправить</button>` : ''}
                </div>
            `;

            warningContainer.appendChild(warningDiv);
        });

        // Делаем анимацию подсветки
        setTimeout(() => {
            const warningElements = warningContainer.querySelectorAll('.config-warning');
            warningElements.forEach((el, index) => {
                setTimeout(() => {
                    el.classList.add('highlight-config');
                    setTimeout(() => el.classList.remove('highlight-config'), 2000);
                }, index * 500);
            });
        }, 1000);

        console.log(`⚠️ ${warnings.length} configuration warnings shown`);
    }

    /**
     * УБРАТЬ ПРЕДУПРЕЖДЕНИЯ
     */
    clearConfigurationWarnings() {
        const warningContainer = document.querySelector('.config-warnings');
        if (warningContainer) {
            warningContainer.remove();
            console.log('⚠️ Configuration warnings cleared');
        }
    }

    /**
     * ДОБАВИТЬ ПОДСКАЗКИ НА ВСЕ ОСНОВНЫЕ ЭЛЕМЕНТЫ
     */
    addDefaultTooltips() {
        // Боты
        this.addTooltip('editBotsBtn', 'Добавление бота', 'Создайте нового бота через @BotFather или настройте существующего');
        this.addTooltip('editSheetsBtn', 'Подключение таблицы', 'Подключите Google Sheets для загрузки списка пользователей');
        this.addTooltip('loadUsersBtn', 'Загрузка пользователей', 'Импортируйте пользователей из подключенной таблицы');

        // Пользователи
        this.addTooltip('selectAllUsersBtn', 'Выделить всех', 'Отметить всех видимых пользователей в фильтре');
        this.addTooltip('clearUsersSelectionBtn', 'Снять выделение', 'Убрать все метки с пользователей');
        this.addTooltip('searchFilter', 'Поиск по пользователям', 'Ищите по имени, ID, username или описанию');

        // Сообщения
        this.addTooltip('messageInput', 'Текст рассылки', 'Напишите сообщение. Используйте {first_name} для персонализации');
        this.addTooltip('addButton', 'Добавить кнопку', 'Создайте inline-кнопку, которая появится под сообщением');
        this.addTooltip('insertLinkBtn', 'Вставить ссылку', 'Добавьте кликабельную ссылку в текст сообщения');

        // Рассылка
        this.addTooltip('sendBtn', 'Тестовая отправка', 'Протестируйте рассылку на выбранных пользователях');
        this.addTooltip('sendMassBtn', 'Массовал рассылка', 'Запустить отправку всем выбранным пользователям');
        this.addTooltip('saveBroadcastTemplateBtn', 'Сохранить шаблон', 'Создайте шаблон рассылки с настройками повторов');

        // Планировщик
        this.addTooltip('scheduleBroadcastBtn', 'Запланировать отправку', 'Установите время автоматической рассылки');
        this.addTooltip('cancelScheduleBtn', 'Отменить расписание', 'Удалить запланированную рассылку');

        console.log('💡 Default tooltips added to all main elements');
    }

    /**
     * ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ ПОМОЩИ
     */
    init() {
        // Создаем кнопку помощи (с задержкой чтобы DOM загрузился)
        setTimeout(() => {
            this.createHelpButton();
            this.addDefaultTooltips();

            // Добавляем дополнительный CSS для туториала
            const style = document.createElement('style');
            style.textContent = `
                .tutorial-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .tutorial-highlight {
                    position: absolute;
                    border: 2px solid #ff6b35;
                    border-radius: 8px;
                    background: rgba(255, 107, 53, 0.1);
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.02); opacity: 0.8; }
                }

                .tutorial-dialog {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }

                .tutorial-step {
                    font-size: 18px;
                    font-weight: 600;
                    color: #007bff;
                    margin-bottom: 15px;
                }

                .tutorial-message {
                    font-size: 14px;
                    color: #333;
                    line-height: 1.5;
                    margin-bottom: 20px;
                }

                .tutorial-next {
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .tutorial-next:hover {
                    background: #218838;
                }
            `;
            document.head.appendChild(style);

            // Проверяем конфигурацию через 3 секунды
            setTimeout(() => {
                this.checkConfiguration();
            }, 3000);

        }, 1000);
    }
}

/* =========================================== */
/* TAB SYNCHRONIZATION - СИНХРОНИЗАЦИЯ МЕЖДУ ТАБАМИ */
/* =========================================== */

class TabSyncManager {
    constructor(mainApp) {
        this.mainApp = mainApp;
        this.channel = null;
        this.tabId = this.generateTabId();
        this.isMaster = false;
        this.lastSync = Date.now();

        // Состояние для синхронизации
        this.syncState = {
            selectedUsers: new Set(),
            filters: {},
            theme: 'default',
            currentBot: null,
            currentSheet: null
        };

        // Инициализация синхронизации
        this.init();
        console.log(`🔄 TabSyncManager initialized (Tab ID: ${this.tabId})`);
    }

    /**
     * ГЕНЕРАЦИЯ УНИКАЛЬНОГО ID ДЛЯ ТЕКУЩЕЙ ВКЛАДКИ
     */
    generateTabId() {
        return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * ИНИЦИАЛИЗАЦИЯ СИНХРОНИЗАЦИИ
     */
    init() {
        // Создаем канал коммуникации
        try {
            this.channel = new BroadcastChannel('telegram_sender_tabs');

            // Слушаем сообщения от других вкладок
            this.channel.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            // Отправляем приветствие для определения master таба
            this.channel.postMessage({
                type: 'HELLO',
                tabId: this.tabId,
                timestamp: Date.now()
            });

            // При закрытии вкладки отправляем уведомление
            window.addEventListener('beforeunload', () => {
                this.channel.postMessage({
                    type: 'BYE',
                    tabId: this.tabId,
                    timestamp: Date.now()
                });
            });

            console.log('✅ Tab synchronization initialized');

        } catch (error) {
            console.warn('❌ Failed to initialize tab sync:', error);
            // Fallback для браузеров без BroadcastChannel
            this.initFallbackSync();
        }
    }

    /**
     * ЗАГЛУШКА ДЛЯ БРАУЗЕРОВ БЕЗ BROADCAST CHANNEL
     */
    initFallbackSync() {
        console.log('🔄 Using fallback localStorage sync');

        // Используем localStorage события для синхронизации
        window.addEventListener('storage', (event) => {
            if (event.key === 'telegram_sender_tab_sync') {
                try {
                    const data = JSON.parse(event.newValue);
                    this.handleFallbackMessage(data);
                } catch (error) {
                    console.warn('❌ Failed to parse fallback sync data:', error);
                }
            }
        });

        // Периодическая проверка других вкладок
        setInterval(() => {
            const otherTabs = this.getOtherTabs();
            if (otherTabs.length === 0) {
                this.syncFromStorage();
            }
        }, 5000);
    }

    /**
     * ОБРАБОТКА СООБЩЕНИЙ ОТ ДРУГИХ ВКЛАДОК
     */
    handleMessage(message) {
        // Игнорируем свои сообщения
        if (message.tabId === this.tabId) return;

        switch (message.type) {
            case 'HELLO':
                console.log(`📬 HELLO from tab ${message.tabId}`);

                // Отвечаем новым табам текущим состоянием
                if (this.isMaster) {
                    this.sendCurrentState();
                }
                break;

            case 'SYNC_STATE':
                this.receiveState(message.state, message.tabId);
                break;

            case 'SELECT_USERS':
                this.receiveSelectedUsers(message.users, message.tabId);
                break;

            case 'APPLY_FILTERS':
                this.receiveFilters(message.filters, message.tabId);
                break;

            case 'CHANGE_THEME':
                this.receiveTheme(message.theme, message.tabId);
                break;

            case 'BOT_CHANGED':
                this.receiveBotChange(message.botId, message.sheetId, message.tabId);
                break;

            case 'BYE':
                console.log(`👋 BYE from tab ${message.tabId}`);
                break;

            default:
                console.log(`📬 Unknown message type: ${message.type}`);
        }
    }

    /**
     * ПРИЕМ ПОЛНОГО СОСТОЯНИЯ ОТ MASTER ВКЛАДКИ
     */
    receiveState(state, fromTabId) {
        console.log(`📥 Received full state from tab ${fromTabId}`);

        // Синхронизируем выбранных пользователей
        this.receiveSelectedUsers(state.selectedUsers, fromTabId);

        // Синхронизируем фильтры
        this.receiveFilters(state.filters, fromTabId);

        // Синхронизируем тему
        this.receiveTheme(state.theme, fromTabId);

        // Синхронизируем бота
        this.receiveBotChange(state.currentBot, state.currentSheet, fromTabId);
    }

    /**
     * ПРИЕМ СПИСКА ВЫБРАННЫХ ПОЛЬЗОВАТЕЛЕЙ
     */
    receiveSelectedUsers(userIds, fromTabId) {
        console.log(`👥 Received ${userIds.length} selected users from tab ${fromTabId}`);

        // Конвертируем массив в Set
        const newSelected = new Set(userIds);

        // Проверяем на изменения
        const hasChanges = !this.equalSets(this.syncState.selectedUsers, newSelected);

        if (hasChanges) {
            // Применяем изменения к локальному состоянию
            this.mainApp.selectedUsers = newSelected;
            this.syncState.selectedUsers = new Set(newSelected);

            // Обновляем UI
            this.mainApp.updateUI();

            // Показываем уведомление
            this.mainApp.showStatus(`Синхронизировано: выбрано ${userIds.length} пользователей`, 'info');

            window.loadingManager?.showToast(
                `Выбранные пользователи синхронизированы (${userIds.length})`,
                'info',
                3000
            );
        }
    }

    /**
     * ПРИЕМ НАСТРОЕК ФИЛЬТРОВ
     */
    receiveFilters(filters, fromTabId) {
        console.log(`🔍 Received filters from tab ${fromTabId}:`, filters);

        // Применяем фильтры к формам
        const searchInput = document.getElementById('searchFilter');
        if (searchInput && filters.search !== undefined) {
            searchInput.value = filters.search;
        }

        // Применяем чекбоксы статусов
        const statusCheckboxes = ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked'];
        statusCheckboxes.forEach(cbId => {
            const cb = document.getElementById(cbId);
            const status = cbId.replace('status', '').toLowerCase();
            if (cb && typeof filters.statuses === 'object') {
                cb.checked = filters.statuses[status] === true;
            }
        });

        // Применяем чекбоксы Trial Calls
        const trialCheckboxes = ['trialCallsLess0', 'trialCallsLess5', 'trialCallsMid', 'trialCallsGreater20', 'trialCallsEquals20'];
        trialCheckboxes.forEach(cbId => {
            const cb = document.getElementById(cbId);
            const filter = cbId.replace('trialCalls', '').toLowerCase();
            if (cb && typeof filters.trialCalls === 'object') {
                cb.checked = filters.trialCalls[filter] === true;
            }
        });

        // Применяем чекбоксы языков
        const languageCheckboxes = ['languageRu', 'languageEn', 'languageEs', 'languageFr', 'languageDe', 'languageIt', 'languagePt', 'languageZh', 'languageAr', 'languageJa', 'languagePl', 'languageTr', 'languageKo', 'languageHi', 'languageFa', 'languageOther'];
        languageCheckboxes.forEach(cbId => {
            const cb = document.getElementById(cbId);
            const lang = cbId.replace('language', '').toLowerCase();
            if (cb && typeof filters.languages === 'object') {
                cb.checked = filters.languages[lang] === true;
            }
        });

        // Применяем фильтры
        this.mainApp.applyFilters();

        // Сохраняем состояние фильтров
        this.syncState.filters = filters;
    }

    /**
     * ПРИЕМ НАСТРОЙКИ ТЕМЫ
     */
    receiveTheme(theme, fromTabId) {
        console.log(`🎨 Received theme change ${theme} from tab ${fromTabId}`);

        if (this.syncState.theme !== theme) {
            this.syncState.theme = theme;
            this.mainApp.setTheme(theme);

            window.loadingManager?.showToast(
                `Тема изменена на ${theme}`,
                'info',
                2000
            );
        }
    }

    /**
     * ПРИЕМ ИЗМЕНЕНИЯ БОТА
     */
    receiveBotChange(botId, sheetId, fromTabId) {
        console.log(`🤖 Received bot change ${botId}/${sheetId} from tab ${fromTabId}`);

        if (this.syncState.currentBot !== botId || this.syncState.currentSheet !== sheetId) {
            this.syncState.currentBot = botId;
            this.syncState.currentSheet = sheetId;

            // Применяем к селекторам
            const botSelect = document.getElementById('botsList');
            if (botSelect) botSelect.value = botId || '';

            const sheetSelect = document.getElementById('sheetsList');
            if (sheetSelect) sheetSelect.value = sheetId || '';

            // Вызываем обработчики
            if (this.mainApp.modules?.bots) {
                if (botId) this.mainApp.modules.bots.selectBot(botId);
                if (sheetId) this.mainApp.modules.bots.selectSheet(sheetId);
            }

            window.loadingManager?.showToast(
                `Бот синхронизирован`,
                'info',
                2000
            );
        }
    }

    /**
     * ОТПРАВКА ТЕКУЩЕГО СОСТОЯНИЯ ДРУГИМ ВКЛАДКАМ
     */
    sendCurrentState() {
        const state = {
            selectedUsers: Array.from(this.mainApp.selectedUsers),
            filters: this.collectCurrentFilters(),
            theme: this.mainApp.modules?.settings?.currentTheme || 'default',
            currentBot: this.mainApp.currentBot,
            currentSheet: this.mainApp.currentSheet
        };

        this.broadcast({
            type: 'SYNC_STATE',
            state: state,
            timestamp: Date.now()
        });

        console.log('📤 Sent current state to other tabs');
    }

    /**
     * ОТПРАВКА ВЫБРАННЫХ ПОЛЬЗОВАТЕЛЕЙ
     */
    sendSelectedUsers() {
        const users = Array.from(this.mainApp.selectedUsers);

        this.broadcast({
            type: 'SELECT_USERS',
            users: users,
            timestamp: Date.now()
        });

        // Обновляем локальное состояние
        this.syncState.selectedUsers = new Set(users);

        console.log(`👥 Sent ${users.length} selected users to other tabs`);
    }

    /**
     * ОТПРАВКА ФИЛЬТРОВ
     */
    sendFilters() {
        const filters = this.collectCurrentFilters();

        this.broadcast({
            type: 'APPLY_FILTERS',
            filters: filters,
            timestamp: Date.now()
        });

        // Обновляем локальное состояние
        this.syncState.filters = filters;

        console.log('🔍 Sent filters to other tabs');
    }

    /**
     * ОТПРАВКА ИЗМЕНЕНИЯ ТЕМЫ
     */
    sendTheme(theme) {
        this.broadcast({
            type: 'CHANGE_THEME',
            theme: theme,
            timestamp: Date.now()
        });

        this.syncState.theme = theme;
        console.log(`🎨 Sent theme change ${theme} to other tabs`);
    }

    /**
     * ОТПРАВКА ИЗМЕНЕНИЯ БОТА
     */
    sendBotChange(botId, sheetId) {
        this.broadcast({
            type: 'BOT_CHANGED',
            botId: botId,
            sheetId: sheetId,
            timestamp: Date.now()
        });

        this.syncState.currentBot = botId;
        this.syncState.currentSheet = sheetId;
        console.log(`🤖 Sent bot change ${botId}/${sheetId} to other tabs`);
    }

    /**
     * СБОР ТЕКУЩИХ НАСТРОЕК ФИЛЬТРОВ
     */
    collectCurrentFilters() {
        return {
            search: document.getElementById('searchFilter')?.value || '',

            statuses: {
                trial: document.getElementById('statusTrial')?.checked || false,
                newsub: document.getElementById('statusNewSub')?.checked || false,
                canceled: document.getElementById('statusCanceled')?.checked || false,
                kicked: document.getElementById('statusKicked')?.checked || false
            },

            trialCalls: {
                less0: document.getElementById('trialCallsLess0')?.checked || false,
                less5: document.getElementById('trialCallsLess5')?.checked || false,
                mid: document.getElementById('trialCallsMid')?.checked || false,
                greater20: document.getElementById('trialCallsGreater20')?.checked || false,
                equals20: document.getElementById('trialCallsEquals20')?.checked || false
            },

            languages: {
                ru: document.getElementById('languageRu')?.checked || false,
                en: document.getElementById('languageEn')?.checked || false,
                es: document.getElementById('languageEs')?.checked || false,
                fr: document.getElementById('languageFr')?.checked || false,
                de: document.getElementById('languageDe')?.checked || false,
                it: document.getElementById('languageIt')?.checked || false,
                pt: document.getElementById('languagePt')?.checked || false,
                zh: document.getElementById('languageZh')?.checked || false,
                ar: document.getElementById('languageAr')?.checked || false,
                ja: document.getElementById('languageJa')?.checked || false,
                pl: document.getElementById('languagePl')?.checked || false,
                tr: document.getElementById('languageTr')?.checked || false,
                ko: document.getElementById('languageKo')?.checked || false,
                hi: document.getElementById('languageHi')?.checked || false,
                fa: document.getElementById('languageFa')?.checked || false,
                other: document.getElementById('languageOther')?.checked || false
            },

            customLanguage: document.getElementById('customLanguageFilter')?.value || ''
        };
    }

    /**
     * ОТПРАВКА СООБЩЕНИЯ В ДРУГИЕ ВКЛАДКИ
     */
    broadcast(message) {
        message.tabId = this.tabId;

        if (this.channel) {
            this.channel.postMessage(message);
        } else {
            // Fallback через localStorage
            this.broadcastFallback(message);
        }
    }

    /**
     * FALLBACK СИНХРОНИЗАЦИИ ЧЕРЕЗ LOCALSTORAGE
     */
    broadcastFallback(message) {
        try {
            localStorage.setItem('telegram_sender_tab_sync', JSON.stringify(message));

            // Очищаем через микросекунды чтобы другие вкладки успели прочитать
            setTimeout(() => {
                localStorage.removeItem('telegram_sender_tab_sync');
            }, 10);
        } catch (error) {
            console.warn('❌ Fallback broadcast failed:', error);
        }
    }

    /**
     * ОБРАБОТКА FALLBACK СООБЩЕНИЙ
     */
    handleFallbackMessage(data) {
        // Исключаем свои сообщения
        if (data.tabId === this.tabId) return;

        this.handleMessage(data);
    }

    /**
     * ПОЛУЧЕНИЕ СПИСКА ДРУГИХ ВКЛАДОК
     */
    getOtherTabs() {
        // Простая заглушка - в будущем можно реализовать через localStorage
        return [];
    }

    /**
     * СИНХРОНИЗАЦИЯ ИЗ LOCALSTORAGE (ДЛЯ НАЧАЛЬНОЙ ЗАГРУЗКИ)
     */
    syncFromStorage() {
        try {
            // Синхронизация выбранных пользователей
            const savedSelected = localStorage.getItem('telegram_sender_selected_users');
            if (savedSelected) {
                const users = JSON.parse(savedSelected);
                if (Array.isArray(users)) {
                    this.receiveSelectedUsers(users, 'storage');
                }
            }

            // Синхронизация темы
            const savedTheme = localStorage.getItem('telegram_sender_theme');
            if (savedTheme) {
                this.receiveTheme(savedTheme, 'storage');
            }

        } catch (error) {
            console.warn('❌ Failed to sync from storage:', error);
        }
    }

    /**
     * ПРОКЕРКА РАВЕНСТВА SET'ОВ
     */
    equalSets(setA, setB) {
        if (setA.size !== setB.size) return false;
        return [...setA].every(item => setB.has(item));
    }

    /**
     * ОЧИСТКА РЕСУРСОВ ПРИ УНИЧТОЖЕНИИ
     */
    destroy() {
        if (this.channel) {
            this.channel.close();
        }
        console.log('🔄 TabSyncManager destroyed');
    }
}

// Инициализация систем после полной загрузки приложения
let tabSyncInitialized = false;
let helpSystemInitialized = false;

function initSystemsAfterLoad() {
    if (!window.telegramSender || !window.telegramSender.isInited) {
        // Ждем полной инициализации
        setTimeout(initSystemsAfterLoad, 100);
        return;
    }

    // Глобальный экземпляр TabSyncManager
    window.tabSync = new TabSyncManager(window.telegramSender);

    // Глобальный экземпляр HelpSystem
    window.helpSystem = new HelpSystem(window.telegramSender);

    tabSyncInitialized = true;
    helpSystemInitialized = true;

    console.log('✅ All systems initialized successfully');
}

// Запускаем инициализацию систем
initSystemsAfterLoad();

/* =========================================== */
/* Телеграм Sender - ПОЛНАЯ ВОССТАНОВЛЕННАЯ ВЕРСИЯ */
/* GitHub Pages compatible */
/* =========================================== */

class TelegramSender {
    constructor() {
        console.log('🚀 Initializing TelegramSender...');

        // Базовые свойства
        this.isAdmin = false;
        this.isInited = false;
        this.sdkReady = false;
        this.config = window.CONFIG || {};

        // Данные
        this.users = [];
        this.filteredUsers = [];
        this.selectedUsers = new Set();
        this.templates = [];
        this.linkTemplates = [];
        this.bots = [];
        this.currentBot = null;
        this.currentSheet = null;
        this.broadcastHistory = [];
        this.userMessageHistory = {};
        this.notificationSoundSettings = {
            frequency: 800,
            duration: 300,
            waveType: 'sine',
            volume: 0.1
        };
        this.linkAutoSave = true;

        // Модули
        this.modules = {};

        // Инициализация модулей
        this.initModules();
        this.initTelegram();
    }

    initModules() {
        // Регистрация всех модулей в правильном порядке по HTML порядку
        this.register('storage', TelegramStorage);
        this.register('messaging', TelegramMessagingAdvanced);
        this.register('users', TelegramUsersAdvanced); // Используем продвинутую версию
        this.register('userlists', TelegramUserLists);
        this.register('bots', TelegramBots);
        this.register('links', TelegramLinks);
        this.register('buttons', TelegramButtons);
        this.register('settings', TelegramSettings);
        this.register('notifications', TelegramNotifications);

        console.log(`📦 Registered ${Object.keys(this.modules).length} modules`);
    }

    register(name, cls) {
        try {
            this.modules[name] = new cls(this);
            console.log(`✅ Module ${name} loaded`);
        } catch (error) {
            console.error(`❌ Failed to load ${name}:`, error);
        }
    }

    initTelegram() {
        this.checkTelegramSDK()
            .then(() => this.checkAdminAccess())
            .then(() => this.initUI())
            .then(() => this.loadInitialData())
            .then(() => {
                this.isInited = true;
                console.log('✅ TelegramSender fully initialized');
            })
            .catch(error => {
                console.error('❌ Initialization failed:', error);
                this.showError('Ошибка инициализации: ' + error.message);
            });
    }

    async checkTelegramSDK() {
        return new Promise((resolve, reject) => {
            if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
                // Настоящий SDK загружен
                Telegram.WebApp.ready();
                Telegram.WebApp.expand();
                this.sdkReady = true;
                resolve();
                return;
            }

            // 🛠️ ЗАГЛУШКА ДЛЯ ТЕСТИРОВАНИЯ БЕЗ SDK
            console.warn('🔧 Telegram SDK не найден - устанавливаем заглушку для тестирования');

            window.Telegram = {
                WebApp: {
                    ready: () => console.log('🔧 Mock Telegram.WebApp.ready()'),
                    expand: () => console.log('🔧 Mock Telegram.WebApp.expand()'),
                    close: () => console.log('🔧 Mock Telegram.WebApp.close()'),
                    initDataUnsafe: {
                        user: {
                            id: 123456789,        // Тестовый ID
                            username: 'test_user',
                            first_name: 'Тестовый',
                            last_name: 'Пользователь'
                        }
                    },
                    themeParams: {},
                    colorScheme: 'light'
                }
            };

            this.sdkReady = true;
            resolve();
        });
    }

    async checkAdminAccess() {
        const config = this.config;

        if (!config.ADMIN_ID) {
            throw new Error('CONFIG.ADMIN_ID не настроен');
        }

        console.warn('⚠️ DEVMODE: проверка доступа отключена');
        if (config.ADMIN_ID !== "PLACEHOLDER_ADMIN_ID") {
            this.isAdmin = true;
            console.log('✅ Admin access granted');
        } else {
            throw new Error('Доступ запрещён');
        }
    }

    initUI() {
        // Скрываем экраны загрузки/ошибки
        const loading = document.querySelector('.loading-screen');
        const error = document.querySelector('.access-denied-screen');
        const main = document.querySelector('.main-app');

        if (loading) loading.classList.add('hidden');
        if (error) error.classList.add('hidden');
        if (main) main.classList.add('animate');

        // Настройка тем
        if (this.modules.settings) {
            this.modules.settings.loadSavedTheme();
        }

        // Инициализация всех модулей
        Object.values(this.modules).forEach(mod => {
            if (mod.init) mod.init();
        });

        // Подключение интерфейса
        this.setupEventListeners();
        this.initModalEvents();

        console.log('🎨 UI initialized');
    }

    setupEventListeners() {
        // Основные кнопки
        this.bindBtn('loadUsersBtn', () => this.modules.users?.reloadUsersData?.());
        this.bindBtn('sendBtn', () => this.modules.messaging?.startSimpleBroadcast?.());
        this.bindBtn('sendMassBtn', () => this.modules.messaging?.startMassBroadcast?.());

        // Управление ботами
        this.bindBtn('editBotsBtn', () => this.modules.bots?.showBotsWizard?.());
        this.bindBtn('editSheetsBtn', () => this.modules.bots?.showSheetsWizard?.());
        this.bindBtn('saveBotBtn', () => this.modules.bots?.addBotFromWizard?.());
        this.bindBtn('addSheetBtn', () => this.modules.bots?.addSheetFromWizard?.());
        this.bindBtn('cancelSheetsWizardBtn', () => this.closeAllModals());

        // Шаблоны и ссылки
        this.bindBtn('insertLinkBtn', () => this.showModal('linkWizard'));
        this.bindBtn('insertLinkConfirmBtn', () => this.insertLink());
        this.bindBtn('editTemplatesBtn', () => this.showModal('templateWizard'));
        this.bindBtn('addTemplateBtn', () => this.addTemplate());

        // Кнопки и медиа
        this.bindBtn('addButton', () => this.addButton());
        this.bindBtn('clearButtons', () => this.clearButtons());

        // Планировщик
        this.bindBtn('scheduleBroadcastBtn', () => this.modules.messaging?.scheduleCurrentBroadcast?.());
        this.bindBtn('cancelScheduleBtn', () => this.modules.messaging?.cancelScheduledBroadcast?.());

        // Выпадающие списки
        this.bindSelect('botsList', (e) => this.modules.bots?.selectBot?.(e.target.value));
        this.bindSelect('sheetsList', (e) => this.modules.bots?.selectSheet?.(e.target.value));
        this.bindSelect('templateSelect', (e) => this.applyTemplate(e.target.value));

        // Фильтры пользователей
        this.bindInput('searchFilter', (e) => this.applyFilters());
        this.bindStatusCheckbox('statusTrial', () => this.applyFilters());
        this.bindStatusCheckbox('statusNewSub', () => this.applyFilters());
        this.bindStatusCheckbox('statusCanceled', () => this.applyFilters());
        this.bindStatusCheckbox('statusKicked', () => this.applyFilters());

        // Фильтры по Trial Calls
        this.bindStatusCheckbox('trialCallsLess0', () => this.applyFilters());
        this.bindStatusCheckbox('trialCallsLess5', () => this.applyFilters());
        this.bindStatusCheckbox('trialCallsMid', () => this.applyFilters());
        this.bindStatusCheckbox('trialCallsGreater20', () => this.applyFilters());
        this.bindStatusCheckbox('trialCallsEquals20', () => this.applyFilters());

        // ФИЛЬТРЫ ПО ЯЗЫКАМ - ДОБАВЛЕНЫ ОБРАБОТЧИКИ
        this.bindStatusCheckbox('languageRu', () => this.applyFilters());
        this.bindStatusCheckbox('languageEn', () => this.applyFilters());
        this.bindStatusCheckbox('languageEs', () => this.applyFilters());
        this.bindStatusCheckbox('languageFr', () => this.applyFilters());
        this.bindStatusCheckbox('languageDe', () => this.applyFilters());
        this.bindStatusCheckbox('languageIt', () => this.applyFilters());
        this.bindStatusCheckbox('languagePt', () => this.applyFilters());
        this.bindStatusCheckbox('languageZh', () => this.applyFilters());
        this.bindStatusCheckbox('languageAr', () => this.applyFilters());
        this.bindStatusCheckbox('languageJa', () => this.applyFilters());
        this.bindStatusCheckbox('languagePl', () => this.applyFilters());
        this.bindStatusCheckbox('languageTr', () => this.applyFilters());
        this.bindStatusCheckbox('languageKo', () => this.applyFilters());
        this.bindStatusCheckbox('languageHi', () => this.applyFilters());
        this.bindStatusCheckbox('languageFa', () => this.applyFilters());
        this.bindStatusCheckbox('languageOther', () => this.applyFilters());
        this.bindInput('customLanguageFilter', (e) => this.applyFilters());

        // Настройки звука
        this.bindBtn('testNotificationBtn', () => this.modules.notifications?.showTestNotification?.());
        this.bindBtn('saveSoundSettingsBtn', () => this.saveSoundSettings());

        // Управление списками
        this.bindBtn('selectAllUsersBtn', () => this.selectAllUsers(true));
        this.bindBtn('clearUsersSelectionBtn', () => this.selectAllUsers(false));
        this.bindBtn('saveToListBtn', () => this.saveSelectedToList());
        this.bindBtn('manageListsBtn', () => this.showModal('userListsWizard'));

        // Экспорт/импорт
        this.bindBtn('exportHistoryCSVBtn', () => this.exportHistory('csv'));
        this.bindBtn('exportHistoryPDFBtn', () => this.exportHistory('pdf'));
        this.bindBtn('runLocalStorageDiagnostic', () => this.runDiagnostic());
        this.bindBtn('importUsersBtn', (e) => this.importUsers(e.target.previousElementSibling.files[0]));

        // Уведомления и звуки
        this.bindBtn('requestNotificationsBtn', () => this.modules.notifications?.requestNotificationPermission?.());
        this.bindBtn('checkNotificationSupportBtn', () => this.modules.notifications?.checkNotificationSupport?.());
        this.bindBtn('soundSettingsBtn', () => this.modules.notifications?.showSoundSettingsWizard?.());
        this.bindBtn('testSoundBtn', () => this.modules.notifications?.playNotificationSound?.());
        this.bindBtn('resetSoundSettingsBtn', () => this.modules.notifications?.resetSoundSettings?.());
        this.bindBtn('cancelSoundSettingsBtn', () => this.closeAllModals());

        // История пользователей
        this.bindBtn('clearUserHistoryBtn', () => this.clearUserHistory());

        // Шаблоны рассылок
        this.bindBtn('saveBroadcastTemplateBtn', () => this.modules.messaging?.createBroadcastTemplateFromWizard?.());
        this.bindBtn('createBroadcastTemplateBtn', () => this.modules.messaging?.createBroadcastTemplateFromWizard?.());
        this.bindBtn('cancelBroadcastWizardBtn', () => this.closeAllModals());

        // Медиа
        this.bindBtn('clearMediaBtn', () => this.modules.messaging?.clearMediaFile?.());

        // Кнопки фильтров
        this.bindBtn('selectAllStatuses', () => this.modules.users?.selectAllStatuses?.());
        this.bindBtn('resetFilters', () => this.modules.users?.resetAllFilters?.());

        console.log('🔗 Event listeners connected');
    }

    // Вспомогательные методы привязки
    bindBtn(btnId, handler) {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', handler);
    }

    bindSelect(selId, handler) {
        const sel = document.getElementById(selId);
        if (sel) sel.addEventListener('change', handler);
    }

    bindInput(inpId, handler) {
        const inp = document.getElementById(inpId);
        if (inp) inp.addEventListener('input', handler);
    }

    bindStatusCheckbox(cbId, handler) {
        const cb = document.getElementById(cbId);
        if (cb) cb.addEventListener('change', handler);
    }

    // Загрузка начальных данных
    async loadInitialData() {
        // История и настройки
        this.modules.storage?.loadBroadcastHistory?.();
        this.modules.storage?.loadUserMessageHistory?.();
        this.modules.storage?.loadBots?.();

        // Восстановление выбора ботов
        this.restoreBotSelection();

        console.log('✅ Initial data loaded');
    }

    restoreBotSelection() {
        try {
            const savedBotId = localStorage.getItem('telegram_sender_current_bot');
            const savedSheetId = localStorage.getItem('telegram_sender_current_sheet');

            if (savedBotId && this.modules.bots) {
                this.modules.bots.selectBot(savedBotId);
                if (savedSheetId) {
                    this.modules.bots.selectSheet(savedSheetId);
                }
            }
        } catch (error) {
            console.warn('Failed to restore bot selection:', error);
        }
    }

    /**
     * ДЕЛАЙ ЗНАЧЕНИЕ ЗАДЕРЖКИ МЕЖДУ СООБЩЕНИЯМИ
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Методы управления ботами
    saveNewBot() {
        const nameInput = document.getElementById('newBotName');
        const tokenInput = document.getElementById('newBotToken');

        const name = nameInput?.value?.trim();
        const token = tokenInput?.value?.trim();

        if (!name || !token) {
            alert('Заполните все поля!');
            return;
        }

        if (this.modules.bots?.addBot) {
            this.modules.bots.addBot(name, token);
        }

        this.hideModal('botsWizard');
    }

    // Методы сообщений и шаблонов
    applyTemplate(templateId) {
        if (!templateId) return;

        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = template.text;
        }
    }

    addTemplate() {
        const nameInput = document.getElementById('newTemplateName');
        const textInput = document.getElementById('newTemplateText');

        const name = nameInput?.value?.trim();
        const text = textInput?.value?.trim();

        if (!name || !text) {
            alert('Заполните все поля!');
            return;
        }

        if (this.modules.messaging?.addTemplate) {
            this.modules.messaging.addTemplate(name, text);
        }

        this.hideModal('templateWizard');
    }

    insertLink() {
        const textInput = document.getElementById('linkText');
        const urlInput = document.getElementById('linkUrl');

        const text = textInput?.value?.trim();
        const url = urlInput?.value?.trim();

        if (!text || !url) {
            alert('Заполните все поля!');
            return;
        }

        // Добавляем шаблон ссылки
        this.modules.messaging?.addLinkTemplate?.(text, url);

        // Вставляем в сообщение
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            const htmlLink = `<a href="${url}">${text}</a>`;
            messageInput.value += htmlLink;
        }

        this.hideModal('linkWizard');
    }

    // Методы кнопок
    addButton() {
        const textInput = document.getElementById('newButtonText');
        const urlInput = document.getElementById('newButtonUrl');

        const text = textInput?.value?.trim();
        const url = urlInput?.value?.trim();

        if (!text) {
            alert('Введите текст кнопки!');
            return;
        }

        if (this.modules.messaging?.addMessageButton) {
            this.modules.messaging.addMessageButton(text, url);
        }
    }

    clearButtons() {
        if (this.modules.messaging?.clearMessageButtons) {
            this.modules.messaging.clearMessageButtons();
        }
    }

    // Методы выбора пользователей
    selectAllUsers(select = true) {
        const rows = document.querySelectorAll('#usersTableBody input[type="checkbox"]');
        rows.forEach(cb => cb.checked = select);

        this.selectedUsers.clear();
        if (select) {
            rows.forEach(cb => this.selectedUsers.add(cb.dataset.userId));
        }
    }

    saveSelectedToList() {
        const listName = prompt('Название списка:');
        if (!listName?.trim()) return;

        const selectedIds = Array.from(this.selectedUsers);
        if (selectedIds.length === 0) {
            alert('Нет выбранных пользователей!');
            return;
        }

        if (this.modules.userlists?.saveSelectedAsNewList) {
            this.modules.userlists.saveSelectedAsNewList(listName, selectedIds);
        }
    }

    // Применение фильтров
    applyFilters() {
        // Получаем все параметры фильтрации
        const search = document.getElementById('searchFilter')?.value?.toLowerCase() || '';
        const statusFilters = this.getStatusFilters();
        const trialFilters = this.getTrialFilters();
        const languageFilters = this.getLanguageFilters();

        console.log('🔍 Applying filters:', {
            search: search || 'none',
            statuses: statusFilters,
            trialCalls: trialFilters,
            languages: languageFilters
        });

        this.filteredUsers = this.users.filter(user => {
            // Поиск по имени/ID/username
            if (search) {
                const text = [
                    user.user_id || '',
                    user.first_name || '',
                    user.last_name || '',
                    user.username || ''
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                if (!text.includes(search)) return false;
            }

            // Фильтр по статусу
            if (statusFilters.length > 0 && !statusFilters.includes(user.status?.toLowerCase())) {
                return false;
            }

            // Фильтр по Trial Calls
            if (trialFilters.length > 0 && !this.matchesTrialFilter(user, trialFilters)) {
                return false;
            }

            // Фильтр по языку
            if (languageFilters.length > 0) {
                const userLang = (user.language_code || '').toLowerCase();
                if (!languageFilters.includes(userLang)) {
                    return false;
                }
            }

            return true;
        });

        // Логируем и ререндерируем
        console.log(`🔍 Filtered: ${this.filteredUsers.length}/${this.users.length} users`);
        this.updateUI();
    }

    getStatusFilters() {
        const filters = [];
        const checkboxes = ['statusTrial', 'statusNewSub', 'statusCanceled', 'statusKicked'];

        checkboxes.forEach(id => {
            const cb = document.getElementById(id);
            if (cb?.checked) {
                filters.push(id.replace('status', '').toLowerCase());
            }
        });

        return filters;
    }

    getTrialFilters() {
        const filters = [];
        const checkboxes = ['trialCallsLess0', 'trialCallsLess5', 'trialCallsMid', 'trialCallsGreater20', 'trialCallsEquals20'];

        checkboxes.forEach(id => {
            const cb = document.getElementById(id);
            if (cb?.checked) {
                filters.push(id.replace('trialCalls', '').toLowerCase());
            }
        });

        return filters;
    }

    getLanguageFilters() {
        const filters = [];

        // Проверяем чекбоксы популярных языков
        const languageCheckboxes = ['languageRu', 'languageEn', 'languageEs', 'languageFr', 'languageDe', 'languageIt', 'languagePt', 'languageZh', 'languageAr', 'languageJa', 'languagePl', 'languageTr', 'languageKo', 'languageHi', 'languageFa', 'languageOther'];
        languageCheckboxes.forEach(id => {
            const cb = document.getElementById(id);
            if (cb?.checked) {
                const lang = id.replace('language', '').toLowerCase();
                filters.push(lang);
            }
        });

        // Проверяем произвольный язык
        const customLanguageInput = document.getElementById('customLanguageFilter');
        if (customLanguageInput?.value?.trim()) {
            const customLang = customLanguageInput.value.trim().toLowerCase();
            filters.push(customLang);
        }

        return filters;
    }

    matchesTrialFilter(user, trialFilters) {
        if (trialFilters.length === 0) return true;

        // Используем новое поле после маппинга (всегда положительное число или 0)
        const trialCalls = parseInt(user.trial_calls) || 0;

        return trialFilters.some(filter => {
            switch (filter) {
                case 'less0':
                    return trialCalls < 0;
                case 'less5':
                    return trialCalls < 5;
                case 'mid':
                    return trialCalls >= 0 && trialCalls <= 20;
                case 'greater20':
                    return trialCalls > 20;
                case 'equals20':
                    return trialCalls === 20;
                default:
                    return false;
            }
        });
    }

    updateUI() {
        // Обновляем таблицу пользователей
        if (this.modules.users?.renderUsersTable) {
            this.modules.users.renderUsersTable();
        }

        // Обновляем счетчики
        this.updateUserCounts();

        // Обновляем мини-список выбранных
        this.updateSelectedUsersMiniList();
    }

    updateUserCounts() {
        const badgeAll = document.getElementById('usersCountBadge');
        const badgeSelected = document.getElementById('usersSelectedBadge');

        if (badgeAll) {
            badgeAll.textContent = `👥 ${this.filteredUsers.length}`;
        }

        if (badgeSelected) {
            badgeSelected.textContent = `✅ ${this.selectedUsers.size}`;
        }
    }

    updateSelectedUsersMiniList() {
        const container = document.getElementById('selectedUsersMiniList');
        if (!container) return;

        if (this.selectedUsers.size === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary);">Нет выбранных пользователей</div>';
            return;
        }

        const selectedData = this.filteredUsers.filter(u => this.selectedUsers.has(u.user_id));

        container.innerHTML = selectedData.map(user => `
            <div>${user.first_name || user.username || user.user_id}
            <button onclick="window.telegramSender.selectedUsers.delete('${user.user_id}'); window.telegramSender.updateUI()">×</button>
            </div>
        `).join('');
    }

    // Экспорт и диагностика
    exportHistory(format = 'csv') {
        if (format === 'csv') {
            this.exportCSV();
        } else if (format === 'pdf') {
            // Для PDF нужна дополнительная библиотека
            console.log('PDF export not yet implemented');
        }
    }

    exportCSV() {
        // Простой CSV экспорт истории
        const headers = ['Timestamp', 'Message', 'User Count', 'Status'];
        const rows = this.broadcastHistory.map(item => [
            new Date(item.timestamp).toLocaleString(),
            item.message.substring(0, 50) + '...',
            item.sentCount || 0,
            item.status
        ]);

        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telegram_sender_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    runDiagnostic() {
        console.log('🔍 Running diagnostic...');

        if (this.modules.storage?.diagnoseStorage) {
            this.modules.storage.diagnoseStorage();
        }

        // Проверка модулей
        console.log('📦 Module status:', Object.keys(this.modules));

        // Проверка данных
        console.log('📊 Data status:', {
            users: this.users.length,
            templates: this.templates.length,
            bots: this.bots.length,
            history: this.broadcastHistory.length
        });
    }

    async importUsers(file) {
        if (!file) return;

        console.log('📥 Importing users from file...');

        // Здесь должна быть логика парсинга CSV
        // Пока просто показываем заглушку
        console.log('CSV import not yet implemented');
    }

    // Очистка истории сообщений пользователя
    clearUserHistory() {
        const userId = document.getElementById('userHistoryTitle')?.dataset?.userId ||
                      document.getElementById('userHistoryWizardHeader')?.dataset?.userId;

        if (!userId) {
            console.warn('❌ Cannot clear user history: userId not found');
            alert('Не найден ID пользователя');
            return;
        }

        if (!confirm(`Очистить всю историю сообщений для пользователя ${userId}?`)) {
            return;
        }

        // Очищаем историю пользователя
        if (this.userMessageHistory && this.userMessageHistory[userId]) {
            delete this.userMessageHistory[userId];
            this.modules.storage?.saveUserMessageHistory?.();
            console.log(`🗑️ Cleared message history for user ${userId}`);

            // Обновляем интерфейс пользователя если открыт
            const userHistoryContent = document.getElementById('userHistoryContent');
            if (userHistoryContent) {
                userHistoryContent.innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); padding: 40px;">
                        📭 История сообщений этого пользователя очищена
                    </div>
                `;
            }

            this.addToLog(`История сообщений пользователя ${userId} очищена`);
        } else {
            alert('История уже пустая или не найдена');
        }
    }

    // Модальные окна с системой backdrop
    showModal(modalId) {
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.classList.add('show');
        }
    }

    hideModal(modalId) {
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('show');
        }
    }

    // Сохранение настроек звука
    saveSoundSettings() {
        // Получаем значения из форм
        const frequency = parseInt(document.getElementById('frequencySlider')?.value) || 800;
        const duration = parseInt(document.getElementById('durationSlider')?.value) || 300;
        const volume = parseFloat(document.getElementById('volumeSlider')?.value) / 100 || 0.1;
        const waveType = document.getElementById('waveTypeSelect')?.value || 'sine';

        this.notificationSoundSettings = { frequency, duration, volume, waveType };

        if (this.modules.storage?.saveSoundSettings) {
            this.modules.storage.saveSoundSettings();
        }

        this.addToLog('Настройки звука сохранены');
        this.hideModal('soundSettingsWizard');
    }

    addToLog(msg) {
        const log = document.getElementById('logContainer');
        if (log) {
            const time = new Date().toLocaleTimeString();
            log.innerHTML += `<br>${time}: ${msg}`;
            log.scrollTop = log.scrollHeight;
        }
    }

    showStatus(msg, type = 'info') {
        console.log(`${type}: ${msg}`);
        // Можно добавить уведомления в интерфейсе
    }

    showError(msg) {
        this.showStatus(msg, 'error');

        const errorDiv = document.querySelector('.access-denied-screen .access-denied-text');
        if (errorDiv) {
            errorDiv.textContent = msg;
            document.querySelector('.access-denied-screen')?.classList.remove('hidden');
        }
    }

    // Дополнительные методы для обеспечения совместимости

    setTheme(theme) {
        document.body.setAttribute('data-theme', theme);

        // Обновляем кнопки тем
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach(btn => {
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    localStorageAvailable = (() => {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    })();

    // Загрузка настройки автоматического сохранения ссылок
    loadLinkAutoSave() {
        const saved = localStorage.getItem('telegram_sender_link_auto_save');
        this.linkAutoSave = saved !== 'false'; // По умолчанию true, если не установлено false
        console.log('🔗 Loaded auto-save setting:', this.linkAutoSave);
    }

    // Инициализация событий модальных окон
    initModalEvents() {
        // Закрытие модальных окон
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('wizard-close-btn')) {
                this.closeAllModals();
            }
        });

        // Клавиша Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // УНИФИЦИРОВАННЫЙ МЕТОД ЗАКРЫТИЯ МОДАЛЬНЫХ ОКОН С ОЧИСТКОЙ
    closeModalSafe(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.warn(`Modal ${modalId} not found`);
                return false;
            }

            // Скрываем конкретное модальное окно
            modal.style.display = 'none';

            // Убираем класс show с backdrop'а
            const backdrop = document.getElementById('modalBackdrop');
            if (backdrop) {
                backdrop.classList.remove('show');
            }

            console.log(`✅ Modal ${modalId} closed safely`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to close modal ${modalId}:`, error);
            return false;
        }
    }

    closeAllModals() {
        console.log('🔽 Closing all modals...');

        // Убираем класс show с backdrop
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('show');
            console.log('✅ Backdrop show class removed');
        }

        // Скрываем все модальные окна (только wizard-modal, не backdrop)
        const modals = document.querySelectorAll('.wizard-modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            console.log(`✅ Modal ${modal.id || 'unknown'} closed`);
        });

        console.log('✅ All modals closed via closeAllModals');
    }

    /**
     * ПРОКСИ МЕТОД ДЛЯ ДОБАВЛЕНИЯ ШАБЛОНА ССЫЛКИ
     * Вызывается из inline обработчика onclick в index.html
     */
    addLinkTemplate(text, url) {
        if (this.modules?.messaging && typeof this.modules.messaging.addLinkTemplate === 'function') {
            return this.modules.messaging.addLinkTemplate(text, url);
        } else {
            console.error('❌ addLinkTemplate method not found in messaging module');
            alert('Модуль отправки сообщений не инициализирован');
            return null;
        }
    }

    /**
     * ПРОКСИ МЕТОД ДЛЯ ОБНОВЛЕНИЯ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ ИЗ SHEETS
     * Для совместимости с HTML интерфейсом
     */
    reloadUsersData() {
        if (this.modules?.users && typeof this.modules.users.reloadUsersData === 'function') {
            console.log('📊 Reloading users data via main app proxy...');
            return this.modules.users.reloadUsersData();
        } else {
            console.error('❌ reloadUsersData method not found in users module');
            this.showStatus('Модуль пользователей не инициализирован', 'error');
            return null;
        }
    }
}

// Функции для доступа из HTML
function addToLog(message) { window.telegramSender?.addToLog(message); }
function showStatus(message, type) { window.telegramSender?.showStatus(message, type); }

// Глобальные функции для совместимости
window.closeAllModals = function() { window.telegramSender?.closeAllModals(); };
window.getTelegramSender = () => window.telegramSender;

// Глобальная функция для просмотра истории сообщений пользователя (совместимость)
window.showUserMessageHistory = function(userId) {
    console.log('🔗 showUserMessageHistory called with userId:', userId);

    if (window.telegramSender?.modules?.users?.showUserDetails) {
        console.log('✅ Forwarding to showUserDetails method');
        window.telegramSender.modules.users.showUserDetails(userId);
    } else {
        console.error('❌ TelegramSender users module not initialized');
        alert('Модуль пользователей не инициализирован. Попробуйте перезагрузить страницу.');
    }
};

// Автозапуск
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 Starting TelegramSender app...');
    window.telegramSender = new TelegramSender();
});

// Экспорт для отладки
window.TelegramSender = TelegramSender;
