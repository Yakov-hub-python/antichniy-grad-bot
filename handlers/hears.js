const { getUser, saveUser } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES } = require('../config/constants');
const { showMainMenu } = require('../handlers/menu');
const { updateQuestProgress, claimQuestReward } = require('../utils/quests');
const {getSoldiers} = require('../utils/helpers')

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
    // 4️⃣ СТРОИТЕЛЬСТВО
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
            'фабрику': 'mint_factory', 'фабрика': 'mint_factory', 'mint_factory': 'mint_factory'
        };
        
        const buildingKey = buildingMap[buildingName];
        if (!buildingKey) {
            return ctx.reply('❌ Неизвестное здание. Список: хижина, ферма, шахта, монетный двор, рынок, казарма, поле, карьер, фабрика');
        }
        
        const user = await getUser(ctx.from.id);
        const cost = BUILDING_COSTS[buildingKey];
        
        const totalGoldNeeded = cost.gold * count;
        const totalCoinsNeeded = cost.coins * count;
        
        if (cost.gold > 0 && user.gold < totalGoldNeeded) {
            return ctx.reply(`❌ Нужно ${totalGoldNeeded}💰, у тебя ${user.gold}💰`);
        }
        
        if (cost.coins > 0 && user.coins < totalCoinsNeeded) {
            return ctx.reply(`❌ Нужно ${totalCoinsNeeded}🪙, у тебя ${user.coins}🪙`);
        }
        
        if (cost.gold > 0) user.gold -= totalGoldNeeded;
        if (cost.coins > 0) user.coins -= totalCoinsNeeded;
        
        const spentGold = cost.gold || 0;
        const spentCoins = cost.coins || 0;
        const totalSpent = spentGold + spentCoins;

        if (totalSpent > 0) {
            const questResult = updateQuestProgress(user, 'spend', totalSpent);
            if (questResult?.completed) {
                await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\n🏆 Награда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
                claimQuestReward(user);
            }
        }
        
        user.buildings[buildingKey] += count;
        if (buildingKey === 'hut') user.citizens += count * 3;
        
        const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = totalBuildings + 1;
        
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ ${count} ${BUILDING_NAMES[buildingKey]} построено! Уровень: ${user.level}`);
    });

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
            'фабрику': 'mint_factory', 'фабрика': 'mint_factory', 'mint_factory': 'mint_factory'
        };
        
        const buildingKey = buildingMap[target];
        if (!buildingKey) {
            return ctx.reply('❌ Неизвестное здание. Список: хижина, ферма, шахта, монетный двор, рынок, казарма, поле, карьер, фабрика');
        }
        
        const user = await getUser(ctx.from.id);
        const cost = BUILDING_COSTS[buildingKey];
        
        if (cost.gold > 0 && user.gold < cost.gold) {
            return ctx.reply(`❌ Нужно ${cost.gold}💰, у тебя ${user.gold}💰`);
        }
        
        if (cost.coins > 0 && user.coins < cost.coins) {
            return ctx.reply(`❌ Нужно ${cost.coins}🪙, у тебя ${user.coins}🪙`);
        }
        
        if (cost.gold > 0) user.gold -= cost.gold;
        if (cost.coins > 0) user.coins -= cost.coins;
        
        const spentGold = cost.gold || 0;
        const spentCoins = cost.coins || 0;
        const totalSpent = spentGold + spentCoins;

        if (totalSpent > 0) {
            const questResult = updateQuestProgress(user, 'spend', totalSpent);
            if (questResult?.completed) {
                await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\n🏆 Награда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
                claimQuestReward(user);
            }
        }
        
        user.buildings[buildingKey] += 1;
        if (buildingKey === 'hut') user.citizens += 3;
        
        const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = totalBuildings + 1;
        
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ ${BUILDING_NAMES[buildingKey]} построена! Уровень: ${user.level}`);
    });

    // ============================================================
    // 5️⃣ КВЕСТЫ
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
    // 6️⃣ ДОСТИЖЕНИЯ
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
    // 7️⃣ НАЙМ СОЛДАТ
    // ============================================================

    bot.hears(/нанять (\d+)/, async (ctx) => {
        const match = ctx.message.text.match(/нанять (\d+)/);
        const amount = parseInt(match[1]);
        const user = await getUser(ctx.from.id);
        const cost = amount * 6;
        
        if (user.coins < cost) {
            return ctx.reply(`❌ Нужно ${cost} монет, у тебя ${user.coins}`);
        }
        
        user.coins -= cost;
        user.soldiers += amount;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Нанято ${amount} солдат за ${cost} монет`);
    });

    bot.hears(/нанять все/, async (ctx) => {
        const user = await getUser(ctx.from.id);
        const amount = Math.floor(user.coins / 6);
        
        if (amount === 0) {
            return ctx.reply('❌ Не хватает монет для найма хотя бы одного солдата');
        }
        
        const cost = amount * 6;
        user.coins -= cost;
        user.soldiers += amount;
        await saveUser(ctx.from.id, user);
        await ctx.reply(`✅ Нанято ${amount} солдат за ${cost} монет`);
    });

    // ============================================================
    // 8️⃣ АТАКА БОССА
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
    // 9️⃣ ПРОСТЫЕ КОМАНДЫ
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
        const user = getUser(ctx.from.id);
        const soldiers = getSoldiers(user);
        await ctx.reply(
            `🪖 КАЗАРМА\n\n` +
            `🪖 Солдаты: ${soldiers}\n` + 
            `💰 Цена: 1 воин = 6 монет\n\n` +
            `⚔️ Каждый солдат даёт 5 урона боссам.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Нанять воинов', callback_data: 'hire_warriors_1' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
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
        await ctx.reply(
            'ℹ️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n' +
            'Версия: 1.3.5\n' +
            'Разработчик: @DEDAYSON\n\n' +
            'Экономическая стратегия в Telegram.\n' +
            'Строй, воюй, приводи друзей!'
        );
    });

    bot.hears(['собрать', 'доход', 'income'], async (ctx) => {
        await require('../hears/income').collect(ctx);
    });

    // ============================================================
    // 🔟 КНОПКИ ИЗ МЕНЮ
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

    bot.hears('Казарма', async (ctx) => {
        const user = getUser(ctx.from.id);
        const soldiers = getSoldiers(user);
        await ctx.reply(
            `🪖 КАЗАРМА\n\n` +
            `🪖 Солдаты: ${soldiers}\n` + 
            `💰 Цена: 1 воин = 6 монет\n\n` +
            `⚔️ Каждый солдат даёт 5 урона боссам.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Нанять воинов', callback_data: 'hire_warriors_1' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
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
        await ctx.reply(
            'ℹ️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n' +
            'Версия: 1.3.5\n' +
            'Разработчик: @DEDAYSON\n\n' +
            'Экономическая стратегия в Telegram.\n' +
            'Строй, воюй, приводи друзей!'
        );
    });

};