/* =========================================== */
/* Telegram Mini App для рассылки сообщений */
/* Полностью клиентское приложение на чистом JavaScript */
/* GitHub Pages compatible */
/* =========================================== */

class TelegramSender {
    constructor() {
        // Глобальные переменные состояния
        this.usersData = []; // Загруженные пользователи из Google Sheets
        this.filteredUsers = []; // Отфильтрованные пользователи
        this.isAdmin = false; // Права администратора
        this.isSending = false; // Флаг отправки рассылки
        this.sendProgress = 0; // Прогресс отправки (0-100)
        this.sendResults = []; // Результаты отправки: {user_id, success, error}

        // Новые свойства для управления ботами - будут установлены после создания модуля
        this.currentBot = null; // Текущий выбранный бот
        this.currentSheet = null; // Текущая выбранная таблица

        // Настройки тем
        this.currentTheme = 'light'; // 'light', 'gray', 'dark'

        // Элементы DOM
        this.dom = {};

        // Шаблоны сообщений
        this.templates = []; // Шаблоны сообщений

        // Планировщик рассылок
        this.sendSchedule = null; // Запланированная отправка
        this.messageTimeout = 1000; // Таймаут между сообщениями в мс (по умолчанию 1 сек)
        this.currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Текущий часовой пояс

        // История сообщений пользователей
        this.userMessageHistory = {}; // {user_id: [{timestamp, message, status}, ...]}

        // Шаблоны ссылок
        this.linkTemplates = []; // Шаблоны ссылок для быстрой вставки

        /* ОСНОВНАЯ НОВИЗНА: АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ ССЫЛОК ИЗ СООБЩЕНИЙ */
        this.linkAutoSave = true; // Режим автоматического сохранения ссылок

        // Выбранные пользователи
        this.selectedUsers = new Set();

        // Текущая сортировка таблицы
        this.currentSort = null;

        // Проверка Telegram SDK
        this.isTelegramSDKReady = false;

        // Загружаем настройки из localStorage ПЕРЕД загрузкой модулей TelegramSettings (несовместимости)
        this.settings = new TelegramSettings(this);

        // Инициализация модулей
        this.messaging = new TelegramMessaging(this);
        this.users = new TelegramUsers(this);
        this.notifications = new TelegramNotifications(this);
        this.scheduler = new TelegramScheduler(this);
        this.botsModule = new TelegramBots(this);
        this.templatesModule = new TelegramTemplates(this);
        this.links = new TelegramLinks(this);
        this.buttons = new TelegramButtons(this);
        this.storage = new TelegramStorage(this);

        // Совместимость с существующим интерфейсом - ссылка на модуль ботов как this.bots
        this.bots = this.botsModule;

        console.log('🚀 TelegramSender instance created with modules');
    }

    /**
     * ОСНОВНАЯ НАЧАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
     * Вызывается один раз при запуске приложения
     */
    async init() {
        console.log('🚀 Initializing Telegram Sender WebApp...');

        try {
            this.storage.loadTemplates();
            this.storage.loadLinkTemplates();
            this.storage.loadBots();
            this.storage.loadBroadcastHistory();
            this.storage.loadUserMessageHistory();
            this.storage.loadSoundSettings();
            this.storage.loadSavedTheme();
            this.storage.loadLinkAutoSave();

            // Загружаем кнопки после других данных
            this.buttons.loadButtons();

            // Запускаем миграцию данных при необходимости
            this.storage.migrateDataOnStartup();

            // Проверяем Telegram WebApp SDK
            await this.checkTelegramSDK();
            await this.checkAdminAccess();

            // Инициализируем интерфейс
            await this.initializeUI();

            // Восстанавливаем выбор бота и таблицы (теперь данные загружены)
            this.restoreSavedSelections();

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showErrorScreen(error.message);
        }
    }

