/**
 * 🎨 Generation Manager - Менеджер генерации изображений
 * Отвечает за создание, обработку и управление генерациями
 */



export class GenerationManager {
    constructor() {
        this.isEnabled = false;
        this.currentGeneration = null;
        this.pendingGenerations = [];

        // Callbacks
        this.onAuthRequired = null;

        console.log('🎨 Generation Manager created');
    }

    /**
     * Инициализация менеджера генерации
     */
    async initialize() {
        console.log('🎨 Initializing Generation Manager...');

        // Подключение к UI элементам
        this.setupFormHandler();

        // Инициализация логики загрузки изображений
        this.initializeImageUpload();

        // Инициализация менеджера генераций
        await this.initializeGenerationManager();

        console.log('✅ Generation Manager initialized');
    }

    /**
     * Настройка обработчика формы
     * REMOVED: Form handling is done by UI Manager to avoid duplicates
     */
    setupFormHandler() {
        // Form submit is handled by UI Manager to prevent multiple generations
        console.log('📝 Form handler skipped (handled by UI Manager)');
    }

    /**
     * Обработка запроса генерации
     */
    async handleGenerationRequest() {
        console.log('🎯 Generation request initiated');

        // Проверка авторизации
        if (this.onAuthRequired && !this.checkAuthentication()) {
            this.onAuthRequired();
            return;
        }

        // Валидация формы
        if (!this.validateForm()) {
            return;
        }

        // Показ экрана обработки
        this.showProcessing();

        // Запуск генерации
        await this.startGeneration();
    }

    /**
     * Проверка авторизации
     */
    checkAuthentication() {
        return window.appState?.userId ? true : false;
    }

    /**
     * Валидация формы
     */
    validateForm() {
        const prompt = document.getElementById('promptInput').value.trim();

        // Поле промпта должно быть заполнено (кроме специальных режимов)
        const mode = this.getCurrentMode();
        const requiresPrompt = !['background_removal', 'upscale_image'].includes(mode);

        if (requiresPrompt && (!prompt || prompt.length < 5)) {
            this.showError('Please enter a description of at least 5 characters');
            return false;
        }

        // Проверка изображений для режимов, которые их требуют
        const requiresImage = ['upscale_image', 'background_removal'].includes(mode);
        if (requiresImage && !this.hasUploadedImages()) {
            this.showError('Please upload an image for this mode');
            return false;
        }

        return true;
    }

    /**
     * Получение текущего режима
     */
    getCurrentMode() {
        // TODO: Реализовать получение из mode-cards компонента
        return 'photo_session'; // default
    }

    /**
     * Проверка наличия загруженных изображений
     */
    hasUploadedImages() {
        return window.userImageState?.images?.length > 0;
    }

    /**
     * Инициализация загрузки изображений
     */
    initializeImageUpload() {
        // TODO: Перенести логику из app_modern.js
        console.log('🖼️ Image upload logic initialized');
    }

    /**
     * Инициализация менеджера генераций
     */
    async initializeGenerationManager() {
        try {
            const { generationManager } = await import('../parallel-generation.js');
            this.generationManager = generationManager;
            console.log('✅ Generation manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize generation manager:', error);
        }
    }

    /**
     * Запуск генерации
     */
    async startGeneration() {
        try {
            // Сбор данных формы
            const generationData = this.collectFormData();

            console.log('🚀 Starting generation with data:', generationData);

            // Вызов функции генерации из app_modern.js
            await generateImage.call(window, { preventDefault: () => {} }, generationData);

        } catch (error) {
            console.error('❌ Generation failed:', error);
            this.showError('Generation failed. Please try again.');

            // Возврат на экран генерации
            this.showGeneration();
        }
    }

    /**
     * Сбор данных формы
     */
    collectFormData() {
        const prompt = document.getElementById('promptInput').value.trim();
        const style = this.getSelectedStyle();
        const mode = this.getCurrentMode();
        const size = document.getElementById('sizeSelect').value;
        const negativePrompt = this.getNegativePrompt();

        return {
            prompt,
            style,
            mode,
            size,
            negativePrompt,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Получение выбранного стиля
     */
    getSelectedStyle() {
        const activeCard = document.querySelector('.carousel-2d-item.active');
        return activeCard?.dataset.style || 'realistic';
    }

    /**
     * Получение негативного промпта
     */
    getNegativePrompt() {
        const checkbox = document.getElementById('negativePromptCheckbox');
        const input = document.getElementById('negativePromptInput');

        if (checkbox && checkbox.checked && input) {
            return input.value.trim();
        }

        return '';
    }

    /**
     * Включение генерации (после авторизации)
     */
    enableGeneration() {
        this.isEnabled = true;
        console.log('✅ Generation enabled');
    }

    /**
     * Отключение генерации
     */
    disableGeneration() {
        this.isEnabled = false;
        console.log('🚫 Generation disabled');
    }

    /**
     * Показ экрана обработки
     */
    showProcessing() {
        // TODO: Реализовать через UI менеджер
        console.log('⏳ Showing processing screen');
    }

    /**
     * Показ экрана генерации
     */
    showGeneration() {
        // TODO: Реализовать через UI менеджер
        console.log('🎨 Showing generation screen');
    }

    /**
     * Показ ошибки
     */
    showError(message) {
        if (window.showToast) {
            window.showToast('error', message);
        } else {
            alert(message);
        }
    }

    /**
     * Показ успеха
     */
    showSuccess(message) {
        if (window.showToast) {
            window.showToast('success', message);
        }
    }

    /**
     * Добавление генерации в очередь
     */
    addGeneration(generation) {
        this.pendingGenerations.push(generation);
        console.log('📋 Generation added to queue:', generation.id);
    }

    /**
     * Получение текущей генерации
     */
    getCurrentGeneration() {
        return this.currentGeneration;
    }

    /**
     * Очистка текущей генерации
     */
    clearCurrentGeneration() {
        this.currentGeneration = null;
    }

    /**
     * Shutdown менеджера генерации
     */
    async shutdown() {
        console.log('🛑 Generation Manager shutting down...');

        // Остановка всех генераций
        if (this.generationManager) {
            await this.generationManager.stopAll();
        }

        // Очистка состояния
        this.clearCurrentGeneration();
        this.pendingGenerations = [];

        console.log('✅ Generation Manager shutdown complete');
    }
}
