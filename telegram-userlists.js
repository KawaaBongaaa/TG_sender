/**
 * TelegramSender User Lists Module
 * Управление списками пользователей с синхронизацией данных
 */

class TelegramUserLists {
    constructor(parent) {
        this.parent = parent; // Ссылка на основной класс TelegramSender
        this.userLists = []; // Массив списков: [{id, name, userIds: Set, created: ISO, updated: ISO}]
        this.activeListId = null; // ID активного списка для быстрого доступа

        console.log('📋 TelegramUserLists module initialized');
    }

    /**
     * ЗАГРУЗКА СПИСКОВ ИЗ localStorage
     */
    loadLists() {
        try {
            const data = localStorage.getItem('telegram_sender_user_lists');
            const loadedLists = data ? JSON.parse(data) : [];

            // Преобразуем массивы userIds обратно в Set для быстрой работы
            this.userLists = loadedLists.map(list => ({
                ...list,
                userIds: new Set(list.userIds || [])
            }));

            console.log('📋 Loaded user lists:', this.userLists.length, 'lists');
        } catch (error) {
            console.warn('❌ Failed to load user lists:', error);
            this.userLists = [];
        }
    }

    /**
     * СОХРАНЕНИЕ СПИСКОВ В localStorage
     */
    saveLists() {
        try {
            // Преобразуем Set обратно в массивы для сериализации
            const dataToSave = this.userLists.map(list => ({
                ...list,
                userIds: Array.from(list.userIds || [])
            }));

            localStorage.setItem('telegram_sender_user_lists', JSON.stringify(dataToSave));
            console.log('💾 User lists saved');
        } catch (error) {
            console.error('❌ Failed to save user lists:', error);
        }
    }

    /**
     * СОЗДАНИЕ НОВОГО СПИСКА ПОЛЬЗОВАТЕЛЕЙ
     */
    createList(name, userIds = [], description = '') {
        if (!name || !name.trim()) {
            throw new Error('Название списка не может быть пустым');
        }

        // Проверяем уникальность имени
        const existingList = this.userLists.find(list =>
            list.name.toLowerCase() === name.trim().toLowerCase()
        );

        if (existingList) {
            throw new Error(`Список с именем "${name}" уже существует`);
        }

        const newList = {
            id: 'userlist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            description: description.trim(),
            userIds: new Set(userIds),
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            usage_count: 0
        };

        this.userLists.push(newList);
        this.saveLists();

        console.log('📋 Created new user list:', newList.name);
        this.parent.addToLog(`Создан новый список: ${newList.name}`);

        return newList;
    }

    /**
     * ДОБАВЛЕНИЕ ПОЛЬЗОВАТЕЛЕЙ В СУЩЕСТВУЮЩИЙ СПИСОК
     */
    addUsersToList(listId, userIds) {
        const list = this.userLists.find(l => l.id === listId);
        if (!list) {
            throw new Error('Список не найден');
        }

        const addedCount = userIds.filter(id => !list.userIds.has(id)).length;

        userIds.forEach(userId => {
            list.userIds.add(userId);
        });

        list.updated = new Date().toISOString();

        this.saveLists();

        console.log('📋 Added users to list:', list.name, 'added:', addedCount);
        if (addedCount > 0) {
            this.parent.addToLog(`Добавлено ${addedCount} пользователей в список "${list.name}"`);
        }

        return list;
    }

    /**
     * УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ИЗ СПИСКА
     */
    removeUsersFromList(listId, userIds) {
        const list = this.userLists.find(l => l.id === listId);
        if (!list) {
            throw new Error('Список не найден');
        }

        const removedCount = userIds.filter(id => list.userIds.has(id)).length;

        userIds.forEach(userId => {
            list.userIds.delete(userId);
        });

        list.updated = new Date().toISOString();

        this.saveLists();

        console.log('📋 Removed users from list:', list.name, 'removed:', removedCount);
        if (removedCount > 0) {
            this.parent.addToLog(`Удалено ${removedCount} пользователей из списка "${list.name}"`);
        }

        return list;
    }

    /**
     * ПРОСМОТР СПИСКА ПО ID
     */
    getList(listId) {
        return this.userLists.find(l => l.id === listId);
    }

    /**
     * ПРОСМОТР СПИСКА ПО ИМЕНИ
     */
    getListByName(name) {
        return this.userLists.find(l =>
            l.name.toLowerCase() === name.toLowerCase()
        );
    }

    /**
     * ПОЛУЧЕНИЕ ПОЛЬНЫХ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ ИЗ СПИСКА
     */
    getUsersFromList(listId) {
        const list = this.getList(listId);
        if (!list) return [];

        return Array.from(list.userIds || [])
            .map(userId => {
                // Ищем пользователя среди загруженных данных
                return this.parent.filteredUsers.find(u => u.user_id == userId) ||
                       this.parent.usersData.find(u => u.user_id == userId);
            })
            .filter(user => user !== undefined);
    }

