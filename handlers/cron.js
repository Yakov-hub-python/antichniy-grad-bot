const cron = require('node-cron');
const { getAllUsers, getGlobalBoss, saveGlobalBoss, readDB, writeDB } = require('../utils/storage');

// ===== ГЛОБАЛЬНЫЙ БОСС (4 РАЗА В ДЕНЬ) =====
function scheduleGlobalBoss() {
    cron.schedule('0 0,6,12,18 * * *', async () => {
        try {
            const users = await getAllUsers();
            const userCount = users.length;
            const hp = 1000 * Math.floor(userCount / 2) || 5000;
            await saveGlobalBoss({
                hp: hp,
                maxHp: hp,
                active: true,
                participants: []
            });
            console.log(`🌍 Глобальный босс появился! HP: ${hp}`);
        } catch (err) {
            console.error('❌ Ошибка cron (босс):', err.message);
        }
    }, {
        timezone: "Europe/Moscow"
    });
}

// ===== АВТООБНОВЛЕНИЕ VIP (КАЖДУЮ МИНУТУ) =====
function scheduleVIPCleanup() {
    setInterval(async () => {
        try {
            const db = readDB();
            for (const id in db.users) {
                const user = db.users[id];
                if (user.vip && user.vip.active && user.vip.expiresAt < Date.now()) {
                    user.vip.active = false;
                }
            }
            writeDB(db);
        } catch (err) {
            console.error('❌ Ошибка обновления VIP:', err.message);
        }
    }, 60 * 1000);
}

// ===== АВТОМАТИЧЕСКИЙ БЕКАП (КАЖДЫЙ ЧАС) =====
function scheduleBackup(bot) {
    const fs = require('fs');
    cron.schedule('0 * * * *', async () => {
        try {
            const db = readDB();
            const json = JSON.stringify(db, null, 2);
            const filename = `backup_${new Date().toISOString().slice(0,13).replace('T', '_')}.json`;
            
            fs.writeFileSync(filename, json);
            console.log(`✅ Бекап создан: ${filename}`);
            
            if (bot && process.env.BACKUP_CHANNEL) {
                await bot.telegram.sendDocument(
                    process.env.BACKUP_CHANNEL,
                    { source: Buffer.from(json, 'utf-8'), filename: filename }
                );
            }
            
            // Удаляем старые бекапы (оставляем 10)
            const files = fs.readdirSync('./').filter(f => f.startsWith('backup_'));
            if (files.length > 10) {
                const sorted = files.sort();
                const toDelete = sorted.slice(0, files.length - 10);
                for (const file of toDelete) {
                    fs.unlinkSync(file);
                }
            }
        } catch (err) {
            console.error('❌ Ошибка авто-бекапа:', err.message);
        }
    }, {
        timezone: "Europe/Moscow"
    });
}

// ===== ЗАПУСК ВСЕХ ЗАДАЧ =====
function startCron(bot) {
    scheduleGlobalBoss();
    scheduleVIPCleanup();
    scheduleBackup(bot);
    console.log('⏰ Cron-задачи запущены');
}

module.exports = { startCron };