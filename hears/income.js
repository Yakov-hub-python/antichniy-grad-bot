const { getUser, saveUser } = require('../utils/storage');
const { calculateIncome, isVIP, getIncomeInterval } = require('../utils/helpers');
const { updateQuestProgress, claimQuestReward } = require('../utils/quests');
const { checkAchievements, claimAchievementReward } = require('../utils/achievements');

module.exports = {
    collect: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        if (!user) return ctx.reply('❌ Сначала /start');

        const now = Date.now();
        const interval = getIncomeInterval(user);
        const lastIncome = user.lastIncome || 0;

        if (now - lastIncome < interval) {
            const left = Math.ceil((interval - (now - lastIncome)) / 1000);
            const minutes = Math.floor(left / 60);
            const seconds = left % 60;
            const timeText = minutes > 0 ? `${minutes}м ${seconds}с` : `${seconds}с`;
            const replyText = `⏳ Доход можно собрать через ${timeText}`;
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery(replyText);
            } else {
                await ctx.reply(replyText);
            }
            return;
        }

        const income = calculateIncome(user);
        // Применяем доход
        user.gold += income.gold;
        user.food += income.food;
        user.coins += income.coins;
        // Железо и металл, если есть
        if (income.iron) user.iron = (user.iron || 0) + income.iron;
        if (income.metal) user.metal = (user.metal || 0) + income.metal;
        user.lastIncome = now;

        // VIP статус
        const vip = isVIP(user);
        let vipText = vip ? '\n👑 VIP ×1.33!' : '';

        // Квесты
        const questResult = updateQuestProgress(user, 'income', 1);
        if (questResult?.completed) {
            await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\n🏆 Награда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
            claimQuestReward(user);
        }

        // Достижения
        const newAchievements = checkAchievements(user);
        for (const ach of newAchievements) {
            await ctx.reply(`🏆 НОВОЕ ДОСТИЖЕНИЕ!\n${ach.name}\n${ach.description}`);
            claimAchievementReward(user, ach);
            await ctx.reply(`🎁 Награда: ${ach.reward === 'vip_3' || ach.reward === 'vip_7' ? ach.reward.replace('_', ' ').toUpperCase() : ach.reward + '💰'}`);
        }

        saveUser(userId, user);

        const text =
            `💰 СОБРАН ДОХОД!\n` +
            `💰 +${income.gold} золота\n` +
            `🍖 +${income.food} еды (съедено: ${income.foodEaten || 0})\n` +
            `🪙 +${income.coins} монет` +
            (income.iron ? `\n⛏️ +${income.iron} железа` : '') +
            (income.metal ? `\n🔩 +${income.metal} металла` : '') +
            (income.deserters ? `\n⚔️ Дезертиров: ${income.deserters}` : '') +
            (income.tax ? `\n💰 Налог: ${income.tax} монет` : '') +
            vipText;

        const reply_markup = {
            inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
            ]
        };

        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, { reply_markup });
            await ctx.answerCbQuery();
        } else {
            await ctx.reply(text, { reply_markup });
        }
    }
};