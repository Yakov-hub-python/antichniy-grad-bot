const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES, MAX_BUILDINGS, TECH_TREE } = require('../config/constants');
const { getProgressivePrice, getDiminishedIncome, addWarriors, getEconomyBonuses } = require('../utils/helpers');
const { updateQuestProgress, claimQuestReward } = require('../utils/quests');
const { checkAchievements, claimAchievementReward } = require('../utils/achievements');
const city = require('../hears/city');
const { completeAction } = require('../handlers/tutorial');


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

        // ===== ПРОВЕРКА УРОВНЯ ГОРОДА =====
        // Защита от null/undefined
        if (user.level === null || user.level === undefined) {
            const total = Object.values(user.buildings).reduce((a, b) => a + b, 0);
            user.level = total + 1;
        }
        if (user.level < baseCost.level) {
            return ctx.reply(`❌ Нужен ${baseCost.level} уровень! У тебя ${user.level}.`);
        }

        // ===== ПРОВЕРКА ЛИМИТА =====
        const currentCount = user.buildings[type] || 0;
        if (MAX_BUILDINGS[type] !== undefined && currentCount >= MAX_BUILDINGS[type]) {
            return ctx.reply(`❌ Нельзя построить больше ${MAX_BUILDINGS[type]} зданий этого типа.`);
        }
        
        // ===== ПРОГРЕССИВНАЯ ЦЕНА =====
        const discount = getEconomyBonuses(user).buildDiscount;
        const actualCost = {
            gold: Math.floor(getProgressivePrice(baseCost.gold, currentCount) * (1 - discount)),
            coins: Math.floor(getProgressivePrice(baseCost.coins, currentCount) * (1 - discount)),
            iron: Math.floor(getProgressivePrice(baseCost.iron || 0, currentCount) * (1 - discount)),
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

        // ===== УВЕЛИЧИВАЕМ СЧЁТЧИК ЗДАНИЯ С ЗАЩИТОЙ ОТ NULL =====
        if (user.buildings[type] === undefined || user.buildings[type] === null) {
            user.buildings[type] = 0;
        }
        user.buildings[type] += 1;

        // ===== ПЕРЕСЧИТЫВАЕМ УРОВЕНЬ =====
        const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = totalBuildings + 1;

        // ===== ЭФФЕКТЫ ЗДАНИЙ (кроме акрополя) =====
        if (type === 'hut') user.citizens += 3;
        if (type === 'house') user.citizens += 5;
        if (type === 'tavern') user.citizens += 2;
        if (type === 'barracks') addWarriors(user, 2);
        // Акрополь удалён — эффект больше не применяется
        if (type === 'walls') {
            user.walls = (user.walls || 0) + 1;
        }
        if (type === 'forge') {
            user.soldierDamage = (user.soldierDamage || 0) + 1;
        }

        // ===== КВЕСТЫ =====
        const questResult = updateQuestProgress(user, 'build', 1);
        if (questResult?.completed) {
            await ctx.reply(
                `🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\n🏆 Награда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`
            );
            claimQuestReward(user);
        }

        // ===== ДОСТИЖЕНИЯ =====
        const newAchievements = checkAchievements(user);
        for (const ach of newAchievements) {
            await ctx.reply(`🏆 НОВОЕ ДОСТИЖЕНИЕ!\n${ach.name}\n${ach.description}`);
            claimAchievementReward(user, ach);
            await ctx.reply(
                `🎁 Награда: ${
                    ach.reward === 'vip_3' || ach.reward === 'vip_7'
                        ? ach.reward.replace('_', ' ').toUpperCase()
                        : ach.reward + '💰'
                }`
            );
        }

        // ===== СОХРАНЯЕМ =====
        saveUser(userId, user);

        // ===== ОБУЧЕНИЕ =====
        if (type === 'hut' || type === 'farm' || type === 'mine') {
            await completeAction(ctx, 'build_' + type);
        }

        await ctx.editMessageText(`
            ✅ ${BUILDING_NAMES[type]} построена! Уровень города: ${user.level}`, 
            { 
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏗️ Строить', callback_data: 'build_menu' }],
                        [{ text: 'Город ', callback_data: 'city_show' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                } 
            }
        );
    }
};