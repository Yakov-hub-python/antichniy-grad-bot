const { getUser, readDB } = require('../utils/storage');
const { getPersonalBossHP, getSoldiers } = require('../utils/helpers');

module.exports = {
    show: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const db = readDB();

        const personal = user.personalBoss || { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 };
        const maxHp = getPersonalBossHP(user);
        personal.maxHp = maxHp;
        if (personal.hp > maxHp) personal.hp = maxHp;

        const personalStatus = personal.respawnAt > Date.now()
            ? `⏳ Переродится через ${Math.floor((personal.respawnAt - Date.now()) / 60000)}м`
            : `✅ Готов! HP: ${personal.hp}/${personal.maxHp}`;

        const global = db.globalBoss || { hp: 5000, maxHp: 5000, active: true };
        const userCount = Object.keys(db.users).length;
        global.maxHp = 1000 * Math.floor(userCount / 2) || 5000;

        const globalStatus = global.active
            ? `🔥 Активен! HP: ${global.hp}/${global.maxHp}`
            : `💤 Повержен. Следующий в 00:00, 6:00, 12:00 или 18:00`;
        const text = `⚔️ БОССЫ\n\n` +
            `👤 ЛИЧНЫЙ БОСС:\nHP: ${personal.hp}/${personal.maxHp}\n${personalStatus}\n`+
            `🏆 Убийств: ${personal.kills || 0}\n\n`
        
            const reply_markup = {
                inline_keyboard: [
                    [{ text: '⚔️ Атаковать личного', callback_data: 'boss_personal' }],
                    [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                ]
            }
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, { reply_markup });
            await ctx.answerCbQuery();
        } else {
            await ctx.reply(text, { reply_markup });
        }
    }
};