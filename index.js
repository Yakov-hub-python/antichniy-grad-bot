const { Telegraf } = require('telegraf');
const http = require('http');
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
const promoHandler = require('./handlers/promo');
const { handleAdvancedCommand } = require('./hears/advanced');
const { startCron } = require('./handlers/cron');
const { startQuiz, handleQuizAnswer } = require('./handlers/quiz');

promoHandler(bot);
commands(bot);
bot.command('question', startQuiz);
hears(bot);
callbacks(bot);


function log(type, message) {
    const time = new Date().toLocaleString('ru-RU');
    console.log(`[${time}] [${type}] ${message}`);
}

log('START', '🚀 Бот запущен');

// ===== ОБРАБОТЧИК ТЕКСТА =====
bot.on('text', async (ctx) => {
    const answer = ctx.message.text.trim();
    if (/^[123]$/.test(answer)) {
        await handleQuizAnswer(ctx);
    }
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    await handleAdvancedCommand(ctx);
});


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


bot.launch()
    .then(() => {
        log('START', '✅ Бот готов!');
        console.log('='.repeat(40));
        startCron(bot); 
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