/* =========================================== */
/* Telegram Scheduler Module */
/* Управление планировщиком рассылок */
/* =========================================== */

class TelegramScheduler {
    constructor(mainApp) {
        this.mainApp = mainApp;
        this.isInitialized = false;

        console.log('⏰ TelegramScheduler module created');
    }

    /**
     * Инициализация модуля планировщика
     */
    init() {
        if (this.isInitialized) return;

        this.isInitialized = true;

        // Проверяем, есть ли запланированные рассылки при запуске
        this.checkScheduledBroadcasts();

        console.log('⏰ TelegramScheduler initialized');
    }

    /**
     * Установка таймаута между сообщениями
     */
    setMessageTimeout() {
        const input = document.getElementById('messageTimeoutInput');
        if (!input) return;

        const timeout = parseInt(input.value);
        if (isNaN(timeout) || timeout < 0 || timeout > 30000) {
            alert('Введите корректное значение таймаута (0-30000 мс)!');
            input.value = this.mainApp.messageTimeout;
            return;
        }

        this.mainApp.messageTimeout = timeout;
        this.mainApp.addToLog(`Таймаут между сообщениями установлен: ${timeout}мс`);
        alert(`Таймаут установлен: ${timeout}мс`);
    }

    /**
     * Запланировать текущую рассылку
     */
    scheduleCurrentBroadcast() {
        const dateInput = document.getElementById('scheduleDateTime');
        if (!dateInput || !dateInput.value) {
            alert('Выберите дату и время!');
            return;
        }

        const scheduleTime = new Date(dateInput.value).getTime();
        const now = Date.now();

        if (scheduleTime <= now) {
            alert('Выбранное время уже прошло!');
            return;
        }

        this.mainApp.sendSchedule = {
            scheduledTime: scheduleTime,
            message: document.getElementById('messageInput')?.value || '',
            selectedUsers: Array.from(this.mainApp.selectedUsers),
            timeout: parseInt(document.getElementById('messageTimeoutInput')?.value || '1000')
        };

        // Устанавливаем таймер для выполнения
        const timeUntilExecution = scheduleTime - Date.now();
        this.mainApp.sendSchedule.timerId = setTimeout(() => {
            this.executeScheduledBroadcast();
        }, timeUntilExecution);

        this.mainApp.addToLog(`Рассылка запланирована на ${new Date(scheduleTime).toLocaleString()}`);
        alert('Рассылка запланирована!');

        // Сохраняем планировщик в localStorage
        this.saveScheduledBroadcast();
    }

    /**
     * Отменить запланированную рассылку
     */
    cancelScheduledBroadcast() {
        if (!this.mainApp.sendSchedule) {
            alert('Нет активного расписания!');
            return;
        }

        // Очищаем таймер если есть
        if (this.mainApp.sendSchedule.timerId) {
            clearTimeout(this.mainApp.sendSchedule.timerId);
            this.mainApp.sendSchedule.timerId = null;
        }

        this.mainApp.sendSchedule = null;

        // Удаляем из localStorage
        localStorage.removeItem('telegram_sender_scheduled_broadcast');

        this.mainApp.addToLog('Запланированная рассылка отменена');
        alert('Запланированная рассылка отменена!');
    }

    /**
     * Выполнить запланированную рассылку
     */
    async executeScheduledBroadcast() {
        console.log('⏰ Executing scheduled broadcast...');

        if (!this.mainApp.sendSchedule) {
            console.warn('No scheduled broadcast found');
            return;
        }

        const schedule = this.mainApp.sendSchedule;

        // Показываем уведомление о начале планируемой рассылки
        if (Notification.permission === 'granted') {
            new Notification('Запланированная рассылка', {
                body: `Начинается отправка ${schedule.selectedUsers.length} сообщения(ий)`,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAyQzEzLjEwNDYgMiAxNCAyLjk4OTU1IDE0IDRDMTQgNS4xMDQ2IDEzLjEwNDYgNiAxMiA2QzEwLjg5NTQgNiAxMCA1LjEwNDYgMTAgNEMxMCAyLjk4OTU1IDEwLjg5NTQgMiAxMiAyWk0yMSAxOVYyMEgzVjE5SDE3VjE2SjE5IDE4VjE2SDE5VjE4Wk04IDE2SDhWMThIOFYxNloiIGZpbGw9IiMxOTc2RDIiLz4KPHBhdGggZD0iTTkgMkQ5IDIuNUQ5LjQgM0E5IDkgMCAwMTkgNUMxOS44IDEwLjEwNDYgMjAuNyAxMSA5IDExQzEwLjEwNDYgMTEgOSAxMC4xMDQ2IDkgOUM5IDYuODk1NCA5Ljg5NTQgNiAxMSA2QzEyLjEwNDYgNiAxOSA4Ljk4OTU1IDE9IDlDMTkgMTEuMTI5IDE1LjUyIDIxIDkgMjFaIiBmaWxsPSIjMTk3NkQyIi8+Cjwvc3ZnPgo='
            });
        }

        this.mainApp.addToLog(`🚀 Начинается выполнение запланированной рассылки`);

        // Фильтруем пользователей по выбранным ID
        const selectedUsers = this.mainApp.usersData.filter(user =>
            schedule.selectedUsers.includes(user.user_id)
        );

        if (selectedUsers.length === 0) {
            this.mainApp.addToLog('❌ Нет пользователей для запланированной рассылки');
            return;
        }

        // Устанавливаем сообщение в input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = schedule.message;
        }

