const cron = require('node-cron');
const { readDB, writeDB } = require('./utils/storage');

// ===== ГЛОБАЛЬНЫЙ БОСС (4 РАЗА В ДЕНЬ) =====
function scheduleGlobalBoss() {
    console.log('🔄 Настройка cron для глобального босса...');
    
    // Убеждаемся, что задача создается только один раз
    cron.schedule('0 0,6,12,18 * * *', () => {
        try {
            console.log(`⏰ Выполнение cron: глобальный босс (${new Date().toLocaleString('ru-RU')})`);
            
            const db = readDB();
            
            // Проверяем, есть ли уже активный босс
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

// ===== АВТООБНОВЛЕНИЕ VIP (КАЖДУЮ МИНУТУ) =====
function scheduleVIPCleanup() {
    console.log('🔄 Настройка авто-очистки VIP...');
    
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
    
    console.log('✅ Авто-очистка VIP настроена (каждую минуту)');
}

// ===== АВТОМАТИЧЕСКИЙ БЕКАП (КАЖДЫЙ ЧАС) =====
function scheduleBackup(bot) {
    console.log('🔄 Настройка авто-бекапа...');
    
    cron.schedule('0 * * * *', () => {
        try {
            const db = readDB();
            const json = JSON.stringify(db, null, 2);
            const dateStr = new Date().toISOString().slice(0, 13).replace('T', '_');
            const filename = `backup_${dateStr}.json`;
            
            fs.writeFileSync(filename, json);
            console.log(`✅ Бекап создан: ${filename} (${(json.length / 1024).toFixed(2)} KB)`);
            
            // Отправляем в канал, если указан
            if (bot && process.env.BACKUP_CHANNEL) {
                try {
                    bot.telegram.sendDocument(
                        process.env.BACKUP_CHANNEL,
                        { source: Buffer.from(json, 'utf-8'), filename: filename }
                    ).catch(err => console.error('❌ Ошибка отправки бекапа:', err.message));
                } catch (err) {
                    console.error('❌ Ошибка отправки бекапа:', err.message);
                }
            }
            
            // Удаляем старые бекапы (оставляем 10)
            const files = fs.readdirSync('./').filter(f => f.startsWith('backup_'));
            if (files.length > 10) {
                const sorted = files.sort();
                const toDelete = sorted.slice(0, files.length - 10);
                for (const file of toDelete) {
                    fs.unlinkSync(file);
                    console.log(`🗑️ Удален старый бекап: ${file}`);
                }
            }
        } catch (err) {
            console.error('❌ Ошибка авто-бекапа:', err.message);
        }
    }, {
        timezone: "Europe/Moscow"
    });
    
    console.log('✅ Авто-бекап настроен (каждый час)');
}

// ===== ЗАПУСК ВСЕХ ЗАДАЧ =====
function startCron(bot) {
    console.log('⏰ Запуск cron-задач...');
    scheduleGlobalBoss();
    scheduleVIPCleanup();
    scheduleBackup(bot);
    console.log('✅ Все cron-задачи запущены');
}

module.exports = { startCron };