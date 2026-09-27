const { getUser } = require('../utils/storage');
const { getIncomeInterval, getSoldiers } = require('../utils/helpers');
const { getActiveOffers } = require('../utils/portStorage');

function getHeader(user) {
    const gold = user.gold || 0;
    const coins = user.coins || 0;
    const food = user.food || 0;
    const citizens = user.citizens || 0;
    const soldiers = getSoldiers(user);
    
    return `🏛️ ГЛАВНАЯ ПЛОЩАДЬ\n` +
        `💰 ${gold} | 🪙 ${coins} | 🍖 ${food} | 👥 ${citizens} \n` +
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
    const offersCount = getActiveOffers(100,0).length;
    const userId = ctx.from.id;
    const user = getUser(userId);

    let text = getHeader(user);
    text += `\n👇 Выбери действие:`;

    const buttons = [];

    const totalBuildings = Object.values(user.buildings || {}).reduce((a, b) => a + b, 0);
    buttons.push([
        { text: `🏙️ Город (${totalBuildings})`, callback_data: 'city_show' }
    ]);


    buttons.push([
        { text: `⚔️ Босс `, callback_data: 'boss_show' }
    ]);

    buttons.push([
        { text: '🏪 Рынок', callback_data: 'market_show' }
    ]);

    buttons.push([
        { text: '👥 Друзья', callback_data: 'referral_show' },
        { text: '🎁 Бонус', callback_data: 'daily_show' }
    ]);

    const lastIncome = user.lastIncome || 0;
    const now = Date.now();
    const interval = getIncomeInterval(user);
    const timeLeft = Math.max(0, interval - (now - lastIncome));
    let incomeButton = '💰 Собрать доход';
    if (timeLeft > 0) {
        const left = Math.ceil(timeLeft / 1000);
        incomeButton = `⏳ Доход через ${left}с`;
    }
    buttons.push([
        { text: incomeButton, callback_data: 'collect_income' }
    ]);

    buttons.push([
        { text: '🏆 Олимп', callback_data: 'olymp_show' },
        { text: 'ℹ️ О боте', callback_data: 'about_show' }
    ]);

    const textBranch = "📈 Ветки развития"
    const callback_data_branch =  'branch_show'

    let portText = '📦 Порт';

    if (offersCount > 0) {
        let wordLot;
        if (offersCount === 1) {
            wordLot = 'лот';
        } else if (offersCount >= 2 && offersCount <= 4) {
            wordLot = 'лота';
        } else {
            wordLot = 'лотов';
        }
        portText = `📦 Порт (${offersCount} ${wordLot})`;
    }
    buttons.push([
        { text: portText, callback_data: 'port_show' },
        { text: '📈 Ветки развития', callback_data: 'branch_show' }
    ]);
    buttons.push([
        { text: '⚔️ Тренировка армии', callback_data: 'training_show' }
    ]);
    const extra = {
        reply_markup: {
            inline_keyboard: buttons
        }
    };
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(text, extra);
            await ctx.answerCbQuery();
        } catch (err) {
            if (err.description && err.description.includes('message is not modified')) {
                await ctx.answerCbQuery();
            } else {
                console.error('❌ Ошибка редактирования главного меню:', err);
                await ctx.reply(text, extra);
            }
        }
    } else {
        await ctx.reply(text, extra);
    }
}

module.exports = { showMainMenu, getHeader, getQuestTracker };