const marketActions = require('../actions/marketActions');
const { getUser, saveUser } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { getSoldiers } = require('../utils/helpers');

module.exports = (bot) => {
    bot.action('market_sell_food', marketActions.sellFood);
    bot.action('market_sell_coins', marketActions.sellCoins);
    bot.action('market_buy_food', marketActions.buyFood);
    bot.action('market_buy_coins', marketActions.buyCoins);
    bot.action('back_to_menu', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply(`🏛️ Главное меню`, MAIN_MENU);
    });
    bot.action('back_to_city', require('../hears/city').show);
    bot.action('build_menu', require('../hears/build').showMenu);
    bot.action(/^build_(.+)/, require('../actions/buildActions').build);
    bot.action('collect_income', require('../hears/income').collect);
    bot.action('copy_ref', require('../actions/referralActions').copy);
    bot.action('boss_personal', require('../actions/bossActions').attackPersonal);
    bot.action('boss_global', require('../actions/bossActions').attackGlobal);
    bot.action('build_barracks', async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        if (user.gold < 50) return ctx.reply('❌ Нужно 50 золота!');
        user.gold -= 50;
        user.buildings.barracks += 1;
        const total = Object.values(user.buildings).reduce((a, b) => a + b, 0);
        user.level = total + 1;
        saveUser(userId, user);
        await ctx.reply(`🪖 Казарма построена! Солдат: ${getSoldiers(user)}`);
    });
};