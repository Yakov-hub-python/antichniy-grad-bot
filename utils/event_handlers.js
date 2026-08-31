function isEventDay() {
    const today = new Date();
    return today.getMonth() === 8 && today.getDate() === 1;
}

function getEventMultiplier() {
    return isEventDay() ? 2 : 1;
}

function applyEventBonus(user) {
    if (!isEventDay()) return null;
    if (!user.eventClaimed) {
        user.gold += 100;
        user.vip = { active: true, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
        user.eventClaimed = true;
        return true;
    }
    return false;
}

function isAcropolisAvailable() {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    return month === 8 && day >= 1 && day <= 3;
}

function isAcropolisAvailableForUser(user) {
    return isAcropolisAvailable() && user.level >= 5 && !user.acropolisBuilt;
}

function buildAcropolis(user) {
    if (!isAcropolisAvailableForUser(user)) {
        return { error: '❌ Акрополь можно построить только с 1 по 3 сентября, начиная с 5 уровня.' };
    }
    if (user.coins < 500) {
        return { error: '❌ Нужно 500 монет для строительства Акрополя.' };
    }
    user.coins -= 500;
    user.acropolisBuilt = true;
    user.acropolisBuiltDate = Date.now();
    return { success: true };
}

function isAcropolisActive(user) {
    return user.acropolisBuilt === true;
}

module.exports = {
    isEventDay,
    getEventMultiplier,
    applyEventBonus,
    isAcropolisAvailable,
    isAcropolisAvailableForUser,
    buildAcropolis,
    isAcropolisActive
};