const { getUser } = require('../utils/storage');

module.exports = {
    show: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const botName = process.env.BOT_USERNAME || 'antichniy_grad_bot';
        const refLink = `https://t.me/${botName}?start=ref_${userId}`;
        const refCount = user.referrals ? user.referrals.length : 0;
        const vipDays = refCount >= 3 ? 7 : 3;

        await ctx.reply(
            `👥 ПРИГЛАСИ ДРУГА!\n\n` +
            `📎 Твоя ссылка:\n${refLink}\n\n` +
            `🔥 За каждого друга ты получаешь 200💰 и VIP 3 дня!\n` +
            `👑 Когда друг достигнет 5 уровня:\n` +
            `   • ${vipDays} дней VIP тебе и другу\n` +
            `   • ${refCount >= 3 ? '✅ 3+ друзей → 7 дней VIP!' : `Осталось ${3 - refCount} друга до 7 дней VIP`}\n\n` +
            `👥 Друзей: ${refCount}`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📋 Скопировать ссылку', callback_data: 'copy_ref' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }
};