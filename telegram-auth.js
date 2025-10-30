// telegram-auth.js - Модуль для обработки авторизации через Telegram

console.log('📱 Telegram Auth module initialized');

// ГЕНЕРИРУЕМ УНИКАЛЬНЫЙ ПАРАМЕТР СЕССИИ ДЛЯ КАЖДОЙ АВТОРИЗАЦИИ
function generateAuthSession() {
    return 'auth_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Функция для обработки авторизации через Telegram
function handleTelegramLogin() {
    console.log('🔔 Handle Telegram login called');

    // СНАЧАЛА ПРОВЕРЯЕМ - ДОСТУПЕН ЛИ TELEGRAM WEB APP API?
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        console.log('✅ Официальный Telegram WebApp API доступен - пытаемся автоматическую авторизацию');

        try {
            // Используем Telegram WebApp авторизацию
            const webApp = window.Telegram.WebApp;

            // Проверяем наличие данных пользователя
            if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
                const user = webApp.initDataUnsafe.user;
                console.log('👤 Автоматическая авторизация через WebApp:', {
                    id: user.id,
                    first_name: user.first_name,
                    username: user.username
                });

                // Сохраняем данные пользователя
                if (typeof window.appState !== 'undefined') {
                    window.appState.userId = user.id;
                    window.appState.userName = user.first_name;
                }

                // Переходим на главный экран
                if (typeof window.showGeneration === 'function') {
                    window.showGeneration();
                }

                // Показываем приветствие
                setTimeout(() => {
                    if (typeof window.showToast === 'function') {
                        window.showToast('success', `Добро пожаловать, ${user.first_name}! 🎉`);
                    }
                }, 1000);

                return; // Успешная WebApp авторизация
            } else {
                console.log('⚠️ WebApp доступен, но данных пользователя нет - продолжаем с инструкциями');
            }
        } catch (error) {
            console.error('❌ Ошибка WebApp авторизации:', error);
        }
    }

    // ЕСЛИ WEBAPP НЕДОСТУПЕН ИЛИ НЕ СРАБОТАЛ - ПОКАЗЫВАЕМ ИНСТРУКЦИИ НА САЙТЕ
    console.log('📱 Показываем инструкции по авторизации на сайте');

    if (typeof window.showToast === 'function') {
        window.showToast('info', 'Открываем инструкции по авторизации...');
    }

    // Показываем модал с инструкциями
    setTimeout(() => {
        alert(`Для авторизации выполните следующие шаги:

1. 🔔 Откройте Telegram бота: @pixPLaceBot
2. 📱 Отправьте команду: /start
3. 🔑 Получите персональную ссылку для авторизации
4. 🔗 Перейдите по ссылке в браузере
5. ✅ Авторизация будет завершена автоматически

После авторизации вы сможете использовать все функции приложения!`);

        console.log('📋 Инструкции по авторизации показаны');

        // Опционально: открываем бота в новой вкладке
        try {
            window.open('https://t.me/pixPLaceBot?start=manual_auth', '_blank', 'noopener,noreferrer');
            console.log('📱 Бот открыт в новой вкладке');
        } catch (error) {
            console.error('❌ Не удалось открыть бота:', error);
        }
    }, 500);
}

// Функция для прослушивания возврата авторизации
function listenForAuthReturn(sessionId) {
    console.log('👂 Listening for auth return with session:', sessionId);

    // Проверяем наличие авторизационных данных каждые 2 секунды
    const authCheckInterval = setInterval(() => {
        try {
            // Проверяем наличие параметров авторизации в URL
            const urlParams = new URLSearchParams(window.location.search);
            const authToken = urlParams.get('telegram_auth');
            const authSession = urlParams.get('session');
            const userData = urlParams.get('user');

            if (authToken && authSession === sessionId) {
                console.log('🎉 Auth token received, processing...');

                // Парсим данные пользователя
                let userInfo = null;
                if (userData) {
                    try {
                        userInfo = JSON.parse(decodeURIComponent(userData));
                    } catch (e) {
                        console.error('❌ Ошибка парсинга пользовательских данных:', e);
                    }
                }

                // Очищаем интервал проверки
                clearInterval(authCheckInterval);

                // Выполняем успешную авторизацию
                completeTelegramAuth({
                    token: authToken,
                    sessionId: authSession,
                    user: userInfo
                });

                // Очищаем URL параметры
                const cleanUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, cleanUrl);

                return;
            }

            // Проверяем не истекло ли время ожидания (5 минут)
            const startTimeStr = localStorage.getItem('telegram_auth_timestamp');
            if (startTimeStr) {
                const startTime = parseInt(startTimeStr);
                const timeElapsed = Date.now() - startTime;

                if (timeElapsed > 5 * 60 * 1000) { // 5 minutes timeout
                    console.warn('⏰ Auth timeout reached');
                    clearInterval(authCheckInterval);

                    if (typeof window.showToast === 'function') {
                        window.showToast('warning', 'Время ожидания авторизации истекло');
                    }

                    // Очищаем сессию
                    localStorage.removeItem('telegram_auth_session');
                    localStorage.removeItem('telegram_auth_timestamp');
                }
            }

        } catch (error) {
            console.error('❌ Ошибка проверки авторизации:', error);
            clearInterval(authCheckInterval);
        }
    }, 2000); // Каждые 2 секунды

    // Ограничиваем время ожидания - максимум 3 минуты
    setTimeout(() => {
        clearInterval(authCheckInterval);
        console.log('⏳ Auth listening timeout');
    }, 3 * 60 * 1000); // 3 минуты климакс
}

function completeTelegramAuth(authData) {
    console.log('✅ Completing Telegram auth with data:', authData);

    // Сохраняем авторизационные данные
    localStorage.setItem('telegram_auth_completed', 'true');
    localStorage.setItem('telegram_auth_token', authData.token);
    localStorage.setItem('telegram_auth_timestamp', Date.now().toString());

    if (authData.user) {
        localStorage.setItem('telegram_user_data', JSON.stringify(authData.user));
    }

    // Сохраняем в appState если доступен
    if (typeof window.appState !== 'undefined') {
        if (authData.user) {
            window.appState.userId = authData.user.id;
            window.appState.userName = authData.user.first_name || authData.user.username;
        }
    }

    // Переходим на главный экран
    if (typeof window.showGeneration === 'function') {
        window.showGeneration();
    }

    // Показываем приветственное сообщение
    setTimeout(() => {
        if (typeof window.showToast === 'function') {
            let userName = 'Пользователь';
            if (authData.user) {
                userName = authData.user.first_name || authData.user.first_name || 'Пользователь';
            }
            window.showToast('success', `Добро пожаловать, ${userName}! 🎉`);
        }
    }, 1000);

    // Очищаем сессионные данные
    localStorage.removeItem('telegram_auth_session');
    localStorage.removeItem('telegram_auth_timestamp');

    console.log('🎉 Telegram authorization completed successfully');
}

// Экспортируем функцию глобально
window.handleTelegramLogin = handleTelegramLogin;

console.log('✅ Telegram Auth function registered globally');
