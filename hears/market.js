const { getUser, saveUser } = require('../utils/storage');
const { getTodayBonus } = require('../utils/dailyBonus');

const PRICES = {
    sell: { food: 1, coins: 3 },
    buy: { food: 2, coins: 6 }
};

async function showMarketMenu(ctx) {
    const user = getUser(ctx.from.id);
    const todayBonus = getTodayBonus();
    
    let bonusText = '';
    if (todayBonus.type === 'market') {
        bonusText = `\n📈 БОНУС: x${todayBonus.multiplier} цены (Торговый бум!)`;
    }

    await ctx.reply(
        `🏪 РЫНОК\n\n` +
        `💰 Золото: ${user.gold}\n` +
        `🍖 Еда: ${user.food || 0}\n` +
        `🪙 Монеты: ${user.coins || 0}\n\n` +
        `📊 Курсы:\n` +
        `🍖 Еда: 1💰 (покупка: 2💰)\n` +
        `🪙 Монеты: 3💰 (покупка: 6💰)\n` +
        `${bonusText}\n\n` +
        `👇 Выбери действие:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🍖 Продать еду', callback_data: 'market_sell_food' }],
                    [{ text: '🪙 Продать монеты', callback_data: 'market_sell_coins' }],
                    [{ text: '🍖 Купить еду', callback_data: 'market_buy_food' }],
                    [{ text: '🪙 Купить монеты', callback_data: 'market_buy_coins' }],
                    [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                ]
            }
        }
    );
}

async function sellResource(ctx, resource) {
    const user = getUser(ctx.from.id);
    const todayBonus = getTodayBonus();
    
    let price = PRICES.sell[resource];
    const amount = 1;

    // Бонус на продажу еды
    if (resource === 'food' && todayBonus.type === 'sell_food') {
        price = Math.floor(price * todayBonus.multiplier);
    }
    
    // Бонус на рынок
    if (todayBonus.type === 'market') {
        price = Math.floor(price * todayBonus.multiplier);
    }

    if (!price) return ctx.reply('❌ Такого ресурса нет.');
    if ((user[resource] || 0) < amount) {
        return ctx.reply(`❌ У тебя только ${user[resource] || 0} ${resource}.`);
    }

    user[resource] -= amount;
    user.gold += amount * price;
    saveUser(ctx.from.id, user);

    await ctx.answerCbQuery(`✅ Продано ${amount} ${resource} за ${amount * price}💰`);
    await ctx.reply(`✅ Продано ${amount} ${resource} за ${amount * price} золота.`);
    await showMarketMenu(ctx);
}

// ... остальные функции

module.exports = {
    showMarketMenu,
    sellResource,
    buyResource
};