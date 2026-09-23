const {
    getUser,
    saveUser,
    readDB,
    writeDB
} = require('../utils/storage');

const {
    getSoldiers,
    getPersonalBossHP,
    getBossReward
} = require('../utils/helpers');

const {
    updateQuestProgress,
    claimQuestReward
} = require('../utils/quests');

const {
    checkAchievements,
    claimAchievementReward
} = require('../utils/achievements');

const {
    getArmyToType
} = require('../config/army');

const {
    giveBattleReward
} = require('../service/battleService');


// ============================================================
// НОВАЯ БОЕВАЯ СИСТЕМА
// ============================================================

const { getBossForUser } = require('../config/boss');

const BATTLE_INTERVAL = 1000;


// ============================================================
// ЗАПУСК НОВОГО БОЯ
// ============================================================

async function start(ctx) {
    const userId = ctx.from.id;
    const user = getUser(userId);

    if (!user) {
        return ctx.reply('❌ Профиль не найден.');
    }

    // Уже есть бой
    if (user.activeBattle) {
        return ctx.reply(
            '⚔️ У тебя уже идёт бой!\n\n' +
            `👹 ${user.activeBattle.boss.name}\n` +
            `❤️ HP: ${user.activeBattle.boss.hp}/${user.activeBattle.boss.maxHp}\n\n` +
            'Бой проходит автоматически.'
        );
    }

    // Проверяем армию
    const army = user.army || {};

    const totalArmy = Object.values(army)
        .reduce((sum, count) => sum + (Number(count) || 0), 0);

    if (totalArmy <= 0) {
        return ctx.reply(
            '❌ У тебя нет армии.\n\n' +
            'Сначала найми войска.'
        );
    }

    const now = Date.now();
    const boss = getBossForUser(user);

    user.activeBattle = {
        boss: {
            ...boss
        },

        round: 0,

        startedAt: now,

        nextRoundAt: now + BATTLE_INTERVAL,

        lossDamage: 0,

        totalPlayerDamage: 0,

        totalBossDamage: 0,

        totalLosses: {}
    };

    saveUser(userId, user);

    return ctx.reply(
        `⚔️ БОЙ НАЧАЛСЯ!\n\n` +
        `👹 ${boss.name} #${boss.level}\n` +
        `❤️ HP: ${boss.hp}/${boss.maxHp}\n` +
        `⚔️ Урон: ${boss.damage}\n` +
        `🛡️ Защита: ${boss.defense}\n\n` +
        `⏳ Первый раунд через 1 секунду.\n` +
        `⚔️ Бой проходит автоматически.`
    );
}


// ============================================================
// СОВМЕСТИМОСТЬ СО СТАРЫМ CALLBACK boss_attack
// ============================================================
//
// Старый callback может остаться в callback.js.
// Он больше НЕ проводит раунд вручную.
// Это важно, чтобы игрок случайно не ускорял бой.
//

async function attack(ctx) {
    const userId = ctx.from.id;
    const user = getUser(userId);

    if (!user?.activeBattle) {
        return ctx.reply(
            '❌ У тебя нет активного боя.'
        );
    }

    return ctx.reply(
        '⚔️ Бой уже идёт автоматически.\n' +
        '⏳ Следующий раунд будет проведён системой.'
    );
}


// ============================================================
// ФОРМАТ ПОТЕРЬ
// ============================================================

function formatLosses(losses) {
    let text = '';

    for (const [unit, count] of Object.entries(losses || {})) {
        if (count <= 0) continue;

        const unitInfo = getArmyToType(unit);

        if (unitInfo) {
            text += `${unitInfo.name}: −${count}\n`;
        }
    }

    return text || 'Нет потерь 🎉';
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    start,
    attack,
    formatLosses
};