    /**
     * Проверка доступности Telegram SDK
     */
    async checkTelegramSDK() {
        // Проверяем, уже ли инициализирован SDK
        if (this.isTelegramSDKReady) {
            console.log('✅ Telegram SDK already initialized');
            return;
        }

        return new Promise((resolve, reject) => {
            if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
                // SDK уже загружен
                console.log('✅ Telegram SDK available');

                // Инициализируем WebApp только один раз
                if (!this.isTelegramSDKReady) {
                    window.Telegram.WebApp.ready();
                    window.Telegram.WebApp.expand();

                    // Применяем тему Telegram
                    this.applyTelegramTheme();
                    this.isTelegramSDKReady = true;
                }

                resolve();
                return;
            }

            // Максимум 3 секунды на загрузку SDK
            const timeout = setTimeout(() => {
                reject(new Error('Telegram SDK не загрузился. Проверьте подключение к интернету.'));
            }, 3000);

            // Повторные проверки каждые 100мс
            const interval = setInterval(() => {
                if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
                    clearTimeout(timeout);
                    clearInterval(interval);

                    console.log('✅ Telegram SDK loaded');

                    // Инициализируем WebApp
                    window.Telegram.WebApp.ready();
                    window.Telegram.WebApp.expand();

                    // Применяем тему Telegram
                    this.applyTelegramTheme();
                    this.isTelegramSDKReady = true;

                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Применение темы из Telegram WebApp
     */
    applyTelegramTheme() {
        const tg = window.Telegram.WebApp;
        if (!tg.themeParams) return;

        // Применяем тёмную тему если в Telegram стоит тёмная
        if (tg.colorScheme === 'dark' || tg.themeParams.bg_color) {
            document.body.setAttribute('data-theme', 'dark');
            console.log('🌙 Applied dark theme from Telegram');
        } else {
            document.body.setAttribute('data-theme', 'light');
            console.log('☀️ Applied light theme from Telegram');
        }
    }

    /**
     * Проверка прав администратора
     */
    checkAdminAccess() {
        return new Promise((resolve, reject) => {
            const tg = window.Telegram.WebApp;
            const config = window.CONFIG;

            if (!config || !config.ADMIN_ID) {
                reject(new Error('CONFIG.ADMIN_ID не настроен! Заполните config.js'));
                return;
            }

            // 🚨 DEVMODE: Временный режим тестирования без Telegram SDK
            if (config.ADMIN_ID !== "PLACEHOLDER_ADMIN_ID") {
                this.isAdmin = true;
                console.log('✅ Dev mode: Admin access granted (config выглядит заполненным)');
                console.log('🔍 Для продакшена удалить этот блок и использовать Telegram SDK!');
                resolve();
                return;
            }

            // Получаем ID текущего пользователя
            const currentUserId = tg.initDataUnsafe?.user?.id?.toString();

            console.log('🔍 Checking admin access:', {
                expected: config.ADMIN_ID,
                current: currentUserId,
                isMatch: currentUserId === config.ADMIN_ID
            });

            if (currentUserId === config.ADMIN_ID) {
                this.isAdmin = true;
                console.log('✅ Admin access granted');
                resolve();
            } else {
                reject(new Error('Доступ запрещён. Только администратор может использовать это приложение.'));
            }
        });
    }

    /**
     * ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЬСКОГО ИНТЕРФЕЙСА
     */
    initializeUI() {
        console.log('🎨 Initializing UI...');

        // Получаем элементы DOM
        this.dom = {
            app: document.querySelector('.app-container'),
            loading: document.querySelector('.loading-screen'),
            error: document.querySelector('.access-denied-screen'),
            main: document.querySelector('.main-app'),
            usersTable: document.querySelector('.users-table tbody'),
            status: document.querySelector('.status-indicator')
        };

        // Настраиваем обработчики событий
        this.setupEventListeners();

        // Рендерим списки шаблонов
        this.renderTemplatesDropdown();
        this.renderLinkTemplatesDropdown();

        // Рендерим список ботов и таблиц
        this.renderBotsDropdown();
        this.renderSheetsDropdown();

        // Показываем основной интерфейс
        this.showMainApp();
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // НОВЫЕ ПРОСТЫЕ ЭЛЕМЕНТЫ ДЛЯ ТЕСТИРОВАНИЯ - кнопка загрузки убрана, загружается автоматически
        const sendBtnSimple = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');

        console.log('Test elements found:', { sendBtnSimple, messageInput });

        if (sendBtnSimple) {
            sendBtnSimple.addEventListener('click', () => {
                console.log('📤 Simple send button clicked');
                this.addToLog('Отправка тестового сообщения...');
                this.messaging.startSimpleBroadcast();
            });
            console.log('✅ Simple send button listener added');
        }

        // ДОПОЛНИТЕЛЬНЫЕ ОБРАБОТЧИКИ ДЛЯ ВСЕХ КНОПОК ИЗ HTML
        this.setupAllButtonListeners();

        // Настраиваем управление ботами и таблицами
        this.botsModule.setupBotEventListeners();

        // Настраиваем сортировку таблицы
        this.users.setupTableSorting();

        // Настраиваем обработчики для переключателя тем
        this.setupThemeSwitcherListeners();

        // Шаблоны сообщений - теперь localStorage данные будут корректно загружаться из модуля
        this.templatesModule.setupTemplateEventListeners();

        // Фильтры пользователей
        this.users.setupFilterEventListeners();

        // Ссылки (передаем ссылку для совместимости с существующими вызовами)
        this.links.setupLinkEventListeners();

        // Добавляем метод addLinkTemplate на уровень основного приложения
        this.addLinkTemplate = this.links.addLinkTemplate.bind(this.links);

        console.log('🎯 Complex event listeners setup completed');
    }

    /**
     * ФУНКЦИЯ ЗАКРЫТИЯ ВСЕХ МОДАЛЬНЫХ ОКОН (ЕДИНАЯ ЛОГИКА)
     */
    closeAllModals() {
        console.log('🎯 Closing all modals...');

        // Закрываем ОБЩИЙ backdrop (используется всеми окнами)
        const modalBackdrop = document.getElementById('modalBackdrop');
        if (modalBackdrop) {
            modalBackdrop.classList.remove('show');
            modalBackdrop.style.display = 'none';
            console.log('✅ Modal backdrop closed');
        }

        // Закрываем все отдельные modal диалоги
        const modals = [
            '#sheetsWizard', '#templateWizard', '#soundSettingsWizard', '#linkWizard',
            '#botsWizard', '#userHistoryWizard' // Добавлено модальное окно истории сообщений
        ];
        modals.forEach(modalId => {
            const modal = document.querySelector(modalId);
            if (modal) {
                modal.style.display = 'none';
                console.log(`✅ ${modalId} closed`);
            }
        });
    }

    /**
     * ЕДИНАЯ ФУНКЦИЯ ПОКАЗА МОДАЛЬНЫХ ОКОН (с backdrop)
     */
    showModalWithBackdrop(wizardId) {
        console.log(`🎯 Showing modal: ${wizardId}`);

        // Показываем backdrop
        const modalBackdrop = document.getElementById('modalBackdrop');
        if (modalBackdrop) {
            modalBackdrop.classList.add('show');
            modalBackdrop.style.display = 'flex';
        }

        // Показываем само модальное окно
        const wizard = document.getElementById(wizardId);
        if (wizard) {
            wizard.style.display = 'block';
            console.log(`✅ ${wizardId} shown`);
        }
    }

    /**
     * ЕДИНАЯ ФУНКЦИЯ СКРЫТИЯ МОДАЛЬНЫХ ОКОН (с backdrop)
     */
    hideModalWithBackdrop(wizardId) {
        console.log(`🎯 Hiding modal: ${wizardId}`);

        // Скрываем само модальное окно
        const wizard = document.getElementById(wizardId);
        if (wizard) {
            wizard.style.display = 'none';
            console.log(`✅ ${wizardId} hidden`);
        }

        // Скрываем backdrop (общее для всех)
        const modalBackdrop = document.getElementById('modalBackdrop');
        if (modalBackdrop) {
            modalBackdrop.classList.remove('show');
            modalBackdrop.style.display = 'none';
        }
    }

    /**
     * ДОПОЛНИТЕЛЬНАЯ НАСТРОЙКА ВСЕХ ОБРАБОТЧИКОВ КНОПОК
     */
    setupAllButtonListeners() {
        console.log('🔧 Setting up all button listeners...');

        // Wizards ботов
        const editBotsBtn = document.getElementById('editBotsBtn');
        if (editBotsBtn) {
            editBotsBtn.addEventListener('click', () => {
                // Показываем modal backdrop и wizard
                const modalBackdrop = document.getElementById('modalBackdrop');
                if (modalBackdrop) {
                    modalBackdrop.classList.add('show');
                    modalBackdrop.style.display = 'flex';
                }
                this.botsModule.showBotsWizard();
            });
            console.log('✅ Edit bots button listener added');
        }

        const addBotBtn = document.getElementById('addBotBtn');
        if (addBotBtn) {
            addBotBtn.addEventListener('click', () => {
                this.botsModule.addBotFromWizard();
                // ОБНОВЛЯЕМ СПИСОК ПОСЛЕ ДОБАВЛЕНИЯ
                this.botsModule.updateBotListContainer();
                this.botsModule.renderBotsDropdown();
            });
            console.log('✅ Add bot button listener added');
        }

        const resetBotSettingsBtn = document.getElementById('resetBotSettingsBtn');
        if (resetBotSettingsBtn) {
            resetBotSettingsBtn.addEventListener('click', () => {
                if (confirm('Удалить ВСЕ настройки ботов и таблиц?\n\nЭто действие нельзя отменить!')) {
                    this.botsModule.resetAllBotSettings();
                }
            });
            console.log('✅ Reset bot settings button listener added');
        }

        const cancelBotsWizardBtn = document.getElementById('cancelBotsWizardBtn');
        if (cancelBotsWizardBtn) {
            cancelBotsWizardBtn.addEventListener('click', () => {
                this.botsModule.hideBotsWizard();
            });
            console.log('✅ Cancel bots wizard button listener added');
        }

        // Wizards таблиц
        const editSheetsBtn = document.getElementById('editSheetsBtn');
        if (editSheetsBtn) {
            editSheetsBtn.addEventListener('click', () => {
                this.showModalWithBackdrop('sheetsWizard');
            });
            console.log('✅ Edit sheets button listener added');
        }

        const addSheetBtn = document.getElementById('addSheetBtn');
        if (addSheetBtn) {
            addSheetBtn.addEventListener('click', () => {
                this.botsModule.addSheetFromWizard();
                // ОБНОВЛЯЕМ СПИСОК ПОСЛЕ ДОБАВЛЕНИЯ
                this.botsModule.updateSheetListContainer();
                this.botsModule.renderSheetsDropdown();
            });
            console.log('✅ Add sheet button listener added');
        }

        const cancelSheetsWizardBtn = document.getElementById('cancelSheetsWizardBtn');
        if (cancelSheetsWizardBtn) {
            cancelSheetsWizardBtn.addEventListener('click', () => {
                this.botsModule.hideSheetsWizard();
            });
            console.log('✅ Cancel sheets wizard button listener added');
        }

        // Шаблоны сообщений
        const editTemplatesBtn = document.getElementById('editTemplatesBtn');
        if (editTemplatesBtn) {
            editTemplatesBtn.addEventListener('click', () => {
                this.showModalWithBackdrop('templateWizard');
            });
            console.log('✅ Edit templates button listener added');
        }

        // Вставка ссылок
        const insertLinkBtn = document.getElementById('insertLinkBtn');
        if (insertLinkBtn) {
            insertLinkBtn.addEventListener('click', () => {
                this.showModalWithBackdrop('linkWizard');
            });
            console.log('✅ Insert link button listener added');
        }

        // Уведомления и настройки звука теперь обрабатываются выше через showModalWithBackdrop

        // Планировщик
        const scheduleBroadcastBtn = document.getElementById('scheduleBroadcastBtn');
        if (scheduleBroadcastBtn) {
            scheduleBroadcastBtn.addEventListener('click', () => {
                this.scheduler.scheduleCurrentBroadcast();
            });
            console.log('✅ Schedule broadcast button listener added');
        }

        const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
        if (cancelScheduleBtn) {
            cancelScheduleBtn.addEventListener('click', () => {
                this.scheduler.cancelScheduledBroadcast();
            });
            console.log('✅ Cancel schedule button listener added');
        }

        const setTimeoutBtn = document.getElementById('setTimeoutBtn');
        if (setTimeoutBtn) {
            setTimeoutBtn.addEventListener('click', () => {
                this.scheduler.setMessageTimeout();
            });
            console.log('✅ Set timeout button listener added');
        }

        // Выбор пользователей
        const selectAllUsersBtn = document.getElementById('selectAllUsersBtn');
        if (selectAllUsersBtn) {
            selectAllUsersBtn.addEventListener('click', () => {
                this.users.toggleAllUsersSelection(true);
            });
            console.log('✅ Select all users button listener added');
        }

        const clearUsersSelectionBtn = document.getElementById('clearUsersSelectionBtn');
        if (clearUsersSelectionBtn) {
            clearUsersSelectionBtn.addEventListener('click', () => {
                this.users.toggleAllUsersSelection(false);
            });
            console.log('✅ Clear users selection button listener added');
        }

        // Массовая рассылка
        const sendMassBtn = document.getElementById('sendMassBtn');
        if (sendMassBtn) {
            sendMassBtn.addEventListener('click', () => {
                console.log('📢 Mass broadcast button clicked');
                this.messaging.startMassBroadcast();
            });
            console.log('✅ Mass broadcast button listener added');
        }

        // Уведомления
        const requestNotificationsBtn = document.getElementById('requestNotificationsBtn');
        if (requestNotificationsBtn) {
            requestNotificationsBtn.addEventListener('click', () => {
                this.notifications.requestNotificationPermission();
            });
            console.log('✅ Request notifications button listener added');
        }

        const testNotificationBtn = document.getElementById('testNotificationBtn');
        if (testNotificationBtn) {
            testNotificationBtn.addEventListener('click', () => {
                this.notifications.showTestNotification();
            });
            console.log('✅ Test notification button listener added');
        }

        const checkNotificationSupportBtn = document.getElementById('checkNotificationSupportBtn');
        if (checkNotificationSupportBtn) {
            checkNotificationSupportBtn.addEventListener('click', () => {
                this.notifications.checkNotificationSupport();
            });
            console.log('✅ Check notification support button listener added');
        }

        const soundSettingsBtn = document.getElementById('soundSettingsBtn');
        if (soundSettingsBtn) {
            soundSettingsBtn.addEventListener('click', () => {
                this.notifications.showSoundSettingsWizard();
            });
            console.log('✅ Sound settings button listener added');
        }

        // Экспорт
        const exportHistoryCSVBtn = document.getElementById('exportHistoryCSVBtn');
        if (exportHistoryCSVBtn) {
            exportHistoryCSVBtn.addEventListener('click', () => {
                this.exportBroadcastHistory('csv');
            });
            console.log('✅ Export CSV button listener added');
        }

        const exportHistoryPDFBtn = document.getElementById('exportHistoryPDFBtn');
        if (exportHistoryPDFBtn) {
            exportHistoryPDFBtn.addEventListener('click', () => {
                this.exportBroadcastHistory('pdf');
            });
            console.log('✅ Export PDF button listener added');
        }

        const importUsersBtn = document.getElementById('importUsersBtn');
        if (importUsersBtn) {
            importUsersBtn.addEventListener('change', (e) => {
                this.users.handleImportUsers(e);
            });
            console.log('✅ Import users button listener added');
        }

        // Сброс фильтров
        const clearFilters = document.getElementById('resetFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.users.clearAllFilters();
            });
            console.log('✅ Clear filters button listener added');
        }

        const selectAllStatuses = document.getElementById('selectAllStatuses');
        if (selectAllStatuses) {
            selectAllStatuses.addEventListener('click', () => {
                this.users.selectAllStatuses();
            });
            console.log('✅ Select all statuses button listener added');
        }

        // Inline кнопки - теперь через модуль buttons
        const addButton = document.getElementById('addButton');
        if (addButton) {
            addButton.addEventListener('click', () => {
                this.buttons.addMessageButton();
            });
            console.log('✅ Add button listener added');
        }

        const clearButtons = document.getElementById('clearButtons');
        if (clearButtons) {
            clearButtons.addEventListener('click', () => {
                this.buttons.clearMessageButtons();
            });
            console.log('✅ Clear buttons button listener added');
        }

        const previewButtons = document.getElementById('previewButtons');
        if (previewButtons) {
            previewButtons.addEventListener('click', () => {
                this.buttons.showButtonPreview();
            });
            console.log('✅ Preview buttons button listener added');
        }

        // Настройки звука
        const testSoundBtn = document.getElementById('testSoundBtn');
        if (testSoundBtn) {
            testSoundBtn.addEventListener('click', () => {
                this.notifications.playNotificationSound();
            });
            console.log('✅ Test sound button listener added');
        }

        const saveSoundSettingsBtn = document.getElementById('saveSoundSettingsBtn');
        if (saveSoundSettingsBtn) {
            saveSoundSettingsBtn.addEventListener('click', () => {
                this.notifications.saveSoundSettingsFromUI();
            });
            console.log('✅ Save sound settings button listener added');
        }

        const resetSoundSettingsBtn = document.getElementById('resetSoundSettingsBtn');
        if (resetSoundSettingsBtn) {
            resetSoundSettingsBtn.addEventListener('click', () => {
                this.notifications.resetSoundSettings();
            });
            console.log('✅ Reset sound settings button listener added');
        }

        const cancelSoundSettingsBtn = document.getElementById('cancelSoundSettingsBtn');
        if (cancelSoundSettingsBtn) {
            cancelSoundSettingsBtn.addEventListener('click', () => {
                this.notifications.hideSoundSettingsWizard();
            });
            console.log('✅ Cancel sound settings button listener added');
        }

        // Слайдеры звука
        const frequencySlider = document.getElementById('frequencySlider');
        if (frequencySlider) {
            frequencySlider.addEventListener('input', (e) => {
                this.notifications.updateFrequencyValue(e.target.value);
            });
            console.log('✅ Frequency slider listener added');
        }

        const durationSlider = document.getElementById('durationSlider');
        if (durationSlider) {
            durationSlider.addEventListener('input', (e) => {
                this.notifications.updateDurationValue(e.target.value);
            });
            console.log('✅ Duration slider listener added');
        }

        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.notifications.updateVolumeValue(e.target.value);
            });
            console.log('✅ Volume slider listener added');
        }

