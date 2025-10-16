/* =========================================== */
/* Телеграм Ссылки - управление шаблонами ссылок */
/* Модуль для Telegram Sender WebApp */
/* =========================================== */

class TelegramLinks {
    constructor(telegramSender) {
        this.sender = telegramSender; // Ссылка на основной класс
        console.log('🔗 TelegramLinks module initialized');
    }

    /**
     * ЗАГРУЗКА ШАБЛОНОВ ССЫЛОК ИЗ localStorage
     */
    loadLinkTemplates() {
        try {
            const data = localStorage.getItem('telegram_sender_link_templates');
            this.sender.linkTemplates = data ? JSON.parse(data) : [];
            console.log('🔗 Loaded link templates:', this.sender.linkTemplates.length);
        } catch (error) {
            console.warn('❌ Failed to load link templates:', error);
            this.sender.linkTemplates = [];
        }
    }

    /**
     * СОХРАНЕНИЕ ШАБЛОНОВ ССЫЛОК В localStorage
     */
    saveLinkTemplates() {
        try {
            localStorage.setItem('telegram_sender_link_templates', JSON.stringify(this.sender.linkTemplates));
            console.log('💾 Link templates saved');
        } catch (error) {
            console.error('❌ Failed to save link templates:', error);
        }
    }

    /**
     * ЗАГРУЗКА НАСТРОЙКИ АВТОСОХРАНЕНИЯ ССЫЛОК
     */
    loadLinkAutoSave() {
        try {
            const saved = localStorage.getItem('telegram_sender_link_autosave');
            this.sender.linkAutoSave = saved ? JSON.parse(saved) : true;
            console.log('🔄 Link auto-save setting loaded:', this.sender.linkAutoSave);
        } catch (error) {
            console.warn('❌ Failed to load link auto-save setting:', error);
            this.sender.linkAutoSave = true;
        }
    }

