const { getUser } = require('./storage');
const { WEALTH_TAX,TECH_TREE } = require('../config/constants');

// ===== VIP =====
function isVIP(user) {
    return user.vip && user.vip.active && user.vip.expiresAt > Date.now();
}

// ===== ИНТЕРВАЛ ДОХОДА =====
function getIncomeInterval(user) {
    const { INCOME_INTERVALS } = require('../config/constants');
    return isVIP(user) ? INCOME_INTERVALS.vip : INCOME_INTERVALS.regular;
}

// ===== СОЛДАТЫ =====
function getSoldiers(user) {
    return user.soldiers || 0;
}

// ===== БОСС HP =====
function getPersonalBossHP(user) {
    return 8000 + (user.level - 1) * 1500;
}

// ===== НАГРАДА ЗА БОССА =====
function getBossReward(user) {
    const baseReward = 100 + user.level * 20;
    const soldierBonus = Math.floor((user.soldiers || 0) / 10) * 10;
    let reward = baseReward + soldierBonus;
    reward = Math.max(200, Math.min(8000, reward));
    return reward;
}

// ============================================================
// 1️⃣ УБЫВАЮЩАЯ ДОХОДНОСТЬ
// ============================================================

function getDiminishedIncome(base, count) {
    if (count === 0) return 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += base * Math.pow(0.98, i);
    }
    return Math.floor(total);
}

// ============================================================
// 2️⃣ ПРОГРЕССИВНАЯ ЦЕНА
// ============================================================

function getProgressivePrice(basePrice, count) {
    return Math.floor(basePrice * (1 + count * 0.15));
}

// ============================================================
// 3️⃣ НАЛОГ НА БОГАТСТВО
// ============================================================

function applyWealthTax(user) {
    if (!user || user.coins <= WEALTH_TAX.threshold) return 0;
    const excess = user.coins - WEALTH_TAX.threshold;
    const rate = WEALTH_TAX.rate * (1 - (user.taxReduction || 0));
    const tax = Math.floor(excess * rate);
    user.coins -= tax;
    return tax;
}

// ============================================================
// 4️⃣ РАСЧЁТ ДОХОДА
// ============================================================

