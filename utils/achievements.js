const { ACHIEVEMENTS } = require('../config/achievements');
const { getUser, saveUser } = require('./storage');

// ============================================================
// 1️⃣ ПРОВЕРКА И ВЫДАЧА ДОСТИЖЕНИЙ
// ============================================================

function checkAchievements(user) {
    if (!user.achievements) {
        user.achievements = {};
    }

    const unlocked = [];

    for (const achievement of ACHIEVEMENTS) {
        // Если уже получено — пропускаем
        if (user.achievements[achievement.id]) continue;

        // Проверяем условие
        if (achievement.condition(user)) {
            user.achievements[achievement.id] = true;
            unlocked.push(achievement);
        }
    }

    if (unlocked.length > 0) {
        saveUser(user.id, user);
    }

    return unlocked;
}

// ============================================================
// 2️⃣ ВЫДАТЬ НАГРАДУ ЗА ДОСТИЖЕНИЕ
// ============================================================

function claimAchievementReward(user, achievement) {
    if (achievement.reward === 'vip_3') {
        user.vip = {
            active: true,
            expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000
        };
    } else if (achievement.reward === 'vip_7') {
        user.vip = {
            active: true,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        };
    } else if (typeof achievement.reward === 'number') {
        user.gold += achievement.reward;
    }

    saveUser(user.id, user);
}

// ============================================================
// 3️⃣ ПОЛУЧИТЬ СПИСОК ДОСТИЖЕНИЙ
// ============================================================

function getAchievements(user) {
    if (!user.achievements) {
        user.achievements = {};
    }

    return ACHIEVEMENTS.map(a => ({
        ...a,
        unlocked: !!user.achievements[a.id]
    }));
}

// ============================================================
// 4️⃣ ЭКСПОРТ
// ============================================================

module.exports = {
    checkAchievements,
    claimAchievementReward,
    getAchievements
};