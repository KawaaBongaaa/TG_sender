/* =========================================== */
/* Телеграм Шаблоны - управление шаблонами сообщений */
/* Модуль для Telegram Sender WebApp */
/* =========================================== */

class TelegramTemplates {
    constructor(telegramSender) {
        this.sender = telegramSender; // Ссылка на основной класс
        console.log('📋 TelegramTemplates module initialized');
    }

    /**
     * ЗАГРУЗКА ЗАПИСЕЙ localStorage
     */
    loadTemplates() {
        try {
            const data = localStorage.getItem('telegram_sender_templates');
            this.sender.templates = data ? JSON.parse(data) : [];
            console.log('📋 Loaded templates:', this.sender.templates.length);
        } catch (error) {
            console.warn('❌ Failed to load templates:', error);
            this.sender.templates = [];
        }
    }

    /**
     * СОХРАНЕНИЕ ШАБЛОНОВ В localStorage
     */
    saveTemplates() {
        try {
            localStorage.setItem('telegram_sender_templates', JSON.stringify(this.sender.templates));
            console.log('💾 Templates saved');
        } catch (error) {
            console.error('❌ Failed to save templates:', error);
        }
    }

    /**
     * ДОБАВЛЕНИЕ ШАБЛОНА СООБЩЕНИЯ
     */
    addTemplate(name, text) {
        if (!name || !text) {
            alert('Заполните все поля!');
            return null;
        }

        const template = {
            id: 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            text: text.trim(),
            created: new Date().toISOString()
        };

        this.sender.templates.push(template);
        this.saveTemplates();
        this.renderTemplatesDropdown();

        console.log('📋 Added message template:', template.name);
        this.sender.addToLog(`Добавлен шаблон сообщения: ${template.name}`);

        return template;
    }

    /**
     * УДАЛЕНИЕ ШАБЛОНА СООБЩЕНИЯ
     */
    deleteTemplate(templateId) {
        const index = this.sender.templates.findIndex(t => t.id === templateId);
        if (index === -1) return false;

        const templateName = this.sender.templates[index].name;
        this.sender.templates.splice(index, 1);
        this.saveTemplates();
        this.renderTemplatesDropdown();

        this.sender.addToLog(`Удален шаблон сообщения: ${templateName}`);
        return true;
    }

    /**
     * ПРОМЕНЕНИЕ ШАБЛОНА СООБЩЕНИЯ
     */
    applyTemplate(templateId) {
        const template = this.sender.templates.find(t => t.id === templateId);
        const messageInput = document.getElementById('messageInput');

        if (!template || !messageInput) return false;

        messageInput.value = template.text;
        messageInput.focus();

        console.log('📋 Template applied:', template.name);
        this.sender.addToLog(`Применен шаблон: ${template.name}`);

        return true;
    }

    /**
     * ДОБАВЛЕНИЕ ШАБЛОНА ЧЕРЕЗ WIZARD
     */
    addTemplateFromWizard() {
        const nameInput = document.getElementById('newTemplateName');
        const textInput = document.getElementById('newTemplateText');

        if (!nameInput || !textInput) return;

        const name = nameInput.value.trim();
        const text = textInput.value.trim();

        if (!name || !text) {
            alert('Заполните все поля!');
            return;
        }

        const template = this.addTemplate(name, text);
        if (template) {
            nameInput.value = '';
            textInput.value = '';
            this.hideTemplatesWizard();
            this.renderTemplatesManagement();
        }
    }

    /**
     * СКРЫТИЕ WIZARD ШАБЛОНОВ
     */
    hideTemplatesWizard() {
        const wizard = document.getElementById('templateWizard');
        if (wizard) {
            wizard.style.display = 'none';
        }
    }

    /**
     * ПОКАЗ WIZARD ШАБЛОНОВ
     */
    showTemplatesWizard() {
        const wizard = document.getElementById('templateWizard');
        if (wizard) {
            wizard.style.display = 'block';
            this.renderTemplatesManagement();
        }
    }

    /**
     * РЕНДЕР ШАБЛОНОВ СООБЩЕНИЙ В СЕЛЕКТЕ
     */
    renderTemplatesDropdown() {
        const templateSelect = document.getElementById('templateSelect');
        if (!templateSelect) return;

        // Очищаем текущие опции кроме первой
        while (templateSelect.options.length > 1) {
            templateSelect.remove(1);
        }

        // Проверяем, что this.sender.templates является массивом
        if (!Array.isArray(this.sender.templates)) {
            console.warn('❌ this.sender.templates is not an array, initializing as empty array');
            this.sender.templates = [];
        }

        this.sender.templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `📝 ${template.name}`;
            templateSelect.appendChild(option);
        });

        console.log('📋 Templates dropdown updated:', this.sender.templates.length, 'templates');
    }

    /**
     * РЕНДЕР ШАБЛОНОВ СООБЩЕНИЙ ДЛЯ УПРАВЛЕНИЯ
     */
    renderTemplatesManagement() {
        const container = document.getElementById('templatesListContainer');
        if (!container) return;

        if (this.sender.templates.length === 0) {
            container.innerHTML = 'Шаблоны не добавлены';
            return;
        }

        const templatesHtml = this.sender.templates.map(template => `
            <div style="margin: 5px 0; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                <strong>${template.name}</strong>
                <small style="color: #666;"> (${template.text.substring(0, 50)}...)</small>
                <button style="float: right; background: #17a2b8; color: white; border: none; border-radius: 3px; padding: 2px 6px; margin-left: 5px; font-size: 11px;" onclick="window.telegramSender.templatesModule.applyTemplate('${template.id}')">📝</button>
                <button style="float: right; background: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 11px;" onclick="if(confirm('Удалить шаблон?')) window.telegramSender.templatesModule.deleteTemplate('${template.id}'); window.telegramSender.templatesModule.renderTemplatesManagement();">❌</button>
                <div style="clear: both;"></div>
            </div>
        `).join('');

        container.innerHTML = templatesHtml;
    }

    /**
     * НАСТРОЙКА ОБРАБОТЧИКОВ ШАБЛОНОВ
     */
    setupTemplateEventListeners() {
        console.log('🔧 Setting up template event listeners...');

        // ДОБАВЛЕНИЕ ОБРАБОТЧИКА КНОПКИ ШАБЛОНОВ СООБЩЕНИЙ
        const addTemplateBtn = document.getElementById('addTemplateBtn');
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => {
                this.addTemplateFromWizard();
            });
            console.log('✅ Add template button listener added');
        }

        const cancelTemplateWizardBtn = document.getElementById('cancelTemplateWizardBtn');
        if (cancelTemplateWizardBtn) {
            cancelTemplateWizardBtn.addEventListener('click', () => {
                this.hideTemplatesWizard();
            });
            console.log('✅ Cancel template wizard button listener added');
        }

        // Шаблоны сообщений
        const editTemplatesBtn = document.getElementById('editTemplatesBtn');
        if (editTemplatesBtn) {
            editTemplatesBtn.addEventListener('click', () => {
                this.showTemplatesWizard();
            });
            console.log('✅ Edit templates button listener added');
        }

        // Обработчик применения шаблона сообщений
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                const templateId = e.target.value;
                if (templateId) {
                    this.applyTemplate(templateId);
                    e.target.value = ''; // Сбрасываем выбор
                }
            });
            console.log('✅ Template select listener added');
        }

        console.log('✅ Template event listeners setup completed');
    }
}

// Экспорт для браузерной среды
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramTemplates;
} else {
    // Для браузера - регистрируем глобально
    window.TelegramTemplates = TelegramTemplates;
}
