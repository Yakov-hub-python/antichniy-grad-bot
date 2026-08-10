const marketActions = require('../actions/marketActions');
const { getUser, saveUser } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { getSoldiers } = require('../utils/helpers');
const { showMainMenu } = require('../handlers/menu');

module.exports = (bot) => {
    // ===== РЫНОК =====
    bot.action('market_sell_food', marketActions.sellFood);
    bot.action('market_sell_coins', marketActions.sellCoins);
    bot.action('market_buy_food', marketActions.buyFood);
    bot.action('market_buy_coins', marketActions.buyCoins);

    // ===== НАВИГАЦИЯ =====
    bot.action('back_to_menu', async (ctx) => {
        await ctx.answerCbQuery();
        await showMainMenu(ctx);
    });

    bot.action('back_to_city', require('../hears/city').show);

    // ===== СТРОИТЕЛЬСТВО =====
    bot.action('build_menu', require('../hears/build').showMenu);
    bot.action(/^build_(.+)/, require('../actions/buildActions').build);

    // ===== ДОХОД =====
    bot.action('collect_income', require('../hears/income').collect);

    // ===== РЕФЕРАЛЫ =====
    bot.action('copy_ref', require('../actions/referralActions').copy);

    // ===== БОССЫ =====
    bot.action('boss_personal', require('../actions/bossActions').attackPersonal);
    bot.action('boss_global', require('../actions/bossActions').attackGlobal);

    // ===== НАЙМ СОЛДАТ =====
    bot.action(/^hire_warriors_(\d+)$/, async (ctx) => {
        const count = parseInt(ctx.match[1]);
        const userId = ctx.from.id;
        const user = getUser(userId);
        const cost = count * 6;
        
        if (user.coins < cost) {
            return ctx.reply(`❌ Нужно ${cost} монет!`);
        }
        
        user.coins -= cost;
        user.soldiers += count; // ❗ БЫЛО += 1, ИСПРАВЛЕНО НА += count
        saveUser(userId, user);
        
        await ctx.reply(`🪖 ${count} солдат нанято! Солдат: ${getSoldiers(user)}`);
    });

    // ============================================================
    // 1️⃣ НОВЫЕ КНОПКИ ИЗ ГЛАВНОГО МЕНЮ
    // ============================================================

    // ===== ГОРОД =====
    bot.action('city_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/city').show(ctx);
    });

    // ===== БОСС =====
    bot.action('boss_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/boss').show(ctx);
    });

    // ===== РЫНОК =====
    bot.action('market_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/market').showMarketMenu(ctx);
    });

    // ===== ДРУЗЬЯ (РЕФЕРАЛЫ) =====
    bot.action('referral_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/referral').show(ctx);
    });

    // ===== ЕЖЕДНЕВНЫЙ БОНУС =====
    bot.action('daily_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/daily').get(ctx);
    });

    // ===== КАЗАРМА =====
    bot.action('barracks_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/barracks').show(ctx);
    });

    // ===== ОЛИМП (ТОП) =====
    bot.action('olymp_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/olymp').show(ctx);
    });

    // ===== О БОТЕ =====
    bot.action('about_show', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply(
            'ℹ️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n' +
            'Версия: 1.3.5\n' +
            'Разработчик: @DEDAYSON\n\n' +
            'Экономическая стратегия в Telegram.\n' +
            'Строй, воюй, приводи друзей!'
        );
    });
};