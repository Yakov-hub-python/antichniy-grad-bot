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
        // Создаем нового пользователя с полем soldiers
        db.users[id] = {
            id: id,
            gold: 200,
            food: 0,
            coins: 0,
            citizens: 5,
            soldiers: 0,  // Добавлено
            level: 1,
            buildings: {
                hut: 0,
                farm: 0,
                mine: 0,
                mint: 0,
                market: 0,
                barracks: 0
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
            username: 'unknown'
        };
        needSave = true;
    } else {
        // Проверяем существующего пользователя
        const user = db.users[id];
        
        if (user.soldiers === undefined) {
            user.soldiers = 0;
            needSave = true;
        }
        
        // Добавьте другие проверки по необходимости
        if (user.coins === undefined) {
            user.coins = 0;
            needSave = true;
        }
        
        if (user.food === undefined) {
            user.food = 0;
            needSave = true;
        }
        
        // Проверка buildings
        if (!user.buildings) {
            user.buildings = { hut: 0, farm: 0, mine: 0, mint: 0, market: 0, barracks: 0 };
            needSave = true;
        } else {
            const defaultBuildings = { hut: 0, farm: 0, mine: 0, mint: 0, market: 0, barracks: 0 };
            for (const key in defaultBuildings) {
                if (user.buildings[key] === undefined) {
                    user.buildings[key] = 0;
                    needSave = true;
                }
            }
        }
    }
    
    if (needSave) {
        writeDB(db);
        console.log(`🔄 Обновлен пользователь ${id}`);
    }
    
    return db.users[id];
}

function saveUser(id, data) {
    const db = readDB();
    db.users[id] = data;
    writeDB(db);
}

module.exports = { readDB, writeDB, getUser, saveUser };