const cron = require('node-cron');
const { readDB, writeDB } = require('../utils/storage');

// ===== ГЛОБАЛЬНЫЙ БОСС (4 РАЗА В ДЕНЬ) =====
function scheduleGlobalBoss() {
    console.log('🔄 Настройка cron для глобального босса...');
    
    cron.schedule('0 0,6,12,18 * * *', () => {
        try {
            console.log(`⏰ Выполнение cron: глобальный босс (${new Date().toLocaleString('ru-RU')})`);
            
            const db = readDB();
            
            if (db.globalBoss && db.globalBoss.active) {
                console.log('⚠️ Глобальный босс уже активен, пропускаем создание');
                return;
            }
            
            const userCount = Object.keys(db.users || {}).length;
            const hp = 1000 * Math.floor(userCount / 2) || 5000;
            
            db.globalBoss = {
                hp: hp,
                maxHp: hp,
                active: true,
                participants: []
            };
            
            writeDB(db);
            console.log(`🌍 Глобальный босс появился! HP: ${hp}, пользователей: ${userCount}`);
            
        } catch (err) {
            console.error('❌ Ошибка создания босса:', err.message);
            console.error(err.stack);
        }
    }, {
        timezone: "Europe/Moscow"
    });
    
    console.log('✅ Cron для глобального босса настроен на 0:00, 6:00, 12:00, 18:00');
}

// ===== VIP ОЧИСТКА (КАЖДУЮ МИНУТУ) =====
function scheduleVIPCleanup() {
    console.log('🔄 Настройка VIP очистки...');
    
    setInterval(() => {
        try {
            const db = readDB();
            let changed = false;
            
            for (const id in db.users) {
                const user = db.users[id];
                if (user.vip?.active && user.vip.expiresAt < Date.now()) {
                    user.vip.active = false;
                    changed = true;
                    console.log(`👑 VIP истек у пользователя ${id}`);
                }
            }
            
            if (changed) {
                writeDB(db);
                console.log('✅ VIP-статусы обновлены');
            }
        } catch (err) {
            console.error('❌ Ошибка обновления VIP:', err.message);
        }
    }, 60 * 1000);
    
    console.log('✅ VIP очистка настроена (каждую минуту)');
}

// ===== АВТОМАТИЧЕСКИЙ БЭКАП (КАЖДЫЕ 6 ЧАСОВ) =====
function scheduleBackup(bot) {
    console.log('🔄 Настройка авто-бэкапа...');
    
    cron.schedule('0 */6 * * *', () => {
        try {
            const db = readDB();
            const json = JSON.stringify(db, null, 2);
            const dateStr = new Date().toISOString().slice(0, 13).replace('T', '_');
            const filename = `backup_${dateStr}.json`;
            
            // Сохраняем локально (если нужно)
            fs.writeFileSync(filename, json);
            console.log(`✅ Бэкап создан: ${filename} (${(json.length / 1024).toFixed(2)} KB)`);
            
            // Отправляем в Telegram, если указан админ или канал
            if (bot && process.env.ADMINS) {
                try {
                    bot.telegram.sendDocument(
                        process.env.ADMINS.split(','),
                        { source: Buffer.from(json, 'utf-8'), filename: filename }
                    ).catch(err => console.error('❌ Ошибка отправки бэкапа:', err.message));
                } catch (err) {
                    console.error('❌ Ошибка отправки бэкапа:', err.message);
                }
            }
            
            // Удаляем старые бэкапы (оставляем 10)
            const files = fs.readdirSync('./').filter(f => f.startsWith('backup_'));
            if (files.length > 10) {
                const sorted = files.sort();
                const toDelete = sorted.slice(0, files.length - 10);
                for (const file of toDelete) {
                    fs.unlinkSync(file);
                    console.log(`🗑️ Удален старый бэкап: ${file}`);
                }
            }
        } catch (err) {
            console.error('❌ Ошибка авто-бэкапа:', err.message);
        }
    }, {
        timezone: "Europe/Moscow"
    });
    
    console.log('✅ Авто-бэкап настроен (каждые 6 часов)');
}

// ===== СТАТИСТИКА (2 РАЗА В ДЕНЬ) =====
function scheduleStats() {
    console.log('🔄 Настройка сбора статистики...');
    
    cron.schedule('0 12,0 * * *', () => {
        try {
            const db = readDB();
            const users = Object.keys(db.users || {}).length;
            const vip = Object.values(db.users || {}).filter(u => u.vip?.active).length;
            const boss = db.globalBoss?.active ? `✅ ${db.globalBoss.hp}/${db.globalBoss.maxHp}` : '❌';
            
            console.log(`[STATS] 👥 ${users} | 👑 ${vip} | 🌍 Босс: ${boss}`);
        } catch (err) {
            // игнорируем
        }
    }, { timezone: "Europe/Moscow" });
    
    console.log('✅ Статистика настроена (в 12:00 и 00:00)');
}

// ===== ЗАПУСК ВСЕХ ЗАДАЧ =====
function startCron(bot) {
    console.log('⏰ Запуск всех cron-задач...');
    scheduleGlobalBoss();
    scheduleVIPCleanup();
    scheduleBackup(bot);
    scheduleStats();
    console.log('✅ Все cron-задачи запущены');
}

module.exports = { startCron };