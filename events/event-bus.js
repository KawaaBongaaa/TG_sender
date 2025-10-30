// events/event-bus.js - Система событий для коммуникации между модулями
export class EventBus {
    constructor() {
        this.events = new Map();
    }

    // Подписка на событие
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        this.events.get(event).add(callback);

        // Возвращаем функцию для отписки
        return () => this.off(event, callback);
    }

    // Отписка от события
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);

            // Очищаем пустые коллекции
            if (this.events.get(event).size === 0) {
                this.events.delete(event);
            }
        }
    }

    // Отписка от всех событий
    offAll() {
        this.events.clear();
    }

    // Отправка события
    emit(event, data) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for '${event}':`, error);
                }
            });
        }
    }

    // Одноразовая подписка
    once(event, callback) {
        const onceCallback = (data) => {
            this.off(event, onceCallback);
            callback(data);
        };

        return this.on(event, onceCallback);
    }

    // Получение списка активных событий (для отладки)
    getActiveEvents() {
        return Array.from(this.events.keys());
    }

    // Получение количества слушателей для события
    getListenerCount(event) {
        if (this.events.has(event)) {
            return this.events.get(event).size;
        }
        return 0;
    }
}

// Глобальный экземпляр EventBus
export const eventBus = new EventBus();

// Обновляем глобальный объект для совместимости (legacy support)
if (typeof window !== 'undefined') {
    window.eventBus = eventBus;
}

console.log('✅ EventBus initialized with global compatibility');
