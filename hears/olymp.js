const { readDB } = require('../utils/storage');

module.exports = {
    show: async (ctx) => {
        const db = readDB();
        const sorted = Object.values(db.users)
            .sort((a, b) => b.gold - a.gold)
            .slice(0, 10);

        if (sorted.length === 0) {
            return ctx.reply('🏆 Пока нет игроков на Олимпе. Стань первым!');
        }

        let text = '🏆 ТОП-10 ГРАДОНАЧАЛЬНИКОВ:\n\n';
        sorted.forEach((user, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
            text += `${medal} ${'@' + user.username || ctx.from.first_name} — 💰${user.gold}\n`;
        });

        await ctx.reply(text);
    }
};