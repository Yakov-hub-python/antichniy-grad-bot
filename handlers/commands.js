const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { getSoldiers } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');
const { showMainMenu } = require('../handlers/menu');
const branchHandler = require('./branch');
const portHandlers = require('./port');
const miracle = require('./miracle');

// ===== ПРОВЕРКА АДМИНА С ЛОГИРОВАНИЕМ =====
function isAdmin(userId) {
    const adminsRaw = process.env.ADMINS || process.env.ADMIN || '';
    const admins = adminsRaw.split(',').map(id => id.trim()).filter(id => id.length > 0);
    const result = admins.includes(userId.toString());
    
    console.log(
        `🔍 [ADMIN CHECK] ID: ${userId} | ` +
        `Список: [${admins.join(', ') || 'пусто'}] | ` +
        `Результат: ${result ? '✅ ДОСТУП РАЗРЕШЁН' : '⛔ ДОСТУП ЗАПРЕЩЁН'}`
    );
    
    return result;
}

module.exports = (bot) => {

    // ===== /START =====
    bot.start(require('./start'));

    // ==== /MENU =====
    bot.command('menu',async (ctx) => {
        ctx.reply('🏛️ Главное меню')
        await showMainMenu(ctx);
    })
    // ===== /CITY =====
    bot.command('city', require('../hears/city').show);

    // ===== /BUILD =====
    bot.command('build', require('../hears/build').showMenu);

    // ===== /INCOME =====
    bot.command('income', require('../hears/income').collect);

    // ===== /BOSS =====
    bot.command('boss', require('../hears/boss').show);

    // ===== /OLYMP =====
    bot.command('olymp', require('../hears/olymp').show);

    // ===== /DAILY =====
    bot.command('daily', require('../hears/daily').get);

    // ===== /REFERRAL =====
    bot.command('referral', require('../hears/referral').show);

    // Ветви развития
    bot.command('branch', branchHandler);
    bot.command('miracle', miracle)
    // Работа с портом
    bot.command('port', portHandlers.port);
    bot.command('sell_port', portHandlers.sell_port);
    bot.command('buy_port', portHandlers.buy_port);
    bot.command('my_offers', portHandlers.my_offers);
    bot.command('cancel_offer', portHandlers.cancel_offer);

    // ===== ОБУЧЕНИЕ =====
    bot.command('training', async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);

        const { getFirstStep, startTraining, isTrainingComplete } = require('../utils/training');

        if (isTrainingComplete(user)) {
            return ctx.reply('✅ Ты уже прошёл обучение! Начинай строить свой город.');
        }

        startTraining(user);
        const step = getFirstStep();

        const text = 
            `📚 ОБУЧЕНИЕ: ШАГ 1 / 4\n\n` +
            `${step.title}\n${step.description}\n\n` +
            `🏆 Награда за выполнение: ${step.reward}💰\n\n` +
            `👉 Выполни действие и получи награду!`;

        saveUser(userId, user);
        await ctx.reply(text);
    });
    // ===== /BARRACKS =====
    bot.command('barracks', async (ctx) => {
        const user = getUser(ctx.from.id);
        const soldiers = getSoldiers(user);
        await ctx.reply(
            `🪖 КАЗАРМА\n\n` +
            `🪖 Солдаты: ${soldiers}\n` + 
            `💰 Цена: 1 воин = 6 монет\n\n` +
            `⚔️ Каждый солдат даёт 5 урона боссам.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Нанять воинов', callback_data: 'hire_warriors_1' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    });
    // ===== /HIRE =====
    bot.command('hire', async (ctx) => {
        const args = ctx.message.text.split(' ');
        
        // Проверка количества аргументов
        if (args.length !== 2) {
            return ctx.reply('❌ Используй: /hire <количество>');
        }
        
        const amount = args[1].trim();
        const number = Number(amount);
        
        // Проверка валидности числа
        if (!Number.isInteger(number) || number <= 0) {
            return ctx.reply('❌ Введите целое положительное число');
        }
        
        // Максимальное количество (защита от спама)
        const MAX_HIRE = 1000;
        if (number > MAX_HIRE) {
            return ctx.reply(`❌ Нельзя нанять больше ${MAX_HIRE} воинов за раз`);
        }
        
        const user = getUser(ctx.from.id);
        const cost = number * 6;
        
        if (!user) {
            return ctx.reply('❌ Пользователь не найден');
        }
        
        if (user.coins < cost) {
            const needed = cost - user.coins;
            return ctx.reply(`❌ Не хватает монет! Нужно еще ${needed} монет. Всего нужно: ${cost}`);
        }
        
        // Выполняем операцию
        user.coins -= cost;
        user.soldiers += number;
        saveUser(ctx.from.id, user);
        
        ctx.reply(
            `✅ Нанято ${number} воинов за ${cost} монет\n` +
            `📊 Всего воинов: ${user.soldiers}\n` +
            `💰 Осталось монет: ${user.coins}`
        );
    });
    // ===== /HELP =====
    bot.command('help', async (ctx) => {
        await ctx.reply(
            `📖 СПИСОК КОМАНД\n\n` +

            `🎮 ИГРОВЫЕ:\n` +
            `/start — начать игру\n` +
            `/menu — главное меню\n` +
            `/city — город и статистика\n` +
            `/build — строительство\n` +
            `/income — собрать доход\n` +
            `/daily — ежедневный бонус\n` +
            `/boss — боссы\n` +
            `/olymp — топ-10 игроков\n` +
            `/profile — мой профиль\n\n` +

            `🪖 АРМИЯ:\n` +
            `/barracks — казарма\n` +
            `/hire <количество> — нанять воинов\n\n` +

            `👥 РЕФЕРАЛЫ:\n` +
            `/referral — ссылка для друзей\n\n` +

            `🏪 ТОРГОВЛЯ:\n` +
            `/market — рынок\n` +
            `/sell <ресурс> <кол-во> — продать\n` +
            `/buy <ресурс> <кол-во> — купить\n\n` +

            `🎁 ПРОМОКОДЫ:\n` +
            `/promo <код> — активировать промокод\n\n` +

            `🎯 КВЕСТЫ И ДОСТИЖЕНИЯ:\n` +
            `/quests — текущий квест\n` +
            `/achievements — все достижения\n\n` +

            `👤 ПРОФИЛЬ:\n` +
            `/setnickname <ник> — установить ник в игре\n\n` +

            `🛠 ОСТАЛЬНОЕ:\n` +
            `/help — помощь\n` +
            `/menu — главное меню\n\n` +

            `📢 Канал: @antichniy_grad\n` +
            `💬 Чат: @antichniy_grad_chat`
        );
    });

    // ===== /SELL =====
    bot.command('sell', async (ctx) => {
        const user = getUser(ctx.from.id)
        if ((user.techTree?.economy || 0) < 1) {
            return ctx.reply('❌ Торговля доступна только после изучения 1 уровня экономики.');
        }
        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            return ctx.reply('❌ Используй: /sell food 10');
        }
        const resource = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ Введи положительное число.');
        }
        const prices = { food: 1, coins: 3 };
        if (!prices[resource]) {
            return ctx.reply('❌ Можно продать только food или coins.');
        }
        if ((user[resource] || 0) < amount) {
            return ctx.reply(`❌ У тебя только ${user[resource] || 0} ${resource}.`);
        }
        user[resource] -= amount;
        user.gold += amount * prices[resource];
        saveUser(ctx.from.id, user);
        ctx.reply(`✅ Продано ${amount} ${resource} за ${amount * prices[resource]} золота.`);
    });

    // ===== /BUY =====
    bot.command('buy', async (ctx) => {
        const user = getUser(ctx.from.id)
        if ((user.techTree?.economy || 0) < 1) {
            return ctx.reply('❌ Торговля доступна только после изучения 1 уровня экономики.');
        }
        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            return ctx.reply('❌ Используй: /buy food 10');
        }
        const resource = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ Введи положительное число.');
        }
        const prices = { food: 2, coins: 6 };
        if (!prices[resource]) {
            return ctx.reply('❌ Можно купить только food или coins.');
        }
        const cost = amount * prices[resource];
        if (user.gold < cost) {
            return ctx.reply(`❌ Нужно ${cost} золота, у тебя ${user.gold}.`);
        }
        user.gold -= cost;
        user[resource] = (user[resource] || 0) + amount;
        saveUser(ctx.from.id, user);
        ctx.reply(`✅ Куплено ${amount} ${resource} за ${cost} золота.`);
    });
    // ===== /MARKET =====
    bot.command('market', require('../hears/market').showMarketMenu);

    // ===== /SHOP =====
    // bot.command('shop', require('../hears/shop').show);

    // ===== /PROFILE =====
    bot.command('profile', async (ctx) => {
        const user = getUser(ctx.from.id);
        await ctx.reply(
            `🪪 ПРОФИЛЬ\n\n` +
            `👤 Ник: ${user.nickname || 'Игрок'}\n` +
            `💰 Золото: ${user.gold}\n` +
            `🍖 Еда: ${user.food || 0}\n` +
            `🪙 Монеты: ${user.coins || 0}\n` +
            `👥 Жители: ${user.citizens}\n` +
            `🏗️ Уровень: ${user.level}\n` +
            `👑 VIP: ${user.vip?.active ? '✅ Активен' : '❌ Не активен'}\n` +
            `🪖 Солдаты: ${getSoldiers(user)}\n` +
            `👥 Друзей: ${user.referrals?.length || 0}`
        );
    });
    bot.command('quests', async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const { getDailyQuest } = require('../utils/quests');
        
        const quest = getDailyQuest(user);
        
        if (quest.completed) {
            return ctx.reply(`✅ КВЕСТ ВЫПОЛНЕН!\n\n${quest.name}\n🏆 Награда: ${quest.reward === 'vip_3' ? 'VIP 3 дня' : quest.reward + '💰'}\n\nЗабери награду автоматически!`);
        }
        
        const progress = Math.min(quest.progress, quest.target);
        const percent = Math.floor((progress / quest.target) * 10);
        const bar = '█'.repeat(percent) + '░'.repeat(10 - percent);
        
        await ctx.reply(
            `🎯 ЕЖЕДНЕВНЫЙ КВЕСТ\n\n` +
            `${quest.name}\n` +
            `📊 Прогресс: ${bar}\n` +
            `${progress}/${quest.target}\n\n` +
            `🏆 Награда: ${quest.reward === 'vip_3' ? 'VIP 3 дня' : quest.reward + '💰'}\n` +
            `⏳ Осталось: ${Math.floor((quest.expiresAt - Date.now()) / 3600000)} часов`
        );
    });

    // ============================================================
    // ДОСТИЖЕНИЯ
    // ============================================================

    // /achievements — показать все достижения
    bot.command('achievements', async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const { getAchievements } = require('../utils/achievements');
        
        const achievements = getAchievements(user);
        const unlocked = achievements.filter(a => a.unlocked);
        const locked = achievements.filter(a => !a.unlocked);
        
        let text = '🏆 ДОСТИЖЕНИЯ\n\n';
        text += `✅ Получено: ${unlocked.length}/${achievements.length}\n\n`;
        
        if (unlocked.length > 0) {
            text += '📌 ПОЛУЧЕНЫ:\n';
            for (const a of unlocked) {
                text += `  ✅ ${a.name}\n`;
            }
            text += '\n';
        }
        
        if (locked.length > 0) {
            text += '📌 НЕ ПОЛУЧЕНЫ:\n';
            const next = locked.slice(0, 5);
            for (const a of next) {
                text += `  ⬜ ${a.name} — ${a.description}\n`;
            }
            if (locked.length > 5) {
                text += `  ... и ещё ${locked.length - 5}\n`;
            }
        }
        
        await ctx.reply(text);
    });
    // ===== УСТАНОВИТЬ НИК =====
    bot.command('setnickname', async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const args = ctx.message.text.split(' ');

        if (args.length < 2) {
            return ctx.reply('❌ Используй: /setnickname <новый ник>\nПример: /setnickname Яша');
        }

        const newNick = args.slice(1).join(' ').trim();

        // Проверки
        if (newNick.length > 20) {
            return ctx.reply('❌ Ник не может быть длиннее 20 символов');
        }
        if (newNick.length < 2) {
            return ctx.reply('❌ Ник должен быть минимум 2 символа');
        }
        if (/[^a-zA-Zа-яА-Я0-9_]/.test(newNick)) {
            return ctx.reply('❌ Ник может содержать только буквы, цифры и _');
        }

        user.nickname = newNick;
        saveUser(userId, user);

        await ctx.reply(`✅ Твой ник изменён на: ${newNick}`);
    });

    // ============================================
    // ========== АДМИН-КОМАНДЫ ==========
    // ============================================

    // ===== /ADMIN =====
    bot.command('admin', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            return ctx.reply('⛔ Доступ запрещён.');
        }

        await ctx.reply(
            `👑 АДМИН-ПАНЕЛЬ\n\n` +

            `📊 СТАТИСТИКА:\n` +
            `/stats — статистика бота\n\n` +

            `🎮 УПРАВЛЕНИЕ ИГРОКАМИ:\n` +
            `/give @user <ресурс> <кол-во> — выдать ресурс\n` +
            `   (gold, coins, food, soldiers, vip)\n` +
            `/give_all <ресурс> <кол-во> — выдать всем\n` +
            `/list_users — список всех игроков\n` +
            `/delete_user @user — удалить игрока\n` +
            `/reset_user @user — сбросить игрока\n` +
            `/recalc_level — восстановление уровня\n\n`+

            `📢 РАССЫЛКА:\n` +
            `/say текст — сообщение всем игрокам\n\n` +

            `🎁 ПРОМОКОДЫ:\n` +
            `/newpromo gold 100 HELLO — создать\n` +
            `/removepromo HELLO — удалить\n` +
            `/promolist — список промокодов\n\n` +

            `💾 БЭКАП:\n` +
            `/backup — скачать бэкап БД\n` +
            `/restore — восстановить БД\n\n`
        )
    });

    // /recalc_level — пересчитать уровень всем игрокам
    bot.command('recalc_level', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Нет прав.');
        const db = readDB();
        let count = 0;
        for (const id in db.users) {
            const user = db.users[id];
            let changed = false;
            // Заменяем null на 0
            for (const key in user.buildings) {
                if (user.buildings[key] === null) {
                    user.buildings[key] = 0;
                    changed = true;
                }
            }
            const total = Object.values(user.buildings).reduce((a, b) => a + b, 0);
            const newLevel = total + 1;
            if (user.level !== newLevel) {
                user.level = newLevel;
                changed = true;
            }
            if (changed) count++;
        }
        writeDB(db);
        ctx.reply(`✅ Уровень пересчитан для ${count} игроков.`);
    });
    // ===== /STATS — СТАТИСТИКА БОТА =====
    bot.command('stats', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            console.log(`⛔ [STATS] Доступ запрещен для ${ctx.from.id}`);
            return ctx.reply('⛔ Доступ запрещён.');
        }
        
        console.log(`📊 [STATS] Запрос статистики от ${ctx.from.id}`);
        
        const db = readDB();
        const users = Object.values(db.users);
        const totalPlayers = users.length;
        const totalGold = users.reduce((sum, u) => sum + (u.gold || 0), 0);
        const vipCount = users.filter(u => u.vip?.active).length;
        const totalCitizens = users.reduce((sum, u) => sum + (u.citizens || 0), 0);
        const totalSoldiers = users.reduce((sum, u) => {
            const soldiers = (u.buildings?.barracks || 0) * 2 + Math.floor((u.citizens || 0) / 10);
            return sum + soldiers;
        }, 0);

        const avgGold = totalPlayers > 0 ? Math.round(totalGold / totalPlayers) : 0;

        await ctx.reply(
            `📊 СТАТИСТИКА БОТА\n\n` +
            `👥 Всего игроков: ${totalPlayers}\n` +
            `💰 Всего золота: ${totalGold}\n` +
            `📈 Средний баланс: ${avgGold}\n` +
            `👑 VIP-игроков: ${vipCount}\n` +
            `👥 Всего жителей: ${totalCitizens}\n` +
            `🪖 Всего солдат: ${totalSoldiers}`
        );
    });

    // ===== /GIVE_GOLD =====
    bot.command('give', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Только для админа');

        const args = ctx.message.text.split(' ');
        if (args.length < 4) {
            return ctx.reply(
                '❌ Используй: /give @user <ресурс> <количество>\n\n' +
                '📦 Ресурсы: gold, coins, food, soldiers, vip\n' +
                'Пример: /give @DEDAYSON gold 1000'
            );
        }

        const username = args[1].replace('@', '');
        const resource = args[2].toLowerCase();
        const amount = parseInt(args[3]);

        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ Количество должно быть положительным числом');
        }

        const validResources = ['gold', 'coins', 'food', 'soldiers', 'vip'];
        if (!validResources.includes(resource)) {
            return ctx.reply(`❌ Неизвестный ресурс. Доступно: ${validResources.join(', ')}`);
        }

        const db = readDB();
        let targetId = null;
        for (const id in db.users) {
            if (db.users[id].username === username) {
                targetId = id;
                break;
            }
        }

        if (!targetId) return ctx.reply(`❌ Игрок @${username} не найден`);

        const user = db.users[targetId];

        switch (resource) {
            case 'gold':
                user.gold += amount;
                break;
            case 'coins':
                user.coins += amount;
                break;
            case 'food':
                user.food += amount;
                break;
            case 'soldiers':
                user.soldiers += amount;
                break;
            case 'vip':
                user.vip = {
                    active: true,
                    expiresAt: Date.now() + amount * 24 * 60 * 60 * 1000
                };
                break;
        }

        writeDB(db);

        const rewardText = resource === 'vip' ? `${amount} дней VIP` : `${amount} ${resource}`;
        await ctx.reply(`✅ @${username} получил ${rewardText}`);
    });
    bot.command('give_all', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Только для админа');

        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            return ctx.reply(
                '❌ Используй: /give_all <ресурс> <количество>\n\n' +
                'Пример: /give_all gold 100'
            );
        }

        const resource = args[1].toLowerCase();
        const amount = parseInt(args[2]);

        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ Количество должно быть положительным числом');
        }

        const validResources = ['gold', 'coins', 'food', 'soldiers'];
        if (!validResources.includes(resource)) {
            return ctx.reply(`❌ Неизвестный ресурс. Доступно: ${validResources.join(', ')}`);
        }

        const db = readDB();
        let count = 0;

        for (const id in db.users) {
            const user = db.users[id];
            switch (resource) {
                case 'gold': user.gold += amount; break;
                case 'coins': user.coins += amount; break;
                case 'food': user.food += amount; break;
                case 'soldiers': user.soldiers += amount; break;
            }
            count++;
        }

        writeDB(db);
        await ctx.reply(`✅ ${count} игроков получили ${amount} ${resource}`);
    });
    // ===== /SAY =====
    bot.command('say', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            console.log(`⛔ [SAY] Доступ запрещен для ${ctx.from.id}`);
            return;
        }
        
        const text = ctx.message.text.replace('/say ', '');
        if (!text || text === '/say') {
            return ctx.reply('❌ Напишите текст для рассылки: /say Привет всем!');
        }
        
        console.log(`📢 [SAY] Рассылка от ${ctx.from.id}: "${text}"`);
        
        const db = readDB();
        let count = 0;
        let errors = 0;
        
        for (const id in db.users) {
            try {
                await ctx.telegram.sendMessage(id, `📢 ${text}`);
                count++;
                // Задержка, чтобы не получить лимит от Telegram
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (err) {
                errors++;
            }
        }
        
        console.log(`✅ [SAY] Рассылка завершена: ${count} успешно, ${errors} ошибок`);
        await ctx.reply(`✅ Рассылка отправлена ${count} игрокам (${errors} не доставлено)`);
    });

    // ===== /LIST_USERS =====
    bot.command('list_users', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            console.log(`⛔ [LIST_USERS] Доступ запрещен для ${ctx.from.id}`);
            return;
        }
        
        console.log(`📋 [LIST_USERS] Запрос списка от ${ctx.from.id}`);
        
        const db = readDB();
        const users = Object.values(db.users);
        
        if (users.length === 0) {
            return ctx.reply('📭 Нет игроков');
        }
        
        // Сортируем по золоту (от большего к меньшему)
        users.sort((a, b) => (b.gold || 0) - (a.gold || 0));
        
        let text = `👥 ВСЕ ИГРОКИ (${users.length}):\n\n`;
        let count = 0;
        for (const u of users) {
            count++;
            text += `${count}. @${u.username || 'unknown'} | 💰 ${u.gold} | 🏗️ ${u.level}\n`;
            if (text.length > 3900) break; // Ограничение Telegram
        }
        
        await ctx.reply(text);
        console.log(`✅ [LIST_USERS] Отправлен список (${Math.min(users.length, count)} показано)`);
    });

    // ===== /DELETE_USER =====
    bot.command('delete_user', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            console.log(`⛔ [DELETE_USER] Доступ запрещен для ${ctx.from.id}`);
            return;
        }
        
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            return ctx.reply('❌ Используйте: /delete_user @user');
        }
        
        const username = args[1].replace('@', '');
        const db = readDB();
        let found = false;
        let userId = null;
        
        for (const id in db.users) {
            if (db.users[id].username === username) {
                userId = id;
                delete db.users[id];
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.log(`❌ [DELETE_USER] Игрок @${username} не найден`);
            return ctx.reply(`❌ Игрок @${username} не найден`);
        }
        
        writeDB(db);
        console.log(`🗑️ [DELETE_USER] @${username} (${userId}) удалён админом ${ctx.from.id}`);
        await ctx.reply(`✅ @${username} удалён`);
    });

    // ===== /RESET_USER =====
    bot.command('reset_user', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            console.log(`⛔ [RESET_USER] Доступ запрещен для ${ctx.from.id}`);
            return;
        }
        
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            return ctx.reply('❌ Используйте: /reset_user @user');
        }
        
        const username = args[1].replace('@', '');
        const db = readDB();
        let found = false;
        let userId = null;
        
        for (const id in db.users) {
            if (db.users[id].username === username) {
                userId = id;
                const user = db.users[id];
                
                // Сброс ресурсов
                user.gold = 200;
                user.food = 0;
                user.coins = 0;
                user.citizens = 5;
                user.soldiers = 0;
                user.level = 1;
                user.dailyStreak = 0;
                
                // Сброс зданий (полный список)
                user.buildings = {
                    hut: 0,
                    farm: 0,
                    mine: 0,
                    mint: 0,
                    market: 0,
                    barracks: 0,
                    field: 0,
                    quarry: 0,
                    mint_factory: 0,
                    house: 0,
                    tavern: 0,
                    bank: 0,
                    garden: 0,
                    walls: 0,
                    forge: 0,
                    iron_mine: 0,
                    smelter: 0,
                    acropolis: 0
                };
                
                // Сброс времени
                user.lastIncome = Date.now();
                user.lastDaily = null;
                
                // Сброс VIP
                user.vip = { active: false, expiresAt: 0 };
                
                // Сброс рефералов
                user.referrals = [];
                user.referredBy = null;
                user.referralCompleted = false;
                
                // Сброс боссов
                user.bossKills = 0;
                user.totalDamage = 0;
                user.personalBoss = { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 };
                
                // Сброс достижений
                user.achievements = {};
                
                // Сброс обучения
                user.training = { currentStep: 1, completed: false };
                
                // Сброс технологических деревьев
                user.techTree = { economy: 0, army: 0, culture: 0 };
                user.techTreeLastUpgrade = { economy: 0, army: 0, culture: 0 };
                
                // Сброс новых ресурсов
                user.iron = 0;
                user.metal = 0;
                user.buildingLevels = {};
                user.soldierDamage = 0;
                
                // (Опционально) сброс активной способности, если есть
                user.lastMiracle = 0;
                user.miracleActive = false;
                user.miracleExpiresAt = 0;
                
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.log(`❌ [RESET_USER] Игрок @${username} не найден`);
            return ctx.reply(`❌ Игрок @${username} не найден`);
        }
        
        writeDB(db);
        console.log(`🔄 [RESET_USER] @${username} (${userId}) сброшен админом ${ctx.from.id}`);
        await ctx.reply(`✅ @${username} сброшен до начального состояния`);
    });
    // ===== /BACKUP (обновлённый) =====
    bot.command('backup', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            console.log(`⛔ [BACKUP] Доступ запрещен для ${ctx.from.id}`);
            return;
        }
        
        console.log(`📦 [BACKUP] Создание бекапа от ${ctx.from.id}`);
        
        try {
            // Читаем обе базы
            const db = readDB();
            const offers = require('../utils/portStorage').readOffers();
            
            // Формируем единый объект бекапа
            const backupData = {
                database: db,
                offers: offers,
                version: '1.6.1',
                createdAt: new Date().toISOString()
            };
            
            const json = JSON.stringify(backupData, null, 2);
            const filename = `backup_${new Date().toISOString().slice(0,10)}.json`;
            
            await ctx.replyWithDocument({
                source: Buffer.from(json, 'utf-8'),
                filename: filename
            });
            
            console.log(`✅ [BACKUP] Бекап отправлен: ${filename} (${json.length} символов)`);
            await ctx.reply(
                `✅ Бекап создан!\n` +
                `📦 Включает: database.json + offers.json\n` +
                `📌 Чтобы восстановить: ответьте на это сообщение командой /restore`
            );
        } catch (err) {
            console.error('❌ [BACKUP] Ошибка:', err.message);
            await ctx.reply('❌ Ошибка при создании бекапа');
        }
    });
    // ===== /RESTORE (обновлённый) =====
    bot.command('restore', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            return ctx.reply('⛔ Доступ запрещен.');
        }

        console.log(`📥 [RESTORE] Начало восстановления от ${ctx.from.id}`);

        const repliedMsg = ctx.message.reply_to_message;
        if (!repliedMsg) {
            return ctx.reply(
                '❌ Ответьте на сообщение с файлом бекапа.\n' +
                'Пример: отправьте /backup, а затем ответьте на его сообщение /restore'
            );
        }

        if (!repliedMsg.document) {
            return ctx.reply('❌ В сообщении, на которое вы ответили, нет файла.');
        }

        const file = repliedMsg.document;
        if (!file.file_name.endsWith('.json')) {
            return ctx.reply('❌ Файл должен быть в формате .json');
        }

        console.log(`📄 [RESTORE] Файл: ${file.file_name} (${file.file_size} байт)`);

        try {
            const fileLink = await ctx.telegram.getFileLink(file.file_id);
            const response = await fetch(fileLink);
            const jsonText = await response.text();

            let backupData;
            try {
                backupData = JSON.parse(jsonText);
            } catch (parseErr) {
                return ctx.reply('❌ Файл поврежден или это невалидный JSON.');
            }

            // Определяем формат бекапа
            let dbData, offersData;
            if (backupData.database && backupData.offers) {
                // Новый формат (1.6.1+)
                dbData = backupData.database;
                offersData = backupData.offers;
                console.log('📌 [RESTORE] Обнаружен новый формат бекапа (database + offers)');
            } else if (backupData.users) {
                // Старый формат (только users)
                dbData = {
                    users: backupData.users,
                    globalBoss: backupData.globalBoss || { hp: 5000, maxHp: 5000, active: false, participants: [] },
                    promocodes: backupData.promocodes || {}
                };
                offersData = { offers: [] };
                console.log('📌 [RESTORE] Обнаружен старый формат бекапа (только users). Порт будет очищен.');
                await ctx.reply('📌 Обнаружен старый формат бекапа. Порт будет очищен.');
            } else {
                return ctx.reply('❌ Неизвестный формат бекапа. Ожидается ключ "users" или "database".');
            }

            const userCount = Object.keys(dbData.users || {}).length;
            const offersCount = offersData.offers ? offersData.offers.length : 0;
            console.log(`👥 [RESTORE] В бекапе ${userCount} пользователей и ${offersCount} лотов`);

            // Резервные копии текущих файлов
            const timestamp = Date.now();
            if (fs.existsSync('database.json')) {
                const backupName = `database_auto_backup_${timestamp}.json`;
                fs.copyFileSync('database.json', backupName);
                console.log(`📀 [RESTORE] Создана копия: ${backupName}`);
            }
            if (fs.existsSync('offers.json')) {
                const backupName = `offers_auto_backup_${timestamp}.json`;
                fs.copyFileSync('offers.json', backupName);
                console.log(`📀 [RESTORE] Создана копия: ${backupName}`);
            }

            // Восстанавливаем
            writeDB(dbData);
            const { writeOffers } = require('../utils/portStorage');
            writeOffers(offersData);

            console.log(`✅ [RESTORE] Базы восстановлены (${userCount} пользователей, ${offersCount} лотов)`);

            await ctx.reply(
                `✅ Базы данных восстановлены из файла ${file.file_name}!\n` +
                `👥 Пользователей: ${userCount}\n` +
                `📦 Лотов в порту: ${offersCount}\n` +
                `📀 Созданы резервные копии: database_auto_backup_${timestamp}.json, offers_auto_backup_${timestamp}.json`
            );

        } catch (error) {
            console.error('❌ [RESTORE] Ошибка:', error.message);
            await ctx.reply(`❌ Ошибка при восстановлении: ${error.message}`);
        }
    });
}