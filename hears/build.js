const { getUser } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES, BUILDING_DESCRIPTIONS, BUILDING_CATEGORIES } = require('../config/constants');
const { getProgressivePrice } = require('../utils/helpers');

module.exports = {
    showMenu: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);

        let menu = `🏗️ СТРОИТЕЛЬСТВО\n`;
        menu += `💰 Золото: ${user.gold} | 🪙 Монет: ${user.coins} | ⛏️ Железа: ${user.iron || 0}\n`;
        menu += `👑 Уровень: ${user.level}\n\n`;

        const buttons = [];

        // Проходим по категориям
        for (const [categoryName, buildingKeys] of Object.entries(BUILDING_CATEGORIES)) {
            // Заголовок категории (только текст, не кнопка)
            menu += `📌 ${categoryName}:\n`;

            // Собираем кнопки для этой категории
            const categoryButtons = [];
            for (const key of buildingKeys) {
                const baseCost = BUILDING_COSTS[key];
                const count = user.buildings[key] || 0;
                const price = getProgressivePrice(baseCost.gold || 0, count);
                const priceCoins = getProgressivePrice(baseCost.coins || 0, count);
                const priceIron = getProgressivePrice(baseCost.iron || 0, count);
                const desc = BUILDING_DESCRIPTIONS[key] || '';

                // Цена в тексте
                let priceText = '';
                if (price > 0) priceText += `${price}💰 `;
                if (priceCoins > 0) priceText += `${priceCoins}🪙 `;
                if (priceIron > 0) priceText += `${priceIron}⛏️ `;

                // Добавляем в меню (текст)
                menu += `  ${BUILDING_NAMES[key]} (${count} шт.) — ${priceText}(${baseCost.level} ур)\n`;
                menu += `     ${desc}\n\n`;

                // Кнопка: короткое название + цена
                let shortPrice = '';
                if (price > 0) shortPrice += `${price}💰`;
                if (priceCoins > 0) shortPrice += ` ${priceCoins}🪙`;
                if (priceIron > 0) shortPrice += ` ${priceIron}⛏️`;

                categoryButtons.push({
                    text: `${BUILDING_NAMES[key]} (${shortPrice})`,
                    callback_data: `build_${key}`
                });
            }

            // Добавляем кнопки категории по 2 в ряд
            for (let i = 0; i < categoryButtons.length; i += 2) {
                const row = [];
                row.push(categoryButtons[i]);
                if (i + 1 < categoryButtons.length) {
                    row.push(categoryButtons[i + 1]);
                }
                buttons.push(row);
            }

            // Пустая строка между категориями
            menu += '\n';
        }

        // Кнопка назад
        buttons.push([{ text: '🔙 Назад', callback_data: 'back_to_city' }]);

        await ctx.reply(menu, {
            reply_markup: {
                inline_keyboard: buttons,
                resize_keyboard: true
            }
        });
    }
};