const cron = require('node-cron');
const fs = require('fs');
const { readDB, writeDB } = require('../utils/storage');

// ===== ГЛОБАЛЬНЫЙ БОСС =====
function scheduleGlobalBoss() {
    cron.schedule('0 0,6,12,18 * * *', () => {
        try {
            const db = readDB();
            if (db.globalBoss?.active) {
                console.log('⚠️ Босс уже активен');
                return;
            }
            const userCount = Object.keys(db.users || {}).length;
            const hp = 1000 * Math.floor(userCount / 2) || 5000;
            db.globalBoss = {
                hp,
                maxHp: hp,
                active: true,
                participants: []
            };
            writeDB(db);
            console.log(`🌍 Глобальный босс создан! HP: ${hp}`);
        } catch (err) {
            console.error('❌ Ошибка создания босса:', err.message);
        }
    }, { timezone: "Europe/Moscow" });
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
    scheduleGlobalBoss();
    scheduleVIPCleanup();
    scheduleBackup(bot);
    console.log('✅ Cron-задачи запущены');
}

module.exports = { startCron };