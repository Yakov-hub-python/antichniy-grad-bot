const { getUser } = require('../utils/storage');
const { getSoldiers } = require('../utils/helpers');

function getHeader(user) {
    const gold = user.gold || 0;
    const coins = user.coins || 0;
    const food = user.food || 0;
    const citizens = user.citizens || 0;
    const soldiers = user.soldiers || 0;
    
    return `🏛️ ГЛАВНАЯ ПЛОЩАДЬ\n` +
        `💰 ${gold} | 🪙 ${coins} | 🍖 ${food} | 👥 ${citizens} | 🪖 ${soldiers}\n` +
        `─────────────────`;
}

function getQuestTracker(user) {
    if (user.quests && user.quests.length > 0) {
        const quest = user.quests[0];
        return `\n🎯 ${quest.name}\n📊 ${quest.progress}/${quest.target}\n`;
    }
    
    const totalBuildings = Object.values(user.buildings || {}).reduce((a, b) => a + b, 0);
    if (totalBuildings < 3) {
        return `\n🎯 Построй 3 здания\n📊 ${totalBuildings}/3\n`;
    }
    
    return '';
}

async function showMainMenu(ctx) {
    const userId = ctx.from.id;
    const user = await getUser(userId);

    let text = getHeader(user);
    text += `\n👇 Выбери действие:`;

    const buttons = [];

    const totalBuildings = Object.values(user.buildings || {}).reduce((a, b) => a + b, 0);
    buttons.push([
        { text: `🏙️ Город (${totalBuildings})`, callback_data: 'city_show' }
    ]);

    if (user.soldiers > 0) {
        buttons.push([
            { text: `⚔️ Босс (🪖${user.soldiers})`, callback_data: 'boss_show' }
        ]);
    } else {
        buttons.push([
            { text: `⚔️ Босс (найми солдат!)`, callback_data: 'barracks_show' }
        ]);
    }

    buttons.push([
        { text: '🏪 Рынок', callback_data: 'market_show' }
    ]);

    buttons.push([
        { text: '👥 Друзья', callback_data: 'referral_show' },
        { text: '🎁 Бонус', callback_data: 'daily_show' }
    ]);

    const lastIncome = user.lastIncome || 0;
    const now = Date.now();
    const interval = user.vip?.active ? 60 * 1000 : 90 * 1000;
    const timeLeft = interval - (now - lastIncome);
    
    if (timeLeft <= 0) {
        buttons.push([
            { text: '💰 Собрать доход ✅', callback_data: 'collect_income' }
        ]);
    } else {
        const seconds = Math.floor(timeLeft / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const timeText = minutes > 0 ? `${minutes}м ${secs}с` : `${secs}с`;
        buttons.push([
            { text: `⏳ Доход через ${timeText}`, callback_data: 'collect_income' }
        ]);
    }

    buttons.push([
        { text: '🪖 Казарма', callback_data: 'barracks_show' }
    ]);

    buttons.push([
        { text: '🏆 Олимп', callback_data: 'olymp_show' },
        { text: 'ℹ️ О боте', callback_data: 'about_show' }
    ]);

    // ===== ✅ ДОБАВЛЯЕМ REPLY-КЛАВИАТУРУ =====
    const replyKeyboard = {
        keyboard: [
            ['🏙️ Город', '⚔️ Босс'],
            ['🏪 Рынок', '🪖 Казарма'],
            ['👥 Пригласить друга', '🎁 Ежедневный бонус'],
            ['🏆 Олимп', 'ℹ️ О боте']
        ],
        resize_keyboard: true
    };
    await ctx.reply(text, {
        reply_markup: {
            inline_keyboard: buttons
        }
    });
}

module.exports = { showMainMenu, getHeader, getQuestTracker };