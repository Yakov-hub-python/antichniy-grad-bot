const fs = require('fs');
const path = require('path');

const DB_FILE = 'database.json';

function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const emptyDB = { users: {} };
            fs.writeFileSync(DB_FILE, JSON.stringify(emptyDB, null, 2));
            return emptyDB;
        }
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        if (!data || data.trim() === '') {
            const emptyDB = { users: {} };
            fs.writeFileSync(DB_FILE, JSON.stringify(emptyDB, null, 2));
            return emptyDB;
        }
        return JSON.parse(data);
    } catch (err) {
        console.error('❌ Ошибка чтения database.json:', err.message);
        const emptyDB = { users: {} };
        fs.writeFileSync(DB_FILE, JSON.stringify(emptyDB, null, 2));
        return emptyDB;
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Ошибка записи database.json:', err.message);
    }
}

function getUser(id) {
    const db = readDB();
    let needSave = false;
    
    if (!db.users[id]) {
        // Новый пользователь
        db.users[id] = {
            id: id,
            gold: 200,
            food: 0,
            coins: 0,
            citizens: 5,
            soldiers: 0,
            level: 1,
            buildings: {
                hut: 0,
                farm: 0,
                mine: 0,
                mint: 0,
                market: 0,
                barracks: 0,
                // НОВЫЕ ЗДАНИЯ
                field: 0,
                quarry: 0,
                mint_factory: 0
            },
            lastIncome: Date.now(),
            lastDaily: null,
            vip: { active: false, expiresAt: 0 },
            referrals: [],
            referredBy: null,
            referralCompleted: false,
            bossKills: 0,
            totalDamage: 0,
            personalBoss: {
                hp: 5000,
                maxHp: 5000,
                respawnAt: 0,
                kills: 0
            },
            username: 'unknown',
            first_name: 'Игрок',
            nickname: 'Игрок'
        };
        needSave = true;
    } else {
        // Существующий пользователь - проверяем поля
        const user = db.users[id];
        
        // Проверяем soldiers
        if (user.soldiers === undefined) {
            user.soldiers = 0;
            needSave = true;
        }
        
        // Проверяем coins
        if (user.coins === undefined) {
            user.coins = 0;
            needSave = true;
        }
        
        // Проверяем food
        if (user.food === undefined) {
            user.food = 0;
            needSave = true;
        }
        
        // Проверяем bossKills
        if (user.bossKills === undefined) {
            user.bossKills = 0;
            needSave = true;
        }
        
        // Проверяем referrals
        if (user.referrals === undefined) {
            user.referrals = [];
            needSave = true;
        }
        
        // Проверяем personalBoss
        if (user.personalBoss === undefined) {
            user.personalBoss = {
                hp: 5000,
                maxHp: 5000,
                respawnAt: 0,
                kills: 0
            };
            needSave = true;
        }
        
        // ===== МИГРАЦИЯ ЗДАНИЙ =====
        if (!user.buildings) {
            // Если buildings вообще нет - создаем с нуля
            user.buildings = {
                hut: 0,
                farm: 0,
                mine: 0,
                mint: 0,
                market: 0,
                barracks: 0,
                field: 0,
                quarry: 0,
                mint_factory: 0
            };
            needSave = true;
        } else {
            // Проверяем каждое новое здание
            const newBuildings = ['field', 'quarry', 'mint_factory'];
            for (const building of newBuildings) {
                if (user.buildings[building] === undefined) {
                    user.buildings[building] = 0;
                    needSave = true;
                }
            }
        }
        
        // Сохраняем если были изменения
        if (needSave) {
            writeDB(db);
            console.log(`🔄 Обновлены поля для пользователя ${id}`);
        }
    }
    
    return db.users[id];
}

function saveUser(id, data) {
    const db = readDB();
    db.users[id] = data;
    writeDB(db);
}

// ===== ФУНКЦИЯ ДЛЯ МАССОВОЙ МИГРАЦИИ =====
function migrateAllUsers() {
    console.log('🔄 Запуск массовой миграции...');
    const db = readDB();
    let count = 0;
    
    for (const id in db.users) {
        const user = db.users[id];
        let needSave = false;
        
        // Проверяем и добавляем новые здания
        const newBuildings = ['field', 'quarry', 'mint_factory'];
        if (!user.buildings) {
            user.buildings = {
                hut: 0,
                farm: 0,
                mine: 0,
                mint: 0,
                market: 0,
                barracks: 0,
                field: 0,
                quarry: 0,
                mint_factory: 0
            };
            needSave = true;
        } else {
            for (const building of newBuildings) {
                if (user.buildings[building] === undefined) {
                    user.buildings[building] = 0;
                    needSave = true;
                }
            }
        }
        
        // Добавляем coins если нет
        if (user.coins === undefined) {
            user.coins = 0;
            needSave = true;
        }
        
        if (needSave) {
            count++;
        }
    }
    
    if (count > 0) {
        writeDB(db);
        console.log(`✅ Миграция завершена! Обновлено ${count} пользователей`);
    } else {
        console.log('✅ Миграция не требуется - все пользователи актуальны');
    }
}

module.exports = { readDB, writeDB, getUser, saveUser, migrateAllUsers };