const { getUser, saveUser } = require('../utils/storage');
const { calculateIncome, getIncomeInterval, isVIP } = require('../utils/helpers');
const { updateQuestProgress } = require('../utils/quests');
const { checkAchievements, claimAchievementReward } = require('../utils/achievements');
const { advanceTraining } = require('../utils/training');

module.exports = {
    collect: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const now = Date.now();
        const interval = getIncomeInterval(user);
        const elapsed = now - user.lastIncome;

        if (elapsed < interval) {
            const leftMs = interval - elapsed;
            const minutes = Math.floor(leftMs / 60000);
            const seconds = Math.floor((leftMs % 60000) / 1000);
            let timeText = minutes > 0 ? `${minutes}м ${seconds}с` : `${seconds}с`;
            return ctx.reply(`⏳ Доход через ${timeText}`);
        }

        const income = calculateIncome(user);
        
        if (income.gold === 0 && income.food === 0 && income.coins === 0) {
            return ctx.reply('🏗️ Нет зданий — нет дохода. Построй шахты, фермы или монетный двор!');
        }
        
        // Обновляем ресурсы
        user.gold += income.gold;
        user.food = income.food; 
        user.coins = (user.coins || 0) + income.coins;
        user.lastIncome = now;
        

        const trainingResult = advanceTraining(user, 'collect_income');
        if (trainingResult) {
            if (trainingResult.completed) {
                await ctx.reply(`🎉 ОБУЧЕНИЕ ЗАВЕРШЕНО!\nНаграда: ${trainingResult.step.reward}💰\n\nТы готов к игре! 🏛️`);
            } else {
                const nextStep = trainingResult.nextStep;
                await ctx.reply(
                    `✅ Шаг ${trainingResult.step.id} выполнен!\n💰 +${trainingResult.step.reward} золота\n\n` +
                    `📚 СЛЕДУЮЩИЙ ШАГ:\n${nextStep.title}\n${nextStep.description}\n\n` +
                    `🏆 Награда: ${nextStep.reward}💰`
                );
            }
            saveUser(userId, user);
        }
        saveUser(userId, user);
        
        let message = `💰 СОБРАН ДОХОД!\n\n`;
        message += `💰 +${income.gold} золота\n`;
        message += `🍖 +${income.food} еды (съедено: ${income.foodEaten})\n`;
        message += `🪙 +${income.coins} монет\n`;
        
        if (income.deserters > 0) {
            message += `\n⚠️ ${income.deserters} солдат дезертировало из-за нехватки еды!\n`;
            message += `🪖 Осталось солдат: ${user.soldiers}`;
        }
        
        if (isVIP(user)) {
            message += `\n👑 VIP ×1.33!`;
        }
        
        await ctx.reply(message);

        // ===== ОБНОВЛЯЕМ КВЕСТ (income) =====
        const questResult = updateQuestProgress(user, 'income');
        if (questResult?.completed) {
            await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\nНаграда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
        }

        // ===== ПРОВЕРЯЕМ ДОСТИЖЕНИЯ =====
        const newAchievements = checkAchievements(user);
        for (const ach of newAchievements) {
            await ctx.reply(`🏆 НОВОЕ ДОСТИЖЕНИЕ!\n${ach.name}\n${ach.description}`);
            claimAchievementReward(user, ach);
            await ctx.reply(`🎁 Награда: ${ach.reward === 'vip_3' || ach.reward === 'vip_7' ? ach.reward.replace('_', ' ').toUpperCase() : ach.reward + '💰'}`);
        }
    }
};