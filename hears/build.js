const { getUser } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES } = require('../config/constants');
const { getBuildingDiscount } = require('../utils/helpers');

module.exports = {
    showMenu: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);

        let menu = `🏗️ СТРОИТЕЛЬСТВО\n💰 Золото: ${user.gold}\n\n`;
        for (const [key, cost] of Object.entries(BUILDING_COSTS)) {
            menu += `${BUILDING_NAMES[key]} — ${cost}💰\n`;
        }
        const buttons = Object.keys(BUILDING_COSTS).map(key => [
            { text: `${BUILDING_NAMES[key]} (${BUILDING_COSTS[key]}💰)`, callback_data: `build_${key}` }
        ]);
        buttons.push([{ text: '🔙 Назад', callback_data: 'back_to_city' }]);

        await ctx.reply(menu, { reply_markup: { inline_keyboard: buttons } });
    }
};