/**
 * Remove Background Module
 * Отдельный модуль для удаления фона с собственным webhook
 */

class RemoveBackgroundModule {
    constructor() {
        this.initialized = false;
        this.webhookUrl = 'https://api.runware.ai/v1/'; // Direct API endpoint
    }

    /**
     * Инициализация модуля
     */
    init() {
        if (this.initialized) return;
        console.log('🎨 RemoveBackgroundModule initialized');
        this.initialized = true;
    }

    /**
     * Генерация удаления фона для изображения
     * @param {Object} generation - объект генерации из generationManager
     * @param {string} apiKey - API ключ Runware
     */
    async processRemoval(generation, apiKey) {
        console.log('🎨 Starting background removal for generation:', generation.id);

        try {
            // Проверяем наличие изображений UUID
            const imageUUID = generation.imageUUIDs?.[0] || generation.imageUUID;
            if (!imageUUID) {
                throw new Error('No image UUID found for background removal');
            }

            console.log('🎨 Using image UUID:', imageUUID, 'for background removal');
            console.log('🎨 Task UUID:', generation.taskUUID);

            // Используем прямой вызов к Runware API вместо webhook
            const result = await this.directRunwareRequest(imageUUID, generation.taskUUID, apiKey);
            console.log('🎨 Background removal result:', result);

            if (result.status === 'success') {
                console.log('✅ Background removal successful:', result.image_url);

                // Убираем cost из результата, чтобы не использовать неправильные данные
                return {
                    status: 'success',
                    image_url: result.image_url,
                    cost: 0, // Устанавливаем 0, настоящий cost будет возвращен в следующем обновлении
                    cost_currency: 'Cr',
                    remaining_credits: null, // Пока без кредитов
                    imageUUID: imageUUID,
                    taskUUID: generation.taskUUID
                };
            } else {
                throw new Error(result.error || 'Background removal failed');
            }

        } catch (error) {
            console.error('❌ Background removal failed:', error);
            return {
                status: 'error',
                error: error.message || 'Background removal failed'
            };
        }
    }

    /**
     * Прямое обращение к Runware API для background removal (альтернативный метод)
     * @param {string} imageUUID - UUID загруженного изображения
     * @param {string} taskUUID - UUID задачи генерации
     */
    async directRunwareRequest(imageUUID, taskUUID, apiKey) {
        if (!apiKey) {
            throw new Error('Runware API key not configured');
        }

        const requestBody = [
            {
                taskType: "imageBackgroundRemoval",
                inputImage: imageUUID,
                outputType: ["URL"],
                outputFormat: "PNG",
                model: "runware:110@1",
                includeCost: true,
                taskUUID: taskUUID
            }
        ];

        console.log('🎨 Direct Runware request for background removal:', {
            imageUUID,
            taskUUID,
            model: "runware:110@1"
        });

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('🎨 Direct Runware response:', result);

            if (result.data && result.data[0] && result.data[0].imageURL) {
                return {
                    status: 'success',
                    image_url: result.data[0].imageURL,
                    cost: result.data[0].cost || 0
                };
            } else {
                throw new Error('Unexpected response format from Runware');
            }
        } catch (error) {
            console.error('❌ Direct Runware request failed:', error);
            throw error;
        }
    }
}

// Экземпляр модуля
const removeBackgroundModule = new RemoveBackgroundModule();

// Экспорт
export { removeBackgroundModule, RemoveBackgroundModule };

// Для совместимости с window
window.removeBackgroundModule = removeBackgroundModule;

console.log('🎨 Remove Background Module loaded');
