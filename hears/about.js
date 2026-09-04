module.exports = {
    show: async (ctx) => {
        await ctx.reply(
            `🏛️ **АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК**\n\n` +
            `📌 **Версия:** \`1.6.1\`\n` +
            `👨‍💻 **Разработчик:** [@DEDAYSON](https://t.me/DEDAYSON)\n\n` +
            `📖 **О ПРОЕКТЕ**\n` +
            `Экономическая стратегия в Telegram.\n` +
            `Строй свой город, добывай ресурсы,\n` +
            `сражайся с боссами и приводи друзей!\n\n` +
            `🔗 **ИСХОДНЫЙ КОД**\n` +
            `https://github.com/Yakov-hub-python/antichniy-grad-bot\n\n` +
            `🏆 **БЛАГОДАРНОСТИ**\n` +
            `• @KimiAntonelliF1DriverOficcial — за тестирование и поддержку\n` +
            `• @MAMA_I_SUAY — за первый фидбек\n` +
            `• @Mevanel (Arthas) — за тонны фидбека, идеи по балансу и то, что сломал экономику так, что я понял, что её надо чинить 😄\n` +
            `• @reactistov (Владос) — за быстрый рост и ещё один пинок по балансу\n` +
            `• всем игрокам — за вашу активность и терпение!\n\n` +
            `📢 **КАНАЛ И ЧАТ**\n` +
            `📢 Канал: @antichniy_grad\n` +
            `💬 Чат: @antichniy_grad_chat`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }
};