    /**
     * ДОБАВЛЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    addLinkTemplate(text, url, name = '') {
        if (!text || !url) {
            alert('Заполните текст и URL ссылки!');
            return null;
        }

        try {
            new URL(url);
        } catch (error) {
            alert('Введите корректный URL (с http:// или https://)!');
            return null;
        }

        const templateName = name.trim() || (text.length > 20 ? text.substring(0, 20) + '...' : text);

        // Проверяем уникальность
        const existingIndex = this.sender.linkTemplates.findIndex(link =>
            link.text === text && link.url === url
        );

        if (existingIndex >= 0) {
            alert('Такая ссылка уже сохранена!');
            return null;
        }

        const template = {
            id: 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: templateName,
            text: text.trim(),
            url: url.trim(),
            created: new Date().toISOString(),
            usage_count: 0
        };

        this.sender.linkTemplates.push(template);
        this.saveLinkTemplates();

        console.log('🔗 Added link template:', template.name);
        this.sender.addToLog(`Сохранен шаблон ссылки: ${template.name}`);

        return template;
    }

    /**
     * УДАЛЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    deleteLinkTemplate(templateId) {
        const index = this.sender.linkTemplates.findIndex(link => link.id === templateId);
        if (index === -1) return false;

        const templateName = this.sender.linkTemplates[index].name;
        this.sender.linkTemplates.splice(index, 1);
        this.saveLinkTemplates();

        console.log('❌ Link template deleted:', templateName);
        this.sender.addToLog(`Удален шаблон ссылки: ${templateName}`);

        return true;
    }

    /**
     * ПРИМЕНЕНИЕ ШАБЛОНА ССЫЛКИ
     */
    applyLinkTemplate(templateId) {
        const template = this.sender.linkTemplates.find(link => link.id === templateId);
        if (!template) {
            console.warn('Link template not found:', templateId);
            return false;
        }

        // Увеличиваем счетчик использования
        template.usage_count = (template.usage_count || 0) + 1;
        this.saveLinkTemplates();

        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            const currentText = messageInput.value;
            const cursorPos = messageInput.selectionStart;
            const textBefore = currentText.substring(0, cursorPos);
            const textAfter = currentText.substring(cursorPos);

            // Создаем HTML ссылку
            const htmlLink = `<a href="${template.url}">${template.text}</a>`;

            // Множественная вставка - если повторяемая ссылка с той же позиции курсора
            if (textBefore.endsWith(htmlLink)) {
                // Вместо вставки повторяемой ссылки, просто вставляем новую строку или разделитель
                messageInput.value = textBefore + textAfter;
                messageInput.setSelectionRange(cursorPos, cursorPos);
            } else {
                // Обычная вставка
                messageInput.value = textBefore + htmlLink + textAfter;
                const newCursorPos = cursorPos + htmlLink.length;
                messageInput.setSelectionRange(newCursorPos, newCursorPos);
            }

            messageInput.focus();

            console.log('🔗 Applied link template:', template.name);
            this.sender.addToLog(`Применен шаблон ссылки: ${template.name}`);

            return true;
        }
        return false;
    }

    /**
     * ОБРАБОТКА ССЫЛОК ИЗ СООБЩЕНИЙ
     */
    processAndSaveLinksFromMessage(message) {
        if (!message || !this.sender.linkAutoSave) return [];

        const savedLinks = [];

        // Регулярное выражение для поиска HTML ссылок
        const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
        let match;

        while ((match = linkRegex.exec(message)) !== null) {
            const url = match[1].trim();
            const text = match[2].trim();

            // Проверяем, является ли это валидной ссылкой
            try {
                new URL(url);

                // Сохраняем ссылку как шаблон
                const savedTemplate = this.autoSaveLinkOnInsert(text, url);
                if (savedTemplate) {
                    savedLinks.push(savedTemplate);
                }
            } catch (error) {
                console.warn('Невалидная ссылка в сообщении:', url);
            }
        }

        return savedLinks;
    }

    /**
     * АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ ССЫЛКИ
     */
    autoSaveLinkOnInsert(text, url) {
        // Проверяем, существует ли уже такая ссылка
        const existingIndex = this.sender.linkTemplates.findIndex(link =>
            link.text === text && link.url === url
        );

        if (existingIndex >= 0) {
            console.log('🔗 Link template already exists, skipping auto-save');
            return null;
        }

        // Создаем имя шаблона автоматически
        const templateName = text.length > 20 ? text.substring(0, 20) + '...' : text;

        // Проверяем название на уникальность
        let uniqueName = templateName;
        let counter = 1;
        while (this.sender.linkTemplates.some(link => link.name === uniqueName)) {
            uniqueName = `${templateName} (${counter})`;
            counter++;
        }

        const template = {
            id: 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: uniqueName,
            text: text,
            url: url,
            created: new Date().toISOString(),
            usage_count: 0
        };

        this.sender.linkTemplates.push(template);
        this.saveLinkTemplates();

        console.log('🔗 Auto-saved link template:', template.name);
        this.sender.addToLog(`Автоматически сохранен шаблон ссылки: ${template.name}`);

        return template;
    }

    /**
     * РЕНДЕР ШАБЛОНОВ ССЫЛОК В СЕЛЕКТЕ
     */
    renderLinkTemplatesDropdown() {
        const linkTemplatesSelect = document.getElementById('linkTemplatesSelect');
        if (!linkTemplatesSelect) return;

        // Очищаем текущие опции кроме первой
        while (linkTemplatesSelect.options.length > 1) {
            linkTemplatesSelect.remove(1);
        }

        // Сортируем по использованию (часто используемые сначала)
        const sortedTemplates = [...this.sender.linkTemplates].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));

        sortedTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            const usage = template.usage_count ? ` (${template.usage_count}x)` : '';
            option.textContent = `🔗 ${template.name}${usage}`;
            linkTemplatesSelect.appendChild(option);
        });

        console.log('🔗 Link templates dropdown updated:', this.sender.linkTemplates.length, 'templates');
    }

    /**
     * РЕНДЕР ШАБЛОНОВ ССЫЛОК ДЛЯ УПРАВЛЕНИЯ
     */
    renderLinkTemplatesManagement() {
        const container = document.getElementById('linkTemplatesListContainer');
        if (!container) return;

        if (this.sender.linkTemplates.length === 0) {
            container.innerHTML = '<div style="color: #888; font-style: italic;">Шаблоны ссылок не добавлены</div>';
            return;
        }

        // Сортируем по используемости
        const sortedTemplates = [...this.sender.linkTemplates].sort((a, b) =>
            (b.usage_count || 0) - (a.usage_count || 0) || new Date(b.created) - new Date(a.created)
        );

        const templatesHtml = sortedTemplates.map(template => `
            <div style="margin: 5px 0; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                <strong>${template.name}</strong>${template.usage_count ? ` <small style="color: #666;">(${template.usage_count}x использований)</small>` : ''}
                <br>
                <small style="color: #666;">
                    [<a href="${template.url}" target="_blank">${template.text}</a>]
                    <span style="color: #666;">→ ${template.url}</span>
                </small>
                <button style="float: right; background: #17a2b8; color: white; border: none; border-radius: 3px; padding: 2px 6px; margin-left: 5px; font-size: 11px;" onclick="window.telegramSender.links.applyLinkTemplate('${template.id}')">Использовать</button>
                <button style="float: right; background: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 11px;" onclick="if(confirm('Удалить этот шаблон ссылки?')) window.telegramSender.links.deleteLinkTemplate('${template.id}'); window.telegramSender.links.renderLinkTemplatesManagement();">❌</button>
                <div style="clear: both;"></div>
            </div>
        `).join('');

        container.innerHTML = templatesHtml;
    }

    /**
     * ПОКАЗ WIZARD ВСТАВКИ ССЫЛОК
     */
    showLinkInsertWizard() {
        const wizard = document.getElementById('linkWizard');
        if (wizard) {
            wizard.style.display = 'block';
        }
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ССЫЛОК
     */
    setupLinkEventListeners() {
        console.log('🔗 Setting up link event listeners...');

        // Вставка ссылок
        const insertLinkBtn = document.getElementById('insertLinkBtn');
        if (insertLinkBtn) {
            insertLinkBtn.addEventListener('click', () => {
                this.showLinkInsertWizard();
            });
            console.log('✅ Insert link button listener added');
        }

        // Обработчик применения шаблона ссылок
        const linkTemplatesSelect = document.getElementById('linkTemplatesSelect');
        if (linkTemplatesSelect) {
            linkTemplatesSelect.addEventListener('change', (e) => {
                const templateId = e.target.value;
                if (templateId) {
                    this.applyLinkTemplate(templateId);
                    e.target.value = ''; // Сбрасываем выбор
                }
            });
            console.log('✅ Link template select listener added');
        }

        console.log('✅ Link event listeners setup completed');
    }
}

// Экспорт для браузерной среды
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramLinks;
} else {
    // Для браузера - регистрируем глобально
    window.TelegramLinks = TelegramLinks;
}
