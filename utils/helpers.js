const { WEALTH_TAX, TECH_TREE, INCOME_INTERVALS } = require('../config/constants');
const { saveUser } = require('../utils/storage');
const { ARMY_UNITS } = require('../config/army');

function isVIP(user) {
    return Boolean(user?.vip?.active && user.vip.expiresAt > Date.now());
}

function getIncomeInterval(user) {
    return isVIP(user) ? INCOME_INTERVALS.vip : INCOME_INTERVALS.regular;
}

function getArmyCount(user) {
    return Object.values(user?.army || {})
        .reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
}

function syncSoldierCount(user) {
    if (!user) return 0;
    user.soldiers = getArmyCount(user);
    return user.soldiers;
}

function addWarriors(user, amount) {
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    if (!user || count <= 0) return 0;
    user.army = user.army || {};
    user.army.warriors = (Number(user.army.warriors) || 0) + count;
    syncSoldierCount(user);
    return count;
}

function removeWarriors(user, amount) {
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    if (!user || count <= 0) return 0;
    user.army = user.army || {};
    const removed = Math.min(Number(user.army.warriors) || 0, count);
    user.army.warriors = (Number(user.army.warriors) || 0) - removed;
    syncSoldierCount(user);
    return removed;
}

function getSoldiers(user) {
    return syncSoldierCount(user);
}

function getEconomyBonuses(user) {
    const level = Math.max(0, Number(user?.techTree?.economy) || 0);
    const result = {
        incomeMultiplier: 1,
        coinMultiplier: 1,
        taxReduction: 0,
        sellBonus: 1,
        buildDiscount: 0,
        marketCommission: 0.15,
        portSlots: 3,
        marketBuyDiscount: 0
    };

    for (let current = 1; current <= level; current++) {
        const bonus = TECH_TREE.economy.levels[current]?.bonus;
        if (!bonus) continue;
        if (bonus.incomeMultiplier) result.incomeMultiplier = bonus.incomeMultiplier;
        if (bonus.coinMultiplier) result.coinMultiplier = bonus.coinMultiplier;
        if (bonus.taxReduction) result.taxReduction = Math.max(result.taxReduction, bonus.taxReduction);
        if (bonus.sellBonus) result.sellBonus = Math.max(result.sellBonus, bonus.sellBonus);
        if (bonus.buildDiscount) result.buildDiscount = Math.max(result.buildDiscount, bonus.buildDiscount);
        if (bonus.marketCommission !== undefined) result.marketCommission = bonus.marketCommission;
        if (bonus.portSlots) result.portSlots = 3 + bonus.portSlots;
        if (bonus.marketBuyDiscount) result.marketBuyDiscount = Math.max(result.marketBuyDiscount, bonus.marketBuyDiscount);
    }

    return result;
}

function getPortLimit(user) {
    return getEconomyBonuses(user).portSlots;
}

function getPersonalBossHP(user) {
    const level = Math.max(1, (Number(user?.bossKills) || 0) + 1);
    return Math.floor(1000 * Math.pow(1.25, level - 1));
}

function getBossReward(user) {
    const bossLevel = Math.max(1, (Number(user?.bossKills) || 0) + 1);
    return Math.min(8000, Math.max(200, Math.floor(100 + bossLevel * 40 + getSoldiers(user) * 2)));
}

function getProgressivePrice(basePrice, count) {
    return Math.floor((Number(basePrice) || 0) * (1 + Math.max(0, Number(count) || 0) * 0.15));
}

function applyWealthTax(user) {
    if (!user || user.coins <= WEALTH_TAX.threshold) return 0;
    const excess = user.coins - WEALTH_TAX.threshold;
    const rate = WEALTH_TAX.rate * (1 - (user.taxReduction || 0));
    const tax = Math.floor(excess * rate);
    user.coins -= tax;
    return tax;
}

const MAX_SAFE = 1000000000000000;

function clampResources(user) {
    if (!user) return user;
    for (const key of ['gold', 'food', 'coins', 'iron', 'metal']) {
        if (Number(user[key]) > MAX_SAFE) user[key] = MAX_SAFE;
        if (Number(user[key]) < 0 || !Number.isFinite(Number(user[key]))) user[key] = 0;
    }
    return user;
}

