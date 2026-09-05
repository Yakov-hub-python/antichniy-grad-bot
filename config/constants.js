// ============================================================
// 1️⃣ СТОИМОСТЬ ЗДАНИЙ
// ============================================================

const BUILDING_COSTS = {
    // ===== ЖИЛЫЕ =====
    hut: { gold: 20, coins: 0, iron: 0, level: 1 },
    house: { gold: 100, coins: 0, iron: 0, level: 5 },
    tavern: { gold: 150, coins: 0, iron: 0, level: 3 },
    
    // ===== СЕЛЬСКОХОЗЯЙСТВЕННЫЕ =====
    farm: { gold: 25, coins: 0, iron: 0, level: 1 },
    field: { gold: 0, coins: 1000, iron: 0, level: 5 },
    
    // ===== ДОБЫВАЮЩИЕ =====
    mine: { gold: 40, coins: 0, iron: 0, level: 1 },
    quarry: { gold: 0, coins: 750, iron: 0, level: 3 },
    
    // ===== ПРОИЗВОДСТВЕННЫЕ =====
    mint: { gold: 80, coins: 0, iron: 0, level: 1 },
    mint_factory: { gold: 0, coins: 5000, iron: 0, level: 10 },
    
    // ===== ТОРГОВЫЕ =====
    bank:{ gold: 0, coins: 500, iron: 0, level: 10, economyLevel: 2 },
    // ===== ОСОБЫЕ =====
    acropolis: { gold: 0, coins: 500, iron: 0, level: 5 },
};

// ============================================================
// 2️⃣ НАЗВАНИЯ ЗДАНИЙ
// ============================================================

const BUILDING_NAMES = {
    // Жилые
    hut: '🏠 Хижина',
    house: '🏠 Дом',
    tavern: '🍺 Таверна',
    
    // Сельскохозяйственные
    farm: '🌾 Ферма',
    field: '🌾 Поле',
    
    // Добывающие
    mine: '⛏️ Шахта',
    quarry: '⛰️ Карьер',
    
    // Производственные
    mint: '🪙 Монетный двор',
    mint_factory: '🏭 Фабрика монет',
    
    // Торговые
    bank: '🏛️ Банк',
    
    // Особые
    acropolis: '🏛️ Акрополь',
};

// ============================================================
// 3️⃣ ОПИСАНИЯ ЗДАНИЙ
// ============================================================

const BUILDING_DESCRIPTIONS = {
    hut: 'Простое жильё. Даёт +3 жителя.',
    house: 'Просторный дом. Даёт +5 жителей.',
    tavern: 'Место встреч. Даёт +2 жителя и +1 еду за сбор.',
    
    farm: 'Поле для выращивания еды. Даёт +5 еды за сбор.',
    field: 'Плодородное поле. Даёт +250 еды за сбор.',
    
    mine: 'Добыча золота. Даёт +6 золота за сбор.',
    quarry: 'Добыча руды. Даёт +200 золота за сбор.',
    
    mint: 'Чеканка монет. Даёт +6 монет за сбор.',
    mint_factory: 'Промышленное производство. Даёт +500 монет за сбор.',

    bank: 'Финансовый центр. +5% к доходу с монет за каждый банк.',
    
    acropolis: 'Священный холм. +10% ко всем доходам навсегда.',
};

// ============================================================
// 4️⃣ КАТЕГОРИИ ЗДАНИЙ (ДЛЯ КРАСИВОГО МЕНЮ)
// ============================================================

const BUILDING_CATEGORIES = {
    '🏠 Жилые': ['hut', 'house', 'tavern'],
    '🌾 Сельскохозяйственные': ['farm', 'field'],
    '⛏️ Добывающие': ['mine', 'quarry'],
    '🏪 Торговые': ['bank'],
    '🏭 Производственные': ['mint', 'mint_factory',],
    '🏛️ Особые': ['acropolis'],
};

// ============================================================
// 5️⃣ ЛИМИТЫ ЗДАНИЙ
// ============================================================

const MAX_BUILDINGS = {
    hut: 200,
    house: 500,
    tavern: 30,
    farm: 150,
    field: 80,
    mine: 150,
    quarry: 80,
    bank: 10,
    acropolis: 1,
};

