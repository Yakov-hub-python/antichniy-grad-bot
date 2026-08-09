const { getUser } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES } = require('../config/constants');

module.exports = {
    showMenu: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);

        let menu = `🏗️ СТРОИТЕЛЬСТВО\n💰 Золото: ${user.gold}\n🪙 Монет: ${user.coins}\n👑 Уровень: ${user.level}\n\n`;

        // Формируем меню
        for (const [key, cost] of Object.entries(BUILDING_COSTS)) {
            let priceText = '';
            if (cost.gold > 0 && cost.coins > 0) {
                priceText = `${cost.gold}💰 + ${cost.coins}🪙`;
            } else if (cost.gold > 0) {
                priceText = `${cost.gold}💰`;
            } else {
                priceText = `${cost.coins}🪙`;
            }
            menu += `${BUILDING_NAMES[key]} — ${priceText} (${cost.level} ур)\n`;
        }

        // Формируем кнопки (ИСПРАВЛЕНО)
        const buttons = Object.keys(BUILDING_COSTS).map(key => {
            const cost = BUILDING_COSTS[key];
            let priceText = '';
            if (cost.gold > 0 && cost.coins > 0) {
                priceText = `${cost.gold}💰+${cost.coins}🪙`;
            } else if (cost.gold > 0) {
                priceText = `${cost.gold}💰`;
            } else {
                priceText = `${cost.coins}🪙`;
            }
            return [{ 
                text: `${BUILDING_NAMES[key]} (${priceText})`,
                callback_data: `build_${key}` 
            }];
        });
        
        buttons.push([{ text: '🔙 Назад', callback_data: 'back_to_city' }]);

        await ctx.reply(menu, { reply_markup: { inline_keyboard: buttons } });
    }
};