const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();
const {readDB,writeDB,getUser,saveUser} = require('./utils/storage.js')

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMINS = process.env.ADMINS ? process.env.ADMINS.split(',').map(id => id.trim()) : [];

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не найден в .env');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

function isAdmin(userId) {
    return ADMINS.includes(userId.toString());
}

// ============================================================
// 2. КОНСТАНТЫ
// ============================================================

const CONFIG = {
    BUILDING_COSTS: {
        hut: 20,
        farm: 10,
        mine: 30,
        mint: 70,
        market: 200,
        barracks: 50
    },
    BUILDING_NAMES: {
        hut: '🏠 Хижина',
        farm: '🌾 Ферма',
        mine: '⛏️ Шахта',
        mint: '🪙 Монетный двор',
        market: '🏪 Рынок',
        barracks: '🪖 Казарма'
    },
    INCOME_INTERVALS: {
        regular: 5 * 60 * 1000, // 5 минут
        vip: 3 * 60 * 1000      // 3 минуты
    },
    MAIN_MENU: {
        reply_markup: {
            keyboard: [
                ['ℹ️ О боте'],
                ['🏙️ Город', '👥 Пригласить друга'],
                ['🎁 Ежедневный бонус'],
                ['🛒 Магазин', '⚔️ Босс'],
                ['🏆 Олимп', '🪖 Казармы']
            ],
            resize_keyboard: true
        }
    }
};

// ============================================================
// 3. ХЕЛПЕРЫ
// ============================================================

function isVIP(user) {
    return user.vip && user.vip.active && user.vip.expiresAt > Date.now();
}

function getIncomeInterval(user) {
    return isVIP(user) ? CONFIG.INCOME_INTERVALS.vip : CONFIG.INCOME_INTERVALS.regular;
}

function getSoldiers(user) {
    return user.buildings.barracks * 2 + Math.floor(user.citizens / 10);
}

function getPersonalBossHP(user) {
    return 5000 + (user.level - 1) * 1000;
}

function calculateIncome(user) {
    const buildings = user.buildings;
    const citizens = user.citizens || 5;
    const neededWorkers = buildings.mine * 2 + buildings.mint * 1;
    const workers = Math.min(citizens, neededWorkers);
    if (workers === 0) return { gold: 0, food: 0, coins: 0 };

    let gold = buildings.mine * 2;
    let coins = buildings.mint * 1;
    let food = buildings.farm * 2;

    const efficiency = workers / neededWorkers;
    gold = Math.floor(gold * efficiency);
    coins = Math.floor(coins * efficiency);
    food = Math.floor(food * efficiency);

    const multiplier = isVIP(user) ? 2 : 1;
    gold *= multiplier;
    coins *= multiplier;
    food *= multiplier;

    if (user.food < citizens) {
        gold = Math.floor(gold * 0.8);
        coins = Math.floor(coins * 0.8);
        food = Math.floor(food * 0.8);
    }
    return { gold, food, coins };
}

// ============================================================
// 4. ПОКАЗ ГОРОДА
// ============================================================

async function showCity(ctx) {
    const user = getUser(ctx.from.id);
    const income = calculateIncome(user);
    const soldiers = getSoldiers(user);
    const vipStatus = isVIP(user) ? '✅ Активен' : '❌ Не активен';
    const foodStatus = user.food >= user.citizens ? '✅ Сыты' : '❌ Голодают (-20%)';

    await ctx.reply(
        `🏙️ ТВОЙ ГОРОД\n\n` +
        `💰 Золото: ${user.gold}\n` +
        `🪙 Монеты: ${user.coins || 0}\n` +
        `👥 Жители: ${user.citizens}\n` +
        `🍖 Еда: ${user.food} (${foodStatus})\n` +
        `🪖 Солдаты: ${soldiers}\n` +
        `🏗️ Уровень: ${user.level}\n` +
        `👑 VIP: ${vipStatus}\n\n` +
        `📊 Доход за сбор:\n` +
        `💰 +${income.gold} золота\n` +
        `🍖 +${income.food} еды\n` +
        `🪙 +${income.coins} монет`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏗️ Строить', callback_data: 'build_menu' }],
                    [{ text: '💰 Собрать доход', callback_data: 'collect_income' }],
                    [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                ]
            }
        }
    );
}

