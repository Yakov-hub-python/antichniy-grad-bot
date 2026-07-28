const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');

module.exports = async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    let user = getUser(userId);
    user.username = ctx.from.username || ctx.from.first_name || 'unknown';
    saveUser(userId, user);

    if (text.includes('ref_')) {
        const refId = text.split('_')[1];
        if (refId == userId) return await ctx.reply('❌ Нельзя пригласить самого себя!');

        const db = readDB();
        const newUser = db.users[userId];
        if (newUser.referredBy) return await ctx.reply('❌ Ты уже был приглашён!');

        newUser.referredBy = refId;
        newUser.gold += 200;
        newUser.vip = { active: true, expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 };

        if (!db.users[refId].referrals) db.users[refId].referrals = [];
        db.users[refId].referrals.push(userId);
        db.users[refId].gold += 200;
        db.users[refId].vip = { active: true, expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 };

        writeDB(db);
        await ctx.reply(`🎉 Ты пришёл по ссылке друга! +200💰 и VIP 3 дня!`);
        try {
            await ctx.telegram.sendMessage(refId, `👤 Твой друг @${user.username} пришёл! +200💰 и VIP 3 дня!`);
        } catch (err) {}
    }

    const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
    user.level = totalBuildings + 1;
    saveUser(userId, user);

    await ctx.reply(
        `🏛️ ДОБРО ПОЖАЛОВАТЬ,${ctx.from.first_name.toUpperCase()}!\n\n` +
        `💰 Золото: ${user.gold}\n` +
        `🏗️ Уровень города: ${user.level}\n` +
        `👥 Друзей: ${user.referrals ? user.referrals.length : 0}\n\n` +
        `Строй, воюй и приводи друзей!`,
        MAIN_MENU
    );
};