        const waveTypeSelect = document.getElementById('waveTypeSelect');
        if (waveTypeSelect) {
            waveTypeSelect.addEventListener('change', (e) => {
                this.notifications.notificationSoundSettings.waveType = e.target.value;
            });
            console.log('✅ Wave type select listener added');
        }

        console.log('✅ All button listeners setup completed');
    }

    /**
     * ВОССТАНОВЛЕНИЕ СОХРАНЕННЫХ ВЫБОРОВ
     */
    restoreSavedSelections() {
        try {
            // ЗАГРУЖАЕМ данные БОТОВ ДО восстановления выборов (исправлено)
            this.botsModule.loadBots();

            // Теперь восстанавливаем выборы бота и таблицы
            this.botsModule.restoreSavedSelections();

            // Восстановление планировщика после загрузки модуля
            if (this.scheduler) {
                this.scheduler.init();
            }
            console.log('✅ Selections restored');

            // ДОБАВЛЯЕМ ОБРАБОТЧИКИ ДЛЯ ЗАКРЫТИЯ МОДАЛЬНЫХ ОКОН ПО ESC И КЛИКУ ВНЕ
            this.setupModalClosingHandlers();

        } catch (error) {
            console.error('❌ Failed to restore selections:', error);
        }
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ЗАКРЫТИЯ МОДАЛЬНЫХ ОКОН
     */
    setupModalClosingHandlers() {
        // Глобальный обработчик ESC для всех модальных окон
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                console.log('🔙 ESC pressed - closing all modals');
                this.closeAllModals();
            }
        });

        // ОБРАБОТЧИКИ ЗАКРЫТИЯ ПО КЛИКУ ВНЕ ДИАЛОГА ДЛЯ КАЖДОГО ТИПА МОДАЛЬНЫХ ОКОН
        setTimeout(() => {
            // Форма ботов (использует modal-backdrop)
            const modalBackdrop = document.getElementById('modalBackdrop');
            if (modalBackdrop) {
                modalBackdrop.addEventListener('click', (e) => {
                    if (e.target === modalBackdrop) {
                        console.log('🎯 Clicked outside bots modal');
                        this.closeAllModals();
                    }
                });
            }

            // Форма таблиц
            const sheetsWizard = document.getElementById('sheetsWizard');
            if (sheetsWizard) {
                sheetsWizard.addEventListener('click', (e) => {
                    if (e.target === sheetsWizard) {
                        console.log('🎯 Clicked outside sheets modal');
                        this.closeAllModals();
                    }
                });
            }

            // Форма шаблонов
            const templateWizard = document.getElementById('templateWizard');
            if (templateWizard) {
                templateWizard.addEventListener('click', (e) => {
                    if (e.target === templateWizard) {
                        console.log('🎯 Clicked outside template modal');
                        this.closeAllModals();
                    }
                });
            }

            // Форма настроек звука
            const soundSettingsWizard = document.getElementById('soundSettingsWizard');
            if (soundSettingsWizard) {
                soundSettingsWizard.addEventListener('click', (e) => {
                    if (e.target === soundSettingsWizard) {
                        console.log('🎯 Clicked outside sound settings modal');
                        this.closeAllModals();
                    }
                });
            }

            // Форма вставки ссылок
            const linkWizard = document.getElementById('linkWizard');
            if (linkWizard) {
                linkWizard.addEventListener('click', (e) => {
                    if (e.target === linkWizard) {
                        console.log('🎯 Clicked outside link modal');
                        this.closeAllModals();
                    }
                });
            }

            // Форма истории сообщений
            const userHistoryWizard = document.getElementById('userHistoryWizard');
            if (userHistoryWizard) {
                userHistoryWizard.addEventListener('click', (e) => {
                    if (e.target === userHistoryWizard) {
                        console.log('🎯 Clicked outside user history modal');
                        this.closeAllModals();
                    }
                });
            }

            console.log('✅ Modal closing handlers for all types set up');
        }, 1000);
    }

    /**
     * ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ ИЗ GOOGLE SHEETS
     */
    async loadUsersData() {
        await this.users.loadUsersData();
    }

    /**
     * УСТАНОВКА ТЕМЫ
     */
    setTheme(themeName) {
        if (['light', 'dark', 'gray'].includes(themeName)) {
            this.currentTheme = themeName;
            document.body.setAttribute('data-theme', themeName);
            console.log('🎨 Theme set to:', themeName);
        }
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ПЕРЕКЛЮЧАТЕЛЯ ТЕМ
     */
    setupThemeSwitcherListeners() {
        console.log('🎨 Setting up theme switcher listeners...');

        // Обработчик переключателя тем
        const themeSwitcher = document.querySelector('#themeSwitcher');
        if (themeSwitcher) {
            themeSwitcher.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
                this.storage.saveTheme(e.target.value);
                this.addToLog(`Тема изменена на: ${e.target.value}`);
            });
            console.log('✅ Theme switcher listener added');
        }

        console.log('✅ Theme switcher listeners setup completed');
    }

    /**
     * РЕНДЕР ШАБЛОНОВ СООБЩЕНИЙ В СЕЛЕКТЕ
     */
    renderTemplatesDropdown() {
        this.templatesModule.renderTemplatesDropdown();
    }

    /**
     * РЕНДЕР ШАБЛОНОВ ССЫЛОК В СЕЛЕКТЕ
     */
    renderLinkTemplatesDropdown() {
        this.links.renderLinkTemplatesDropdown();
    }

    /**
     * РЕНДЕР СПИСКА БОТОВ В СЕЛЕКТЕ
     */
    renderBotsDropdown() {
        this.botsModule.renderBotsDropdown();
    }

    /**
     * РЕНДЕР СПИСКА ТАБЛИЦ В СЕЛЕКТЕ
     */
    renderSheetsDropdown() {
        this.botsModule.renderSheetsDropdown();
    }

    /**
     * ПОКАЗ ОСНОВНОГО ИНТЕРФЕЙСА
     */
    showMainApp() {
        console.log('🎬 showMainApp called');

        // Скрываем загрузку и ошибку
        if (this.dom.loading) {
            this.dom.loading.classList.add('hidden');
            console.log('✅ Loading screen hidden');
        }
        if (this.dom.error) {
            this.dom.error.classList.add('hidden');
            console.log('✅ Error screen hidden');
        }

        // Показываем основной интерфейс
        if (this.dom.app) {
            this.dom.app.style.display = 'block';
            this.dom.app.classList.add('animate');
            console.log('✅ App container shown');
        }

        if (this.dom.main) {
            this.dom.main.classList.add('animate');
            console.log('✅ Main app animated');
        }

        // Показваем сообщение статуса
        this.showStatus('Приложение готово к работе!', 'success');
    }

    /**
     * ПОКАЗ ЭКРАНА ОШИБКИ
     */
    showErrorScreen(message = 'Произошла неизвестная ошибка') {
        if (this.dom.loading) this.dom.loading.classList.add('hidden');
        if (this.dom.main) this.dom.main.classList.add('hidden');
        if (this.dom.error) {
            this.dom.error.classList.remove('hidden');
            const errorText = this.dom.error.querySelector('.access-denied-text');
            if (errorText) errorText.textContent = message;
        }
    }

    /**
     * ОТОБРАЖЕНИЕ СТАТУСНОГО СООБЩЕНИЯ
     */
    showStatus(message, type = 'info') {
        if (!this.dom.status) return;

        this.dom.status.textContent = message;
        this.dom.status.className = `status-indicator status-${type}`;

        // Автоматическое скрытие через 3 секунды (кроме ошибок)
        if (type !== 'error') {
            setTimeout(() => {
                if (this.dom.status) {
                    this.dom.status.className = 'status-indicator';
                }
            }, 3000);
        }
    }

    /**
     * ДОБАВЛЕНИЕ СООБЩЕНИЯ В ЛОГ
     */
    addToLog(message) {
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            const timestamp = new Date().toLocaleTimeString();
            logContainer.innerHTML += `<br>${timestamp}: ${message}`;
            logContainer.scrollTop = logContainer.scrollHeight; // Автопрокрутка вниз
        }
    }

    /**
     * УТИЛИТА ЗАДЕРЖКИ
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * ЭКСПОРТ ИСТОРИИ РАССЫЛОК
     */
    exportBroadcastHistory(format) {
        if (!this.broadcastHistory || this.broadcastHistory.length === 0) {
            alert('Нет истории рассылок для экспорта');
            return;
        }

        const now = new Date().toISOString().split('T')[0];
        const filename = `telegram_sender_history_${now}`;

        if (format === 'csv') {
            let csv = 'Дата,Сообщение,Количество пользователей,Результат\n';
            this.broadcastHistory.forEach(item => {
                const date = new Date(item.timestamp).toLocaleString();
                const message = `"${(item.message || '').replace(/"/g, '""')}"`;
                const userCount = item.sentTo || 0;
                const status = item.status || 'unknown';
                csv += `${date},${message},${userCount},${status}\n`;
            });

            this.downloadFile(`${filename}.csv`, csv, 'text/csv');
        } else if (format === 'pdf') {
            // Для простоты - экспортируем как текстовый файл с расширением .pdf
            // В реальном приложении здесь должен быть генератор PDF
            let content = 'ИСТОРИЯ РАССЫЛОК TELEGRAM SENDER\n\n';
            this.broadcastHistory.forEach((item, index) => {
                content += `${index + 1}. ${new Date(item.timestamp).toLocaleString()}\n`;
                content += `    Сообщение: ${item.message || ''}\n`;
                content += `    Отправлено: ${item.sentTo || 0} пользователям\n`;
                content += `    Статус: ${item.status || 'unknown'}\n\n`;
            });

            this.downloadFile(`${filename}.txt`, content, 'text/plain');
        }

        this.addToLog(`История экспортирована в формате ${format.toUpperCase()}`);
        alert(`История экспортирована: ${filename}.${format}`);
    }

    /**
     * СКАЧИВАНИЕ ФАЙЛА
     */
    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * ДИАГНОСТИКА localStorage И СОСТОЯНИЯ ПРИЛОЖЕНИЯ
     */
    testLocalStorageAndData() {
        console.log('🔍 Running diagnostic test...');

        // ТЕСТИРОВАНИЕ localStorage
        let localStorageWorks = true;
        try {
            localStorage.setItem('diagnostic_test', 'test_value');
            const retrieved = localStorage.getItem('diagnostic_test');
            if (retrieved !== 'test_value') {
                throw new Error('Retrieval failed');
            }
            localStorage.removeItem('diagnostic_test');
        } catch (error) {
            console.error('❌ localStorage error:', error);
            localStorageWorks = false;
        }

        // ПРОВЕРКА КЛЮЧЕЙ localStorage
        const telegramKeys = this.storage.diagnoseStorage();

        // ТЕСТИРОВАНИЕ КОНФИгурации
        const configCheck = {
            CONFIG: typeof window.CONFIG !== 'undefined',
            ADMIN_ID: window.CONFIG?.ADMIN_ID,
            BOT_TOKEN: window.CONFIG?.BOT_TOKEN,
            SHEET_ID: window.CONFIG?.SHEET_ID,
            PROXY_URL: window.CONFIG?.PROXY_URL
        };

        const dataStatus = {
            botsCount: this.bots?.length || 0,
            usersCount: this.usersData?.length || 0,
            templatesCount: this.templates?.length || 0,
            linkTemplatesCount: this.linkTemplates?.length || 0
        };

        // ПОДГОТОВКА РЕКОМЕНДАЦИЙ
        const recommendations = [];
        if (!localStorageWorks) {
            recommendations.push('❌ localStorage НЕ РАБОТАЕТ! Проверьте настройки приватности браузера');
        }
        if (telegramKeys.length === 0) {
            recommendations.push('⚠️ Нет сохраненных данных приложения - добавьте ботов и настроек');
        }
        if (this.bots?.length === 0) {
            recommendations.push('🤖 Добавьте хотя бы одного бота через "⚙️ Боты"');
        }
        if (!this.currentBot) {
            recommendations.push('🤖 Выберите активного бота из списка ботов');
        }
        if (this.usersData?.length === 0) {
            recommendations.push('📊 Загрузите данные пользователей - нажмите "📊 Загрузить"');
        }
        if (this.linkTemplates?.length === 0) {
            recommendations.push('🔗 При отправке сообщений со ссылками они автоматически сохраняются');
        }

        if (recommendations.length > 0) {
            console.log('💡 РЕКОМЕНДАЦИИ:');
            recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
        } else {
            console.log('✅ Все данные на месте! Приложение готово к работе');
        }

        // Показ результатов
        let resultMessage = `📊 Диагностика завершена!\n\n`;
        resultMessage += `💾 localStorage: ${localStorageWorks ? '✅ Работает' : '❌ НЕ РАБОТАЕТ'}\n`;
        resultMessage += `🤖 Ботов: ${this.bots?.length || 0}\n`;
        resultMessage += `👥 Пользователей: ${this.usersData?.length || 0}\n`;
        resultMessage += `📝 Шаблонов: ${this.templates?.length || 0}\n`;
        resultMessage += `🔗 Ссылок: ${this.linkTemplates?.length || 0}\n\n`;

        if (recommendations.length > 0) {
            resultMessage += '⚠️ Найдены проблемы:\n';
            recommendations.forEach((rec, i) => resultMessage += `${i + 1}. ${rec}\n`);
        } else {
            resultMessage += '✅ Все в порядке!';
        }

        alert(resultMessage);
        return { localStorageWorks, dataStatus, configCheck, recommendations };
    }
}

