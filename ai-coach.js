/**
 * ai-prompt-helper.js — Ai Assistant pixPlace
 * Isolated module for pixPLace AI Prompt Helper
 * UID: KLB-12SN-17A | Cognitive Framework: 3-7-12-22-25 | ECHO-BLOCK Active
 */
// ========== COGNITIVE ASSISTANT INTEGRATION ==========
export function createCoachButton() {
    // Create button
    const coachButton = document.createElement('button');
    coachButton.textContent = 'AI Prompt Assistant';
    coachButton.className = 'ai-coach-btn';

    // Все стили теперь через CSS класс ai-coach-btn с медиа-запросами

    // Восстанавливаю правильную функциональность - открытие AI чата
    coachButton.onclick = () => {
        if (window.AICoach) {
            window.AICoach.show();
        } else {
            console.warn('AI Coach not loaded');
        }
    };

    // Add to body (fixed position for easy access)
    document.body.appendChild(coachButton);

    // Style injection for button (minimal)
    const style = document.createElement('style');
    style.textContent = `
        .ai-coach-btn {
            font-size: 14px;
            border: none;
            cursor: pointer;
        }
        .ai-coach-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
    `;
    document.head.appendChild(style);

    console.log('🧠 AI Coach button created');
}

export async function initAICoach() {
    try {
        // Проверить, что AICoach доступен (уже загружен из HTML)
        if (!window.AICoach) {
            console.warn('AI Coach not loaded from HTML');
            return;
        }

        createCoachButton();
        // Дополнительно можно прослушать событие, если нужно
        window.addEventListener('ai-coach-ready', createCoachButton);
    } catch (error) {
        console.error('Failed to init AI Coach:', error);
    }
}

export function createChatButton() {
    // Create floating chat button
    const chatBtn = document.createElement('button');
    chatBtn.id = 'ai-chat-float-btn';
    chatBtn.innerHTML = 'AI Chat';
    chatBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        transition: all 0.3s ease;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    chatBtn.onmouseenter = () => {
        chatBtn.style.transform = 'scale(1.05)';
        chatBtn.style.boxShadow = '0 6px 25px rgba(99, 102, 241, 0.6)';
    };

    chatBtn.onmouseleave = () => {
        chatBtn.style.transform = 'scale(1)';
        chatBtn.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
    };

    chatBtn.onclick = () => {
        if (window.AICoach) {
            window.AICoach.show();
            triggerHaptic('light');
        }
    };

    document.body.appendChild(chatBtn);
    console.log('🧠 AI Chat floating button created');
}

