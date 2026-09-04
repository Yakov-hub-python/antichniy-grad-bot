const { getUser, saveUser } = require('../utils/storage');
const { showMainMenu } = require('../handlers/menu');
const { updateQuestProgress, claimQuestReward } = require('../utils/quests');
const { advanceTraining } = require('../utils/training');
const about = require('../hears/about');

module.exports = (bot) => {

    // ============================================================
    // 1️⃣ МЕНЮ / НАЗАД
    // ============================================================

    bot.hears(['меню', 'menu', 'главное меню', 'назад', 'back'], async (ctx) => {
        await showMainMenu(ctx);
    });

    // ============================================================
    // 2️⃣ ПРОДАЖА
    // ============================================================

    bot.hears(/продать еда (\d+)/, async (ctx) => {
        const match = ctx.message.text.match(/продать еда (\d+)/);
        const amount = parseInt(match[1]);
        const user = await getUser(ctx.from.id);

        if (user.food < amount) {
            return ctx.reply(`❌ У тебя только ${user.food} еды`);
        }

        user.food -= amount;
        user.gold += amount;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Продано ${amount} еды за ${amount}💰`);
    });

    bot.hears(/продать монеты (\d+)/, async (ctx) => {
        const match = ctx.message.text.match(/продать монеты (\d+)/);
        const amount = parseInt(match[1]);
        const user = await getUser(ctx.from.id);

        if (user.coins < amount) {
            return ctx.reply(`❌ У тебя только ${user.coins} монет`);
        }

        user.coins -= amount;
        user.gold += amount * 3;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Продано ${amount} монет за ${amount * 3}💰`);
    });

    bot.hears(/продать еда все/, async (ctx) => {
        const user = await getUser(ctx.from.id);
        const amount = user.food;

        if (amount === 0) {
            return ctx.reply('❌ У тебя нет еды');
        }

        user.food = 0;
        user.gold += amount;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Продано ${amount} еды за ${amount}💰`);
    });

    bot.hears(/продать монеты все/, async (ctx) => {
        const user = await getUser(ctx.from.id);
        const amount = user.coins;

        if (amount === 0) {
            return ctx.reply('❌ У тебя нет монет');
        }

        user.coins = 0;
        user.gold += amount * 3;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Продано ${amount} монет за ${amount * 3}💰`);
    });

    // ============================================================
    // 3️⃣ ПОКУПКА
    // ============================================================

    bot.hears(/купить еда (\d+)/, async (ctx) => {
        const match = ctx.message.text.match(/купить еда (\d+)/);
        const amount = parseInt(match[1]);
        const user = await getUser(ctx.from.id);
        const cost = amount * 2;

        if (user.gold < cost) {
            return ctx.reply(`❌ Нужно ${cost}💰, у тебя ${user.gold}💰`);
        }

        user.gold -= cost;
        user.food += amount;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Куплено ${amount} еды за ${cost}💰`);
    });

    bot.hears(/купить монеты (\d+)/, async (ctx) => {
        const match = ctx.message.text.match(/купить монеты (\d+)/);
        const amount = parseInt(match[1]);
        const user = await getUser(ctx.from.id);
        const cost = amount * 6;

        if (user.gold < cost) {
            return ctx.reply(`❌ Нужно ${cost}💰, у тебя ${user.gold}💰`);
        }

        user.gold -= cost;
        user.coins += amount;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Куплено ${amount} монет за ${cost}💰`);
    });

    // ============================================================
    // 4️⃣ СТРОИТЕЛЬСТВО (С ЧИСЛОМ)
    // ============================================================

    bot.hears(/построить (.+?) (\d+)/, async (ctx) => {
        const match = ctx.message.text.match(/построить (.+?) (\d+)/);
        const buildingName = match[1].trim();
        let count = parseInt(match[2]);

        if (count <= 0) {
            return ctx.reply('❌ Количество должно быть больше 0');
        }

        if (count > 10) {
            count = 10;
            await ctx.reply(`ℹ️ Можно построить не больше 10 зданий за раз. Строю 10.`);
        }

        const buildingMap = {
            'хижину': 'hut', 'хижина': 'hut', 'hut': 'hut',
            'ферму': 'farm', 'ферма': 'farm', 'farm': 'farm',
            'шахту': 'mine', 'шахта': 'mine', 'mine': 'mine',
            'монетный двор': 'mint', 'двор': 'mint', 'mint': 'mint',
            'рынок': 'market', 'market': 'market',
            'казарму': 'barracks', 'казарма': 'barracks', 'barracks': 'barracks',
            'поле': 'field', 'field': 'field',
            'карьер': 'quarry', 'quarry': 'quarry',
            'фабрику': 'mint_factory', 'фабрика': 'mint_factory', 'mint_factory': 'mint_factory',
            'дом': 'house', 'house': 'house',
            'таверну': 'tavern', 'таверна': 'tavern', 'tavern': 'tavern',
            'железный рудник': 'iron_mine', 'рудник': 'iron_mine', 'iron_mine': 'iron_mine',
            'сталелитейный завод': 'smelter', 'завод': 'smelter', 'smelter': 'smelter',
            'банк': 'bank', 'bank': 'bank',
            'кузницу': 'forge', 'кузница': 'forge', 'forge': 'forge',
            'стены': 'walls', 'стену': 'walls', 'walls': 'walls',
            'сад': 'garden', 'garden': 'garden',
            'акрополь': 'acropolis', 'acropolis': 'acropolis'
        };

        const buildingKey = buildingMap[buildingName];
        if (!buildingKey) {
            return ctx.reply('❌ Неизвестное здание.');
        }

        const user = await getUser(ctx.from.id);
        const { getProgressivePrice } = require('../utils/helpers');
        const { BUILDING_COSTS, MAX_BUILDINGS, BUILDING_NAMES } = require('../config/constants');

        const baseCost = BUILDING_COSTS[buildingKey];
        const currentCount = user.buildings[buildingKey] || 0;

        if (MAX_BUILDINGS[buildingKey] !== undefined && currentCount + count > MAX_BUILDINGS[buildingKey]) {
            const maxCanBuild = MAX_BUILDINGS[buildingKey] - currentCount;
            return ctx.reply(`❌ Нельзя построить больше ${MAX_BUILDINGS[buildingKey]} зданий этого типа. Можно построить ещё ${maxCanBuild}.`);
        }

        let totalGold = 0;
        let totalCoins = 0;
        let totalIron = 0;
        for (let i = 0; i < count; i++) {
            const idx = currentCount + i;
            totalGold += getProgressivePrice(baseCost.gold || 0, idx);
            totalCoins += getProgressivePrice(baseCost.coins || 0, idx);
            totalIron += getProgressivePrice(baseCost.iron || 0, idx);
        }

        if (user.gold < totalGold) {
            return ctx.reply(`❌ Нужно ${totalGold}💰, у тебя ${user.gold}💰`);
        }
        if (user.coins < totalCoins) {
            return ctx.reply(`❌ Нужно ${totalCoins}🪙, у тебя ${user.coins}🪙`);
        }
        if (user.iron < totalIron) {
            return ctx.reply(`❌ Нужно ${totalIron}⛏️, у тебя ${user.iron || 0}⛏️`);
        }

        user.gold -= totalGold;
        user.coins -= totalCoins;
        user.iron -= totalIron;
        user.buildings[buildingKey] += count;

        if (buildingKey === 'hut') user.citizens += count * 3;
        if (buildingKey === 'house') user.citizens += count * 5;
        if (buildingKey === 'tavern') user.citizens += count * 2;
        if (buildingKey === 'barracks') user.soldiers += count * 2;
        if (buildingKey === 'acropolis') {
            user.acropolisBuilt = true;
            user.acropolisBuiltDate = Date.now();
        }

        const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = totalBuildings + 1;

        // ===== ОБУЧЕНИЕ =====
        if (buildingKey === 'hut' || buildingKey === 'farm' || buildingKey === 'mine') {
            const trainingResult = advanceTraining(user, 'build_' + buildingKey);
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
                saveUser(ctx.from.id, user);
            }
        }

        // ===== КВЕСТЫ =====
        const questResult = updateQuestProgress(user, 'build', count);
        if (questResult?.completed) {
            await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\n🏆 Награда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
            claimQuestReward(user);
        }

        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ ${count} ${BUILDING_NAMES[buildingKey]} построено! Уровень: ${user.level}`);
    });

    // ============================================================
    // 5️⃣ СТРОИТЕЛЬСТВО (БЕЗ ЧИСЛА)
    // ============================================================

    bot.hears(/построить/, async (ctx) => {
        const text = ctx.message.text;
        const words = text.split(/\s+/);

        if (words.length === 1) {
            return require('../hears/build').showMenu(ctx);
        }

        if (/\d/.test(text)) {
            return;
        }

        const target = words.slice(1).join(' ');
        const buildingMap = {
            'хижину': 'hut', 'хижина': 'hut', 'hut': 'hut',
            'ферму': 'farm', 'ферма': 'farm', 'farm': 'farm',
            'шахту': 'mine', 'шахта': 'mine', 'mine': 'mine',
            'монетный двор': 'mint', 'двор': 'mint', 'mint': 'mint',
            'рынок': 'market', 'market': 'market',
            'казарму': 'barracks', 'казарма': 'barracks', 'barracks': 'barracks',
            'поле': 'field', 'field': 'field',
            'карьер': 'quarry', 'quarry': 'quarry',
            'фабрику': 'mint_factory', 'фабрика': 'mint_factory', 'mint_factory': 'mint_factory',
            'дом': 'house', 'house': 'house',
            'таверну': 'tavern', 'таверна': 'tavern', 'tavern': 'tavern',
            'железный рудник': 'iron_mine', 'рудник': 'iron_mine', 'iron_mine': 'iron_mine',
            'сталелитейный завод': 'smelter', 'завод': 'smelter', 'smelter': 'smelter',
            'банк': 'bank', 'bank': 'bank',
            'кузницу': 'forge', 'кузница': 'forge', 'forge': 'forge',
            'стены': 'walls', 'стену': 'walls', 'walls': 'walls',
            'сад': 'garden', 'garden': 'garden',
            'акрополь': 'acropolis', 'acropolis': 'acropolis'
        };

        const buildingKey = buildingMap[target];
        if (!buildingKey) {
            return ctx.reply('❌ Неизвестное здание.');
        }

        const user = await getUser(ctx.from.id);
        const { getProgressivePrice } = require('../utils/helpers');
        const { BUILDING_COSTS, MAX_BUILDINGS, BUILDING_NAMES } = require('../config/constants');

        const baseCost = BUILDING_COSTS[buildingKey];
        const currentCount = user.buildings[buildingKey] || 0;

        if (MAX_BUILDINGS[buildingKey] !== undefined && currentCount >= MAX_BUILDINGS[buildingKey]) {
            return ctx.reply(`❌ Нельзя построить больше ${MAX_BUILDINGS[buildingKey]} зданий этого типа.`);
        }

        const price = getProgressivePrice(baseCost.gold || 0, currentCount);
        const priceCoins = getProgressivePrice(baseCost.coins || 0, currentCount);
        const priceIron = getProgressivePrice(baseCost.iron || 0, currentCount);

        if (user.gold < price) {
            return ctx.reply(`❌ Нужно ${price}💰, у тебя ${user.gold}💰`);
        }
        if (user.coins < priceCoins) {
            return ctx.reply(`❌ Нужно ${priceCoins}🪙, у тебя ${user.coins}🪙`);
        }
        if (user.iron < priceIron) {
            return ctx.reply(`❌ Нужно ${priceIron}⛏️, у тебя ${user.iron || 0}⛏️`);
        }

        user.gold -= price;
        user.coins -= priceCoins;
        user.iron -= priceIron;
        user.buildings[buildingKey] += 1;

        if (buildingKey === 'hut') user.citizens += 3;
        if (buildingKey === 'house') user.citizens += 5;
        if (buildingKey === 'tavern') user.citizens += 2;
        if (buildingKey === 'barracks') user.soldiers += 2;
        if (buildingKey === 'acropolis') {
            user.acropolisBuilt = true;
            user.acropolisBuiltDate = Date.now();
        }

        const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = totalBuildings + 1;

        // ===== ОБУЧЕНИЕ =====
        if (buildingKey === 'hut' || buildingKey === 'farm' || buildingKey === 'mine') {
            const trainingResult = advanceTraining(user, 'build_' + buildingKey);
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
                saveUser(ctx.from.id, user);
            }
        }

        // ===== КВЕСТЫ =====
        const questResult = updateQuestProgress(user, 'build', 1);
        if (questResult?.completed) {
            await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\n🏆 Награда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
            claimQuestReward(user);
        }

        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ ${BUILDING_NAMES[buildingKey]} построена! Уровень: ${user.level}`);
    });

    // ============================================================
    // 6️⃣ КВЕСТЫ
    // ============================================================

    bot.hears(['квест', 'квесты', 'quest', 'quests'], async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const { getDailyQuest } = require('../utils/quests');

        const quest = getDailyQuest(user);

        if (quest.completed) {
            return ctx.reply(`✅ КВЕСТ ВЫПОЛНЕН!\n\n${quest.name}\n🏆 Награда: ${quest.reward === 'vip_3' ? 'VIP 3 дня' : quest.reward + '💰'}`);
        }

        const progress = Math.min(quest.progress, quest.target);
        const percent = Math.floor((progress / quest.target) * 10);
        const bar = '█'.repeat(percent) + '░'.repeat(10 - percent);

        await ctx.reply(
            `🎯 ЕЖЕДНЕВНЫЙ КВЕСТ\n\n` +
            `${quest.name}\n` +
            `📊 Прогресс: ${bar}\n` +
            `${progress}/${quest.target}\n\n` +
            `🏆 Награда: ${quest.reward === 'vip_3' ? 'VIP 3 дня' : quest.reward + '💰'}\n` +
            `⏳ Осталось: ${Math.floor((quest.expiresAt - Date.now()) / 3600000)} часов`
        );
    });

    // ============================================================
    // 7️⃣ ДОСТИЖЕНИЯ
    // ============================================================

    bot.hears(['достижения', 'ачивки', 'achievements'], async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const { getAchievements } = require('../utils/achievements');

        const achievements = getAchievements(user);
        const unlocked = achievements.filter(a => a.unlocked);
        const locked = achievements.filter(a => !a.unlocked);

        let text = '🏆 ДОСТИЖЕНИЯ\n\n';
        text += `✅ Получено: ${unlocked.length}/${achievements.length}\n\n`;

        if (unlocked.length > 0) {
            text += '📌 ПОЛУЧЕНЫ:\n';
            for (const a of unlocked) {
                text += `  ✅ ${a.name}\n`;
            }
            text += '\n';
        }

        if (locked.length > 0) {
            text += '📌 НЕ ПОЛУЧЕНЫ:\n';
            const next = locked.slice(0, 5);
            for (const a of next) {
                text += `  ⬜ ${a.name} — ${a.description}\n`;
            }
            if (locked.length > 5) {
                text += `  ... и ещё ${locked.length - 5}\n`;
            }
        }

        await ctx.reply(text);
    });

    // ============================================================
    // 8️⃣ НАЙМ СОЛДАТ
    // ============================================================

    bot.hears(/нанять (\d+)/, async (ctx) => {
        const match = ctx.message.text.match(/нанять (\d+)/);
        const amount = parseInt(match[1]);
        const user = await getUser(ctx.from.id);

        const MAX_SOLDIERS = 10000;
        if (user.soldiers + amount > MAX_SOLDIERS) {
            return ctx.reply(`❌ Нельзя нанять больше ${MAX_SOLDIERS} солдат. У тебя уже ${user.soldiers}.`);
        }

        const cost = amount * 6;
        const ingotCost = amount * 1;

        if (user.coins < cost) {
            return ctx.reply(`❌ Нужно ${cost} монет, у тебя ${user.coins}`);
        }
        if (user.ingot < ingotCost) {
            return ctx.reply(`❌ Нужно ${ingotCost} слитков, у тебя ${user.ingot || 0}`);
        }

        user.coins -= cost;
        user.ingot -= ingotCost;
        user.soldiers += amount;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Нанято ${amount} солдат за ${cost} монет и ${ingotCost} слитков`);
    });

    bot.hears(/нанять все/, async (ctx) => {
        const user = await getUser(ctx.from.id);
        const maxByCoins = Math.floor(user.coins / 6);
        const maxByIngot = user.ingot || 0;
        const amount = Math.min(maxByCoins, maxByIngot);

        if (amount === 0) {
            return ctx.reply('❌ Не хватает монет или слитков для найма хотя бы одного солдата');
        }

        const MAX_SOLDIERS = 10000;
        const maxCanHire = MAX_SOLDIERS - user.soldiers;
        const finalAmount = Math.min(amount, maxCanHire);

        if (finalAmount <= 0) {
            return ctx.reply(`❌ У тебя уже ${user.soldiers} солдат. Максимум ${MAX_SOLDIERS}.`);
        }

        const cost = finalAmount * 6;
        const ingotCost = finalAmount * 1;

        user.coins -= cost;
        user.ingot -= ingotCost;
        user.soldiers += finalAmount;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Нанято ${finalAmount} солдат за ${cost} монет и ${ingotCost} слитков`);
    });

    // ============================================================
    // 9️⃣ АТАКА БОССА
    // ============================================================

    bot.hears(/атаковать босса/, async (ctx) => {
        const bossActions = require('../actions/bossActions');
        await bossActions.attackPersonal(ctx);
    });

    bot.hears(/атаковать глобального/, async (ctx) => {
        const bossActions = require('../actions/bossActions');
        await bossActions.attackGlobal(ctx);
    });

    // ============================================================
    // 🔟 ПРОСТЫЕ КОМАНДЫ (КНОПКИ + ТЕКСТ)
    // ============================================================

    bot.hears(['рынок', 'market'], async (ctx) => {
        await require('../hears/market').showMarketMenu(ctx);
    });

    bot.hears(['город', 'city', 'мой город'], async (ctx) => {
        await require('../hears/city').show(ctx);
    });

    bot.hears(['босс', 'boss'], async (ctx) => {
        await require('../hears/boss').show(ctx);
    });

    bot.hears(['казарма', 'barracks'], async (ctx) => {
        await require('../hears/barracks').show(ctx);
    });

    bot.hears(['бонус', 'daily', 'ежедневный'], async (ctx) => {
        await require('../hears/daily').get(ctx);
    });

    bot.hears(['топ', 'olymp', 'олимп', 'лидеры'], async (ctx) => {
        await require('../hears/olymp').show(ctx);
    });

    bot.hears(['друзья', 'referral', 'пригласить'], async (ctx) => {
        await require('../hears/referral').show(ctx);
    });

    bot.hears(['помощь', 'help', 'команды'], async (ctx) => {
        await ctx.reply(
            '📖 СПИСОК КОМАНД\n\n' +
            'Текстовые команды:\n' +
            '• продать еда 10\n' +
            '• продать монеты 5\n' +
            '• купить еда 10\n' +
            '• купить монеты 5\n' +
            '• построить хижину\n' +
            '• нанять 10\n' +
            '• атаковать босса\n' +
            '• рынок / город / босс / бонус / топ\n\n' +
            'Кнопки в меню для быстрого доступа!'
        );
    });

    bot.hears(['о боте', 'инфо'], async (ctx) => {
        await about.show(ctx)
    });

    bot.hears(['собрать', 'доход', 'income'], async (ctx) => {
        await require('../hears/income').collect(ctx);
    });

    // ============================================================
    // 1️⃣1️⃣ КНОПКИ ИЗ МЕНЮ (ДУБЛЬ, ЧТОБЫ РАБОТАЛИ)
    // ============================================================

    bot.hears('🏙️ Город', async (ctx) => {
        await require('../hears/city').show(ctx);
    });

    bot.hears('⚔️ Босс', async (ctx) => {
        await require('../hears/boss').show(ctx);
    });

    bot.hears('🏪 Рынок', async (ctx) => {
        await require('../hears/market').showMarketMenu(ctx);
    });

    bot.hears('🪖 Казарма', async (ctx) => {
        await require('../hears/barracks').show(ctx);
    });

    bot.hears('👥 Друзья', async (ctx) => {
        await require('../hears/referral').show(ctx);
    });

    bot.hears('🎁 Бонус', async (ctx) => {
        await require('../hears/daily').get(ctx);
    });

    bot.hears('🏆 Олимп', async (ctx) => {
        await require('../hears/olymp').show(ctx);
    });

    bot.hears('ℹ️ О боте', async (ctx) => {
        await about.show(ctx);
    });

    // ============================================================
    // 1️⃣2️⃣ ОБУЧЕНИЕ
    // ============================================================

    bot.hears(['обучение', 'training', 'туториал', 'тренировка'], async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);

        const { getFirstStep, startTraining, isTrainingComplete } = require('../utils/training');

        if (isTrainingComplete(user)) {
            return ctx.reply('✅ Ты уже прошёл обучение! Начинай строить свой город.');
        }

        startTraining(user);
        const step = getFirstStep();

        const text =
            `📚 ОБУЧЕНИЕ: ШАГ 1 / 4\n\n` +
            `${step.title}\n${step.description}\n\n` +
            `🏆 Награда за выполнение: ${step.reward}💰\n\n` +
            `👉 Выполни действие и получи награду!`;

        saveUser(userId, user);
        await ctx.reply(text);
    });

};