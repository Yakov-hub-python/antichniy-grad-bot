const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES } = require('../config/constants');
const { getTodayBonus } = require('../utils/dailyBonus');
const city = require('../hears/city');

module.exports = {
    build: async (ctx) => {
        const userId = ctx.from.id;
        const type = ctx.match[1];
        const user = getUser(userId);
        let cost = BUILDING_COSTS[type];
        
        // ===== СКИДКА ДНЯ =====
        const todayBonus = getTodayBonus();
        if (todayBonus.type === 'build') {
            cost = {
                gold: Math.floor(cost.gold * todayBonus.discount),
                coins: Math.floor(cost.coins * todayBonus.discount),
                level: cost.level
            };
        }

        // Проверка уровня
        if (user.level < cost.level) {
            return ctx.reply(`❌ Нужен ${cost.level} уровень! У тебя ${user.level}`);
        }

        // Проверка золота
        if (user.gold < cost.gold) {
            return ctx.reply(`❌ Не хватает золота! Нужно ${cost.gold}, у тебя ${user.gold}`);
        }

        // Проверка монет
        if (user.coins < cost.coins) {
            return ctx.reply(`❌ Не хватает монет! Нужно ${cost.coins}, у тебя ${user.coins}`);
        }

        // Списываем ресурсы
        user.gold -= cost.gold;
        user.coins -= cost.coins;
        user.buildings[type] += 1;
        
        // Бонус от зданий
        if (type === 'hut') user.citizens += 3;
        if (type === 'barracks') user.soldiers += 2;
        if (type === 'arena') user.soldiers += 5;

        // Обновление уровня
        const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = totalBuildings + 1;

        // Реферальный бонус
        if (user.level >= 5 && user.referredBy && !user.referralCompleted) {
            user.referralCompleted = true;
            const db = readDB();
            const refUser = db.users[user.referredBy];
            const vipDays = refUser.referrals?.length >= 3 ? 7 : 3;
            user.vip = { active: true, expiresAt: Date.now() + vipDays * 24 * 60 * 60 * 1000 };
            refUser.vip = { active: true, expiresAt: Date.now() + vipDays * 24 * 60 * 60 * 1000 };
            writeDB(db);
            await ctx.reply(`🎉 Ты достиг 5 уровня! Вы с другом получили VIP на ${vipDays} дней!`);
            try {
                await ctx.telegram.sendMessage(user.referredBy, `🎉 Твой друг @${user.username} достиг 5 уровня! Вы получили VIP на ${vipDays} дней!`);
            } catch (err) {}
        }

        saveUser(userId, user);
        await ctx.reply(`✅ ${BUILDING_NAMES[type]} построена! Уровень города: ${user.level}`);
        await city.show(ctx);
    }
};