function calculateIncome(user, options = {}) {
    const preview = Boolean(options.preview);
    if (!user) {
        return { gold: 0, food: 0, coins: 0, iron: 0, deserters: 0, foodEaten: 0, tax: 0 };
    }

    if (!preview) clampResources(user);
    syncSoldierCount(user);

    const buildings = user.buildings || {};
    const citizens = Math.max(0, Number(user.citizens) || 0);
    const soldiers = getSoldiers(user);
    const economy = getEconomyBonuses(user);

    const WORKERS_NEEDED = {
        hut: 0, house: 0, tavern: 1,
        farm: 1, field: 2,
        mine: 2, quarry: 3, iron_mine: 2,
        mint: 1, mint_factory: 2, smelter: 2,
        market: 1, bank: 1, barracks: 0,
        forge: 0, walls: 0, acropolis: 0, garden: 1
    };

    let neededWorkers = 0;
    for (const [key, count] of Object.entries(buildings)) {
        neededWorkers += (WORKERS_NEEDED[key] || 0) * (Number(count) || 0);
    }

    const workers = Math.min(citizens, neededWorkers);
    const efficiency = neededWorkers > 0 ? workers / neededWorkers : 1;

    let gold = 6 * (buildings.mine || 0) + 200 * (buildings.quarry || 0);
    let food = 5 * (buildings.farm || 0) + 250 * (buildings.field || 0) + (buildings.tavern || 0);
    let coins = 6 * (buildings.mint || 0) + 500 * (buildings.mint_factory || 0);
    let iron = 10 * (buildings.iron_mine || 0) + 50 * (buildings.smelter || 0);

    if (buildings.bank) {
        coins = Math.floor(coins * (1 + (Number(buildings.bank) || 0) * 0.05));
    }

    gold = Math.floor(gold * efficiency);
    food = Math.floor(food * efficiency);
    coins = Math.floor(coins * efficiency);
    iron = Math.floor(iron * efficiency);

    if (isVIP(user)) {
        gold = Math.floor(gold * 1.2);
        food = Math.floor(food * 1.2);
        coins = Math.floor(coins * 1.2);
        iron = Math.floor(iron * 1.2);
    }

    if (user.acropolisBuilt) {
        gold = Math.floor(gold * 1.1);
        food = Math.floor(food * 1.1);
        coins = Math.floor(coins * 1.1);
        iron = Math.floor(iron * 1.1);
    }

    gold = Math.floor(gold * economy.incomeMultiplier);
    food = Math.floor(food * economy.incomeMultiplier);
    coins = Math.floor(coins * economy.coinMultiplier);
    iron = Math.floor(iron * economy.incomeMultiplier);

    const now = Date.now();
    if (user.miracleActive && user.miracleExpiresAt && now < user.miracleExpiresAt) {
        gold = Math.floor(gold * 1.3);
        food = Math.floor(food * 1.3);
        coins = Math.floor(coins * 1.3);
        iron = Math.floor(iron * 1.3);
    } else if (user.miracleActive && user.miracleExpiresAt && now >= user.miracleExpiresAt) {
        if (!preview) {
            user.miracleActive = false;
            user.miracleExpiresAt = 0;
        }
    }

    const totalFoodNeeded = citizens + soldiers * 1.5;
    const foodAfterEat = (Number(user.food) || 0) + food - totalFoodNeeded;
    let deserters = 0;
    let finalFood;

    if (foodAfterEat < 0) {
        const deficit = Math.abs(foodAfterEat);
        const penalty = Math.max(0.5, 1 - (deficit / (totalFoodNeeded + 1)) * 0.5);
        gold = Math.floor(gold * penalty);
        coins = Math.floor(coins * penalty);
        iron = Math.floor(iron * penalty);
        deserters = Math.min(soldiers, Math.floor(deficit / 3) + 1);
        if (deserters > 0 && !preview) {
            // Дезертируют сначала обычные мечники — это бывшие generic soldiers.
            removeWarriors(user, deserters);
        }
        finalFood = 0;
    } else {
        finalFood = Math.floor(foodAfterEat);
    }

    if (!preview) {
        user.taxReduction = economy.taxReduction;
        user.sellBonus = economy.sellBonus;
        user.portSlots = economy.portSlots;
    }

    const tax = preview ? 0 : applyWealthTax(user);
    if (!preview) clampResources(user);

    return {
        gold: Math.floor(gold),
        food: Math.floor(food),
        foodEaten: Math.floor(totalFoodNeeded),
        coins: Math.floor(coins),
        iron: Math.floor(iron),
        deserters,
        tax
    };
}

async function sendOrEdit(ctx, text, options = {}) {
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(text, options);
        } catch (error) {
            if (!error.description?.includes('message is not modified')) throw error;
        }
        return ctx.answerCbQuery().catch(() => {});
    }
    return ctx.reply(text, options);
}

function getMarketCommission(user) {
    return getEconomyBonuses(user).marketCommission;
}

function calculateMarketSellPayout(user, amount, basePrice) {
    const economy = getEconomyBonuses(user);
    const gross = Math.floor(Math.max(0, Number(amount) || 0) * Math.max(0, Number(basePrice) || 0) * economy.sellBonus);
    const fee = Math.floor(gross * economy.marketCommission);
    return { gross, fee, earned: Math.max(0, gross - fee), sellBonus: economy.sellBonus };
}

function calculateMarketBuyCost(user, amount, basePrice) {
    const economy = getEconomyBonuses(user);
    const base = Math.max(0, Number(amount) || 0) * Math.max(0, Number(basePrice) || 0);
    return Math.max(1, Math.floor(base * (1 - economy.marketBuyDiscount)));
}

module.exports = {
    isVIP,
    getIncomeInterval,
    getSoldiers,
    getArmyCount,
    syncSoldierCount,
    addWarriors,
    removeWarriors,
    getEconomyBonuses,
    getPortLimit,
    getPersonalBossHP,
    getBossReward,
    getProgressivePrice,
    applyWealthTax,
    clampResources,
    calculateIncome,
    sendOrEdit,
    getMarketCommission,
    calculateMarketSellPayout,
    calculateMarketBuyCost,
    MAX_SAFE
};