// ===========================================
// СПЕЦИАЛЬНЫЕ ФУНКЦИИ ОБРАБОТКИ ДАННЫХ ДЛЯ ТАБЛИЦЫ
// ===========================================
function getPremiumDisplay(user) {
    // Переберем все поля пользователя для поиска премиум-данных
    const premiumFields = ['premium', 'премиум', 'is_premium', 'premium_user', 'vip', 'про'];
    for (const field of premiumFields) {
        const value = user[field];
        if (value !== undefined && value !== null) {
            return value.toString().trim();
        }
    }
    return '';
}

function getTrafficSourceDisplay(user) {
    // ТОЧНЫЕ названия полей из Google Sheets (как они приходят после lowercase в парсере)
    const trafficFields = [
        'traffic from',  // ← ЭТО ПОЛЕ ЕСТЬ В ВАШЕЙ ТАБЛИЦЕ!
        'traffic_from',
        'источник трафика',
        'source',
        'from',
        'utm_source',
        'канал',
        'трафик'
    ];

    for (const field of trafficFields) {
        const value = user[field];
        if (value !== undefined && value !== null) {
            const trimmedValue = value.toString().trim();
            console.log(`✅ Found traffic source "${trimmedValue}" from field "${field}"`);
            return trimmedValue;
        }
    }

    console.log(`❌ No traffic source found for user ${user.user_id || 'unknown'}`);
    return '';
}

