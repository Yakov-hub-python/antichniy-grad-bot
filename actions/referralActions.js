module.exports = {
    copy: async (ctx) => {
        const userId = ctx.from.id;
        const botName = process.env.BOT_USERNAME || 'antichniy_grad_bot';
        const refLink = `https://t.me/${botName}?start=ref_${userId}`;
        await ctx.answerCbQuery('📋 Ссылка скопирована!');
        await ctx.reply(`📋 Твоя ссылка:\n${refLink}`);
    }
};