        // Запускаем стандартный процесс рассылки
        await this.mainApp.messaging.startBroadcastToUsers(selectedUsers, schedule.message, schedule.timeout);

        // Очищаем планировщик после выполнения
        this.cancelScheduledBroadcast();
    }

    /**
     * Проверка запланированных рассылок при запуске приложения
     */
    checkScheduledBroadcasts() {
        try {
            const savedSchedule = localStorage.getItem('telegram_sender_scheduled_broadcast');
            if (!savedSchedule) return;

            const schedule = JSON.parse(savedSchedule);
            const now = Date.now();

            if (schedule.scheduledTime <= now) {
                // Время вышло - выполняем немедленно
                this.mainApp.sendSchedule = schedule;

                // Небольшая задержка чтобы приложение успело загрузиться
                setTimeout(() => {
                    this.executeScheduledBroadcast();
                }, 2000);

                this.mainApp.addToLog('⏰ Найдена просроченная запланированная рассылка - выполняем');
            } else {
                // Время не вышло - восстанавливаем таймер
                this.mainApp.sendSchedule = schedule;

                const timeUntilExecution = schedule.scheduledTime - now;
                this.mainApp.sendSchedule.timerId = setTimeout(() => {
                    this.executeScheduledBroadcast();
                }, timeUntilExecution);

                this.mainApp.addToLog(`⏰ Восстановлена запланированная рассылка на ${new Date(schedule.scheduledTime).toLocaleString()}`);
            }
        } catch (error) {
            console.error('❌ Error checking scheduled broadcasts:', error);
            localStorage.removeItem('telegram_sender_scheduled_broadcast');
        }
    }

    /**
     * Сохранение запланированной рассылки в localStorage
     */
    saveScheduledBroadcast() {
        if (!this.mainApp.sendSchedule) return;

        try {
            localStorage.setItem('telegram_sender_scheduled_broadcast',
                JSON.stringify({
                    scheduledTime: this.mainApp.sendSchedule.scheduledTime,
                    message: this.mainApp.sendSchedule.message,
                    selectedUsers: this.mainApp.sendSchedule.selectedUsers,
                    timeout: this.mainApp.sendSchedule.timeout
                })
            );
        } catch (error) {
            console.error('❌ Error saving scheduled broadcast:', error);
        }
    }

    /**
     * Получение информации о запланированной рассылке
     */
    getScheduledBroadcastInfo() {
        if (!this.mainApp.sendSchedule) {
            return null;
        }

        const scheduleTime = new Date(this.mainApp.sendSchedule.scheduledTime);
        const now = Date.now();
        const timeLeft = Math.max(0, this.mainApp.sendSchedule.scheduledTime - now);

        return {
            scheduledTime: scheduleTime,
            timeLeft: timeLeft,
            message: this.mainApp.sendSchedule.message,
            selectedUsersCount: this.mainApp.sendSchedule.selectedUsers.length,
            timeout: this.mainApp.sendSchedule.timeout
        };
    }

    /**
     * Показать информацию о запланированной рассылке
     */
    showScheduledBroadcastInfo() {
        const info = this.getScheduledBroadcastInfo();

        if (!info) {
            alert('Нет запланированной рассылки');
            return;
        }

        const message = `📅 Информация о запланированной рассылке:\n\n`
            + `🕐 Время: ${info.scheduledTime.toLocaleString()}\n`
            + `⏱️ Осталось: ${Math.floor(info.timeLeft / 60000)} мин ${Math.floor((info.timeLeft % 60000) / 1000)} сек\n`
            + `👥 Получателей: ${info.selectedUsersCount}\n`
            + `⏳ Таймаут: ${info.timeout}мс\n`
            + `📝 Сообщение: ${info.message.substring(0, 100)}${info.message.length > 100 ? '...' : ''}`;

        alert(message);
    }
}

// Экспорт для использования как модуль
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramScheduler;
}
