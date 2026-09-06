const {getUser}=require('../utils/storage')
const { getSoldiers } = require('../utils/helpers');
const { inlineKeyboard } = require('telegraf/markup');

module.exports = {
    show: async (ctx) => {
        const user = getUser(ctx.from.id);
        const soldiers = getSoldiers(user);
        const text = `🪖 КАЗАРМА\n\n` +
            `🪖 Солдаты: ${soldiers}\n` + 
            `💰 Цена: 1 воин = 6 монет\n\n` +
            `⚔️ Каждый солдат даёт 5 урона боссам.`
        const reply_markup = {
            inlineKeyboard:[
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