const marketActions = require('../actions/marketActions');
const { getUser, saveUser } = require('../utils/storage');
const { getSoldiers, sendOrEdit, addWarriors } = require('../utils/helpers');
const { showMainMenu } = require('../handlers/menu');
const { updateQuestProgress, claimQuestReward } = require('../utils/quests');
const { hireArmy } = require('../service/armyService');
const tutorial = require('../handlers/tutorial');

module.exports = (bot) => {
    bot.action('market_sell_food', marketActions.sellFood);
    bot.action('market_sell_coins', marketActions.sellCoins);
    bot.action('market_buy_food', marketActions.buyFood);
    bot.action('market_buy_coins', marketActions.buyCoins);

    bot.action('guide', async (ctx) => {
        await require('./guide').show(ctx, 'main');
    });

    bot.action(/^guide:(main|resources|buildings|economy|army|boss|trade)$/, async (ctx) => {
        await require('./guide').show(ctx, ctx.match[1]);
    });

    bot.action('back_to_menu', async (ctx) => {
        await ctx.answerCbQuery();
        await showMainMenu(ctx);
    });

    bot.action('back_to_city', require('../hears/city').show);

    bot.action('build_menu', require('../hears/build').showMenu);
    bot.action(/^build_(.+)/, require('../actions/buildActions').build);

    bot.action('collect_income', require('../hears/income').collect);
    bot.action('copy_ref', require('../actions/referralActions').copy);

    bot.action('boss_start', require('../actions/bossActions').start);


    bot.action(/^hire_warriors_(\d+)$/, async (ctx) => {
        const count = parseInt(ctx.match[1]);
        const userId = ctx.from.id;
        const user = getUser(userId);
        const success = hireArmy(user, 'warriors', count);

        if (!success) {
            return ctx.reply('❌ Не удалось нанять мечников. Нужна 1 уровень ветки армии, достаточно золота/еды и свободный лимит.');
        }

        await sendOrEdit(
            ctx,
            `✅ Нанято мечников: ${count}\n🪖 Всего солдат: ${getSoldiers(user)}\n💰 Золото: ${user.gold}\n🍖 Еда: ${user.food}`,
            { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'barracks_show' }]] } }
        );
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
    bot.action('about_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/about').show(ctx);
    });
    bot.action('barracks_show', async (ctx) => {
        await require('../hears/barracks').show(ctx);
    });

    bot.action('olymp_show', async (ctx) => {
        await ctx.answerCbQuery();
        await require('../hears/olymp').show(ctx);
    });
    bot.action('port_show', async(ctx) => {
        await ctx.answerCbQuery()
        await require('../handlers/port').port(ctx)
    })
    bot.action('branch_show', async(ctx) => {
        await ctx.answerCbQuery()
        await require('../handlers/branch')(ctx)
    })
    bot.action('training_show', async(ctx) => {
        await ctx.answerCbQuery()
        await require('../handlers/trainingArmy').show(ctx)
    });
    bot.action(/^training_(.+)$/, async (ctx) => {
        await ctx.answerCbQuery();
        const type = ctx.match[1];
        const user = getUser(ctx.from.id);
        const success = hireArmy(user, type, 1);
        if (!success) {
            return ctx.reply('❌ Не удалось нанять войско.');
        }
        const buttons = [
            [{ text: '🔙 Назад', callback_data: 'training_show' }],
        ];
        await sendOrEdit(ctx, '✅ Войско успешно нанято!', { reply_markup: { inline_keyboard: buttons } });
    });
    // ===== ОБУЧЕНИЕ =====



    bot.action('tutorial_next', tutorial.nextStep);
    bot.action('tutorial_skip', tutorial.skipTutorial);
    bot.action('tutorial_finish', tutorial.finishTutorial);
    bot.action('tutorial_restart', tutorial.restartTutorial);
};