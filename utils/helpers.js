const { getUser } = require('./storage');
const { getTodayBonus } = require('./dailyBonus');

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
    return 5000 + (user.level - 1) * 1000;
}

function getBossReward(user) {
    const bossHp = getPersonalBossHP(user);
    const soldiers = getSoldiers(user);
    const damage = soldiers * 5 || 1;
    const hitsToKill = Math.ceil(bossHp / damage);
    let reward = 50 + hitsToKill * 10;
    reward = Math.max(100, Math.min(5000, reward));
    return reward;
}

function calculateIncome(user) {
    const buildings = user.buildings || {};
    const citizens = user.citizens || 5;
    
    // Нужно рабочих
    const neededWorkers = 
        (buildings.mine || 0) * 2 + 
        (buildings.mint || 0) * 1 +
        (buildings.quarry || 0) * 3 + 
        (buildings.field || 0) * 2 + 
        (buildings.mint_factory || 0) * 2;
    
    const workers = Math.min(citizens, neededWorkers);
    if (workers === 0 || neededWorkers === 0) return { gold: 0, food: 0, coins: 0 };

    // Базовый доход
    let gold = (buildings.mine || 0) * 7 + (buildings.quarry || 0) * 200; // было 390
    let food = (buildings.farm || 0) * 2 + (buildings.field || 0) * 250;  // было 410
    let coins = (buildings.mint || 0) * 6 + (buildings.mint_factory || 0) * 500; // было 840

    // Эффективность
    const efficiency = workers / neededWorkers;
    gold = Math.floor(gold * efficiency);
    food = Math.floor(food * efficiency);
    coins = Math.floor(coins * efficiency);

    // ===== БОНУС ДНЯ (ДОБАВЛЯЕМ) =====
    const todayBonus = getTodayBonus();
    
    // Бонус на шахты/карьеры
    if (todayBonus.type === 'mine') {
        gold = Math.floor(gold * todayBonus.multiplier);
    }
    
    // Бонус на монеты
    if (todayBonus.type === 'coins') {
        coins = Math.floor(coins * todayBonus.multiplier);
    }

    // VIP бонус
    const multiplier = isVIP(user) ? 1.33 : 1;
    gold = Math.floor(gold * multiplier);
    food = Math.floor(food * multiplier);
    coins = Math.floor(coins * multiplier);

    // Голодный штраф
    if (user.food < citizens) {
        const foodDeficit = citizens - user.food;
        const hungerPenalty = Math.max(0.5, 1 - (foodDeficit / citizens) * 0.5);
        gold = Math.floor(gold * hungerPenalty);
        food = Math.floor(food * hungerPenalty);
        coins = Math.floor(coins * hungerPenalty);
    }

    // Сенат бонус
    if (buildings.senate > 0) {
        gold = Math.floor(gold * 1.5);
        food = Math.floor(food * 1.5);
        coins = Math.floor(coins * 1.5);
    }

    return { gold, food, coins };
}

module.exports = {
    isVIP,
    getIncomeInterval,
    getSoldiers,
    getPersonalBossHP,
    getBossReward,
    calculateIncome
};