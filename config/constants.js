module.exports = {
    BUILDING_COSTS: {
        hut: 20,
        farm: 10,
        mine: 30,
        mint: 70,
        market: 200,
        barracks: 50
    },
    BUILDING_NAMES: {
        hut: '🏠 Хижина',
        farm: '🌾 Ферма',
        mine: '⛏️ Шахта',
        mint: '🪙 Монетный двор',
        market: '🏪 Рынок',
        barracks: '🪖 Казарма'
    },
    INCOME_INTERVALS: {
        regular: 5 * 60 * 1000,
        vip: 3 * 60 * 1000
    },
    MAIN_MENU: {
        reply_markup: {
            keyboard: [
                ['ℹ️ О боте'],
                ['🏙️ Город','👥 Пригласить друга'],
                ['🎁 Ежедневный бонус'],
                ['🛒 Магазин', '⚔️ Босс'],
                ['🏆 Олимп', '🪖 Казармы']
            ],
            resize_keyboard: true
        }
    }
};