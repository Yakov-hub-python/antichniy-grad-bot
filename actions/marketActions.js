const { getUser, saveUser } = require('../utils/storage');
const { updateQuestProgress, claimQuestReward } = require('../utils/quests');
const { calculateMarketSellPayout, calculateMarketBuyCost, getEconomyBonuses, sendOrEdit } = require('../utils/helpers');

const PRICES = {
    sell: { food: 1, coins: 3 },
    buy: { food: 2, coins: 6 }
};

async function showMarketMenu(ctx) {
    const user = getUser(ctx.from.id);

    const economy = getEconomyBonuses(user);
    const foodBuy = calculateMarketBuyCost(user, 1, PRICES.buy.food);
    const coinBuy = calculateMarketBuyCost(user, 1, PRICES.buy.coins);
    const text =
        `🏪 РЫНОК\n\n` +
        `💰 Золото: ${user.gold}\n` +
        `🍖 Еда: ${user.food || 0}\n` +
        `🪙 Монеты: ${user.coins || 0}\n\n` +
        `📊 Курсы за 1 шт.:\n` +
        `🍖 Еда: продажа ${PRICES.sell.food}💰, покупка ${foodBuy}💰\n` +
        `🪙 Монеты: продажа ${PRICES.sell.coins}💰, покупка ${coinBuy}💰\n` +
        `💸 Комиссия: ${Math.round(economy.marketCommission * 100)}%\n` +
        `📈 Бонус продаж: +${Math.round((economy.sellBonus - 1) * 100)}%\n\n` +
        `👇 Выбери действие:`;

    return sendOrEdit(ctx, text, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🍖 Продать еду', callback_data: 'market_sell_food' }],
                [{ text: '🪙 Продать монеты', callback_data: 'market_sell_coins' }],
                [{ text: '🍖 Купить еду', callback_data: 'market_buy_food' }],
                [{ text: '🪙 Купить монеты', callback_data: 'market_buy_coins' }],
                [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
            ]
        }
    });
}

async function sellResource(ctx, resource) {
    const user = getUser(ctx.from.id);
    const price = PRICES.sell[resource];
    const amount = 1;

    if (!price) {
        return ctx.reply('❌ Такого ресурса нет.');
    }

    if ((user[resource] || 0) < amount) {
        return ctx.reply(
            `❌ У тебя только ${user[resource] || 0} ${resource}.`
        );
    }

    const payout = calculateMarketSellPayout(user, amount, price);
    const fee = payout.fee;
    const earned = payout.earned;

    user[resource] -= amount;
    user.gold += earned;

    saveUser(ctx.from.id, user);

    await ctx.answerCbQuery(
        `✅ Продано ${amount} ${resource} за ${earned}💰`
    );

    await ctx.reply(
        `✅ Продано ${amount} ${resource} за ${earned} золота.\n` +
        `💸 Комиссия: ${fee} золота`
    );

    await showMarketMenu(ctx);
}

async function buyResource(ctx, resource) {
    const user = getUser(ctx.from.id);
    const price = PRICES.buy[resource];
    const amount = 1;

    if (!price) {
        return ctx.reply('❌ Такого ресурса нет.');
    }

    const cost = calculateMarketBuyCost(user, amount, price);

    if (user.gold < cost) {
        return ctx.reply(
            `❌ Нужно ${cost} золота, у тебя ${user.gold}.`
        );
    }

    user.gold -= cost;
    user[resource] = (user[resource] || 0) + amount;

    saveUser(ctx.from.id, user);

    await ctx.answerCbQuery(
        `✅ Куплено ${amount} ${resource} за ${cost}💰`
    );

    await ctx.reply(
        `✅ Куплено ${amount} ${resource} за ${cost} золота.`
    );

    await showMarketMenu(ctx);
}

module.exports = {
    showMarketMenu,
    sellResource,
    buyResource,
    sellFood: async (ctx) => sellResource(ctx, 'food'),
    sellCoins: async (ctx) => sellResource(ctx, 'coins'),
    buyFood: async (ctx) => buyResource(ctx, 'food'),
    buyCoins: async (ctx) => buyResource(ctx, 'coins')
};