module.exports = {
    BUILDING_COSTS: {
        hut: 20,
        farm: 25,
        mine: 60,
        mint: 120,
    },
    BUILDING_NAMES: {
        hut: '🏠 Хижина',
        farm: '🌾 Ферма',
        mine: '⛏️ Шахта',
        mint: '🪙 Монетный двор'
    },
    INCOME_INTERVALS: {
        regular: 2 * 60 * 1000,
        vip: 60 * 1000 + 30 * 1000
    },
    MAIN_MENU: {
        reply_markup: {
            keyboard: [
                ['ℹ️ О боте'],
                ['🏙️ Город', '👥 Пригласить друга'],
                ['🎁 Ежедневный бонус'],
                ['🛒 Магазин', '⚔️ Босс'],
                ['🏆 Олимп', '🪖 Казарма']
            ],
        resize_keyboard: true
        }
    }
};