(function () {
    'use strict';

    // ========== CORE ARCHITECTURE ==========
    const COGNITIVE_ENGINE = {
        levels: ['ученик', 'игрок', 'исследователь'],
        triggers: [
            'удивление', 'боль', 'решение', 'доказательство', 'эксклюзив',
            'сенсорика', 'история', 'микро-обязательство', 'рефрейм',
            'онбординг', 'реферал', 'лояльность'
        ],
        cognitiveFramework: '3-7-12-22-25',
        echoBlock: { shock: '', segmentation: '', retention: '' }
    };

    // ========== PRIVATE STATE ==========
    let state = {
        userLevel: 'исследователь',
        conversationId: Date.now().toString(),
        history: [],
        currentTrigger: null,
        kpi: { clarity: 0, actionability: 0, understanding: 0 },
        modal: null,
        isOpen: false,
        isProcessing: false,
        chatUI: null
    };

    // ========== LOCAL STORAGE FUNCTIONS ==========
    function loadChatHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem('aiCoachHistory') || '{}');
            if (saved[state.conversationId]) {
                state.history = saved[state.conversationId];
                // Восстановить историю сообщений
                state.history.forEach(msg => {
                    addMessageToChat(msg.content, msg.role === 'user' ? 'user' : 'bot');
                });
            }
        } catch (error) {
            console.warn('Failed to load chat history:', error);
            state.history = [];
        }
    }

    function saveChatHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem('aiCoachHistory') || '{}');
            saved[state.conversationId] = state.history;
            localStorage.setItem('aiCoachHistory', JSON.stringify(saved));
        } catch (error) {
            console.warn('Failed to save chat history:', error);
        }
    }

    // ========== TOKEN LIMIT FUNCTIONS ==========
    function estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters for Russian/English
        return Math.max(1, Math.ceil(text.length / 4));
    }

    function trimHistoryToTokenLimit(history, currentMessage, maxTokens = 5000) {
        const currentTokens = estimateTokens(currentMessage);
        let availableTokens = maxTokens - currentTokens - 100; // Reserve some tokens
        const trimmedHistory = [];
        let totalTokens = 0;

        // Start from the most recent messages
        for (let i = history.length - 1; i >= 0; i--) {
            const msg = history[i];
            const tokens = estimateTokens(msg.content);

            if (totalTokens + tokens <= availableTokens) {
                trimmedHistory.unshift(msg);
                totalTokens += tokens;
            } else {
                break;
            }
        }

        console.log(`📊 History trimmed: ${totalTokens} tokens (${trimmedHistory.length} messages)`);
        return trimmedHistory;
    }

    async function sendToWebhook(message, fullHistory) {
        // Проверяем доступность CONFIG
        const webhookUrl = (typeof window.CONFIG !== 'undefined' && window.CONFIG.CHAT_WEBHOOK_URL)
            ? window.CONFIG.CHAT_WEBHOOK_URL
            : 'https://hook.us2.make.com/your-chat-webhook-url';

        console.log('🪝 Using webhook URL:', webhookUrl);
        console.log('📤 Sending message:', message);

        // Trim history to fit token limit
        const trimmedHistory = trimHistoryToTokenLimit(fullHistory, message, 5000);
        console.log('📊 Trimmed history:', trimmedHistory.length, 'messages');

        const userId = (typeof appState !== 'undefined' && appState.userId)
            ? appState.userId
            : (typeof window !== 'undefined' && window.appState?.userId)
                ? window.appState.userId
                : 'unknown';
        const userName = (typeof appState !== 'undefined' && appState.userName)
            ? appState.userName
            : (typeof window !== 'undefined' && window.appState?.userName)
                ? window.appState.userName
                : 'Unknown';

        const payload = {
            action: 'AI Prompt Helper Chat Message',
            message: message,
            conversation_id: state.conversationId,
            history: trimmedHistory,
            user_id: userId,
            user_name: userName,
            timestamp: new Date().toISOString()
        };

        console.log('📦 Payload:', JSON.stringify(payload, null, 2));

        try {
            console.log('🔄 Starting fetch to:', webhookUrl);
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            console.log('📥 Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Webhook error response:', errorText);
                throw new Error(`Webhook error: ${response.status} - ${errorText}`);
            }

            let responseText = await response.text();
            console.log('📄 Full webhook response:', responseText);

            // Очистка от markdown форматирования
            if (responseText.includes('```json')) {
                responseText = responseText.replace(/```json\n?/g, '').replace(/\n?```$/g, '');
                console.log('✨ Cleaned response:', responseText);
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError);
                console.warn('📄 Raw response that failed to parse:', responseText);
                return 'Извините, произошла ошибка обработки ответа. Повторите пожалуйста.';
            }

            console.log('✅ Parsed webhook response data:', data);
            return data.response || 'Спасибо за сообщение! Ваш запрос обработан.';
        } catch (error) {
            console.error('💥 Webhook request failed:', error);
            console.error('Stack trace:', error.stack);
            return 'Извините, произошла ошибка. Повторите пожалуйста.';
        }
    }

    // ========== UTILITY FUNCTIONS ==========
    function createElement(tag, props = {}, children = []) {
        const el = document.createElement(tag);
        Object.assign(el, props);

        // Ensure children is an array
        if (!Array.isArray(children)) {
            children = [children];
        }

        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child) {
                el.appendChild(child);
            }
        });
        return el;
    }

    function detectUserLevel(message) {
        // Enhanced heuristic based on message complexity
        const length = message.length;
        const complexity = (message.match(/[,:;.!?]/g) || []).length / length;
        const uppercaseWords = (message.match(/\b[A-ZА-Я]\w*\b/g) || []).length;
        const questions = (message.match(/\?/g) || []).length;

        // Yandexo's upgraded logic
        if (length < 30 || complexity < 0.05 || uppercaseWords < 1) {
            return 'ученик';
        }
        if (length < 150 || complexity < 0.12 || questions < 2) {
            return 'игрок';
        }
        return 'исследователь';
    }

    function selectOptimalTrigger(message) {
        // Enhanced selection with more patterns
        const patterns = {
            удивление: ['удив', 'неожида', 'шок', 'интересн', 'нов', 'вау'],
            боль: ['проблем', 'трудн', 'не работает', 'слома', 'ошибк', 'помоги'],
            решение: ['как', 'помо', 'реше', 'вариант', 'совет', 'что делать'],
            доказательство: ['почему', 'объясн', 'доказ', 'причин', 'факты'],
            эксклюзив: ['особ', 'уник', 'тольк', 'никт', 'секрет'],
            сенсорика: ['виде', 'зву', 'металл', 'запах', 'чувств', 'ощущ'],
            история: ['расска', 'выращива', 'был', 'была', 'было'],
            'микро-обязательство': ['попроб', 'сдела', 'планир', 'начн', 'давай'],
            рефрейм: ['дума', 'смотр', 'может', 'иначе', 'по-друг'],
            онбординг: ['обуч', 'изуч', 'науч', 'начина'],
            реферал: ['друг', 'знаком', 'пригл', 'подел', 'рассказ'],
            лояльность: ['верный', 'довер', 'поддерж', 'остаюс']
        };

        const lowerMsg = message.toLowerCase();
        for (const [trigger, words] of Object.entries(patterns)) {
            if (words.some(word => lowerMsg.includes(word))) {
                return trigger;
            }
        }

        // Fallback to default based on message length
        const index = Math.min(Math.floor(message.length / 20), COGNITIVE_ENGINE.triggers.length - 1);
        return COGNITIVE_ENGINE.triggers[index];
    }

    function createEchoBlock(message, trigger) {
        return {
            shock: `🔥 ШОК: Ваш запрос "${message.substring(0, 30)}..." активировал триггер "${trigger}"`,
            segmentation: `📊 АНАЛИЗ: Уровень "${state.userLevel}". Cognitive Framework: ${COGNITIVE_ENGINE.cognitiveFramework}`,
            retention: `🎯 ДЕЙСТВИЕ: Следующий шаг - интегрировать в pixPLace`
        };
    }

    function buildCognitiveContent(message) {
        const trigger = state.currentTrigger;

        // Dynamic cognitive content based on trigger
        const cognitiveTemplates = {
            удивление: `**P — Восприятие:** Ваш запрос требует интерактивного подхода к генерации!\n**M — Смысл:** Используйте когнитивные паттерны - сочетайте сложные понятия с неожиданными элементами.\n**A — Действие:** Структурируйте промпт как: "Создать {тип} с {интересный аспект} + {неожиданный элемент} в стиле {стиль}"`,

            боль: `**P — Восприятие:** Строгая рациональная оценка существующих ограничений.\n**M — Смысл:** Фокус на трансформации проблемы через детальное описание желаемого состояния.\n**A — Действие:** Используйте формулу: "Устранить {проблема} через {решение} дает {абсолютный результат}"`,

            решение: `**P — Восприятие:** Методичное рассмотрение всех доступных опций для достижения результата.\n**M — Смысл:** Логическая структура в комбинации с творческими подходами - математическая точность плюс артистичность.\n**A — Действие:** Формат: "Я хочу, чтобы AI создал {описание} используя {метод} для достижения {цель} с precision of {уровень детали}"`,

            доказательство: `**P — Восприятие:** Тщательная верификация всех параметров и условий корректности.\n**M — Смысл:** Enhancement через подробное обоснование - почему именно этот подход оптимален.\n**A — Действие:** Начать промпт: "Verification checklist complete: {условие} подтверждено || {новая концепция} requires {спецификация}"`,
        };

        return cognitiveTemplates[trigger] || `**Cognitive Framework:** Запрос обработан со стратегией neural adaptation.\n**Adaptive recommendation:** Рекомендуется стиль "${trigger}" с акцентом на детальную спецификацию.\n**Next iteration:** Усилить через increased contextual density.`;
    }

    function calculateKPI(response) {
        // Simple scoring
        state.kpi.clarity = 4;
        state.kpi.actionability = 5;
        state.kpi.understanding = 4;
        return state.kpi;
    }

    function suggestNextAction() {
        return 'Внедрить в pixPLace: toggle to Act Mode для кода.';
    }

    // ========== UI FUNCTIONS ==========
    function createModal() {
        if (state.modal) return state.modal;

        // Determine sizes based on screen width
        const isMobile = window.innerWidth <= 768;
        const buttonPadding = isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem';
        const buttonSize = isMobile ? '0.875rem' : '0.9rem';
        const buttonMinWidth = isMobile ? 'auto' : 'none';

        const overlay = createElement('div', {
            id: 'ai-coach-overlay',
            className: 'fixed inset-0 flex items-center justify-center p-4 hid hidden',
            style: {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))',
                backdropFilter: 'blur(20px)',
                zIndex: '1',
                opacity: '0',
                transition: 'opacity 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            onclick: (e) => { if (e.target.id === 'ai-coach-overlay') hideCognitiveAssistant(); }
        });

        const modal = createElement('div', {
            id: 'ai-coach-modal',
            style: {
                background: 'linear-gradient(135deg, #1e293b, #1e2730)',
                borderRadius: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                width: '100%',
                maxWidth: '400px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(99,102,241,0.2)',
                overflow: 'hidden',
                transform: 'scale(0.95)',
                opacity: '0',
                transition: 'all 0.3s ease'
            }
        });

        // Header with gradient
        const header = createElement('div', {
            style: {
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                padding: '1rem'
            }
        }, [
            createElement('div', {
                style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
            }, [
                createElement('div', {
                    style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }
                }, [
                    createElement('div', {
                        style: {
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    }, createElement('span', { style: { fontSize: '1.25rem' } }, '🧠')),
                    createElement('div', {}, [
                        createElement('h3', {
                            style: {
                                color: 'white',
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                margin: '0'
                            }
                        }, 'AI Prompt Helper'),
                        createElement('p', {
                            style: {
                                color: '#c7d2fe',
                                fontSize: '0.875rem',
                                margin: '0'
                            }
                        }, 'v3.1 • AI Когнитивный Ассистент')
                    ])
                ]),
                createElement('button', {
                    className: 'close-btn',
                    style: {
                        width: '32px',
                        height: '32px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        transition: 'background-color 0.2s ease'
                    },
                    onclick: hideCognitiveAssistant,
                    title: 'Закрыть'
                }, '×')
            ])
        ]);

        // Chat area with better styling
        const chatArea = createElement('div', {
            id: 'ai-coach-chat',
            style: {
                flex: '1',
                padding: '1rem',
                overflowY: 'auto',
                background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
                minHeight: '0'
            }
        }, [
            createElement('div', {
                style: {
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.875rem',
                    marginTop: '2rem'
                }
            }, (typeof appState !== 'undefined' ? appState.translate('ai_coach_ready') : '✨ AI Prompt Helper is ready to help with AI generation!'))
        ]);

        // Input area with modern design
        const inputArea = createElement('div', {
            style: {
                borderTop: '1px solid rgba(51,65,85,0.5)',
                padding: '1rem',
                background: '#1e293b'
            }
        }, [
            createElement('div', {
                style: { display: 'flex', gap: '0.5rem' }
            }, [
                createElement('input', {
                    id: 'ai-coach-input',
                    type: 'text',
                    placeholder: (typeof appState !== 'undefined' ? appState.translate('ai_placeholder_modal') : 'Write to your AI assistant...'),
                    style: {
                        flex: '1',
                        backgroundColor: '#374151',
                        borderRadius: '2rem',
                        padding: '0.75rem 1rem',
                        color: 'white',
                        border: '2px solid #4b5563',
                        outline: 'none',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        placeholderColor: '#9ca3af'
                    },
                    onkeypress: (e) => { if (e.key === 'Enter') sendMessage(); },
                    onfocus: function () {
                        this.style.borderColor = '#ec4899';
                        this.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.2)';
                    },
                    onblur: function () {
                        this.style.borderColor = '#4b5563';
                        this.style.boxShadow = 'none';
                    }
                }),
                createElement('button', {
                    style: {
                        background: 'linear-gradient(135deg, #ec4899, #f97316)',
                        border: 'none',
                        borderRadius: '2rem',
                        padding: buttonPadding,
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: buttonSize,
                        boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)',
                        transform: 'scale(1)',
                        hover: 'scale(1.05)',
                        minWidth: buttonMinWidth
                    },
                    onclick: sendMessage,
                    title: 'Отправить сообщение',
                    onmousedown: function () { this.style.transform = 'scale(0.95)'; },
                    onmouseup: function () { this.style.transform = 'scale(1)'; },
                    onmouseleave: function () { this.style.transform = 'scale(1)'; }
                }, '📤')
            ])
        ]);

        modal.append(header, chatArea, inputArea);
        overlay.appendChild(modal);

        // Add custom styles for animations
        const style = createElement('style', {}, `
            .ai-coach-overlay:not(.hidden) { opacity: 1 !important; }
            .ai-coach-modal { transform: scale(1) !important; opacity: 1 !important; }
            .ai-coach-overlay.hidden .ai-coach-modal { transform: scale(0.95) !important; opacity: 0 !important; }
            .close-btn:hover { background-color: rgba(255,255,255,0.3) !important; }
        `);
        document.head.appendChild(style);

        document.body.appendChild(overlay);
        state.modal = overlay;
        return overlay;
    }

    function renderCoachInterface() {
        const chat = document.getElementById('ai-coach-chat');
        if (!chat) return;

        // Загрузить историю из localStorage
        loadChatHistory();

        // Если история пустая, показать приветственное сообщение
        if (state.history.length === 0) {
            const introKey = typeof appState !== 'undefined' ? appState.translate('ai_welcome_intro') : 'AI Prompt Helper: Welcome! I am your AI assistant for improving the quality of image generation results. Ask any question about creating prompts! Or briefly describe your vision, and I will create a professional prompt for you.';
            addMessageToChat(introKey, 'bot');
        }

        state.isOpen = true;
        createModal().classList.remove('hidden');
    }

    function createMessageElement(text, sender, timestamp = null) {
        // Modern WhatsApp-style message bubble
        const messageDiv = createElement('div', {
            className: `ai-chat-message ${sender}`,
            style: {
                maxWidth: '85%',
                marginBottom: '0.75rem',
                display: 'flex',
                flexDirection: sender === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: '0.5rem'
            }
        });

        // Avatar
        const avatar = createElement('div', {
            className: 'message-avatar',
            style: {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: 'white',
                background: sender === 'user'
                    ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                    : 'linear-gradient(135deg, #ec4899, #f97316)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                flexShrink: '0'
            }
        }, sender === 'user' ? '👤' : '🧠');

        // Message bubble
        const bubble = createElement('div', {
            style: {
                background: sender === 'user'
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'linear-gradient(135deg, #374151, #4b5563)',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '1.25rem',
                borderBottomRightRadius: sender === 'user' ? '0.25rem' : '1.25rem',
                borderBottomLeftRadius: sender === 'user' ? '1.25rem' : '0.25rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'relative',
                maxWidth: '70%',
                wordWrap: 'break-word',
                animation: 'slideIn 0.3s ease-out'
            }
        });

        // Process text with line breaks and formatting
        const lines = text.split('\n');
        const messageContent = lines.map(line => {
            if (line.trim() === '') return createElement('br');
            return createElement('div', {}, line);
        });

        bubble.append(...messageContent);

        // Timestamp
        if (timestamp) {
            const timeStr = new Date(timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const timestampEl = createElement('div', {
                className: 'message-timestamp'
            }, timeStr);

            bubble.appendChild(timestampEl);
        }

        // Assemble message
        if (sender === 'user') {
            messageDiv.appendChild(bubble);
            messageDiv.appendChild(avatar);
        } else {
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(bubble);
        }

        return messageDiv;
    }

    function createTypingIndicator() {
        const typingDiv = createElement('div', {
            style: {
                maxWidth: '85%',
                marginBottom: '0.75rem',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: '0.5rem'
            }
        });

        // Avatar
        const avatar = createElement('div', {
            style: {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: 'white',
                background: 'linear-gradient(135deg, #ec4899, #f97316)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                flexShrink: '0'
            }
        }, '🧠');

        // Typing bubble
        const bubble = createElement('div', {
            style: {
                background: 'linear-gradient(135deg, #374151, #4b5563)',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '1.25rem',
                borderBottomLeftRadius: '0.25rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                animation: 'slideIn 0.3s ease-out'
            }
        });

        // Typing animation
        const indicator = createElement('div', {
            className: 'ai-typing-indicator'
        }, createElement('div', {
            className: 'typing-dots'
        }, [
            createElement('span'),
            createElement('span'),
            createElement('span')
        ]));

        bubble.appendChild(indicator);
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(bubble);

        return typingDiv;
    }

    function addMessageToChat(text, sender) {
        const chat = document.getElementById('ai-chat-messages');
        if (!chat) return;

        let messageElement;
        if (text === '🤖 pixPLace Assistant думает...') {
            // Special case for typing indicator
            messageElement = createTypingIndicator();
        } else {
            // Normal message
            messageElement = createMessageElement(text, sender);
        }

        chat.appendChild(messageElement);

        // Auto-scroll to bottom
        setTimeout(() => {
            chat.scrollTop = chat.scrollHeight;
        }, 100);
    }

    function showChatScreen() {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });

        // Show chat screen
        const chatScreen = document.getElementById('chatScreen');
        if (chatScreen) {
            chatScreen.classList.remove('hidden');
            chatScreen.classList.add('active');
        }

        // Change logo behavior to go back to generation
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.onclick = () => showGeneration();
        }

        // Show back button in header for chat screen
        setTimeout(() => {
            if (typeof window.showBackButton === 'function') {
                window.showBackButton(true);
                console.log('✅ Back button enabled for chat screen');
            } else {
                console.error('❌ showBackButton function not available - retrying...');
                // Retry after a short delay
                setTimeout(() => {
                    if (typeof window.showBackButton === 'function') {
                        window.showBackButton(true);
                        console.log('✅ Back button enabled after retry');
                    } else {
                        console.error('❌ showBackButton function still not available');
                    }
                }, 500);
            }
        }, 50);

        // Update data attribute
        const main = document.querySelector('main');
        if (main) main.setAttribute('data-current-screen', 'chat');

        state.isOpen = true;

        // Load/initialize chat
        initializeChat();

        console.log('📱 Switched to chat screen view');
    }

    function hideChatScreen() {
        showGeneration(); // Go back to generation screen

        // Reset logo behavior
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.onclick = () => showGeneration();
        }

        // Hide back button in header when leaving chat screen
        if (typeof window.showBackButton === 'function') {
            window.showBackButton(false);
        }

        state.isOpen = false;
    }

    function initializeChat() {
        const messagesContainer = document.getElementById('ai-chat-messages');
        if (!messagesContainer) {
            console.error('Chat messages container not found!');
            return;
        }

        console.log('🚀 Initializing chat screen');
        console.log('📋 All input elements in DOM:', document.querySelectorAll('input').length);
        console.log('📋 All ai-chat-input in DOM:', document.querySelectorAll('#ai-chat-input').length);
        console.log('📋 Chat screen visible:', !document.getElementById('chatScreen')?.classList.contains('hidden'));

        // Clear existing messages
        messagesContainer.innerHTML = '';

        // Always show welcome message as the first message (with latest translation)
        const welcomeText = typeof appState !== 'undefined' ? appState.translate('ai_welcome_chat') : 'AI Prompt Helper: Welcome to the chat!';
        const welcomeMessage = createMessageElement(welcomeText, 'bot');
        welcomeMessage.setAttribute('data-welcome-message', 'true'); // Mark as welcome message
        messagesContainer.appendChild(welcomeMessage);

        // Load chat history (only actual conversation messages, not welcome)
        loadChatHistory();

        // Setup input handlers with delay to ensure elements are ready
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            const sendBtn = document.getElementById('ai-chat-send-btn');

            console.log('🎯 Setting up chat input handlers (delayed):', {
                input: !!input,
                inputTag: input?.tagName,
                inputId: input?.id,
                sendBtn: !!sendBtn,
                sendBtnId: sendBtn?.id
            });

            if (input && sendBtn) {
                const handleSend = () => {
                    console.log('🚀 Send message triggered');
                    sendMessage();
                };

                input.addEventListener('keypress', (e) => {
                    console.log('⌨️ Key pressed:', e.key, e.key === 'Enter');
                    if (e.key === 'Enter') handleSend();
                });
                sendBtn.addEventListener('click', (e) => {
                    console.log('👆 Send button clicked');
                    handleSend();
                });

                console.log('✅ Chat input handlers set up successfully');
            } else {
                console.error('❌ Chat input elements not found even after delay');
            }
        }, 200); // Small delay to ensure DOM is ready
    }

    function generateCognitiveResponse(message) {
        // Detect user level from message
        state.userLevel = detectUserLevel(message);

        // Select optimal trigger
        state.currentTrigger = selectOptimalTrigger(message);

        // Create ECHO-BLOCK
        state.echoBlock = createEchoBlock(message, state.currentTrigger);

        // Build cognitive content
        const cognitiveContent = buildCognitiveContent(message);

        // Calculate KPI
        state.kpi = calculateKPI({ content: cognitiveContent });

        // Suggest next action
        const nextAction = suggestNextAction();

        return {
            level: state.userLevel,
            trigger: state.currentTrigger,
            echo_block: state.echoBlock,
            content: cognitiveContent,
            kpi: state.kpi,
            next_step: nextAction,
            timestamp: new Date().toISOString()
        };
    }

    async function sendMessage() {
        console.log('🔥 sendMessage() called, isProcessing:', state.isProcessing);

        const input = document.getElementById('ai-chat-input') || document.querySelector('#ai-chat-input');
        console.log('🎯 Input element found:', !!input, input?.id, input?.tagName);

        // If not found in chat screen, try modal
        if (!input) {
            console.log('🔄 Trying modal input...');
            const modalInput = document.getElementById('ai-coach-input');
            if (modalInput) {
                console.log('✅ Found modal input instead');
                // Handle modal differently
                return;
            }
        }

        if (!input || !input.value.trim() || state.isProcessing) {
            console.log('🚫 sendMessage blocked:', {
                input: !!input,
                hasValue: !!input?.value?.trim(),
                value: input?.value,
                isProcessing: state.isProcessing
            });
            return;
        }

        const message = input.value.trim();
        console.log('📝 Adding user message to chat:', message);
        addMessageToChat(message, 'user');

        // Add to history
        state.history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
        saveChatHistory();

        console.log('🔄 Setting isProcessing = true');
        state.isProcessing = true;
        input.style.opacity = '0.5';
        input.value = '';

        // Show typing indicator AND get a reference to it immediately
        const typingKey = typeof appState !== 'undefined' ? appState.translate('ai_thinking_indicator') : '🤖 pixPLace Assistant is thinking...';
        const typingIndicator = addMessageToChat(typingKey, 'bot');
        console.log('🎭 Typing indicator created:', !!typingIndicator);

        try {
            // Send to webhook with history
            const aiResponse = await sendToWebhook(message, state.history.slice(0, -1)); // Exclude current message from history

            console.log('📨 AI Response received:', aiResponse.substring(0, 50));

            // Remove typing indicator from DOM immediately before adding new message
            if (typingIndicator && typingIndicator.parentNode) {
                console.log('🗑️ Removing typing indicator from DOM');
                typingIndicator.parentNode.removeChild(typingIndicator);
            } else {
                console.warn('⚠️ Typing indicator not found or already removed:', typingIndicator);
            }

            // Add AI response message immediately
            console.log('✉️ Adding AI response message');
            addMessageToChat(aiResponse, 'bot');

            // Add AI response to history
            state.history.push({ role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() });
            saveChatHistory();

        } catch (error) {
            console.error('Chat processing failed:', error);
            // Remove typing indicator from DOM
            if (typingIndicator && typingIndicator.parentNode) {
                console.log('🗑️ Removing typing indicator after error');
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            const errorKey = typeof appState !== 'undefined' ? appState.translate('ai_error_message') : 'Sorry, there was an error. Please try again.';
            addMessageToChat(errorKey, 'bot');
        } finally {
            console.log('🏁 Processing finished, setting isProcessing = false');
            state.isProcessing = false;
            input.style.opacity = '';
        }
    }

    function formatResponse(response) {
        let formatted = `**Уровень:** ${response.level}\n`;
        formatted += `**Триггер:** ${response.trigger}\n\n`;
        formatted += `**ECHO-BLOCK:**\n`;
        formatted += `- Шок: ${response.echo_block.shock}\n`;
        formatted += `- Сегментация: ${response.echo_block.segmentation}\n`;
        formatted += `- Удержание: ${response.echo_block.retention}\n\n`;
        formatted += `${response.content}\n\n`;
        formatted += `**KPI:** Clarity: ${response.kpi.clarity}/5 | Action: ${response.kpi.actionability}/5\n`;
        formatted += `**Следующий шаг:** ${response.next_step}`;
        return formatted;
    }

    function hideCognitiveAssistant() {
        if (state.modal) {
            state.modal.classList.add('hidden');
            state.isOpen = false;
        }
    }

    // ========== MCP INTEGRATION ==========
    async function saveToMCP(response) {
        if (typeof useMCPTool === 'function') {
            try {
                await useMCPTool({
                    server_name: 'pixplace-project',
                    tool_name: 'add_project_insights',
                    arguments: {
                        insight_type: 'decision',
                        title: `AI Coach Response: ${response.trigger}`,
                        description: JSON.stringify(response, null, 2),
                        tags: ['ai_coach', 'cognitive', response.trigger]
                    }
                });
            } catch (error) {
                console.warn('MCP save failed:', error);
            }
        }
    }

    // ========== PUBLIC API ==========
    window.AICoach = {
        init: function () {
            console.log('🧠 AI Prompt Helper initialized');
            // Setup event listeners
            window.addEventListener('ai-coach-show', () => window.AICoach.show());

            // Listen to language change to update chat messages
            document.addEventListener('dictionary:language-changed', (event) => {
                console.log('🌍 Language changed, reinitializing chats with new translations');

                // Simple solution: reinitialize chats if they are open
                // This ensures clean state just like when they open fresh

                // Check screen chat (ai-chat-messages)
                const screenChat = document.getElementById('ai-chat-messages');
                if (screenChat) {
                    console.log('🔄 Reinitializing screen chat');
                    initializeChat(); // This will clear and recreate welcome message
                }

                // Check modal chat if visible (ai-coach-chat)
                const modalChat = document.getElementById('ai-coach-chat');
                if (modalChat && modalChat.children.length > 0) {
                    console.log('🔄 Reinitializing modal chat');
                    // Clear modal chat content
                    modalChat.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.875rem; margin-top: 2rem;">' +
                        (typeof appState !== 'undefined' ? appState.translate('ai_coach_ready') : '✨ AI Prompt Helper is ready to help with AI generation!') +
                        '</div>';
                }
            });

            // Dispatch ready event
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ai-coach-ready'));
            }, 100);
        },

        show: function () {
            showChatScreen();
            analyzeUserLevel(); // Initial analysis
        },

        hide: function () {
            hideChatScreen();
        },

        processMessage: sendMessage,

        getState: function () { return { ...state, history: state.history.slice(-5) }; }
    };

    // Initial user level analysis (placeholder)
    function analyzeUserLevel() {
        // Could integrate with appState.userName or other data
        state.userLevel = 'исследователь'; // Default for now
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.AICoach.init());
    } else {
        window.AICoach.init();
    }

    // Global functions for easy access
    window.showAICoach = () => window.AICoach.show();
    window.hideAICoach = () => window.AICoach.hide();

    console.log('🧠 AI Prompt Helper module loaded - isolated and ready');
})();