function getTrialCallsDisplay(user) {
    // ТОЧНЫЕ названия полей из Google Sheets (как они приходят после lowercase в парсере)
    const trialFields = [
        'triall img gen calls',  // ← ЭТО ПОЛЕ ЕСТЬ В ВАШЕЙ ТАБЛИЦЕ!
        'trial_img_gen_calls',
        'trial_calls',
        'количество trial calls',
        'trial_calls_count',
        'calls',
        'trial_count'
    ];

    for (const field of trialFields) {
        const value = user[field];
        if (value !== undefined && value !== null) {
            const trimmedValue = value.toString().trim();
            console.log(`✅ Found trial calls: "${trimmedValue}" from field "${field}"`);
            return trimmedValue;
        }
    }

    console.log(`❌ No trial calls found for user ${user.user_id || 'unknown'}`);
    return '';
}

function getTagDisplay(user) {
    const tagFields = ['tag', 'tags', 'label', 'group', 'category'];
    for (const field of tagFields) {
        const value = user[field];
        if (value !== undefined && value !== null) {
            return value.toString().trim();
        }
    }
    return '';
}

function getLastSentDisplay(user) {
    const dateFields = ['last_sent', 'last_send', 'последняя отправка', 'sent_at', 'last_message'];
    for (const field of dateFields) {
        const value = user[field];
        if (value !== undefined && value !== null && value.toString().trim() !== '') {
            return value.toString().trim();
        }
    }
    return '';
}

