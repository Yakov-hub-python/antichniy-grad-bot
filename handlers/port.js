const { getUser, saveUser } = require('../utils/storage');
const { createOffer, getActiveOffers, getOfferById, buyOffer, cancelOffer, cleanExpiredOffers } = require('../utils/portStorage');

// Автоматическая очистка просроченных лотов при вызове любой команды
cleanExpiredOffers();

module.exports = {
    // /port — показать активные лоты
    port: async (ctx) => {
        const user = getUser(ctx.from.id);
        if (!user) return ctx.reply('❌ Сначала запусти бота командой /start');

        // Проверяем, открыт ли порт (3 уровень экономики)
        if ((user.techTree?.economy || 0) < 3) {
            return ctx.reply('❌ Порт откроется на 3 уровне ветки экономики.');
        }

        const offers = getActiveOffers(10, 0);
        if (offers.length === 0) {
            return ctx.reply('📭 В порту нет активных лотов. Выставь свой через /sell_port');
        }

        let reply = '🏛️ ПОРТ (активные лоты)\n\n';
        offers.forEach((o, i) => {
            reply += `${i+1}. 📦 ${o.resource} ${o.amount} шт. по ${o.pricePerUnit} ${o.currency}/шт.\n`;
            reply += `💰 Итого: ${o.totalPrice} ${o.currency}\n`;
            reply += `👤 Продавец: ${o.sellerId}\n`;
            reply += `🆔 ID: ${o.id}\n\n`;
        });
        reply += 'Используй /buy_port ID чтобы купить лот.';

        ctx.reply(reply);
    },

    // /sell_port <ресурс> <количество> <цена_за_единицу> <валюта>
    sell_port: async (ctx) => {
        const args = ctx.message.text.split(' ');
        if (args.length < 5) {
            return ctx.reply(
                '❌ Используй: /sell_port ресурс количество цена_за_ед валюта\n' +
                'Пример: /sell_port food 100 2 gold\n' +
                'Доступные ресурсы: food, gold, coins, iron, metal\n' +
                'Доступные валюты: gold, coins'
            );
        }

        const resource = args[1];
        const amount = parseInt(args[2]);
        const pricePerUnit = parseInt(args[3]);
        const currency = args[4].toLowerCase();

        if (!['food', 'gold', 'coins', 'iron', 'metal'].includes(resource)) {
            return ctx.reply('❌ Доступные ресурсы: food, gold, coins, iron, metal');
        }
        if (currency !== 'gold' && currency !== 'coins') {
            return ctx.reply('❌ Валюта должна быть gold или coins');
        }
        if (amount <= 0 || pricePerUnit <= 0) {
            return ctx.reply('❌ Количество и цена должны быть положительными числами.');
        }

        const user = getUser(ctx.from.id);
        if (!user) return ctx.reply('❌ Сначала запусти бота командой /start');

        if ((user.techTree?.economy || 0) < 3) {
            return ctx.reply('❌ Порт откроется на 3 уровне ветки экономики.');
        }

        // Проверяем наличие ресурса (но не списываем)
        if ((user[resource] || 0) < amount) {
            return ctx.reply(`❌ У тебя только ${user[resource] || 0} ${resource}.`);
        }

        // Создаём лот (ресурс пока остаётся у продавца)
        const offer = createOffer(ctx.from.id, resource, amount, pricePerUnit, currency);

        ctx.reply(
            `✅ Лот выставлен!\n` +
            `🆔 ID: ${offer.id}\n` +
            `📦 ${resource} ${amount} шт. по ${pricePerUnit} ${currency}/шт.\n` +
            `💰 Итого: ${offer.totalPrice} ${currency}\n` +
            `⏳ Действует 48 часов.`
        );
    },

    // /buy_port <ID>
    buy_port: async (ctx) => {
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            return ctx.reply('❌ Используй: /buy_port ID_лота\nПример: /buy_port offer_1700000000_abcd');
        }
        const offerId = args[1];

        const buyer = getUser(ctx.from.id);
        if (!buyer) return ctx.reply('❌ Сначала запусти бота командой /start');

        // Проверяем, что покупатель не продавец
        const offer = getOfferById(offerId);
        if (!offer) return ctx.reply('❌ Предложение не найдено.');
        if (offer.sellerId === ctx.from.id) {
            return ctx.reply('❌ Нельзя купить свой собственный лот.');
        }

        // Используем функцию buyOffer для проверки статуса
        const result = buyOffer(offerId, ctx.from.id);
        if (result.error) return ctx.reply(result.error);

        // Проверяем наличие валюты у покупателя
        const currency = offer.currency;
        if ((buyer[currency] || 0) < offer.totalPrice) {
            return ctx.reply(`❌ Не хватает ${offer.totalPrice} ${currency}. У тебя ${buyer[currency] || 0}.`);
        }

        // Получаем продавца
        const seller = getUser(offer.sellerId);
        if (!seller) {
            return ctx.reply('❌ Продавец не найден. Возможно, он удалил аккаунт.');
        }

        // Проверяем, что у продавца ещё есть ресурс
        if ((seller[offer.resource] || 0) < offer.amount) {
            // Откат: помечаем лот как отменённый
            cancelOffer(offerId, offer.sellerId);
            return ctx.reply('❌ У продавца больше нет этого ресурса. Лот отменён.');
        }

        // Проводим транзакцию
        // Списываем валюту у покупателя
        buyer[currency] -= offer.totalPrice;
        // Добавляем ресурс покупателю
        buyer[offer.resource] = (buyer[offer.resource] || 0) + offer.amount;

        // Списываем ресурс у продавца
        seller[offer.resource] -= offer.amount;
        // Добавляем валюту продавцу
        seller[currency] = (seller[currency] || 0) + offer.totalPrice;

        // Помечаем лот как проданный
        const db = require('../utils/portStorage');
        const offerDb = db.readOffers();
        const off = offerDb.offers.find(o => o.id === offerId);
        if (off) off.status = 'sold';
        db.writeOffers(offerDb);

        // Сохраняем изменения
        saveUser(ctx.from.id, buyer);
        saveUser(offer.sellerId, seller);

        ctx.reply(
            `✅ Покупка завершена!\n` +
            `📦 Ты получил ${offer.amount} ${offer.resource}\n` +
            `💰 Потрачено: ${offer.totalPrice} ${currency}`
        );
    },

    // /my_offers — показать свои лоты
    my_offers: async (ctx) => {
        const user = getUser(ctx.from.id);
        if (!user) return ctx.reply('❌ Сначала запусти бота командой /start');

        const offers = getActiveOffers(50, 0).filter(o => o.sellerId === ctx.from.id);
        if (offers.length === 0) {
            return ctx.reply('📭 У тебя нет активных лотов.');
        }

        let reply = '📦 ТВОИ ЛОТЫ\n\n';
        offers.forEach((o) => {
            reply += `🆔 ID: ${o.id}\n`;
            reply += `📦 ${o.resource} ${o.amount} шт. по ${o.pricePerUnit} ${o.currency}/шт.\n`;
            reply += `💰 Итого: ${o.totalPrice} ${o.currency}\n`;
            reply += `⏳ Истекает: ${new Date(o.expiresAt).toLocaleString()}\n\n`;
        });
        reply += 'Используй /cancel_offer ID чтобы отменить лот.';

        ctx.reply(reply);
    },

    // /cancel_offer <ID>
    cancel_offer: async (ctx) => {
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            return ctx.reply('❌ Используй: /cancel_offer ID_лота\nПример: /cancel_offer offer_1700000000_abcd');
        }
        const offerId = args[1];

        const result = cancelOffer(offerId, ctx.from.id);
        if (result.error) return ctx.reply(result.error);

        // Возвращаем ресурс продавцу
        const user = getUser(ctx.from.id);
        const offer = getOfferById(offerId);
        if (offer && offer.status === 'cancelled') {
            user[offer.resource] = (user[offer.resource] || 0) + offer.amount;
            saveUser(ctx.from.id, user);
            ctx.reply(`✅ Лот отменён. ${offer.amount} ${offer.resource} возвращено тебе.`);
        } else {
            ctx.reply('✅ Лот отменён.');
        }
    }
};