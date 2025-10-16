/**
 * TelegramSender Buttons Module
 * Управление inline кнопками для сообщений
 */

class TelegramButtons {
    constructor(parent) {
        this.parent = parent; // Ссылка на основной класс TelegramSender

        // Кнопки для текущего сообщения
        this.messageButtons = [];
    }

    /**
     * ДОБАВЛЕНИЕ INLINE КНОПКИ К СООБЩЕНИЮ
     */
    addMessageButton() {
        const textInput = document.getElementById('newButtonText');
        const urlInput = document.getElementById('newButtonUrl');
        const typeSelect = document.getElementById('newButtonType');

        const text = textInput?.value?.trim();
        const url = urlInput?.value?.trim();
        const type = typeSelect?.value || 'url';

        if (!text || !url) {
            alert('Заполните текст кнопки и URL/Callback');
            return;
        }

        // Валидация для URL типа
        if (type === 'url' && !url.match(/^https?:\/\/.+/i)) {
            alert('URL должен начинаться с http:// или https://');
            return;
        }

        // Проверка лимита кнопок
        if (this.messageButtons.length >= 10) {
            alert('Максимум 10 кнопок на сообщение');
            return;
        }

        // Проверяем что такая кнопка не существует
        const exists = this.messageButtons.some(btn =>
            btn.text === text && btn.url === url && btn.type === type
        );

        if (exists) {
            alert('Такая кнопка уже добавлена');
            return;
        }

        // Создаем кнопку
        const buttonData = {
            id: 'btn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            text: text,
            url: url,
            type: type
        };

        this.messageButtons.push(buttonData);

        // Очищаем поля ввода
        if (textInput) textInput.value = '';
        if (urlInput) urlInput.value = '';

        // Обновляем интерфейс
        this.renderMessageButtons();

        this.parent.addToLog(`Добавлена кнопка: "${text}" (${type}: ${url})`);
    }

    /**
     * ОЧИСТКА ВСЕХ КНОПОК СООБЩЕНИЯ
     */
    clearMessageButtons() {
        if (this.messageButtons.length === 0) return;

        if (confirm(`Удалить все ${this.messageButtons.length} кнопок?`)) {
            this.messageButtons = [];
            this.renderMessageButtons();
            this.parent.addToLog('Все кнопки очищены');
        }
    }

    /**
     * УДАЛЕНИЕ КОНКРЕТНОЙ КНОПКИ
     */
    removeMessageButton(buttonId) {
        const index = this.messageButtons.findIndex(btn => btn.id === buttonId);
        if (index >= 0) {
            const removed = this.messageButtons.splice(index, 1)[0];
            this.renderMessageButtons();
            this.parent.addToLog(`Удалена кнопка: "${removed.text}"`);
        }
    }

    /**
     * РЕНДЕР СПИСКА КНОПОК
     */
    renderMessageButtons() {
        const container = document.getElementById('buttonsList');
        if (!container) return;

        container.innerHTML = '';

        if (this.messageButtons.length === 0) {
            container.innerHTML = '<small style="color: var(--text-tertiary);">Кнопки ещё не добавлены</small>';
            return;
        }

        this.messageButtons.forEach((button, index) => {
            const buttonEl = document.createElement('div');
            buttonEl.className = 'inline-button-item';
            buttonEl.style.cssText = `
                display: inline-flex;
                align-items: center;
                margin: 2px 4px;
                padding: 4px 8px;
                background: var(--accent-success);
                color: var(--text-inverse);
                border-radius: 4px;
                font-size: 11px;
                cursor: default;
                gap: 4px;
            `;

            buttonEl.innerHTML = `
                <span style="font-weight: 500;">${button.text}</span>
                <span style="opacity: 0.8; font-size: 9px;">(${button.type})</span>
                <button onclick="window.telegramSender.buttons.removeMessageButton('${button.id}')"
                        style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: 14px; line-height: 1; margin-left: 4px;">×</button>
            `;

            container.appendChild(buttonEl);
        });
    }

    /**
     * ПОЛУЧЕНИЕ КНОПОК В ФОРМАТЕ INLINE_KEYBOARD ДЛЯ TELEGRAM API
     */
    getInlineKeyboardButtons() {
        if (this.messageButtons.length === 0) return null;

        // Группируем в ряды по 2 кнопки максимум
        const rows = [];
        let currentRow = [];

        this.messageButtons.forEach(button => {
            currentRow.push({
                text: button.text,
                [button.type === 'url' ? 'url' : 'callback_data']: button.url
            });

            // Если ряд полный или это последняя кнопка (упрощенная логика)
            if (currentRow.length >= 2) {
                rows.push(currentRow);
                currentRow = [];
            }
        });

        // Добавляем последний неполный ряд
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        return rows;
    }

    /**
     * СОХРАНИТЬ КНОПКИ В LOCALSTORAGE
     */
    saveButtons() {
        try {
            localStorage.setItem('telegram_sender_buttons', JSON.stringify(this.messageButtons));
            console.log(`💾 Кнопки сохранены: ${this.messageButtons.length} шт.`);
        } catch (error) {
            console.error('❌ Ошибка сохранения кнопок:', error);
        }
    }

    /**
     * ЗАГРУЗИТЬ КНОПКИ ИЗ LOCALSTORAGE
     */
    loadButtons() {
        try {
            const saved = localStorage.getItem('telegram_sender_buttons');
            if (saved) {
                this.messageButtons = JSON.parse(saved);
                console.log(`📂 Кнопки загружены: ${this.messageButtons.length} шт.`);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки кнопок:', error);
        }
    }

    /**
     * ПОЛУЧИТЬ ПРЕВЬЮ КЛАВИАТУРЫ В ТЕКСТОВОМ ВИДЕ
     */
    getKeyboardPreview() {
        if (this.messageButtons.length === 0) return 'Кнопки не добавлены';

        let preview = '📱 Клавиатура будет выглядеть так:\n\n';

        // Группируем по рядам
        let currentRow = [];
        this.messageButtons.forEach((btn, index) => {
            currentRow.push(`[${btn.text}]`);

            if (currentRow.length >= 2 || index === this.messageButtons.length - 1) {
                preview += currentRow.join('  ') + '\n';
                currentRow = [];
            }
        });

        if (currentRow.length > 0) {
            preview += currentRow.join('  ') + '\n';
        }

        return preview;
    }
}
