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
    if (!db.users[id]) {
        db.users[id] = {
            id: id,
            gold: 200,
            food: 0,
            coins: 0,
            citizens: 5,
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
        writeDB(db);
    }
    return db.users[id];
}

function saveUser(id, data) {
    const db = readDB();
    db.users[id] = data;
    writeDB(db);
}

module.exports = { readDB, writeDB, getUser, saveUser };