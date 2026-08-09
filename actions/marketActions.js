const market = require('../hears/market');

module.exports = {
    sellFood: async (ctx) => {
        await market.sellResource(ctx, 'food');
    },
    sellCoins: async (ctx) => {
        await market.sellResource(ctx, 'coins');
    },
    buyFood: async (ctx) => {
        await market.buyResource(ctx, 'food');  // ✅ buyResource есть
    },
    buyCoins: async (ctx) => {
        await market.buyResource(ctx, 'coins'); // ✅ buyResource есть
    }
};