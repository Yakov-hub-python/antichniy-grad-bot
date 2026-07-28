const { getUser, saveUser } = require('../utils/storage');
const { isVIP } = require('../utils/helpers');

module.exports = {
    get: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const now = Date.now();

        if (user.lastDaily) {
            const nextBonus = user.lastDaily + 24 * 60 * 60 * 1000;
            if (now < nextBonus) {
                const left = Math.floor((nextBonus - now) / 60000);
                return ctx.reply(`⏳ Бонус будет доступен через ${left} минут`);
            }
        }

        const bonus = isVIP(user) ? 50 : 25;
        user.gold += bonus;
        user.lastDaily = now;
        saveUser(userId, user);

        await ctx.reply(`🎁 ЕЖЕДНЕВНЫЙ БОНУС!\n💰 +${bonus} золота!\n💰 Баланс: ${user.gold}`);
    }
};