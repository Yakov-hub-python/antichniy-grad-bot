const cron = require('node-cron');
const fs = require('fs');
const { readDB, writeDB } = require('../utils/storage');
const { cleanExpiredOffers } = require('../utils/portStorage');

// ===== ОЧИСТКА ПРОСРОЧЕННЫХ ЛОТОВ =====
function schedulePortCleanup() {
    setInterval(() => {
        try {
            cleanExpiredOffers();
        } catch (err) {
            console.error('❌ Очистка порта:', err.message);
        }
    }, 60 * 1000);
}

// ===== VIP ОЧИСТКА =====
function scheduleVIPCleanup() {
    setInterval(() => {
        try {
            const db = readDB();
            let changed = false;
            for (const id in db.users) {
                const user = db.users[id];
                if (user.vip?.active && user.vip.expiresAt < Date.now()) {
                    user.vip.active = false;
                    changed = true;
                }
            }
            if (changed) {
                writeDB(db);
                console.log('✅ VIP-статусы обновлены');
            }
        } catch (err) {
            console.error('❌ VIP очистка:', err.message);
        }
    }, 60 * 1000);
}

// ===== БЭКАП =====
function scheduleBackup(bot) {
    cron.schedule('0 */6 * * *', () => {
        try {
            const db = readDB();
            const json = JSON.stringify(db, null, 2);
            const filename = `backup_${Date.now()}.json`;
            fs.writeFileSync(filename, json);
            if (bot && process.env.ADMINS) {
                bot.telegram.sendDocument(
                    process.env.ADMINS.split(','),
                    { source: Buffer.from(json, 'utf-8'), filename }
                ).catch(() => {});
            }
        } catch (err) {
            console.error('❌ Бэкап:', err.message);
        }
    }, { timezone: "Europe/Moscow" });
}

// ===== ЗАПУСК ВСЕХ ЗАДАЧ =====
function startCron(bot) {
    console.log('⏰ Запуск cron-задач...');
    schedulePortCleanup();
    scheduleVIPCleanup();
    scheduleBackup(bot);
    console.log('✅ Cron-задачи запущены');
}

module.exports = { startCron };