// ============================================================
// 5. КОМАНДА /start
// ============================================================

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    let user = getUser(userId);
    user.username = ctx.from.username || ctx.from.first_name || 'unknown';
    saveUser(userId, user);

    if (text.includes('ref_')) {
        const refId = text.split('_')[1];
        if (refId == userId) return await ctx.reply('❌ Нельзя пригласить самого себя!');

        const db = readDB();
        const newUser = db.users[userId];
        if (newUser.referredBy) return await ctx.reply('❌ Ты уже был приглашён!');

        newUser.referredBy = refId;
        newUser.gold += 200;
        newUser.vip = { active: true, expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 };

        if (!db.users[refId].referrals) db.users[refId].referrals = [];
        db.users[refId].referrals.push(userId);
        db.users[refId].gold += 200;
        db.users[refId].vip = { active: true, expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 };

        writeDB(db);
        await ctx.reply(`🎉 Ты пришёл по ссылке друга! +200💰 и VIP 3 дня!`);
        try {
            await ctx.telegram.sendMessage(refId, `👤 Твой друг @${user.username} пришёл! +200💰 и VIP 3 дня!`);
        } catch (err) {}
    }

    const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
    user.level = totalBuildings + 1;
    saveUser(userId, user);

    await ctx.reply(
        `🏛️ ДОБРО ПОЖАЛОВАТЬ,${isAdmin(ctx.from.id)? "РАЗРАБОТЧИК":"ГРАДОГАЧАЛЬНИК"}` +
        `💰 Золото: ${user.gold}\n` +
        `🏗️ Уровень города: ${user.level}\n` +
        `👥 Друзей: ${user.referrals ? user.referrals.length : 0}\n\n` +
        `Строй, воюй и приводи друзей!`,
        CONFIG.MAIN_MENU
    );
});

// ============================================================
// 6. КНОПКИ (HEARS)
// ============================================================

bot.hears('ℹ️ О боте', async (ctx) => {
    await ctx.reply(
        `🏛️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n` +
        `Версия: MVP 1.0\n` +
        `Разработчик: @${ctx.botInfo.username}\n\n` +
        `📖 Экономическая стратегия в Telegram.\n` +
        `Строй город, добывай ресурсы, сражайся с боссами и приводи друзей!`,
        CONFIG.MAIN_MENU
    );
});

bot.hears('🏙️ Город', showCity);

bot.hears('👥 Пригласить друга', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const botName = process.env.BOT_USERNAME || 'antichniy_grad_bot';
    const refLink = `https://t.me/${botName}?start=ref_${userId}`;
    const refCount = user.referrals ? user.referrals.length : 0;
    const vipDays = refCount >= 3 ? 7 : 3;

    await ctx.reply(
        `👥 ПРИГЛАСИ ДРУГА!\n\n` +
        `📎 Твоя ссылка:\n${refLink}\n\n` +
        `🔥 За каждого друга ты получаешь 200💰 и VIP 3 дня!\n` +
        `👑 Когда друг достигнет 5 уровня:\n` +
        `   • ${vipDays} дней VIP тебе и другу\n` +
        `   • ${refCount >= 3 ? '✅ 3+ друзей → 7 дней VIP!' : `Осталось ${3 - refCount} друга до 7 дней VIP`}\n\n` +
        `👥 Друзей: ${refCount}`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📋 Скопировать ссылку', callback_data: 'copy_ref' }],
                    [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                ]
            }
        }
    );
});

bot.hears('🎁 Ежедневный бонус', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const today = new Date().toISOString().split('T')[0];

    if (user.lastDaily === today) {
        return ctx.reply('❌ Ты уже получал бонус сегодня! Завтра приходи.');
    }

    const bonus = isVIP(user) ? 50 : 25;
    user.gold += bonus;
    user.lastDaily = today;
    saveUser(userId, user);

    await ctx.reply(`🎁 ЕЖЕДНЕВНЫЙ БОНУС!\n💰 +${bonus} золота!\n💰 Баланс: ${user.gold}`);
});

