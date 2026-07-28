module.exports = {
    show: async (ctx) => {
        await ctx.reply(
            `🛒 МАГАЗИН (Telegram Stars)\n\n` +
            `👑 VIP 1 день — 10⭐\n` +
            `👑 VIP 7 дней — 50⭐\n` +
            `👑 VIP 30 дней — 200⭐\n` +
            `💰 100 золота — 5⭐\n` +
            `💰 500 золота — 20⭐\n\n` +
            `💡 Покупки через Stars — в разработке.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }
};