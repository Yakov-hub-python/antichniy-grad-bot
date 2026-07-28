const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const fs = require('fs');
const http = require('http');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMINS = process.env.ADMINS ? process.env.ADMINS.split(',').map(id => id.trim()) : [];

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не найден в .env');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ===== ПОДКЛЮЧЕНИЕ МОДУЛЕЙ =====
const { readDB, writeDB, getUser, saveUser } = require('./utils/storage');
const { MAIN_MENU } = require('./config/constants');
const { isVIP, getIncomeInterval, getSoldiers, calculateIncome, getPersonalBossHP } = require('./utils/helpers');

// ===== ОБРАБОТЧИКИ =====
const startHandler = require('./handlers/start');
const city = require('./hears/city');
const build = require('./hears/build');
const income = require('./hears/income');
const referral = require('./hears/referral');
const daily = require('./hears/daily');
const shop = require('./hears/shop');
const boss = require('./hears/boss');
const olymp = require('./hears/olymp');

const buildActions = require('./actions/buildActions');
const bossActions = require('./actions/bossActions');
const referralActions = require('./actions/referralActions');

// ===== КОМАНДЫ =====
bot.start(startHandler);

// ===== КНОПКИ =====
bot.hears('ℹ️ О боте', async (ctx) => {
    await ctx.reply(
        `🏛️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n` +
        `Версия: MVP 1.0\n` +
        `Разработчик: @${ctx.botInfo.username}\n\n` +
        `📖 Экономическая стратегия в Telegram.\n` +
        `Строй город, добывай ресурсы, сражайся с боссами и приводи друзей!`,
        MAIN_MENU
    );
});

bot.hears('🏙️ Город', city.show);
bot.hears('👥 Пригласить друга', referral.show);
bot.hears('🎁 Ежедневный бонус', daily.get);
bot.hears('🛒 Магазин', shop.show);
bot.hears('⚔️ Босс', boss.show);
bot.hears('🏆 Олимп', olymp.show);
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

// ===== CALLBACK =====
bot.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`🏛️ Главное меню`, MAIN_MENU);
});

bot.action('back_to_city', city.show);

bot.action('build_menu', build.showMenu);
bot.action(/^build_(.+)/, buildActions.build);
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

bot.action('collect_income', income.collect);
bot.action('copy_ref', referralActions.copy);

bot.action('boss_personal', bossActions.attackPersonal);
bot.action('boss_global', bossActions.attackGlobal);

// ===== АДМИН-КОМАНДЫ =====
function isAdmin(userId) {
    return ADMINS.includes(userId.toString());
}

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
        MAIN_MENU
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

// ===== ГЛОБАЛЬНЫЙ БОСС (РАСПИСАНИЕ) =====
cron.schedule('0 0,6,12,18 * * *', () => {
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
}, {
    timezone: "Europe/Moscow"
});

// ===== АВТООБНОВЛЕНИЕ VIP =====
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

// ===== HTTP-СЕРВЕР ДЛЯ RENDER =====
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Бот "Античный Градоначальник" работает! 🏛️');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`✅ HTTP-сервер запущен на порту ${PORT}`);
});

// ===== ЗАПУСК =====
bot.launch()
    .then(() => console.log('🚀 Бот "Античный Градоначальник" запущен!'))
    .catch(err => console.error('❌ Ошибка:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));