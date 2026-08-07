const { getUser } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { getSoldiers } = require('../utils/helpers');

module.exports = (bot) => {
    bot.hears('ℹ️ О боте', async (ctx) => {
        await ctx.reply(
            `🏛️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n` +
            `Версия: MVP 1.1\n` +
            `Разработчик: @DEDAYSON\n\n` +
            `Исходник: https://github.com/Yakov-hub-python/antichniy-grad-bot\n\n` +
            `📖 Экономическая стратегия в Telegram.\n` +
            `Строй город, добывай ресурсы, сражайся с боссами и приводи друзей!`,
            MAIN_MENU
        );
    });

    bot.hears('🏙️ Город', require('../hears/city').show);
    bot.hears('👥 Пригласить друга', require('../hears/referral').show);
    bot.hears('🎁 Ежедневный бонус', require('../hears/daily').get);
    bot.hears('🛒 Магазин', require('../hears/shop').show);
    bot.hears('⚔️ Босс', require('../hears/boss').show);
    bot.hears('🏆 Олимп', require('../hears/olymp').show);
    bot.hears('🛒 Рынок', require('../hears/market').showMarketMenu);
    bot.hears('🪖 Казармы', async (ctx) => {
        const user = getUser(ctx.from.id);
        const soldiers = getSoldiers(user);
        await ctx.reply(
            `🪖 КАЗАРМЫ\n\n` +
            `🪖 Солдаты: ${soldiers}\n` +
            `🏗️ Казарм: ${user.buildings.barracks}\n` +
            `💰 Цена: 50 золота\n\n` +
            `⚔️ Каждый солдат даёт 5 урона боссам.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🪖 Построить казарму (50💰)', callback_data: 'build_barracks' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    });
};