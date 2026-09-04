const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES, MAX_BUILDINGS } = require('../config/constants');
const { getProgressivePrice, getDiminishedIncome } = require('../utils/helpers');
const { updateQuestProgress, claimQuestReward } = require('../utils/quests');
const { checkAchievements, claimAchievementReward } = require('../utils/achievements');
const { advanceTraining } = require('../utils/training');
const city = require('../hears/city');

module.exports = {
    build: async (ctx) => {
        const userId = ctx.from.id;
        const type = ctx.match[1];
        const user = getUser(userId);

        // ===== ПРОВЕРКА: существует ли здание =====
        const baseCost = BUILDING_COSTS[type];
        if (!baseCost) {
            return ctx.reply('❌ Неизвестное здание.');
        }

        // ===== ПРОВЕРКА УРОВНЯ =====
        if (user.level < baseCost.level) {
            return ctx.reply(`❌ Нужен ${baseCost.level} уровень! У тебя ${user.level}.`);
        }

        // ===== ПРОВЕРКА ЛИМИТА =====
        const currentCount = user.buildings[type] || 0;
        if (MAX_BUILDINGS[type] !== undefined && currentCount >= MAX_BUILDINGS[type]) {
            return ctx.reply(`❌ Нельзя построить больше ${MAX_BUILDINGS[type]} зданий этого типа.`);
        }

        // ===== ПРОГРЕССИВНАЯ ЦЕНА =====
        const actualCost = {
            gold: getProgressivePrice(baseCost.gold, currentCount),
            coins: getProgressivePrice(baseCost.coins, currentCount),
            iron: getProgressivePrice(baseCost.iron || 0, currentCount),
            level: baseCost.level
        };

        // ===== ПРОВЕРКА РЕСУРСОВ =====
        if (user.gold < actualCost.gold) {
            return ctx.reply(`❌ Нужно ${actualCost.gold}💰, у тебя ${user.gold}.`);
        }
        if (user.coins < actualCost.coins) {
            return ctx.reply(`❌ Нужно ${actualCost.coins}🪙, у тебя ${user.coins}.`);
        }
        if (user.iron < actualCost.iron) {
            return ctx.reply(`❌ Нужно ${actualCost.iron}⛏️, у тебя ${user.iron || 0}.`);
        }

        // ===== СПИСЫВАЕМ РЕСУРСЫ =====
        user.gold -= actualCost.gold;
        user.coins -= actualCost.coins;
        user.iron -= actualCost.iron;
        user.buildings[type] += 1;

        // ===== ЭФФЕКТЫ ЗДАНИЙ =====
        if (type === 'hut') user.citizens += 3;
        if (type === 'house') user.citizens += 5;
        if (type === 'tavern') user.citizens += 2;
        if (type === 'barracks') user.soldiers += 2;
        if (type === 'acropolis') {
            user.acropolisBuilt = true;
            user.acropolisBuiltDate = Date.now();
        }
        if (type === 'walls') {
            user.walls = (user.walls || 0) + 1;
        }
        if (type === 'forge') {
            user.soldierDamage = (user.soldierDamage || 0) + 1;
        }

        // ===== ОБНОВЛЯЕМ УРОВЕНЬ =====
        const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = totalBuildings + 1;

        // ===== ОБУЧЕНИЕ =====
        if (type === 'hut' || type === 'farm' || type === 'mine') {
            const trainingResult = advanceTraining(user, 'build_' + type);
            if (trainingResult) {
                if (trainingResult.completed) {
                    await ctx.reply(`🎉 ОБУЧЕНИЕ ЗАВЕРШЕНО!\n🏆 Награда: ${trainingResult.step.reward}💰\n\nТы готов к игре! 🏛️`);
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
        }

        // ===== КВЕСТЫ =====
        const questResult = updateQuestProgress(user, 'build', 1);
        if (questResult?.completed) {
            await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\n🏆 Награда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
            claimQuestReward(user);
        }

        // ===== ДОСТИЖЕНИЯ =====
        const newAchievements = checkAchievements(user);
        for (const ach of newAchievements) {
            await ctx.reply(`🏆 НОВОЕ ДОСТИЖЕНИЕ!\n${ach.name}\n${ach.description}`);
            claimAchievementReward(user, ach);
            await ctx.reply(`🎁 Награда: ${ach.reward === 'vip_3' || ach.reward === 'vip_7' ? ach.reward.replace('_', ' ').toUpperCase() : ach.reward + '💰'}`);
        }

        // ===== СОХРАНЯЕМ =====
        saveUser(userId, user);

        await ctx.reply(`✅ ${BUILDING_NAMES[type]} построена! Уровень города: ${user.level}`);
        await city.show(ctx);
    }
};