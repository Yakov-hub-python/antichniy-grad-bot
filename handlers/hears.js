const { getUser } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { getSoldiers } = require('../utils/helpers');
const { showMainMenu } = require('../handlers/menu');

module.exports = (bot) => {
    bot.hears('ℹ️ О боте', async (ctx) => {
        await ctx.reply(
            `🏛️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n` +
            `Версия: 1.2\n` +
            `Разработчик: @DEDAYSON\n\n` +
            `Огоромная благодарность: @KimiAntonelliF1DriverOficcial\n\n` +
            `Исходник: https://github.com/Yakov-hub-python/antichniy-grad-bot\n\n` +
            `📖 Экономическая стратегия в Telegram.\n` +
            `Telegram канал: @antichniy_grad\n` +
            `Общий чат: @antichniy_chat\n` +
            `Строй город, добывай ресурсы, сражайся с боссами и приводи друзей!`
        );
        await showMainMenu(ctx);
    });

    bot.hears('🏙️ Город', require('../hears/city').show);
    bot.hears('👥 Пригласить друга', require('../hears/referral').show);
    bot.hears('🎁 Ежедневный бонус', require('../hears/daily').get);
    bot.hears('🛒 Магазин', require('../hears/shop').show);
    bot.hears('⚔️ Босс', require('../hears/boss').show);
    bot.hears('🏆 Олимп', require('../hears/olymp').show);
    bot.hears('🛒 Рынок', require('../hears/market').showMarketMenu);
    bot.hears('🪖 Казарма', async (ctx) => {
        const user = getUser(ctx.from.id);
        const soldiers = getSoldiers(user);
        await ctx.reply(
            `🪖 КАЗАРМА\n\n` +
            `🪖 Солдаты: ${soldiers}\n` + 
            `💰 Цена: 1 воин = 6 монет\n\n` +
            `⚔️ Каждый солдат даёт 5 урона боссам.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Нанять воинов', callback_data: 'hire_warriors_1' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    });
};