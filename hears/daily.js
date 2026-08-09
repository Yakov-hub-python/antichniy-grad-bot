const { getUser, saveUser } = require('../utils/storage');
const { isVIP } = require('../utils/helpers');
const { getTodayBonus } = require('../utils/dailyBonus');

module.exports = {
    get: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const now = Date.now();

        // Проверяем, не получал ли уже сегодня
        if (user.lastDaily) {
            const nextBonus = user.lastDaily + 24 * 60 * 60 * 1000;
            if (now < nextBonus) {
                const left = Math.floor((nextBonus - now) / 60000);
                const hours = Math.floor(left / 60);
                const minutes = left % 60;
                return ctx.reply(`⏳ Бонус будет доступен через ${hours}ч ${minutes}м`);
            }
        }

        // Получаем бонус дня
        const bonus = getTodayBonus();
        const vipBonus = isVIP(user) ? 400 : 250;
        
        // Базовый бонус
        user.gold += vipBonus;
        
        // Дополнительный бонус за сегодня
        let extraBonus = '';
        if (bonus.type === 'gold') {
            user.gold += 20;
            extraBonus = '💰 +20 золота (Золотая лихорадка)';
        } else if (bonus.type === 'coins') {
            user.coins = (user.coins || 0) + 15;
            extraBonus = '🪙 +15 монет (Монетный дождь)';
        } else if (bonus.type === 'soldiers') {
            user.soldiers = (user.soldiers || 0) + 3;
            extraBonus = '⚔️ +3 солдата (Воинский призыв)';
        } else if (bonus.type === 'build') {
            user.gold += 30;
            extraBonus = '💰 +30 золота (Строительный бум)';
        } else {
            user.gold += 10;
            extraBonus = '💰 +10 золота (Бонус дня)';
        }

        user.lastDaily = now;
        
        // Сохраняем бонус дня в профиль
        if (!user.dailyBonus) {
            user.dailyBonus = {};
        }
        user.dailyBonus.lastBonus = bonus.id;
        user.dailyBonus.bonusDate = now;
        
        saveUser(userId, user);

        await ctx.reply(
            `🎁 ЕЖЕДНЕВНЫЙ БОНУС!\n\n` +
            `📅 Сегодня: ${bonus.emoji} ${bonus.name}\n` +
            `📖 ${bonus.description}\n\n` +
            `💰 +${vipBonus} золота (ежедневный)\n` +
            `${extraBonus}\n\n` +
            `💰 Баланс: ${user.gold} золота\n` +
            `🪙 Монет: ${user.coins || 0}`
        );
    }
};