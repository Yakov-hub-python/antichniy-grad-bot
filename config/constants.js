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
        description: 'Развивай торговлю, строй банки и увеличивай доходы города.',
        levels: {
            1: {
                cost: { gold: 500, coins: 0 },
                requirements: { level: 5 },
                cooldown: 1 * 60 * 60 * 1000,
                unlocks: ['Рынок'],
                bonus: { incomeMultiplier: 1.00, description: 'Открывает рынок' }
            },
            2: {
                cost: { gold: 1000, coins: 20 },
                requirements: { level: 10 },
                cooldown: 2 * 60 * 60 * 1000,
                unlocks: ['Банк'],
                bonus: { incomeMultiplier: 1.05, description: 'Множитель дохода +5%' }
            },
            3: {
                cost: { gold: 2000, coins: 50 },
                requirements: { level: 15 },
                cooldown: 3 * 60 * 60 * 1000,
                unlocks: ['Порт'],
                bonus: { incomeMultiplier: 1.10, description: 'Множитель дохода +10%' }
            },
            4: {
                cost: { gold: 3500, coins: 100 },
                requirements: { level: 20 },
                cooldown: 4 * 60 * 60 * 1000,
                unlocks: ['Налоговая льгота'],
                bonus: { taxReduction: 0.10, description: 'Снижение налога на 10%' }
            },
            5: {
                cost: { gold: 5000, coins: 200 },
                requirements: { level: 25 },
                cooldown: 6 * 60 * 60 * 1000,
                unlocks: ['Торговый путь'],
                bonus: { sellBonus: 1.10, description: 'Продажи +10%' }
            },
            6: {
                cost: { gold: 8000, coins: 400 },
                requirements: { level: 30 },
                cooldown: 8 * 60 * 60 * 1000,
                unlocks: ['Фабрика'],
                bonus: { incomeMultiplier: 1.15, description: 'Множитель дохода +15%' }
            },
            7: {
                cost: { gold: 12000, coins: 700 },
                requirements: { level: 35 },
                cooldown: 10 * 60 * 60 * 1000,
                unlocks: ['Снижение комиссии рынка'],
                bonus: { incomeMultiplier: 1.20, description: 'Множитель дохода +20%' }
            },
            8: {
                cost: { gold: 20000, coins: 1200 },
                requirements: { level: 40 },
                cooldown: 12 * 60 * 60 * 1000,
                unlocks: ['Монетный двор'],
                bonus: { coinMultiplier: 1.15, description: 'Монеты +15%' }
            },
            9: {
                cost: { gold: 35000, coins: 2000 },
                requirements: { level: 45 },
                cooldown: 16 * 60 * 60 * 1000,
                unlocks: ['Экономическое чудо'],
                bonus: { incomeMultiplier: 1.20, activeAbility: 'economic_miracle', description: 'Множитель дохода +20% + активная способность' }
            },
            10: {
                cost: { gold: 60000, coins: 3500 },
                requirements: { level: 50 },
                cooldown: 20 * 60 * 60 * 1000,
                unlocks: ['Финансовая империя'],
                bonus: { incomeMultiplier: 1.30, description: 'Множитель дохода +30%' }
            },
            11: {
                cost: { gold: 100000, coins: 6000 },
                requirements: { level: 55 },
                cooldown: 24 * 60 * 60 * 1000,
                unlocks: ['Снижение комиссии рынка до 5%'],
                bonus: { incomeMultiplier: 1.35, description: 'Множитель дохода +35%' }
            },
            12: {
                cost: { gold: 160000, coins: 10000 },
                requirements: { level: 60 },
                cooldown: 28 * 60 * 60 * 1000,
                unlocks: ['Торговая гильдия'],
                bonus: { incomeMultiplier: 1.40, description: 'Множитель дохода +40%' }
            },
            13: {
                cost: { gold: 250000, coins: 16000 },
                requirements: { level: 65 },
                cooldown: 32 * 60 * 60 * 1000,
                unlocks: ['Снижение стоимости строительства'],
                bonus: { buildDiscount: 0.10, description: 'Строительство -10%' }
            },
            14: {
                cost: { gold: 400000, coins: 25000 },
                requirements: { level: 70 },
                cooldown: 36 * 60 * 60 * 1000,
                unlocks: ['+2 слота в порту'],
                bonus: { incomeMultiplier: 1.45, description: 'Множитель дохода +45%' }
            },
            15: {
                cost: { gold: 600000, coins: 40000 },
                requirements: { level: 75 },
                cooldown: 40 * 60 * 60 * 1000,
                unlocks: ['Мировой рынок'],
                bonus: { incomeMultiplier: 1.50, description: 'Множитель дохода +50%' }
            }
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
            ['👥 Пригласить друга'],
            ['🏙️ Город', '⚔️ Босс'],
            ['🎁 Ежедневный бонус'],
            ['🏆 Олимп', '🪖 Казарма'],
            ['ℹ️ О боте']
        ],
        resize_keyboard: true
    }
};

// ===== КОМИССИЯ РЫНКА (ЗАВИСИТ ОТ УРОВНЯ ЭКОНОМИКИ) =====
const MARKET_COMMISSION = {
    0: 0.15,   // 0 уровень — 15%
    1: 0.15,
    2: 0.15,
    3: 0.10,   // 3 уровень — 10%
    4: 0.10,
    5: 0.10,
    6: 0.10,
    7: 0.07,   // 7 уровень — 7%
    8: 0.07,
    9: 0.07,
    10: 0.07,
    11: 0.05,  // 11 уровень — 5%
    12: 0.05,
    13: 0.05,
    14: 0.05,
    15: 0.05,
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
    TECH_TREE,
    MARKET_COMMISSION
};