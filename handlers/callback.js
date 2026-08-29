const marketActions = require('../actions/marketActions');
const { getUser, saveUser } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { getSoldiers } = require('../utils/helpers');
const { showMainMenu } = require('../handlers/menu');
const { updateQuestProgress, claimQuestReward } = require('../utils/quests');

module.exports = (bot) => {
    bot.action('market_sell_food', marketActions.sellFood);
    bot.action('market_sell_coins', marketActions.sellCoins);
    bot.action('market_buy_food', marketActions.buyFood);
    bot.action('market_buy_coins', marketActions.buyCoins);

    bot.action('back_to_menu', async (ctx) => {
        await ctx.answerCbQuery();
        await showMainMenu(ctx);
    });

    bot.action('back_to_city', require('../hears/city').show);

    bot.action('build_menu', require('../hears/build').showMenu);
    bot.action(/^build_(.+)/, require('../actions/buildActions').build);

    bot.action('collect_income', require('../hears/income').collect);
    bot.action('copy_ref', require('../actions/referralActions').copy);

    bot.action('boss_personal', require('../actions/bossActions').attackPersonal);
    bot.action('boss_global', require('../actions/bossActions').attackGlobal);

    bot.action(/^hire_warriors_(\d+)$/, async (ctx) => {
        const count = parseInt(ctx.match[1]);
        const userId = ctx.from.id;
        const user = getUser(userId);
        const cost = count * 6;

        if (user.coins < cost) {
            return ctx.reply(`❌ Нужно ${cost} монет!`);
        }

        user.coins -= cost;
        user.soldiers += count;
        saveUser(userId, user);

        const questResult = updateQuestProgress(user, 'spend', cost);
        if (questResult?.completed) {
            await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\n🏆 Награда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
            claimQuestReward(user);
        }

        await ctx.reply(`🪖 ${count} солдат нанято! Солдат: ${getSoldiers(user)}`);
    });

    bot.action('city_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/city').show(ctx);
    });

    bot.action('boss_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/boss').show(ctx);
    });

    bot.action('market_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/market').showMarketMenu(ctx);
    });

    bot.action('referral_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/referral').show(ctx);
    });

    bot.action('daily_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/daily').get(ctx);
    });

    bot.action('barracks_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/barracks').show(ctx);
    });

    bot.action('olymp_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/olymp').show(ctx);
    });

    bot.action('about_show', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply(
            '🏛️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n' +
            'Версия: 1.5.1\n' +
            'Разработчик: @DEDAYSON (https://t.me/DEDAYSON)\n\n' +
            '📖 О ПРОЕКТЕ\n' +
            'Экономическая стратегия в Telegram.\n' +
            'Строй свой город, добывай ресурсы,\n' +
            'сражайся с боссами и приводи друзей!\n\n' +
            '🔗 ИСХОДНЫЙ КОД\n' +
            'https://github.com/Yakov-hub-python/antichniy-grad-bot\n\n' +
            '🙏 БЛАГОДАРНОСТИ\n' +
            '• @KimiAntonelliF1DriverOficcial — за тестирование и поддержку\n' +
            '• @MAMA_I_SUAY — за первый фидбек\n' +
            '• всем игрокам — за вашу активность!\n\n' +
            '📢 КАНАЛ И ЧАТ\n' +
            'Канал: @antichniy_grad\n' +
            'Чат: @antichniy_grad_chat'
        );
    });
};