    /**
     * АКТИВАЦИЯ СПИСКА (УСТАНОВКА ЕГО КАК ВЫБРАННЫЙ)
     */
    selectList(listId) {
        const list = this.getList(listId);
        if (!list) return false;

        this.activeListId = listId;

        // Автоматически выбираем пользователей из списка в интерфейсе
        this.selectUsersFromList(listId);

        console.log('📋 Selected user list:', list.name);
        this.parent.addToLog(`Выбран список: ${list.name}`);

        return true;
    }

    /**
     * ВЫБОР ПОЛЬЗОВАТЕЛЕЙ ИЗ СПИСКА В ИНТЕРФЕЙСЕ
     */
    selectUsersFromList(listId) {
        const list = this.getList(listId);
        if (!list) return false;

        // Очищаем текущий выбор
        this.parent.selectedUsers.clear();

        // Выбираем всех пользователей из списка
        list.userIds.forEach(userId => {
            this.parent.selectedUsers.add(userId);
        });

        // Обновляем чекбоксы в таблице
        this.updateTableSelection();

        // Обновляем счетчики
        this.parent.users.updateSelectedCount();

        return Array.from(list.userIds).length;
    }

    /**
     * ОБНОВЛЕНИЕ ЧЕКБОКСОВ В ТАБЛИЦЕ ПО ТЕКУЩЕМУ ВЫБОРУ
     */
    updateTableSelection() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(cb => {
            const userId = cb.dataset.userId;
            cb.checked = this.parent.selectedUsers.has(userId);
        });

