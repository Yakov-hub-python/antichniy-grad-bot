const { Telegraf } = require('telegraf');
const http = require('http');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не найден в .env');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ===== ПОДКЛЮЧЕНИЕ ВСЕХ ОБРАБОТЧИКОВ =====
const commands = require('./handlers/commands');
const hears = require('./handlers/hears');
const callbacks = require('./handlers/callback');

// ===== РЕГИСТРАЦИЯ =====
commands(bot);
hears(bot);
callbacks(bot);

bot.catch((err, ctx) => {
    if (err.response?.error_code === 429) {
        // Просто логируем, но не даём боту упасть
        console.warn(`⏳ Лимит запросов (${err.response.parameters?.retry_after || 5}с) — игнорируем`);
        return; // Тишина — бот не падает
    }
    console.error('❌ Другая ошибка:', err);
});
// ===== ГЛОБАЛЬНЫЙ БОСС И CRON =====
const { readDB, writeDB } = require('./utils/storage');
cron.schedule('0 0,6,12,18 * * *', () => {
    const db = readDB();
    const userCount = Object.keys(db.users).length;
    const hp = 1000 * Math.floor(userCount / 2) || 5000;
    db.globalBoss = { hp, maxHp: hp, active: true, participants: [] };
    writeDB(db);
    console.log(`🌍 Глобальный босс появился! HP: ${hp}`);
}, { timezone: "Europe/Moscow" });

setInterval(() => {
    const db = readDB();
    for (const id in db.users) {
        const user = db.users[id];
        if (user.vip?.active && user.vip.expiresAt < Date.now()) {
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
server.listen(PORT, () => console.log(`✅ HTTP-сервер запущен на порту ${PORT}`));

// ===== ЗАПУСК =====
bot.launch()
    .catch(err => console.error('❌ Ошибка:', err));

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});