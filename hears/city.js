const { getUser } = require('../utils/storage');
const { calculateIncome, getSoldiers, isVIP } = require('../utils/helpers');

module.exports = {
    show: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const income = calculateIncome(user);
        const soldiers = getSoldiers(user);
        const vipStatus = isVIP(user) ? '✅ Активен' : '❌ Не активен';
        const foodStatus = user.food >= user.citizens ? '✅ Сыты' : '❌ Голодают (-20%)';

        await ctx.reply(
            `${user.nickname || 'Игрок'},твой город\n\n` +
            `💰 Золото: ${user.gold}\n` +
            `🪙 Монеты: ${user.coins || 0}\n` +
            `👥 Жители: ${user.citizens}\n` +
            `🍖 Еда: ${user.food} (${foodStatus})\n` +
            `🪖 Солдаты: ${soldiers}\n` +
            `🏗️ Уровень: ${user.level}\n` +
            `👑 VIP: ${vipStatus}\n\n` +
            `📊 Доход за сбор:\n` +
            `💰 +${income.gold} золота\n` +
            `🍖 +${income.food} еды\n` +
            `🪙 +${income.coins} монет`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏗️ Строить', callback_data: 'build_menu' }],
                        [{ text: '💰 Собрать доход', callback_data: 'collect_income' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }
};