        // Обновляем мастер-чекбокс
        const masterCheckbox = document.getElementById('masterUserCheckbox');
        if (masterCheckbox) {
            const totalCheckboxes = checkboxes.length;
            const checkedCheckboxes = document.querySelectorAll('.user-checkbox:checked').length;
            masterCheckbox.checked = totalCheckboxes > 0 && checkedCheckboxes === totalCheckboxes;
        }
    }

    /**
     * ДОБАВЛЕНИЕ ТЕКУЩИХ ВЫБРАННЫХ ПОЛЬЗОВАТЕЛЕЙ В СПИСОК
     */
    saveSelectedToList(listId) {
        if (this.parent.selectedUsers.size === 0) {
            throw new Error('Нет выбранных пользователей');
        }

        const selectedIds = Array.from(this.parent.selectedUsers);
        return this.addUsersToList(listId, selectedIds);
    }

    /**
     * СОХРАНЕНИЕ ВЫБРАННЫХ ПОЛЬЗОВАТЕЛЕЙ В НОВЫЙ СПИСОК
     */
    saveSelectedAsNewList(listName, description = '') {
        if (this.parent.selectedUsers.size === 0) {
            throw new Error('Нет выбранных пользователей');
        }

        const selectedIds = Array.from(this.parent.selectedUsers);
        return this.createList(listName, selectedIds, description);
    }

    /**
     * УДАЛЕНИЕ СПИСКА
     */
    deleteList(listId) {
        const index = this.userLists.findIndex(l => l.id === listId);
        if (index === -1) {
            throw new Error('Список не найден');
        }

        const listName = this.userLists[index].name;
        this.userLists.splice(index, 1);

        // Если удален активный список, сбрасываем активный
        if (this.activeListId === listId) {
            this.activeListId = null;
        }

        this.saveLists();

        console.log('❌ Deleted user list:', listName);
        this.parent.addToLog(`Удален список: ${listName}`);

        return listName;
    }

    /**
     * ПЕРЕИМЕНОВАНИЕ СПИСКА
     */
    renameList(listId, newName) {
        if (!newName || !newName.trim()) {
            throw new Error('Название списка не может быть пустым');
        }

        const list = this.getList(listId);
        if (!list) {
            throw new Error('Список не найден');
        }

        // Проверяем уникальность нового имени
        const existingList = this.userLists.find(l =>
            l.id !== listId && l.name.toLowerCase() === newName.trim().toLowerCase()
        );

        if (existingList) {
            throw new Error(`Список с именем "${newName}" уже существует`);
        }

        const oldName = list.name;
        list.name = newName.trim();
        list.updated = new Date().toISOString();

        this.saveLists();

        console.log('📝 Renamed list:', oldName, '->', newName);
        this.parent.addToLog(`Список переименован: ${oldName} → ${newName}`);

        return list;
    }

    /**
     * СИНХРОНИЗАЦИЯ СПИСКОВ С ОБНОВЛЕННЫМИ ДАННЫМИ ПОЛЬЗОВАТЕЛЕЙ
     *
     * Этот метод вызывается после загрузки свежих пользователей из Google Sheets
     * для поддержания актуальности данных в списках
     */
    syncWithUserData() {
        let totalSynced = 0;

        this.userLists.forEach(list => {
            const listUserIds = Array.from(list.userIds || []);
            const existingUsers = listUserIds.filter(userId =>
                this.parent.usersData.some(u => u.user_id == userId)
            );

            const removedCount = listUserIds.length - existingUsers.length;

            if (removedCount > 0) {
                // Обновляем список, удаляя несуществующих пользователей
                list.userIds = new Set(existingUsers);
                list.updated = new Date().toISOString();
                totalSynced++;
                console.log(`🔄 Synced list "${list.name}": removed ${removedCount} non-existent users`);
            }
        });

        if (totalSynced > 0) {
            this.saveLists();
            console.log('✅ Synchronized all user lists with current user data');
        }
    }

    /**
     * СТАТИСТИКА ПО СПИСКАМ
     */
    getListsStatistics() {
        return this.userLists.map(list => {
            const userCount = list.userIds ? list.userIds.size : 0;
            const activeUsers = Array.from(list.userIds || []).filter(userId =>
                this.parent.usersData.some(u => u.user_id == userId)
            ).length;

            return {
                id: list.id,
                name: list.name,
                userCount: userCount,
                activeUsers: activeUsers,
                created: list.created,
                updated: list.updated
            };
        });
    }

    /**
     * ОЧИСТКА ВСЕХ СПИСКОВ (ДЛЯ ОТЛАДКИ ИЛИ СБРОСА)
     */
    clearAllLists() {
        if (!confirm('Удалить ВСЕ списки пользователей?\n\nЭто действие нельзя отменить!')) {
            return false;
        }

        this.userLists = [];
        this.activeListId = null;
        this.saveLists();

        console.log('🧹 Cleared all user lists');
        this.parent.addToLog('Очищены все списки пользователей');

        return true;
    }

    /**
     * РЕНДЕР СПИСКОВ В UI ЭЛЕМЕНТ
     */
    renderListsDropdown(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.userLists.length === 0) {
            container.innerHTML = '<div style="color: var(--text-tertiary); font-style: italic; padding: 8px;">Нет сохраненных списков</div>';
            return;
        }

        let html = '<div style="max-height: 200px; overflow-y: auto;">';

        this.userLists.forEach(list => {
            const userCount = list.userIds ? list.userIds.size : 0;
            const isActive = list.id === this.activeListId;

            html += `
                <div class="user-list-item ${isActive ? 'active' : ''}"
                     style="padding: 8px; margin-bottom: 4px; border: 1px solid var(--border); border-radius: 6px; background: ${isActive ? 'var(--accent-bg)' : 'var(--bg-secondary)'}; cursor: pointer;"
                     data-list-id="${list.id}"
                     onclick="telegramSender.userLists.selectList('${list.id}')">

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-weight: 600; color: var(--text-primary);">${list.name}</div>
                        <div style="color: var(--text-secondary); font-size: 12px;">👥 ${userCount}</div>
                    </div>

                    <div style="display: flex; gap: 4px; margin-top: 4px;">
                        <button onclick="event.stopPropagation(); telegramSender.userLists.selectUsersFromList('${list.id}')"
                                style="padding: 2px 6px; font-size: 10px; background: var(--accent-primary); color: var(--text-inverse); border: none; border-radius: 3px; cursor: pointer;">
                            Выбрать
                        </button>
                        <button onclick="event.stopPropagation(); telegramSender.showBroadcastFromListDialog('${list.id}')"
                                style="padding: 2px 6px; font-size: 10px; background: var(--accent-success); color: var(--text-inverse); border: none; border-radius: 3px; cursor: pointer;">
                            Отправить
                        </button>
                        <button onclick="event.stopPropagation(); telegramSender.showEditListDialog('${list.id}')"
                                style="padding: 2px 6px; font-size: 10px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 3px; cursor: pointer;">
                            ⚙️
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * ПОЛУЧЕНИЕ СПИСКА ПОЛЬЗОВАТЕЛЕЙ ДЛЯ РАССЫЛКИ
     */
    getListForBroadcast(listId) {
        const list = this.getList(listId);
        if (!list) {
            throw new Error('Список не найден');
        }

        const users = this.getUsersFromList(listId);

        if (users.length === 0) {
            throw new Error(`Список "${list.name}" пуст или содержит только неактивных пользователей`);
        }

        // Обновляем счетчик использования
        list.usage_count = (list.usage_count || 0) + 1;
        this.saveLists();

        return {
            list: list,
            users: users
        };
    }

    /**
     * ЭКСПОРТ СПИСКА В CSV
     */
    exportListToCSV(listId) {
        const list = this.getList(listId);
        if (!list) {
            throw new Error('Список не найден');
        }

        const users = this.getUsersFromList(listId);

        if (users.length === 0) {
            alert('Список пуст - нечего экспортировать');
            return;
        }

        // Заголовки на основе первого пользователя
        const headers = Object.keys(users[0]);

        // Создаем CSV
        let csv = headers.join(',') + '\n';

        users.forEach(user => {
            const row = headers.map(header => {
                const value = user[header] || '';
                // Экранируем запятые и кавычки
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csv += row.join(',') + '\n';
        });

        // Скачиваем файл
        const filename = `telegram_users_list_${list.name}_${new Date().toISOString().split('T')[0]}.csv`;
        this.parent.downloadFile(filename, csv, 'text/csv');

        this.parent.addToLog(`Экспортирован список "${list.name}" (${users.length} пользователей)`);
    }
}

// Экспорт для браузерной среды
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramUserLists;
} else {
    // Для браузера - регистрируем глобально
    window.TelegramUserLists = TelegramUserLists;
}