bot.hears('🛒 Магазин', async (ctx) => {
    await ctx.reply(
        `🛒 МАГАЗИН (Telegram Stars)\n\n` +
        `👑 VIP 1 день — 10⭐\n` +
        `👑 VIP 7 дней — 50⭐\n` +
        `👑 VIP 30 дней — 200⭐\n` +
        `💰 100 золота — 5⭐\n` +
        `💰 500 золота — 20⭐\n\n` +
        `💡 Покупки через Stars — в разработке.`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                ]
            }
        }
    );
});

bot.hears('⚔️ Босс', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const db = readDB();

    const personal = user.personalBoss || { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 };
    const maxHp = getPersonalBossHP(user);
    personal.maxHp = maxHp;
    if (personal.hp > maxHp) personal.hp = maxHp;

    const personalStatus = personal.respawnAt > Date.now()
        ? `⏳ Переродится через ${Math.floor((personal.respawnAt - Date.now()) / 60000)}м`
        : `✅ Готов! HP: ${personal.hp}/${personal.maxHp}`;

    const global = db.globalBoss || { hp: 5000, maxHp: 5000, active: true };
    const userCount = Object.keys(db.users).length;
    global.maxHp = 1000 * Math.floor(userCount / 2) || 5000;

    const globalStatus = global.active
        ? `🔥 Активен! HP: ${global.hp}/${global.maxHp}`
        : `💤 Повержен. Следующий в 12:00 или 18:00`;

    await ctx.reply(
        `⚔️ БОССЫ\n\n` +
        `👤 ЛИЧНЫЙ БОСС:\nHP: ${personal.hp}/${personal.maxHp}\n${personalStatus}\n🏆 Убийств: ${personal.kills || 0}\n\n` +
        `🌍 ГЛОБАЛЬНЫЙ БОСС:\n${globalStatus}`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚔️ Атаковать личного', callback_data: 'boss_personal' }],
                    [{ text: '⚔️ Атаковать глобального', callback_data: 'boss_global' }],
                    [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                ]
            }
        }
    );
});

bot.hears('🪖 Казармы', async (ctx) => {
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

bot.hears('🏆 Олимп', async (ctx) => {
    const db = readDB();
    const sorted = Object.values(db.users)
        .sort((a, b) => b.gold - a.gold)
        .slice(0, 10);

    if (sorted.length === 0) {
        return ctx.reply('🏆 Пока нет игроков на Олимпе. Стань первым!');
    }

    let text = '🏆 ТОП-10 ГРАДОНАЧАЛЬНИКОВ:\n\n';
    sorted.forEach((user, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        text += `${medal} @${user.username || 'unknown'} — 💰${user.gold}\n`;
    });

    await ctx.reply(text, CONFIG.MAIN_MENU);
});

// ============================================================
// 7. КОЛБЭКИ (CALLBACK)
// ============================================================

bot.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`🏛️ Главное меню`, CONFIG.MAIN_MENU);
});

bot.action('back_to_city', showCity);

bot.action('build_menu', async (ctx) => {
    const user = getUser(ctx.from.id);
    let menu = `🏗️ СТРОИТЕЛЬСТВО\n💰 Золото: ${user.gold}\n\n`;
    for (const [key, cost] of Object.entries(CONFIG.BUILDING_COSTS)) {
        menu += `${CONFIG.BUILDING_NAMES[key]} — ${cost}💰\n`;
    }
    const buttons = Object.keys(CONFIG.BUILDING_COSTS).map(key => [
        { text: `${CONFIG.BUILDING_NAMES[key]} (${CONFIG.BUILDING_COSTS[key]}💰)`, callback_data: `build_${key}` }
    ]);
    buttons.push([{ text: '🔙 Назад', callback_data: 'back_to_city' }]);

    await ctx.reply(menu, { reply_markup: { inline_keyboard: buttons } });
});

