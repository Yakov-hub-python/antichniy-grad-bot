const { getUser, saveUser } = require('./storage');

// ============================================================
// 1️⃣ ТИПЫ КВЕСТОВ
// ============================================================

const QUEST_TYPES = [
    { type: 'build', target: 5, reward: 100, name: '🏗️ Построй 5 зданий' },
    { type: 'build', target: 10, reward: 200, name: '🏗️ Построй 10 зданий' },
    { type: 'income', target: 5, reward: 50, name: '💰 Собери доход 5 раз' },
    { type: 'income', target: 10, reward: 100, name: '💰 Собери доход 10 раз' },
    { type: 'boss', target: 2, reward: 150, name: '⚔️ Убей 2 боссов' },
    { type: 'boss', target: 5, reward: 400, name: '⚔️ Убей 5 боссов' },
    { type: 'referral', target: 1, reward: 'vip_3', name: '👥 Приведи друга' },
    { type: 'spend', target: 500, reward: 80, name: '💸 Потрать 500 золота' },
    { type: 'spend', target: 1000, reward: 150, name: '💸 Потрать 1000 золота' }
];

// ============================================================
// 2️⃣ ГЕНЕРАЦИЯ КВЕСТА
// ============================================================

function generateDailyQuest() {
    const random = QUEST_TYPES[Math.floor(Math.random() * QUEST_TYPES.length)];
    return {
        type: random.type,
        target: random.target,
        reward: random.reward,
        name: random.name,
        progress: 0,
        completed: false,
        claimed: false,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
}

// ============================================================
// 3️⃣ ПОЛУЧИТЬ ТЕКУЩИЙ КВЕСТ
// ============================================================

function getDailyQuest(user) {
    if (!user.quests) {
        user.quests = {};
    }

    if (!user.quests.daily) {
        const quest = generateDailyQuest();
        user.quests.daily = quest;
        saveUser(user.id, user);
        return quest;
    }

    const quest = user.quests.daily;

    if (quest.expiresAt < Date.now() || quest.completed) {
        const newQuest = generateDailyQuest();
        user.quests.daily = newQuest;
        saveUser(user.id, user);
        return newQuest;
    }

    return quest;
}

// ============================================================
// 4️⃣ ОБНОВИТЬ ПРОГРЕСС КВЕСТА
// ============================================================

function updateQuestProgress(user, type, amount = 1) {
    if (!user.quests?.daily) return null;

    const quest = user.quests.daily;
    if (quest.completed) return null;
    if (quest.expiresAt < Date.now()) return null;
    if (quest.type !== type) return null;

    quest.progress += amount;

    if (quest.progress >= quest.target) {
        quest.completed = true;
        saveUser(user.id, user);
        return { completed: true, quest };
    }

    saveUser(user.id, user);
    return { completed: false, quest };
}

// ============================================================
// 5️⃣ ВЫДАТЬ НАГРАДУ ЗА КВЕСТ
// ============================================================

function claimQuestReward(user) {
    if (!user.quests?.daily) return null;
    const quest = user.quests.daily;

    if (!quest.completed) return null;
    if (quest.claimed) return null;

    if (quest.reward === 'vip_3') {
        user.vip = {
            active: true,
            expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000
        };
    } else if (typeof quest.reward === 'number') {
        user.gold += quest.reward;
    }

    quest.claimed = true;
    saveUser(user.id, user);
    return quest.reward;
}

// ============================================================
// 6️⃣ ЭКСПОРТ
// ============================================================

module.exports = {
    QUEST_TYPES,
    generateDailyQuest,
    getDailyQuest,
    updateQuestProgress,
    claimQuestReward
};