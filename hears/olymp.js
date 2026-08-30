const { readDB } = require('../utils/storage');

module.exports = {
    show: async (ctx) => {
        const db = readDB();
        const users = Object.values(db.users);

        // Топ по золоту (5 мест)
        const topGold = users
            .sort((a, b) => b.gold - a.gold)
            .slice(0, 5)
            .map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                const name = u.nickname && u.nickname !== 'Игрок' ? u.nickname : u.username || 'Игрок';
                return `${medal} ${name} — ${u.gold}💰`;
            })
            .join('\n');

        // Топ по стрику (5 мест)
        const topStreak = users
            .filter(u => u.dailyStreak && u.dailyStreak > 0)
            .sort((a, b) => (b.dailyStreak || 0) - (a.dailyStreak || 0))
            .slice(0, 5)
            .map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                const name = u.nickname && u.nickname !== 'Игрок' ? u.nickname : u.username || 'Игрок';
                return `${medal} ${name} — ${u.dailyStreak} дн.`;
            })
            .join('\n') || 'Пока нет данных';

        const topClans = '🚧 Топ кланов появится позже';

        const text =
            `🏆 ОЛИМП ГРАДОНАЧАЛЬНИКОВ\n\n` +
            `🏅 ПО ЗОЛОТУ:\n${topGold}\n\n` +
            `📆 ПО СТРИКУ:\n${topStreak}\n\n` +
            `🏛️ ТОП КЛАНОВ:\n${topClans}`;

        await ctx.reply(text);
    }
};