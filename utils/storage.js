const fs = require('fs');
const path = require('path');

const DB_FILE = 'database.json';

const ARMY_TYPES = ['warriors', 'spearmen', 'archers', 'knights', 'siege', 'catapults', 'legion', 'immortals'];
const BUILDING_TYPES = ['hut', 'farm', 'mine', 'mint', 'market', 'barracks', 'field', 'quarry', 'mint_factory', 'house', 'tavern', 'bank', 'garden', 'walls', 'forge', 'iron_mine', 'smelter', 'acropolis'];

function normalizeUser(user, id) {
    let changed = false;
    user.id = user.id ?? id;

    const numericDefaults = {
        gold: 200, food: 10, coins: 0, citizens: 5, soldiers: 0,
        level: 1, dailyStreak: 0, bossKills: 0, totalDamage: 0,
        tutorialStep: 0
    };
    for (const [key, value] of Object.entries(numericDefaults)) {
        if (user[key] === undefined || user[key] === null || !Number.isFinite(Number(user[key]))) {
            user[key] = value;
            changed = true;
        }
    }

    user.army = user.army || {};
    for (const type of ARMY_TYPES) {
        if (user.army[type] === undefined || user.army[type] === null || !Number.isFinite(Number(user.army[type]))) {
            user.army[type] = 0;
            changed = true;
        }
        user.army[type] = Math.max(0, Math.floor(Number(user.army[type]) || 0));
    }

    const armyCount = ARMY_TYPES.reduce((sum, type) => sum + user.army[type], 0);
    // Legacy generic soldiers are migrated to warriors exactly once.
    if (armyCount === 0 && Number(user.soldiers) > 0) {
        user.army.warriors = Math.floor(Number(user.soldiers));
        changed = true;
    }
    const normalizedArmyCount = ARMY_TYPES.reduce((sum, type) => sum + user.army[type], 0);
    if (user.soldiers !== normalizedArmyCount) {
        user.soldiers = normalizedArmyCount;
        changed = true;
    }

    user.buildings = user.buildings || {};
    for (const type of BUILDING_TYPES) {
        if (user.buildings[type] === undefined || user.buildings[type] === null || !Number.isFinite(Number(user.buildings[type]))) {
            user.buildings[type] = 0;
            changed = true;
        }
        user.buildings[type] = Math.max(0, Math.floor(Number(user.buildings[type]) || 0));
    }

    const totalBuildings = Object.values(user.buildings).reduce((sum, count) => sum + (Number(count) || 0), 0);
    const newLevel = totalBuildings + 1;
    if (user.level !== newLevel) {
        user.level = newLevel;
        changed = true;
    }

    if (user.vip === undefined) { user.vip = { active: false, expiresAt: 0 }; changed = true; }
    if (user.referrals === undefined) { user.referrals = []; changed = true; }
    if (user.referredBy === undefined) { user.referredBy = null; changed = true; }
    if (user.referralCompleted === undefined) { user.referralCompleted = false; changed = true; }
    if (user.lastIncome === undefined) { user.lastIncome = Date.now(); changed = true; }
    if (user.lastDaily === undefined) { user.lastDaily = null; changed = true; }
    if (user.tutorialComplete === undefined) { user.tutorialComplete = false; changed = true; }
    if (user.techTree === undefined) { user.techTree = { economy: 0, army: 0 }; changed = true; }
    user.techTree.economy = Number(user.techTree.economy) || 0;
    user.techTree.army = Number(user.techTree.army) || 0;
    if (user.techTreeLastUpgrade === undefined) { user.techTreeLastUpgrade = { economy: 0, army: 0 }; changed = true; }
    if (user.personalBoss === undefined) { user.personalBoss = { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 }; changed = true; }
    if (user.username === undefined) { user.username = 'unknown'; changed = true; }
    if (user.first_name === undefined) { user.first_name = 'Игрок'; changed = true; }
    if (user.nickname === undefined) { user.nickname = 'Игрок'; changed = true; }
    if (user.activeBattle === undefined) { user.activeBattle = undefined; }
    if (user.iron === undefined) { user.iron = 0; changed = true; }
    if (user.metal === undefined) { user.metal = 0; changed = true; }

    return changed;
}

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
            id,
            gold: 200,
            food: 10,
            coins: 0,
            citizens: 5,
            soldiers: 0,
            army: Object.fromEntries(ARMY_TYPES.map(type => [type, 0])),
            level: 1,
            dailyStreak: 0,
            buildings: Object.fromEntries(BUILDING_TYPES.map(type => [type, 0])),
            lastIncome: Date.now(),
            lastDaily: null,
            vip: { active: false, expiresAt: 0 },
            referrals: [],
            referredBy: null,
            referralCompleted: false,
            bossKills: 0,
            totalDamage: 0,
            tutorialStep: 0,
            tutorialComplete: false,
            techTree: { economy: 0, army: 0 },
            techTreeLastUpgrade: { economy: 0, army: 0 },
            personalBoss: { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 },
            username: 'unknown',
            first_name: 'Игрок',
            nickname: 'Игрок',
            iron: 0,
            metal: 0
        };
        writeDB(db);
    }

    const user = db.users[id];
    if (normalizeUser(user, id)) {
        writeDB(db);
    }

    return user;
}

function saveUser(id, data) {
    const db = readDB();
    normalizeUser(data, id);
    db.users[id] = data;
    writeDB(db);
}

// ===== ФУНКЦИЯ ДЛЯ МАССОВОЙ МИГРАЦИИ =====
function migrateAllUsers() {
    console.log('🔄 Запуск массовой миграции...');
    const db = readDB();
    let count = 0;

    for (const id in db.users) {
        if (normalizeUser(db.users[id], id)) count++;
    }

    if (count > 0) {
        writeDB(db);
        console.log(`✅ Миграция завершена! Обновлено ${count} пользователей`);
    } else {
        console.log('✅ Миграция не требуется - все пользователи актуальны');
    }
}

module.exports = { readDB, writeDB, getUser, saveUser, migrateAllUsers, normalizeUser };
