const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { getSoldiers } = require('../utils/helpers');

// ===== ПРОВЕРКА АДМИНА =====
function isAdmin(userId) {
    const ADMINS = process.env.ADMINS ? process.env.ADMINS.split(',').map(id => id.trim()) : [];
    return ADMINS.includes(userId.toString());
}

module.exports = (bot) => {

    // ===== /START =====
    bot.start(require('./start'));

    // ==== /MENU =====
    bot.command('menu',(ctx) => {
        ctx.reply('🏛️ Главное меню',MAIN_MENU)
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

    // ===== /BARRACKS =====
    bot.command('barracks', async (ctx) => {
        const user = getUser(ctx.from.id);
        const soldiers = getSoldiers(user);
        await ctx.reply(
            `🪖 КАЗАРМЫ\n\n` +
            `🪖 Солдаты: ${soldiers}\n` +
            `🏗️ Казарм: ${user.buildings.barracks}\n` +
            `💰 Цена: 50 золота\n\n` +
            `⚔️ Каждый солдат даёт 5 урона боссам.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🪖 Построить казарму (50💰)', callback_data: 'build_barracks' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    });



    
    // ===== /HELP =====
    bot.command('help', async (ctx) => {
        await ctx.reply(
            `📖 СПИСОК КОМАНД:\n\n` +
            `/start — начать игру\n` +
            `/city — город\n` +
            `/build — строительство\n` +
            `/income — собрать доход\n` +
            `/sell — продать ресурс (sell food 10)\n` +
            `/buy — купить ресурс (buy food 10)\n` +
            `/boss — боссы\n` +
            `/olymp — топ-10\n` +
            `/daily — ежедневный бонус\n` +
            `/referral — реферальная ссылка\n` +
            `/barracks — казармы\n` +
            `/help — помощь\n\n` +
            `🏛️ Удачи, градоначальник!`
        );
    });

    // ===== /SELL =====
    bot.command('sell', async (ctx) => {
        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            return ctx.reply('❌ Используй: /sell food 10');
        }
        const resource = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ Введи положительное число.');
        }
        const user = getUser(ctx.from.id);
        const prices = { food: 1, coins: 2 };
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
        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            return ctx.reply('❌ Используй: /buy food 10');
        }
        const resource = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ Введи положительное число.');
        }
        const user = getUser(ctx.from.id);
        const prices = { food: 2, coins: 4 };
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
    bot.command('shop', require('../hears/shop').show);

    // ===== /PROFILE =====
    bot.command('profile', async (ctx) => {
        const user = getUser(ctx.from.id);
        await ctx.reply(
            `🪪 ПРОФИЛЬ\n\n` +
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
    // ===== /ADMIN =====
    bot.command('admin', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Доступ запрещён.');
        await ctx.reply(
            `👑 АДМИН-ПАНЕЛЬ\n\n` +
            `📌 Команды:\n` +
            `/stats — статистика бота\n` +
            `/give_gold @user 100\n` +
            `/give_vip @user 7\n` +
            `/say текст\n` +
            `/list_users\n` +
            `/delete_user @user\n` +
            `/reset_user @user\n` +
            `/backup — скачать бекап БД`,
            MAIN_MENU
        );
    });
    // ===== /STATS — СТАТИСТИКА БОТА =====
    bot.command('stats', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Доступ запрещён.');
        
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
            `🪖 Всего солдат: ${totalSoldiers}\n` +
            `🏗️ Активных игроков: ???`
        );
    });
    // ===== /GIVE_GOLD =====
    bot.command('give_gold', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const args = ctx.message.text.split(' ');
        if (args.length < 3) return ctx.reply('❌ /give_gold @user 100');
        const username = args[1].replace('@', '');
        const amount = parseInt(args[2]);
        const db = readDB();
        let found = false;
        for (const id in db.users) {
            if (db.users[id].username === username) {
                db.users[id].gold += amount;
                found = true;
                break;
            }
        }
        if (!found) return ctx.reply('❌ Игрок не найден');
        writeDB(db);
        await ctx.reply(`✅ ${username} получил ${amount} золота`);
    });

    // ===== /GIVE_VIP =====
    bot.command('give_vip', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const args = ctx.message.text.split(' ');
        if (args.length < 3) return ctx.reply('❌ /give_vip @user 7');
        const username = args[1].replace('@', '');
        const days = parseInt(args[2]);
        const db = readDB();
        let found = false;
        for (const id in db.users) {
            if (db.users[id].username === username) {
                db.users[id].vip = { active: true, expiresAt: Date.now() + days * 24 * 60 * 60 * 1000 };
                found = true;
                break;
            }
        }
        if (!found) return ctx.reply('❌ Игрок не найден');
        writeDB(db);
        await ctx.reply(`✅ ${username} получил VIP на ${days} дней`);
    });

    // ===== /SAY =====
    bot.command('say', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const text = ctx.message.text.replace('/say ', '');
        const db = readDB();
        let count = 0;
        for (const id in db.users) {
            try {
                await ctx.telegram.sendMessage(id, `📢 ${text}`);
                count++;
            } catch (err) {}
        }
        await ctx.reply(`✅ Рассылка отправлена ${count} игрокам`);
    });

    // ===== /LIST_USERS =====
    bot.command('list_users', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const db = readDB();
        const users = Object.values(db.users);
        if (users.length === 0) return ctx.reply('📭 Нет игроков');
        let text = `👥 ВСЕ ИГРОКИ (${users.length}):\n\n`;
        users.forEach(u => {
            text += `🆔 ${u.id} | @${u.username || 'unknown'} | 💰 ${u.gold} | 🏗️ ${u.level}\n`;
        });
        await ctx.reply(text.slice(0, 4000));
    });

    // ===== /DELETE_USER =====
    bot.command('delete_user', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const args = ctx.message.text.split(' ');
        if (args.length < 2) return ctx.reply('❌ /delete_user @user');
        const username = args[1].replace('@', '');
        const db = readDB();
        let found = false;
        for (const id in db.users) {
            if (db.users[id].username === username) {
                delete db.users[id];
                found = true;
                break;
            }
        }
        if (!found) return ctx.reply('❌ Игрок не найден');
        writeDB(db);
        await ctx.reply(`✅ ${username} удалён`);
    });

    // ===== /RESET_USER =====
    bot.command('reset_user', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const args = ctx.message.text.split(' ');
        if (args.length < 2) return ctx.reply('❌ /reset_user @user');
        const username = args[1].replace('@', '');
        const db = readDB();
        let found = false;
        for (const id in db.users) {
            if (db.users[id].username === username) {
                db.users[id].gold = 200;
                db.users[id].food = 0;
                db.users[id].coins = 0;
                db.users[id].citizens = 5;
                db.users[id].level = 1;
                db.users[id].buildings = { hut: 0, farm: 0, mine: 0, mint: 0, market: 0, barracks: 0 };
                db.users[id].lastIncome = Date.now();
                db.users[id].lastDaily = null;
                db.users[id].vip = { active: false, expiresAt: 0 };
                db.users[id].referrals = [];
                db.users[id].referredBy = null;
                db.users[id].referralCompleted = false;
                db.users[id].bossKills = 0;
                db.users[id].totalDamage = 0;
                db.users[id].personalBoss = { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 };
                found = true;
                break;
            }
        }
        if (!found) return ctx.reply('❌ Игрок не найден');
        writeDB(db);
        await ctx.reply(`✅ ${username} сброшен до начального состояния`);
    });

    // ===== /BACKUP =====
    bot.command('backup', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        try {
            const db = readDB();
            const json = JSON.stringify(db, null, 2);
            await ctx.replyWithDocument({
                source: Buffer.from(json, 'utf-8'),
                filename: `backup_${new Date().toISOString().slice(0,10)}.json`
            });
            await ctx.reply(`✅ Бекап создан!`);
        } catch (err) {
            console.error('❌ Ошибка бекапа:', err.message);
            await ctx.reply('❌ Ошибка при создании бекапа');
        }
    });

};