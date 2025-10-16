/* =========================================== */
/* Telegram Notifications Module */
/* Управление уведомлениями браузера и звуками */
/* =========================================== */

class TelegramNotifications {
    constructor(mainApp) {
        this.mainApp = mainApp;
        this.isInitialized = false;

        console.log('🔔 TelegramNotifications module created');
    }

    /**
     * Инициализация модуля уведомлений
     */
    init() {
        if (this.isInitialized) return;

        this.isInitialized = true;
        console.log('🔔 TelegramNotifications initialized');
    }

    /**
     * Запрос разрешения на уведомления
     */
    requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('Уведомления не поддерживаются в этом браузере');
            return;
        }

        if (Notification.permission === 'granted') {
            alert('Уведомления уже разрешены');
            return;
        }

        if (Notification.permission === 'denied') {
            alert('Уведомления заблокированы. Разрешите их в настройках браузера');
            return;
        }

        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                alert('Уведомления разрешены!');
                this.mainApp.addToLog('Уведомления разрешены');
            } else {
                alert('Уведомления запрещены');
                this.mainApp.addToLog('Уведомления запрещены');
            }
        });
    }

    /**
     * Показать тестовое уведомление
     */
    showTestNotification() {
        if (Notification.permission !== 'granted') {
            alert('Сначала разрешите уведомления!');
            return;
        }

        const notification = new Notification('Test Notification', {
            body: 'Это тестовое уведомление Telegram Sender',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAyQzEzLjEwNDYgMiAxNCAyLjk4OTU1IDE0IDRDMTQgNS4xMDQ2IDEzLjEwNDYgNiAxMiA2QzEwLjg5NTQgNiAxMCA1LjEwNDYgMTAgNEMxMCAyLjk4OTU1IDEwLjg5NTQgMiAxMiAyWk0yMSAxOVYyMEgzVjE5SDE3VjE2SjE5IDE4VjE2SDE5VjE4Wk04IDE2SDhWMThIOFYxNloiIGZpbGw9IiMxOTc2RDIiLz4KPHBhdGggZD0iTTkgMkQ5IDIuNUQ5LjQgM0E5IDkgMCAwMTkgNUMxOS44IDEwLjEwNDYgMjAuNyAxMSA5IDExQzEwLjEwNDYgMTEgOSAxMC4xMDQ2IDkgOUM5IDYuODk1NCA5Ljg5NTQgNiAxMSA2QzEyLjEwNDYgNiAxOSA4Ljk4OTU1IDEkgOUMxOSAxMS4xMjkgMTUuNTIgMjEgOSA5QzMgNSA1LjUzIDIgOSA5LjQ5QzEyLjQ3IDguOTUgMTMgOS43IDEyIDlDMTggOSA3LjUgNi41IDIxLjUgNkM5IDIgMi41NiA0LjU3IDIgOUMyIDIzLjAwNiAxMy44MjMgMjUgMjUgMjVDMjUgMjUuMjkyIDI0Ljg0MSAyNSAyNCAyNUgyNEMyNSAyMi43NDggMjQuNjkgMjIgMjQgMjJIMjJDMjQgMTkuNzUyIDIzLjY5IDE5IDIzIDE5SEY5QzIuMjQgMTkgMS42OSAyMi43NDggMSAyNUMxIDI1LjI5MiAxLjE1OSAyNSAyIDI1SDFaTTkgM0MxMCAzLjEwNDYgMTAuMTc1IDMuNzU5NTcgOS42OTYgNC4wNDIyQzkuMjE4IDQuMzI4OSA4LjYxIDQgOC42MSA0QzYuMzEgNCA1LjM3NSA2LjY1MSA2LjA2IDguODUyQzYuNzQ1IDEwLjk3MyA4LjEwNSAxMyAxMiAxM0MxNS44OTUgMTMgMTcuMjU1IDEwLjk3MyAxNy45NCA4Ljg1MkMxOC42MjUgNi42NTEgMTcuNjkgNCAxNS4zOSA0QzE0LjYxIDQgMTMuODEgNC4zMjg5IDEzLjMwNCA0LjA0MjJDMTIuODI1IDMuNzU5NTcgMTMgMyAxNCAzQzEzIDMgMTIgMi45IDExLjM4NSAyLjc5ODJDMTQuNzggMi43MDQ0IDE0IDIgMTIgMlMxMCAyLjcwNDQgMTEuMzg1IDIuNzk4MkMxMSAxMC40IDEyIDEzIDE3IDEzQzE5LjIgMTMgMjEuNTUgMTAuOSA3IDEwLjk0QzcuNDkgMTUuMzMgMTMuNzYgMTguNjUgNSAxOC42NUNzIDUgNi4zMSA1IDkgOEM5IDYuMzEgNSAzIDI2IDJDNSAyMTEuNmMgMC45NiAyLjI2IDMgNC40OSA0IDI1Ljk4QzIgMjUuNDkgNC4wMyAyMy4yMiAzLjY5IDIyLjY3QzIuOTMgMjIuMzkgMiAxOC45NSAyIDE4Ljk1QzIgMTMuODYgMi4yMiAzLjA5IDkgMkExOSA2Ljg4IEwxIDMgMTEsNyAxOC41TDMgMjNMjAgMTJMMTUgMjk2MTUzVjE5TDMgNUQyMDI0TDggMjNMjQtMTJMMjAgMjcriberC'
        });

        this.mainApp.addToLog('Тестовое уведомление показано');
        setTimeout(() => notification.close(), 5000);
    }

    /**
     * Проверка поддержки уведомлений
     */
    checkNotificationSupport() {
        const results = {
            notifications: 'Notification' in window,
            serviceWorker: 'serviceWorker' in navigator,
            permission: Notification.permission
        };

        let message = 'Проверка поддержки уведомлений:\n\n';
        message += `Уведомления браузера: ${results.notifications ? '✅ Поддерживаются' : '❌ Не поддерживаются'}\n`;
        message += `Service Worker: ${results.serviceWorker ? '✅ Поддерживается' : '❌ Не поддерживается'}\n`;
        message += `Разрешение: ${results.permission}\n\n`;

        if (results.notifications) {
            message += 'Рекомендации:\n';
            message += '• Для лучших уведомлений используйте HTTPS\n';
            message += '• В Chrome: настройки сайта → уведомления\n';
            message += '• В Firefox: настройки приватности → уведомления\n';
        }

        alert(message);
        console.log('📢 Notification support check:', results);
    }

    /**
     * Показать мастер настроек звука
     */
    showSoundSettingsWizard() {
        const wizard = document.getElementById('soundSettingsWizard');
        if (wizard) {
            // Загружаем текущие значения в поля
            const frequencySlider = document.getElementById('frequencySlider');
            const durationSlider = document.getElementById('durationSlider');
            const volumeSlider = document.getElementById('volumeSlider');
            const waveTypeSelect = document.getElementById('waveTypeSelect');

            if (frequencySlider) frequencySlider.value = this.mainApp.notificationSoundSettings.frequency;
            if (durationSlider) durationSlider.value = this.mainApp.notificationSoundSettings.duration;
            if (volumeSlider) volumeSlider.value = this.mainApp.notificationSoundSettings.volume;
            if (waveTypeSelect) waveTypeSelect.value = this.mainApp.notificationSoundSettings.waveType;

            this.updateFrequencyValue(this.mainApp.notificationSoundSettings.frequency);
            this.updateDurationValue(this.mainApp.notificationSoundSettings.duration);
            this.updateVolumeValue(this.mainApp.notificationSoundSettings.volume);

            wizard.style.display = 'block';
        }
    }

    /**
     * Скрыть мастер настроек звука
     */
    hideSoundSettingsWizard() {
        const wizard = document.getElementById('soundSettingsWizard');
        if (wizard) {
            wizard.style.display = 'none';
        }
    }

    /**
     * Обновление отображаемого значения частоты
     */
    updateFrequencyValue(value) {
        const display = document.getElementById('frequencyValue');
        if (display) display.textContent = value + ' Hz';
    }

    /**
     * Обновление отображаемого значения длительности
     */
    updateDurationValue(value) {
        const display = document.getElementById('durationValue');
        if (display) display.textContent = value + ' мс';
    }

    /**
     * Обновление отображаемого значения громкости
     */
    updateVolumeValue(value) {
        const display = document.getElementById('volumeValue');
        if (display) display.textContent = value + '%';
    }

    /**
     * Проиграть тестовый звук уведомления
     */
    playNotificationSound() {
        if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
            alert('Ваш браузер не поддерживает Web Audio API');
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = this.mainApp.notificationSoundSettings.waveType;
            oscillator.frequency.setValueAtTime(this.mainApp.notificationSoundSettings.frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(this.mainApp.notificationSoundSettings.volume / 100, audioContext.currentTime);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + this.mainApp.notificationSoundSettings.duration / 1000);

            this.mainApp.addToLog(`Звук проигран: ${this.mainApp.notificationSoundSettings.frequency}Hz, ${this.mainApp.notificationSoundSettings.duration}мс`);
        } catch (error) {
            console.error('Ошибка воспроизведения звука:', error);
            alert('Ошибка воспроизведения звука');
        }
    }

    /**
     * Сохранить настройки звука из UI
     */
    saveSoundSettingsFromUI() {
        const frequencySlider = document.getElementById('frequencySlider');
        const durationSlider = document.getElementById('durationSlider');
        const volumeSlider = document.getElementById('volumeSlider');
        const waveTypeSelect = document.getElementById('waveTypeSelect');

        if (frequencySlider) this.mainApp.notificationSoundSettings.frequency = parseInt(frequencySlider.value);
        if (durationSlider) this.mainApp.notificationSoundSettings.duration = parseInt(durationSlider.value);
        if (volumeSlider) this.mainApp.notificationSoundSettings.volume = parseInt(volumeSlider.value);
        if (waveTypeSelect) this.mainApp.notificationSoundSettings.waveType = waveTypeSelect.value;

        this.mainApp.saveSoundSettings();
        this.mainApp.addToLog('Настройки звука сохранены');
        alert('Настройки звука сохранены!');
    }

    /**
     * Сбросить настройки звука
     */
    resetSoundSettings() {
        this.mainApp.notificationSoundSettings = {
            frequency: 800,
            duration: 300,
            waveType: 'sine',
            volume: 0.1
        };
        this.mainApp.saveSoundSettings();
        this.mainApp.addToLog('Настройки звука сброшены');
        alert('Настройки звука сброшены!');
    }
}

// Экспорт для использования как модуль
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramNotifications;
}
