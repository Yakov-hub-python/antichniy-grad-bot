const { getUser, saveUser } = require('../utils/storage');
const { isVIP } = require('../utils/helpers');
const { getWeeklyBonus } = require('../utils/events');

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
        const weeklyBonus = getWeeklyBonus();
        let weeklyText = '';
        if (weeklyBonus) {
            let description = '';
            if (weeklyBonus.type === 'mine') description = 'x2 доход с шахт и карьеров сегодня';
            else if (weeklyBonus.type === 'farm') description = 'x2 доход с ферм и полей сегодня';
            else if (weeklyBonus.type === 'mint') description = 'x2 доход с монетных дворов и фабрик сегодня';
            else if (weeklyBonus.type === 'hire') description = 'x2 солдаты при найме сегодня';
            else if (weeklyBonus.type === 'build') description = 'Скидка 30% на постройки сегодня';
            else if (weeklyBonus.type === 'boss') description = 'x2 урон по боссам сегодня';
            else if (weeklyBonus.type === 'daily') description = 'x2 ежедневный бонус сегодня';
            weeklyText = `\n📅 Сегодня: ${weeklyBonus.icon} ${weeklyBonus.name}\n📖 ${description}\n`;
        }

        const vipBonus = isVIP(user) ? 50 : 25;
        user.gold += vipBonus;
        
        // Дополнительный бонус
        let extraBonus = '';
        if (weeklyBonus?.type === 'daily') {
            user.gold += 10;
            extraBonus = '💰 +10 золота (День отдыха)';
        } else {
            user.gold += 10;
            extraBonus = '💰 +10 золота (Бонус дня)';
        }

        user.lastDaily = now;
        saveUser(userId, user);

        await ctx.reply(
            `🎁 ЕЖЕДНЕВНЫЙ БОНУС!\n` +
            `${weeklyText}\n` +
            `💰 +${vipBonus} золота (ежедневный)\n` +
            `${extraBonus}\n\n` +
            `💰 Баланс: ${user.gold} золота\n` +
            `🪙 Монет: ${user.coins || 0}`
        );
    }
};