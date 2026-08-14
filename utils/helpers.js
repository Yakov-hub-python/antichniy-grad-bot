const { getUser } = require('./storage');

function isVIP(user) {
    return user.vip && user.vip.active && user.vip.expiresAt > Date.now();
}

function getIncomeInterval(user) {
    const { INCOME_INTERVALS } = require('../config/constants');
    return isVIP(user) ? INCOME_INTERVALS.vip : INCOME_INTERVALS.regular;
}

function getSoldiers(user) {
    return user.soldiers || 0;
}

function getPersonalBossHP(user) {
    return 1000 + (user.level - 1) * 1500; // ✅ Новый баланс
}

function getBossReward(user) {
    const baseReward = 100 + user.level * 20;
    const soldierBonus = Math.floor((user.soldiers || 0) / 10) * 10;
    let reward = baseReward + soldierBonus;
    reward = Math.max(200, Math.min(8000, reward));
    return reward;
}

// ===== НОВЫЙ БАЛАНС =====
function calculateIncome(user) {
    const buildings = user.buildings || {};
    const citizens = user.citizens || 5;
    const soldiers = user.soldiers || 0;
    
    // ============================================================
    // 1️⃣ НУЖНО РАБОЧИХ
    // ============================================================
    
    const WORKERS_NEEDED = {
        hut: 0,
        farm: 1,
        mine: 2,
        mint: 1,
        market: 1,
        barracks: 0,
        field: 2,
        quarry: 3,
        mint_factory: 2
    };
    
    let neededWorkers = 0;
    for (const [key, val] of Object.entries(buildings)) {
        neededWorkers += (WORKERS_NEEDED[key] || 0) * val;
    }
    
    // ============================================================
    // 2️⃣ ЭФФЕКТИВНОСТЬ (от жителей)
    // ============================================================
    
    const workers = Math.min(citizens, neededWorkers);
    const efficiency = neededWorkers > 0 ? workers / neededWorkers : 1;
    
    // ============================================================
    // 3️⃣ БАЗОВЫЙ ДОХОД (НОВЫЙ БАЛАНС)
    // ============================================================
    
    let gold = (buildings.mine || 0) * 6 + (buildings.quarry || 0) * 75 + (buildings.market || 0) * 10;
    let food = (buildings.farm || 0) * 3 + (buildings.field || 0) * 100;
    let coins = (buildings.mint || 0) * 6 + (buildings.mint_factory || 0) * 250;
    
    // ============================================================
    // 4️⃣ ПРИМЕНЯЕМ ЭФФЕКТИВНОСТЬ
    // ============================================================
    
    gold = Math.floor(gold * efficiency);
    food = Math.floor(food * efficiency);
    coins = Math.floor(coins * efficiency);
    
    // ============================================================
    // 5️⃣ VIP БОНУС (+20%)
    // ============================================================
    
    if (isVIP(user)) {
        gold = Math.floor(gold * 1.2);
        food = Math.floor(food * 1.2);
        coins = Math.floor(coins * 1.2);
    }
    
    // ============================================================
    // 6️⃣ ЖИТЕЛИ И СОЛДАТЫ ЕДЯТ ЕДУ (1 РАЗ ЗА СБОР)
    // ============================================================
    
    // Каждый житель съедает 1 еду за сбор
    const foodForCitizens = citizens;
    
    // Каждый солдат съедает 0.5 еды за сбор
    const foodForSoldiers = soldiers * 0.5;
    
    const totalFoodNeeded = foodForCitizens + foodForSoldiers;
    
    // Еда, которая останется после того, как жители и солдаты поедят
    const foodAfterEat = user.food + food - totalFoodNeeded;
    
    // ============================================================
    // 7️⃣ ГОЛОДНЫЙ ШТРАФ (если еды не хватило)
    // ============================================================
    
    let deserters = 0;
    let finalFood = food;
    
    if (foodAfterEat < 0) {
        // Не хватило еды — штраф на доход
        const deficit = Math.abs(foodAfterEat);
        const penalty = Math.max(0.5, 1 - (deficit / (totalFoodNeeded + 1)) * 0.5);
        
        gold = Math.floor(gold * penalty);
        coins = Math.floor(coins * penalty);
        
        // Дезертирство солдат (каждый 3 нехватки = 1 солдат уходит)
        deserters = Math.floor(deficit / 3) + 1;
        if (deserters > user.soldiers) deserters = user.soldiers;
        
        // Обновляем солдат
        user.soldiers = Math.max(0, user.soldiers - deserters);
        
        // Еды не остаётся
        finalFood = 0;
    } else {
        // Еды хватило — остаток сохраняется
        finalFood = Math.floor(foodAfterEat);
    }
    
    // ============================================================
    // 8️⃣ ВОЗВРАЩАЕМ
    // ============================================================
    
    return {
        gold: Math.floor(gold),
        food: Math.floor(finalFood),
        coins: Math.floor(coins),
        deserters: deserters,
        foodEaten: Math.floor(totalFoodNeeded)
    };
}

module.exports = {
    isVIP,
    getIncomeInterval,
    getSoldiers,
    getPersonalBossHP,
    getBossReward,
    calculateIncome
};