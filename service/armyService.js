const { ARMY_UNITS, getArmyToType } = require('../config/army');
const { saveUser } = require('../utils/storage');
const { syncSoldierCount } = require('../utils/helpers');

function getLevelToUnlocked(type) {
    return getArmyToType(type)?.unlockLevel ?? Infinity;
}

function checkUnlockedToPlayer(user, type) {
    if (!user || !getArmyToType(type)) return false;
    const requiredLevel = getLevelToUnlocked(type);
    return (Number(user.techTree?.army) || 0) >= requiredLevel;
}

function getCountTypeArmyToPlayer(user) {
    const result = {};
    for (const type of Object.keys(ARMY_UNITS)) {
        result[type] = Number(user?.army?.[type]) || 0;
    }
    return result;
}

function hireArmy(user, type, amount) {
    if (!user || !type || !Number.isInteger(amount) || amount <= 0) return false;
    const unit = getArmyToType(type);
    if (!unit || !checkUnlockedToPlayer(user, type)) return false;

    user.army = user.army || {};
    user.army[type] = Number(user.army[type]) || 0;

    const cost = unit.cost || {};
    if ((user.gold || 0) < (cost.gold || 0) * amount) return false;
    if ((user.food || 0) < (cost.food || 0) * amount) return false;
    if (user.army[type] + amount > 1000) return false;

    user.gold -= (cost.gold || 0) * amount;
    user.food -= (cost.food || 0) * amount;
    user.army[type] += amount;
    syncSoldierCount(user);
    saveUser(user.id, user);
    return true;
}

module.exports = {
    getLevelToUnlocked,
    checkUnlockedToPlayer,
    getCountTypeArmyToPlayer,
    hireArmy
};