// ===========================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ТЕСТИРОВАНИЯ
// ===========================================

/**
 * ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ТЕСТИРОВАНИЯ
 */
function runLocalStorageDiagnostic() {
    if (window.telegramSender) {
        window.telegramSender.testLocalStorageAndData();
    } else {
        alert('🚀 Приложение еще загружается...');
    }
}

/**
 * Проверка существования элементов
 */
function testElementsExist() {
    console.log('🧪 Testing UI elements...');

    const testResults = {
        buttons: {
            loadBtn: !!document.getElementById('loadBtn'),
            sendBtn: !!document.getElementById('sendBtn'),
            masterUserCheckbox: !!document.getElementById('masterUserCheckbox')
        },
        inputs: {
            messageInput: !!document.getElementById('messageInput'),
            searchFilter: !!document.getElementById('searchFilter'),
            usersTableBody: !!document.getElementById('usersTableBody')
        },
        wizards: {
            botsWizard: !!document.getElementById('botsWizard'),
            sheetsWizard: !!document.getElementById('sheetsWizard'),
            templateWizard: !!document.getElementById('templateWizard')
        }
    };

    console.table(testResults);
    const totalFound = Object.values(testResults).flat().filter(Boolean).length;
    const totalExpected = Object.values(testResults).flat().length;

    if (totalFound === totalExpected) {
        console.log('✅ All elements found!');
        alert('✅ Все элементы интерфейса найдены! Приложение готово к работе.');
    } else {
        console.warn(`⚠️ Only ${totalFound}/${totalExpected} elements found`);
        alert(`⚠️ Найдено только ${totalFound}/${totalExpected} элементов интерфейса. Проверьте HTML структуру.`);
    }

    return testResults;
}

