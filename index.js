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

// ===== ПОДКЛЮЧЕНИЕ ОБРАБОТЧИКОВ =====
const commands = require('./handlers/commands');
const hears = require('./handlers/hears');
const callbacks = require('./handlers/callback');
const { readDB, writeDB } = require('./utils/storage');
const promoHandler = require('./handlers/promo');

promoHandler(bot);
commands(bot);
hears(bot);
callbacks(bot);

// ===== ПРОСТОЙ ЛОГГЕР ТОЛЬКО ДЛЯ ВАЖНОГО =====
function log(type, message) {
    const time = new Date().toLocaleString('ru-RU');
    console.log(`[${time}] [${type}] ${message}`);
}

log('START', '🚀 Бот запущен');


// ===== ГЛОБАЛЬНЫЙ БОСС =====
cron.schedule('0 0,6,12,18 * * *', () => {
    try {
        const db = readDB();
        const userCount = Object.keys(db.users || {}).length;
        
        if (db.globalBoss?.active) {
            log('BOSS', `⚠️ Босс уже активен (HP: ${db.globalBoss.hp}/${db.globalBoss.maxHp})`);
            return;
        }
        
        const hp = 1000 * Math.floor(userCount / 2) || 5000;
        db.globalBoss = { hp, maxHp: hp, active: true, participants: [] };
        writeDB(db);
        
        log('BOSS', `🌍 Босс создан! HP: ${hp}, пользователей: ${userCount}`);
    } catch (err) {
        log('ERROR', `❌ Ошибка: ${err.message}`);
    }
}, { timezone: "Europe/Moscow" });

// ===== VIP ОЧИСТКА =====
setInterval(() => {
    try {
        const db = readDB();
        let changed = false;
        
        for (const id in db.users) {
            if (db.users[id].vip?.active && db.users[id].vip.expiresAt < Date.now()) {
                db.users[id].vip.active = false;
                changed = true;
            }
        }
        
        if (changed) {
            writeDB(db);
            log('VIP', '✅ Обновлены VIP-статусы');
        }
    } catch (err) {
        log('ERROR', `❌ VIP ошибка: ${err.message}`);
    }
}, 60 * 1000);

cron.schedule('0 */6 * * *', () => {
    if (!process.env.ADMINS) {
        log('BACKUP', '⚠️ ADMINS не указан');
        return;
    }

    try {
        const db = readDB();
        const json = JSON.stringify(db, null, 2);
        
        // Имя файла с московским временем
        const mskTime = new Date().toLocaleString('ru-RU', { 
            timeZone: 'Europe/Moscow' 
        }).replace(/[:\s]/g, '_');
        const filename = `backup_${mskTime}.json`;
        
        bot.telegram.sendDocument(
            process.env.ADMINS.split(','),
            { 
                source: Buffer.from(json, 'utf-8'), 
                filename: filename 
            },
            { 
                caption: `📦 Бэкап | ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} | ${(json.length/1024).toFixed(1)}KB` 
            }
        ).then(() => {
            log('BACKUP', `✅ Бэкап отправлен (${(json.length/1024).toFixed(1)}KB)`);
        }).catch(err => {
            log('ERROR', `❌ Ошибка отправки: ${err.message}`);
        });
    } catch (err) {
        log('ERROR', `❌ Ошибка бэкапа: ${err.message}`);
    }
}, { timezone: "Europe/Moscow" });

// Логирование запуска
console.log('🔄 Бэкап будет выполняться в 00:00, 06:00, 12:00, 18:00 по МСК');

// ===== СТАТИСТИКА (2 РАЗА В ДЕНЬ) =====
cron.schedule('0 12,0 * * *', () => {
    try {
        const db = readDB();
        const users = Object.keys(db.users || {}).length;
        const vip = Object.values(db.users || {}).filter(u => u.vip?.active).length;
        const boss = db.globalBoss?.active ? `✅ ${db.globalBoss.hp}/${db.globalBoss.maxHp}` : '❌';
        
        log('STATS', `👥 ${users} | 👑 ${vip} | 🌍 Босс: ${boss}`);
    } catch (err) {
        // Игнорируем
    }
}, { timezone: "Europe/Moscow" });

// ===== ОШИБКИ TELEGRAF =====
bot.catch((err, ctx) => {
    if (err.response?.error_code === 429) {
        console.warn(`⏳ Лимит запросов`);
        return;
    }
    log('ERROR', `❌ ${err.message}`);
});

// ===== HTTP СЕРВЕР =====
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Бот работает! 🏛️');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    log('HTTP', `✅ Сервер на порту ${PORT}`);
});

// ===== ЗАПУСК =====
bot.launch()
    .then(() => {
        log('START', '✅ Бот готов!');
        console.log('='.repeat(40));
    })
    .catch(err => {
        console.error('❌ Ошибка:', err.message);
        process.exit(1);
    });

// ===== ЗАВЕРШЕНИЕ =====
process.once('SIGINT', () => {
    log('STOP', '🛑 Остановка');
    bot.stop('SIGINT');
    server.close();
});

process.once('SIGTERM', () => {
    log('STOP', '🛑 Остановка');
    bot.stop('SIGTERM');
    server.close();
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});