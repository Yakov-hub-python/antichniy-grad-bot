const { getUser } = require('./storage');

function isVIP(user) {
    return user.vip && user.vip.active && user.vip.expiresAt > Date.now();
}

function getIncomeInterval(user) {
    const { INCOME_INTERVALS } = require('../config/constants');
    return isVIP(user) ? INCOME_INTERVALS.vip : INCOME_INTERVALS.regular;
}

function getSoldiers(user) {
    return user.soldiers;
}

function getPersonalBossHP(user) {
    return 5000 + (user.level - 1) * 1000;
}

function getBossReward(user) {
    const bossHp = getPersonalBossHP(user);
    const soldiers = getSoldiers(user);
    const damage = soldiers * 5;
    if (damage === 0) return 100;
    const hitsToKill = Math.ceil(bossHp / damage);
    let reward = 50 + hitsToKill * 10;
    reward = Math.max(100, Math.min(5000, reward));
    return reward;
}

function calculateIncome(user) {
    const buildings = user.buildings;
    const citizens = user.citizens || 5;
    const neededWorkers = buildings.mine * 2 + buildings.mint * 1;
    const workers = Math.min(citizens, neededWorkers);
    if (workers === 0) return { gold: 0, food: 0, coins: 0 };

    let gold = buildings.mine * 15;
    let coins = buildings.mint * 10;
    let food = buildings.farm * 5;

    const efficiency = workers / neededWorkers;
    gold = Math.floor(gold * efficiency);
    coins = Math.floor(coins * efficiency);
    food = Math.floor(food * efficiency);

    const multiplier = isVIP(user) ? 2 : 1;
    gold *= multiplier;
    coins *= multiplier;
    food *= multiplier;

    if (user.food < citizens) {
        gold = Math.floor(gold * 0.8);
        coins = Math.floor(coins * 0.8);
        food = Math.floor(food * 0.8);
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