// ============================================================
// 6️⃣ ДОХОД ЗДАНИЙ (БАЗОВЫЙ)
// ============================================================

const BUILDING_INCOME = {
    hut: { citizens: 3 },
    house: { citizens: 5 },
    tavern: { citizens: 2, food: 1 },
    
    farm: { food: 5 },
    field: { food: 250 },
    
    mine: { gold: 6 },
    quarry: { gold: 200 },
    
    mint: { coins: 6 },
    mint_factory: { coins: 500 },
    
    bank: { coinsBonus: 0.05 },
    
    acropolis: { incomeBonus: 0.1 },
};

// ============================================================
// 7️⃣ МАКСИМАЛЬНОЕ КОЛИЧЕСТВО СОЛДАТ
// ============================================================

const MAX_SOLDIERS = 10000;

// ============================================================
// 8️⃣ ИНТЕРВАЛЫ СБОРА ДОХОДА
// ============================================================

const INCOME_INTERVALS = {
    regular: 90 * 1000,  // 1.5 минуты
    vip: 60 * 1000,      // 1 минута
};

// ============================================================
// Ветви, пока только экономика
// ============================================================
const TECH_TREE = {
    economy: {
        name: '🏛️ Экономика',
        levels: {
            1: { cost: { gold: 1000, coins: 0 }, requirements: { level: 5 }, cooldown: 3600000, unlocks: ['market'], bonus: { incomeMultiplier: 1.00 } },
            2: { cost: { gold: 2500, coins: 50 }, requirements: { level: 10 }, cooldown: 720000, unlocks: ['bank'], bonus: { incomeMultiplier: 1.05 } },
            3: { cost: { gold: 5000, coins: 100 }, requirements: { level: 15 }, cooldown: 1000, unlocks: ['port'], bonus: { incomeMultiplier: 1.10 } },
            4: { cost: { gold: 10000, coins: 200 }, requirements: { level: 20 }, cooldown: 21600000, unlocks: ['tax_break'], bonus: { taxReduction: 0.10 } },
            5: { cost: { gold: 20000, coins: 500 }, requirements: { level: 25 }, cooldown: 28800000, unlocks: ['trade_route'], bonus: { sellBonus: 1.15 } },
            6: { cost: { gold: 40000, coins: 1000 }, requirements: { level: 30 }, cooldown: 43200000, unlocks: ['factory'], bonus: { incomeMultiplier: 1.20 } },
            7: { cost: { gold: 80000, coins: 2000 }, requirements: { level: 35 }, cooldown: 57600000, unlocks: ['guild'], bonus: { incomeMultiplier: 1.25 } },
            8: { cost: { gold: 160000, coins: 4000 }, requirements: { level: 40 }, cooldown: 72000000, unlocks: ['mint_house'], bonus: { coinMultiplier: 1.20 } },
            9: { cost: { gold: 320000, coins: 8000 }, requirements: { level: 45 }, cooldown: 86400000, unlocks: ['economic_miracle'], bonus: { incomeMultiplier: 1.30, activeAbility: 'economic_miracle' } },
            10: { cost: { gold: 640000, coins: 16000 }, requirements: { level: 50 }, cooldown: 172800000, unlocks: ['financial_empire'], bonus: { incomeMultiplier: 1.50 } }
        }
    }
};

// ============================================================
// 9️⃣ НАЛОГ НА БОГАТСТВО
// ============================================================

const WEALTH_TAX = {
    threshold: 500000,   // монет
    rate: 0.005,         // 0.5%
};

// ============================================================
// 🔟 ГЛАВНОЕ МЕНЮ
// ============================================================

const MAIN_MENU = {
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
};

// ============================================================
// 1️⃣1️⃣ ЭКСПОРТ
// ============================================================

module.exports = {
    BUILDING_COSTS,
    BUILDING_NAMES,
    BUILDING_DESCRIPTIONS,
    BUILDING_CATEGORIES,
    MAX_BUILDINGS,
    BUILDING_INCOME,
    MAX_SOLDIERS,
    INCOME_INTERVALS,
    WEALTH_TAX,
    MAIN_MENU,
    TECH_TREE
};