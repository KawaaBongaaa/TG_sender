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
     * ПОКАЗАТЬ ФОРМУ ДОБАВЛЕНИЯ КНОПКИ
     */
    showAddButtonDialog() {
        const content = `
            <div style="margin-bottom: 20px;">
                <h4>➕ Добавление inline-кнопки</h4>
                <p style="color: var(--text-secondary); font-size: 11px;">
                    Inline-кнопки прикрепляются к сообщению и позволяют пользователю взаимодействовать
                </p>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: var(--text-primary); font-size: 12px;">
                    <strong>Текст кнопки:</strong>
                </label>
                <input type="text" id="dialogButtonText" placeholder="Например: 'Купить'"
                    style="width: 100%; padding: 8px; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px;">
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: var(--text-primary); font-size: 12px;">
                    <strong>Тип действия:</strong>
                </label>
                <select id="dialogButtonType" style="width: 100%; padding: 8px; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px;">
                    <option value="url">🌐 Открыть URL</option>
                    <option value="callback_data">🔄 Callback (для бота)</option>
                </select>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; color: var(--text-primary); font-size: 12px;" id="dialogButtonUrlLabel">
                    <strong>URL адреса:</strong>
                </label>
                <input type="text" id="dialogButtonUrl" placeholder="https://example.com"
                    style="width: 100%; padding: 8px; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px;">
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="this.closest('#customModalBackdrop').remove()"
                        style="flex: 1; padding: 8px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;">
                    Отмена
                </button>
                <button onclick="window.telegramSender.buttons.addButtonFromDialog()"
                        style="flex: 1; padding: 8px; background: var(--accent-success); color: var(--text-inverse); border: none; border-radius: 4px; cursor: pointer;">
                    ➕ Добавить кнопку
                </button>
            </div>
        `;

        this.parent.showCustomModal('➕ Inline-кнопка', content);
    }

    /**
     * ДОБАВИТЬ КНОПКУ ИЗ МОДАЛЬНОГО ДИАЛОГА
     */
    addButtonFromDialog() {
        const textInput = document.getElementById('dialogButtonText');
        const urlInput = document.getElementById('dialogButtonUrl');
        const typeSelect = document.getElementById('dialogButtonType');

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

        // Закрываем диалог
        document.querySelector('#customModalBackdrop')?.remove();

        // Обновляем интерфейс
        this.renderMessageButtons();

        this.parent.addToLog(`Добавлена кнопка: "${text}" (${type}: ${url})`);
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

    /**
     * ПОКАЗАТЬ ПРЕВЬЮ КЛАВИАТУРЫ
     */
    showButtonPreview() {
        const preview = this.getKeyboardPreview();

        const content = `
            <div style="text-align: center;">
                <h4 style="margin-bottom: 15px;">👀 Предпросмотр клавиатуры</h4>
                ${this.messageButtons.length > 0 ?
                    `<div style="margin-bottom: 15px;">
                        <strong>${this.messageButtons.length} кнопок добавлено</strong>
                    </div>` :
                    `<div style="margin-bottom: 15px; color: var(--accent-error);">
                        <strong>Нет добавленных кнопок</strong>
                    </div>`
                }
                <pre style="background: var(--bg-primary); padding: 15px; border-radius: 5px; border: 1px solid var(--border); font-family: monospace; white-space: pre-wrap; text-align: left; color: var(--text-primary); margin-bottom: 15px;">
${preview}
                </pre>
                <div style="color: var(--text-secondary); font-size: 11px;">
                    Так будет выглядеть клавиатура в Telegram
                </div>
            </div>
        `;

        this.parent.showCustomModal('👀 Предпросмотр', content);
    }
}
