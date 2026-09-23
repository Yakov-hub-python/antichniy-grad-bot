const { getUser, saveUser } = require('../utils/storage');
const { sendOrEdit } = require('../utils/helpers');
const { getBossForUser } = require('../config/boss');

module.exports = {
    show: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);

        const boss = getBossForUser(user);

        const text =
            `⚔️ БОСС\n\n` +
            `👹 ${boss.name} #${boss.level}\n` +
            `❤️ HP: ${boss.hp}/${boss.maxHp}\n` +
            `⚔️ Урон: ${boss.damage}\n` +
            `🛡️ Защита: ${boss.defense}`;

        const reply_markup = {
            inline_keyboard: [
                [
                    {
                        text: '⚔️ Начать бой',
                        callback_data: 'boss_start'
                    }
                ],
                [
                    {
                        text: '🔙 Назад',
                        callback_data: 'back_to_menu'
                    }
                ]
            ]
        };

        await sendOrEdit(ctx, text, { reply_markup });
    },

    start: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);

        if (user.activeBattle) {
            return ctx.answerCbQuery('⚔️ У тебя уже идёт бой!');
        }

        const armyCount = Object.values(user.army || {})
            .reduce((sum, count) => sum + count, 0);

        if (armyCount <= 0) {
            return ctx.answerCbQuery('❌ У тебя нет армии!');
        }

        const boss = getBossForUser(user);

        user.activeBattle = {
            boss: { ...boss },

            round: 0,
            startedAt: Date.now(),
            nextRoundAt: Date.now() + 1000,

            lossDamage: 0,

            totalPlayerDamage: 0,
            totalBossDamage: 0,
            totalLosses: {}
        };

        saveUser(userId, user);

        const text =
            `⚔️ БОЙ НАЧАЛСЯ!\n\n` +
            `👹 ${boss.name} #${boss.level}\n` +
            `❤️ HP: ${boss.hp}/${boss.maxHp}\n` +
            `⚔️ Урон: ${boss.damage}\n` +
            `🛡️ Защита: ${boss.defense}\n\n` +
            `🤖 Бой проходит автоматически.\n` +
            `⏱️ Следующий раунд через 1 секунду...`;

        await sendOrEdit(ctx, text);
    }
};