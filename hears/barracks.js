const {getUser} = require('../utils/storage')
const { getSoldiers } = require('../utils/helpers');

module.exports = {
    show: async (ctx) => {
        const user = getUser(ctx.from.id);
        const soldiers = getSoldiers(user);
        const text = `🪖 КАЗАРМА\n\n` +
            `🪖 Солдаты: ${soldiers}\n` +
            `💰 Базовый найм: 1 воин = 100💰 и 20🍖 через систему армии.\n\n` +
            `⚔️ Состав армии и характеристики смотри в «Тренировка армии».`
        const reply_markup = {
            inline_keyboard:[
                [{ text: 'Нанять воинов', callback_data: 'hire_warriors_1' }],
                [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
            ]
        }
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, { reply_markup });
            await ctx.answerCbQuery();
        } else {
            await ctx.reply(text, { reply_markup });
        }
    }
}