function calculateIncome(user) {
    const buildings = user.buildings || {};
    const citizens = user.citizens || 5;
    const soldiers = user.soldiers || 0;
    const ecoLevel = user.techTree?.economy || 0;

    // ===== НУЖНО РАБОЧИХ =====
    const WORKERS_NEEDED = {
        hut: 0, house: 0, tavern: 1,
        farm: 1, field: 2,
        mine: 2, quarry: 3, iron_mine: 2,
        mint: 1, mint_factory: 2, smelter: 2,
        market: 1, bank: 1,
        barracks: 0, forge: 0, walls: 0,
        acropolis: 0, garden: 1
    };

    let neededWorkers = 0;
    for (const [key, val] of Object.entries(buildings)) {
        neededWorkers += (WORKERS_NEEDED[key] || 0) * val;
    }

    const workers = Math.min(citizens, neededWorkers);
    const efficiency = neededWorkers > 0 ? workers / neededWorkers : 1;

    // ===== БАЗОВЫЙ ДОХОД =====
    let gold = 0;
    let food = 0;
    let coins = 0;
    let iron = 0;

    // Золото
    gold += getDiminishedIncome(6, buildings.mine || 0);
    gold += getDiminishedIncome(200, buildings.quarry || 0);
    gold += (buildings.market || 0) * 10;
    gold += (buildings.garden || 0) * 5;

    // Еда
    food += getDiminishedIncome(5, buildings.farm || 0);
    food += getDiminishedIncome(250, buildings.field || 0);
    food += (buildings.tavern || 0) * 1;

    // Монеты
    coins += getDiminishedIncome(6, buildings.mint || 0);
    coins += getDiminishedIncome(500, buildings.mint_factory || 0);

    // Железо
    iron += getDiminishedIncome(10, buildings.iron_mine || 0);
    iron += getDiminishedIncome(50, buildings.smelter || 0);

    // ===== БАНК (бонус к монетам) =====
    if (buildings.bank) {
        const bankBonus = buildings.bank * 0.05;
        coins = Math.floor(coins * (1 + bankBonus));
    }

    // ===== КУЗНИЦА (урон солдатам) =====
    if (buildings.forge) {
        user.soldierDamage = (user.soldierDamage || 0) + buildings.forge;
    }

    // ===== ЭФФЕКТИВНОСТЬ =====
    gold = Math.floor(gold * efficiency);
    food = Math.floor(food * efficiency);
    coins = Math.floor(coins * efficiency);
    iron = Math.floor(iron * efficiency);

    // ===== VIP =====
    if (isVIP(user)) {
        gold = Math.floor(gold * 1.2);
        food = Math.floor(food * 1.2);
        coins = Math.floor(coins * 1.2);
        iron = Math.floor(iron * 1.2);
    }

    // ===== АКРОПОЛЬ =====
    if (user.acropolisBuilt) {
        gold = Math.floor(gold * 1.1);
        food = Math.floor(food * 1.1);
        coins = Math.floor(coins * 1.1);
        iron = Math.floor(iron * 1.1);
    }

    // ===== ВЕТКА ЭКОНОМИКИ =====
    if (ecoLevel > 0) {
        const ecoBonus = TECH_TREE.economy.levels[ecoLevel]?.bonus?.incomeMultiplier || 1;
        const coinBonus = TECH_TREE.economy.levels[ecoLevel]?.bonus?.coinMultiplier || 1;
        gold = Math.floor(gold * ecoBonus);
        food = Math.floor(food * ecoBonus);
        coins = Math.floor(coins * coinBonus);
        iron = Math.floor(iron * ecoBonus);
    }

    // ===== ЭКОНОМИЧЕСКОЕ ЧУДО =====
    const now = Date.now();
    if (user.miracleActive && user.miracleExpiresAt && now < user.miracleExpiresAt) {
        gold = Math.floor(gold * 1.3);
        food = Math.floor(food * 1.3);
        coins = Math.floor(coins * 1.3);
        iron = Math.floor(iron * 1.3);
    } else if (user.miracleActive && user.miracleExpiresAt && now >= user.miracleExpiresAt) {
        user.miracleActive = false;
        user.miracleExpiresAt = 0;
    }

    // ===== ЕДА ДЛЯ ЖИТЕЛЕЙ И СОЛДАТ =====
    const foodForCitizens = citizens;
    const foodForSoldiers = soldiers * 0.5;
    const totalFoodNeeded = foodForCitizens + foodForSoldiers;
    const foodAfterEat = user.food + food - totalFoodNeeded;

    let deserters = 0;
    let finalFood = food;

    if (foodAfterEat < 0) {
        const deficit = Math.abs(foodAfterEat);
        const penalty = Math.max(0.5, 1 - (deficit / (totalFoodNeeded + 1)) * 0.5);
        gold = Math.floor(gold * penalty);
        coins = Math.floor(coins * penalty);
        iron = Math.floor(iron * penalty);
        deserters = Math.floor(deficit / 3) + 1;
        if (deserters > user.soldiers) deserters = user.soldiers;
        user.soldiers = Math.max(0, user.soldiers - deserters);
        finalFood = 0;
    } else {
        finalFood = Math.floor(foodAfterEat);
    }

    // ===== НАЛОГОВАЯ ЛЬГОТА =====
    const taxReduction = TECH_TREE.economy.levels[ecoLevel]?.bonus?.taxReduction || 0;
    user.taxReduction = taxReduction;

    // ===== НАЛОГ =====
    const tax = applyWealthTax(user);
    if (tax > 0) {
        console.log(`💰 Налог: ${tax} монет у пользователя ${user.id}`);
    }

    return {
        gold: Math.floor(gold),
        food: Math.floor(finalFood),
        coins: Math.floor(coins),
        iron: Math.floor(iron),
        deserters,
        foodEaten: Math.floor(totalFoodNeeded),
        tax
    };
}

module.exports = {
    isVIP,
    getIncomeInterval,
    getSoldiers,
    getPersonalBossHP,
    getBossReward,
    getDiminishedIncome,
    getProgressivePrice,
    applyWealthTax,
    calculateIncome
};