bot.action(/^build_(.+)/, async (ctx) => {
    const userId = ctx.from.id;
    const type = ctx.match[1];
    const user = getUser(userId);
    const cost = CONFIG.BUILDING_COSTS[type];

    if (user.gold < cost) {
        return ctx.reply(`❌ Не хватает золота! Нужно ${cost}, у тебя ${user.gold}`);
    }

    user.gold -= cost;
    user.buildings[type] += 1;
    if (type === 'hut') user.citizens += 3;

    const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
    user.level = totalBuildings + 1;

    if (user.level >= 5 && user.referredBy && !user.referralCompleted) {
        user.referralCompleted = true;
        const db = readDB();
        const refUser = db.users[user.referredBy];
        const vipDays = refUser.referrals.length >= 3 ? 7 : 3;
        user.vip = { active: true, expiresAt: Date.now() + vipDays * 24 * 60 * 60 * 1000 };
        refUser.vip = { active: true, expiresAt: Date.now() + vipDays * 24 * 60 * 60 * 1000 };
        writeDB(db);
        await ctx.reply(`🎉 Ты достиг 5 уровня! Вы с другом получили VIP на ${vipDays} дней!`);
        try {
            await ctx.telegram.sendMessage(user.referredBy, `🎉 Твой друг @${user.username} достиг 5 уровня! Вы получили VIP на ${vipDays} дней!`);
        } catch (err) {}
    }

    saveUser(userId, user);
    await ctx.reply(`✅ ${CONFIG.BUILDING_NAMES[type]} построена! Уровень города: ${user.level}`);
    await showCity(ctx);
});

bot.action('collect_income', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const now = Date.now();
    const interval = getIncomeInterval(user);
    const elapsed = now - user.lastIncome;

    if (elapsed < interval) {
        const left = Math.floor((interval - elapsed) / 60000);
        return ctx.reply(`⏳ Доход через ${left} минут`);
    }

    const income = calculateIncome(user);
    if (income.gold === 0 && income.food === 0 && income.coins === 0) {
        return ctx.reply('🏗️ Нет зданий — нет дохода. Построй шахты, фермы или монетный двор!');
    }

    user.gold += income.gold;
    user.food += income.food;
    user.coins = (user.coins || 0) + income.coins;
    user.lastIncome = now;
    saveUser(userId, user);

    await ctx.reply(
        `💰 СОБРАН ДОХОД!\n` +
        `💰 +${income.gold} золота\n` +
        `🍖 +${income.food} еды\n` +
        `🪙 +${income.coins} монет\n` +
        `${isVIP(user) ? '👑 VIP ×2!' : ''}`
    );
});

bot.action('copy_ref', async (ctx) => {
    const userId = ctx.from.id;
    const botName = process.env.BOT_USERNAME || 'antichniy_grad_bot';
    const refLink = `https://t.me/${botName}?start=ref_${userId}`;
    await ctx.answerCbQuery('📋 Ссылка скопирована!');
    await ctx.reply(`📋 Твоя ссылка:\n${refLink}`);
});

bot.action('boss_personal', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const personal = user.personalBoss || { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 };

    if (personal.respawnAt > Date.now()) {
        const left = Math.floor((personal.respawnAt - Date.now()) / 60000);
        return ctx.reply(`⏳ Личный босс перерождается через ${left} минут`);
    }

    const soldiers = getSoldiers(user);
    const damage = soldiers * 3;
    personal.hp -= damage;

    if (personal.hp <= 0) {
        personal.hp = getPersonalBossHP(user);
        personal.respawnAt = Date.now() + 6 * 60 * 60 * 1000;
        personal.kills = (personal.kills || 0) + 1;
        user.gold += 100;
        user.bossKills = (user.bossKills || 0) + 1;

        if (Math.random() < 0.1) {
            user.vip = { active: true, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
            await ctx.reply(`🎉 Ты получил VIP на 1 день за убийство личного босса!`);
        }

        user.personalBoss = personal;
        saveUser(userId, user);
        await ctx.reply(`⚔️ ЛИЧНЫЙ БОСС ПОВЕРЖЕН!\n💰 +100 золота!\n⏳ Следующий через 6 часов.`);
    } else {
        user.personalBoss = personal;
        saveUser(userId, user);
        await ctx.reply(`⚔️ Урон: ${damage}. Осталось HP: ${personal.hp}/${getPersonalBossHP(user)}`);
    }
});

