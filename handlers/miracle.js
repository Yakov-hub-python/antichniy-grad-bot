const { getUser, saveUser } = require('../utils/storage');

module.exports = async (ctx) => {
    const user = getUser(ctx.from.id);
    if (!user) return ctx.reply('❌ Сначала /start');

    // Проверяем, открыта ли способность (9 уровень экономики)
    if ((user.techTree?.economy || 0) < 9) {
        return ctx.reply('❌ Экономическое чудо доступно на 9 уровне экономики.');
    }

    const now = Date.now();
    const lastMiracle = user.lastMiracle || 0;
    if (now - lastMiracle < 24 * 60 * 60 * 1000) {
        const left = Math.ceil((24 * 60 * 60 * 1000 - (now - lastMiracle)) / 3600000);
        return ctx.reply(`⏳ Экономическое чудо можно использовать через ${left} ч.`);
    }

    // Активируем способность
    user.lastMiracle = now;
    user.miracleActive = true;
    user.miracleExpiresAt = now + 60 * 60 * 1000; // 1 час
    saveUser(ctx.from.id, user);

    ctx.reply('✨ ЭКОНОМИЧЕСКОЕ ЧУДО АКТИВИРОВАНО!\n📈 Все доходы +30% на 1 час!');
};