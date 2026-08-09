module.exports = {
    BUILDING_COSTS: {
        hut: { gold: 20, coins: 0, level: 1 },
        farm: { gold: 25, coins: 0, level: 1 },
        mine: { gold: 60, coins: 0, level: 1 },
        mint: { gold: 120, coins: 0, level: 1 },
        market: { gold: 200, coins: 0, level: 3 },
        barracks: { gold: 300, coins: 0, level: 5 },
        field: { gold: 0, coins: 1000, level: 5 },
        quarry: { gold: 0, coins: 750, level: 3 },
        mint_factory: { gold: 0, coins: 5000, level: 10 }
    },
    BUILDING_NAMES: {
        hut: '🏠 Хижина',
        farm: '🌾 Ферма',
        mine: '⛏️ Шахта',
        mint: '🪙 Монетный двор',
        market: '🏪 Рынок',
        barracks: '🪖 Казарма',
        field: '🌾 Поле',
        quarry: '⛰️ Карьер',
        mint_factory: '🏭 Фабрика монет'
    },
    INCOME_INTERVALS: {
        regular: 90 * 1000,  // 1.5 минуты (ИСПРАВЛЕНО)
        vip: 60 * 1000       // 1 минута (ИСПРАВЛЕНО)
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