bot.action('boss_global', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const db = readDB();
    const global = db.globalBoss || { hp: 5000, maxHp: 5000, active: true, participants: [] };

    if (!global.active) {
        return ctx.reply('💤 Глобальный босс повержен. Следующий в 12:00 или 18:00.');
    }

    const soldiers = getSoldiers(user);
    const damage = soldiers * 3;
    global.hp -= damage;

    if (!global.participants) global.participants = [];
    const existing = global.participants.find(p => p.id === userId);
    if (existing) {
        existing.damage += damage;
    } else {
        global.participants.push({ id: userId, damage: damage });
    }

    if (global.hp <= 0) {
        global.active = false;
        const sorted = global.participants.sort((a, b) => b.damage - a.damage);
        const top = sorted.slice(0, 3);

        for (let i = 0; i < top.length; i++) {
            const player = getUser(top[i].id);
            if (i === 0) {
                player.vip = { active: true, expiresAt: Date.now() + 15 * 24 * 60 * 60 * 1000 };
                await ctx.telegram.sendMessage(top[i].id, '🏆 Ты занял 1 место! Получил VIP на 15 дней!');
            } else {
                player.gold += 50;
                await ctx.telegram.sendMessage(top[i].id, `🥈 ${i+1} место! +50 золота!`);
            }
            saveUser(top[i].id, player);
        }

        const share = Math.floor(5000 / (global.participants.length || 1));
        for (const p of global.participants) {
            const player = getUser(p.id);
            player.gold += share;
            saveUser(p.id, player);
        }

        const userCount = Object.keys(db.users).length;
        global.hp = 1000 * Math.floor(userCount / 2) || 5000;
        global.maxHp = global.hp;
        global.participants = [];
        db.globalBoss = global;
        writeDB(db);
        await ctx.reply(`🌍 ГЛОБАЛЬНЫЙ БОСС ПОВЕРЖЕН!\n💰 Все участники получили +${share} золота!`);
    } else {
        db.globalBoss = global;
        writeDB(db);
        await ctx.reply(`⚔️ Урон: ${damage}. Осталось HP: ${global.hp}/${global.maxHp}`);
    }
});

bot.action('build_barracks', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    if (user.gold < 50) return ctx.reply('❌ Нужно 50 золота!');
    user.gold -= 50;
    user.buildings.barracks += 1;
    const total = Object.values(user.buildings).reduce((a, b) => a + b, 0);
    user.level = total + 1;
    saveUser(userId, user);
    await ctx.reply(`🪖 Казарма построена! Солдат: ${getSoldiers(user)}`);
});

// ============================================================
// 8. АДМИН-КОМАНДЫ
// ============================================================

bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Доступ запрещён.');
    await ctx.reply(
        `👑 АДМИН-ПАНЕЛЬ\n\n` +
        `📌 Команды:\n` +
        `/give_gold @user 100\n` +
        `/give_vip @user 7\n` +
        `/say текст\n` +
        `/list_users\n` +
        `/delete_user @user\n` +
        `/reset_user @user`,
        CONFIG.MAIN_MENU
    );
});

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

// ============================================================
// 9. ГЛОБАЛЬНЫЙ БОСС (РАСПИСАНИЕ)
// ============================================================

cron.schedule('0 12,18 * * *', () => {
    const db = readDB();
    const userCount = Object.keys(db.users).length;
    const hp = 1000 * Math.floor(userCount / 2) || 5000;
    db.globalBoss = {
        hp: hp,
        maxHp: hp,
        active: true,
        participants: []
    };
    writeDB(db);
    console.log(`🌍 Глобальный босс появился! HP: ${hp}`);
});

// ============================================================
// 10. АВТООБНОВЛЕНИЕ VIP
// ============================================================

setInterval(() => {
    const db = readDB();
    for (const id in db.users) {
        const user = db.users[id];
        if (user.vip && user.vip.active && user.vip.expiresAt < Date.now()) {
            user.vip.active = false;
        }
    }
    writeDB(db);
}, 60 * 1000);

// ============================================================
// 11. HTTP-СЕРВЕР ДЛЯ RENDER
// ============================================================

const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Бот "Античный Градоначальник" работает! 🏛️');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`✅ HTTP-сервер запущен на порту ${PORT}`);
});

// ============================================================
// 12. ЗАПУСК
// ============================================================

bot.launch()
    .then(() => console.log('🚀 Бот "Античный Градоначальник" запущен!'))
    .catch(err => console.error('❌ Ошибка:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));