/**
 * ПОКАЗ ИСТОРИИ СООБЩЕНИЙ ПОЛЬЗОВАТЕЛЯ В УНИФИЦИРОВАННОМ МОДАЛЬНОМ ОКНЕ С ПОЛНОЙ ИНФОРМАЦИЕЙ ИЗ ТАБЛИЦЫ
 */
function showUserMessageHistory(userId) {
    if (!window.telegramSender) {
        alert('Приложение еще загружается...');
        return;
    }

    const userHistory = window.telegramSender.userMessageHistory?.[userId];
    const user = window.telegramSender.usersData?.find(u => u.user_id == userId);
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.user_id : userId;

    // Показываем backdrop
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.add('show');
        modalBackdrop.style.display = 'flex';
    }

    // Показываем модальное окно истории
    const historyWizard = document.getElementById('userHistoryWizard');
    if (historyWizard) {
        historyWizard.style.display = 'block';

        // Обновляем заголовок с именем пользователя
        const titleElement = document.getElementById('userHistoryTitle');
        if (titleElement) {
            titleElement.textContent = `📄 История: ${userName}`;
        }

        // Обновляем полную информацию о пользователе из таблицы
        const headerElement = document.getElementById('userHistoryWizardHeader');
        if (headerElement && user) {
            const premiumDisplay = getPremiumDisplay(user);
            const trafficDisplay = getTrafficSourceDisplay(user);
            const trialDisplay = getTrialCallsDisplay(user);
            const tagDisplay = getTagDisplay(user);

            headerElement.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; padding: 10px; background: var(--bg-tertiary); border-radius: 6px;">
                    <div><strong>🆔 ID:</strong> <code style="background:#f8f9fa;color:#000;padding:1px 4px;border-radius:2px;font-size:11px;">${user.user_id}</code></div>
                    <div><strong>👤 Имя:</strong> ${user.first_name || '—'}</div>
                    <div><strong>👤 Фамилия:</strong> ${user.last_name || '—'}</div>
                    <div><strong>👥 Username:</strong> ${user.username ? `<a href="https://t.me/${user.username}" target="_blank">@${user.username}</a>` : '—'}</div>
                    <div><strong>📊 Статус:</strong> <span class="status-pill">${user.status || 'unknown'}</span></div>
                    <div><strong>🌍 Язык:</strong> <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold;">${user.language || '—'}</span></div>
                    <div><strong>⭐ Премиум:</strong> <strong style="color: #dc3545; background: #f8d7da; padding: 2px 6px; border-radius: 4px;">${premiumDisplay}</strong></div>
                    <div><strong>🚦 Источник трафика:</strong> <strong style="color: #28a745; background: #d4edda; padding: 2px 6px; border-radius: 4px;">${trafficDisplay}</strong></div>
                    <div><strong>🎨 Trial Calls:</strong> <span style="background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; border: 2px solid #ff9900;"><strong>${trialDisplay}</strong></span></div>
                    <div><strong>🏷️ Тег:</strong> ${tagDisplay}</div>
                </div>
                <div style="text-align: center; color: var(--text-secondary);">
                    Последняя отправка: ${window.telegramSender.messaging.getLastSentDisplay(user).replace(/<[^>]*>/g, '').trim() || 'Никогда'}
                </div>
            `;
        } else if (headerElement) {
            headerElement.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
                    Пользователь не найден в базе данных<br>
                    <small>ID: ${userId}</small>
                </div>
            `;
        }

        // Заполняем содержимое истории
        const contentElement = document.getElementById('userHistoryContent');
        if (contentElement) {
            if (!userHistory || userHistory.length === 0) {
                contentElement.innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); padding: 40px;">
                        📭 История сообщений пользователя пуста<br>
                        <small>Сообщения появятся после начала рассылок</small>
                    </div>
                `;
            } else {
                // Упорядочим по времени (от нового к старому)
                const sortedHistory = [...userHistory].sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );

                let historyHtml = '<div style="max-height: 400px; overflow-y: auto;">';

                sortedHistory.forEach((entry, index) => {
                    const date = new Date(entry.timestamp).toLocaleString('ru-RU');
                    const status = entry.status === 'delivered' ? '✅' : entry.status === 'failed' ? '❌' : '⏳';
                    const statusText = entry.status === 'delivered' ? 'Доставлено' :
                                      entry.status === 'failed' ? 'Ошибка' : 'Отправляется';
                    const statusColor = entry.status === 'delivered' ? 'var(--accent-success)' :
                                       entry.status === 'failed' ? 'var(--accent-error)' : 'var(--accent-warning)';

                    const message = entry.message || '';
                    const shortMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;

                    historyHtml += `
                        <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 8px; background: var(--bg-secondary);">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                <span style="font-weight: 600; color: var(--text-primary);">${index + 1}. ${date}</span>
                                <span style="color: ${statusColor}; font-weight: 500;">${status} ${statusText}</span>
                            </div>
                            <div style="color: var(--text-primary); line-height: 1.4;">
                                "${shortMessage}"
                            </div>
                        </div>
                    `;
                });

                historyHtml += '</div>';
                contentElement.innerHTML = historyHtml;
            }
        }
    }

    // Настраиваем обработчик очистки истории
    const clearBtn = document.getElementById('clearUserHistoryBtn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm(`Очистить всю историю сообщений пользователя ${userName}? Это действие нельзя отменить.`)) {
                if (window.telegramSender.userMessageHistory) {
                    delete window.telegramSender.userMessageHistory[userId];
                    window.telegramSender.storage.saveUserMessageHistory();
                    window.telegramSender.closeAllModals();
                    alert('История сообщений очищена');
                }
            }
        };
    }
}

// Экспортируем функции в глобальную область видимости
window.runLocalStorageDiagnostic = runLocalStorageDiagnostic;
window.testElementsExist = testElementsExist;

// ===========================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ===========================================

/**
 * Запуск приложения при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Telegram Sender WebApp loaded');
    window.telegramSender = new TelegramSender();
    window.telegramSender.init(); // Запуск инициализации
});
