const { getUser, saveUser } = require('../utils/storage');
const { calculateIncome, getIncomeInterval, isVIP,getTodayBonus,generateDailyBonus } = require('../utils/helpers');

module.exports = {
    collect: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const now = Date.now();
        const interval = getIncomeInterval(user);
        const elapsed = now - user.lastIncome;

        if (elapsed < interval) {
            const leftMs = interval - elapsed;
            const minutes = Math.floor(leftMs / 60000);
            const seconds = Math.floor((leftMs % 60000) / 1000);
            let timeText = minutes > 0 ? `${minutes}м ${seconds}с` : `${seconds}с`;
            return ctx.reply(`⏳ Доход через ${timeText}`);
        }

        const income = calculateIncome(user);
        if (income.gold === 0 && income.food === 0 && income.coins === 0) {
            return ctx.reply('🏗️ Нет зданий — нет дохода. Построй шахты, фермы или монетный двор!');
        }
        
        user.gold += income.gold;
        user.food += income.food;
        user.coins = (user.coins || 0) + income.coins;
        user.lastIncome = now;
        saveUser(userId, user);
        await ctx.reply(
            `💰 СОБРАН ДОХОД!\n` +
            `💰 +${income.gold} золота\n` +
            `🍖 +${income.food} еды\n` +
            `🪙 +${income.coins} монет\n` +
            `${isVIP(user) ? '👑 VIP ×2!' : ''}`
        );
    }
};