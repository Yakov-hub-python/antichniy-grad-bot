const { getUser, saveUser } = require('../utils/storage');
const { applyDailyBonus } = require('../utils/dailyStreak');

module.exports = {
    get: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);

        const result = applyDailyBonus(user);
        if (result.error) {
            return ctx.reply(result.error);
        }

        const { reward, newStreak } = result;

        let text = `🎁 ЕЖЕДНЕВНЫЙ БОНУС (день ${newStreak})!\n\n`;
        text += `💰 +${reward.gold} золота\n`;
        text += `🍖 +${reward.food} еды\n`;
        if (reward.coins > 0) text += `🪙 +${reward.coins} монет\n`;
        if (reward.vip > 0) text += `👑 +${reward.vip} дня VIP!\n`;

        const nextVIP = 7 - (newStreak % 7);
        if (nextVIP > 0 && nextVIP < 7) {
            text += `\n📅 До VIP-бонуса осталось ${nextVIP} дней стрика`;
        }

        saveUser(userId, user);
        await ctx.reply(text);
    }
};