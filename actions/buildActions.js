const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES } = require('../config/constants');

module.exports = {
    build: async (ctx) => {
        const userId = ctx.from.id;
        const type = ctx.match[1];
        const user = getUser(userId);
        const cost = BUILDING_COSTS[type];

        if (user.gold < cost) {
            return ctx.reply(`❌ Не хватает золота! Нужно ${cost}, у тебя ${user.gold}`);
        }

        user.gold -= cost;
        user.buildings[type] += 1;
        if (type === 'hut') user.citizens += 3;

        const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = totalBuildings + 1;

        if (user.level >= 5 && user.referredBy && !user.referralCompleted) {
            user.referralCompleted = true;
            const db = readDB();
            const refUser = db.users[user.referredBy];
            const vipDays = refUser.referrals.length >= 3 ? 7 : 3;
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
        await showCity(ctx);
    }
};