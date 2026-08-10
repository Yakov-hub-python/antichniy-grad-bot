const { getUser, saveUser } = require('../utils/storage');
const { BUILDING_COSTS, BUILDING_NAMES } = require('../config/constants');

// ============================================================
// 1️⃣ ПАРСИНГ КОМАНД
// ============================================================

function parseCommand(text) {
    const lower = text.toLowerCase().trim();
    const words = lower.split(/\s+/);
    
    let action = null;
    let resource = null;
    let amount = null;
    let target = null;
    
    // ===== ДЕЙСТВИЯ =====
    if (words.some(w => ['продать','продай','сдать','sell'].includes(w))) {
        action = 'sell';
    } else if (words.some(w => ['купить','куплю','приобрести','buy'].includes(w))) {
        action = 'buy';
    } else if (words.some(w => ['построить','построй','build'].includes(w))) {
        action = 'build';
    } else if (words.some(w => ['атаковать','ударить','бить','attack'].includes(w))) {
        action = 'attack';
    } else if (words.some(w => ['нанять','найми','hire'].includes(w))) {
        action = 'hire';
    }
    
    // ===== РЕСУРСЫ =====
    if (words.some(w => ['еда','еду','хлеб','food'].includes(w))) {
        resource = 'food';
    } else if (words.some(w => ['монеты','монет','coins','coin','деньги'].includes(w))) {
        resource = 'coins';
    } else if (words.some(w => ['золото','золота','gold'].includes(w))) {
        resource = 'gold';
    }
    
    // ===== ЗДАНИЯ =====
    if (words.some(w => ['хижина','хижину','hut'].includes(w))) {
        target = 'hut';
    } else if (words.some(w => ['ферма','ферму','farm'].includes(w))) {
        target = 'farm';
    } else if (words.some(w => ['шахта','шахту','mine'].includes(w))) {
        target = 'mine';
    } else if (words.some(w => ['монетный двор','двор','mint'].includes(w))) {
        target = 'mint';
    } else if (words.some(w => ['рынок','market'].includes(w)) && action !== 'market') {
        target = 'market';
    } else if (words.some(w => ['казарма','barracks'].includes(w))) {
        target = 'barracks';
    } else if (words.some(w => ['поле','field'].includes(w))) {
        target = 'field';
    } else if (words.some(w => ['карьер','quarry'].includes(w))) {
        target = 'quarry';
    } else if (words.some(w => ['фабрика','фабрику','mint_factory'].includes(w))) {
        target = 'mint_factory';
    }
    
    // ===== КОЛИЧЕСТВО =====
    for (const word of words) {
        if (['все','всё','all'].includes(word)) {
            amount = 'all';
            break;
        }
        const num = parseInt(word);
        if (!isNaN(num) && num > 0) {
            amount = num;
            break;
        }
    }
    
    // ===== ПРОСТЫЕ КОМАНДЫ =====
    if (words.includes('рынок') || words.includes('market')) {
        return { action: 'market_show' };
    }
    if (words.includes('строительство') || words.includes('стройка')) {
        return { action: 'build_menu' };
    }
    if (words.includes('город') || words.includes('city') || words.includes('мой город')) {
        return { action: 'city_show' };
    }
    if (words.includes('босс') || words.includes('boss')) {
        return { action: 'boss_show' };
    }
    if (words.includes('казарма') || words.includes('barracks')) {
        return { action: 'barracks_show' };
    }
    if (words.includes('бонус') || words.includes('daily') || words.includes('ежедневный')) {
        return { action: 'daily_show' };
    }
    if (words.includes('топ') || words.includes('olymp') || words.includes('олимп') || words.includes('лидеры')) {
        return { action: 'olymp_show' };
    }
    if (words.includes('друзья') || words.includes('referral') || words.includes('пригласить')) {
        return { action: 'referral_show' };
    }
    if (words.includes('помощь') || words.includes('help') || words.includes('команды')) {
        return { action: 'help_show' };
    }
    if (words.includes('о боте') || words.includes('инфо')) {
        return { action: 'about_show' };
    }
    if (words.includes('собрать') || words.includes('доход') || words.includes('income')) {
        return { action: 'collect_income' };
    }
    
    // ===== МЕНЮ / НАЗАД =====
    if (words.includes('меню') || words.includes('menu') || words.includes('главное меню') || 
        words.includes('назад') || words.includes('back')) {
        return { action: 'menu_show' };
    }
    
    return { action, resource, amount, target };
}

// ============================================================
// 2️⃣ ОБРАБОТЧИКИ
// ============================================================

// ===== ПРОДАЖА =====
async function handleSell(ctx, user, resource, amount) {
    const price = { food: 1, coins: 3 }[resource];
    if (!price) {
        return ctx.reply('❌ Можно продать только еду или монеты');
    }
    
    if (amount === 'all') {
        amount = user[resource] || 0;
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
        return ctx.reply('❌ Укажи количество. Пример: продать еда 10');
    }
    
    if ((user[resource] || 0) < amount) {
        return ctx.reply(`❌ У тебя только ${user[resource] || 0} ${resource}`);
    }
    
    user[resource] -= amount;
    const earned = amount * price;
    user.gold += earned;
    await saveUser(ctx.from.id, user);
    
    await ctx.reply(`✅ Продано ${amount} ${resource} за ${earned}💰`);
}

// ===== ПОКУПКА =====
async function handleBuy(ctx, user, resource, amount) {
    const price = { food: 2, coins: 6 }[resource];
    if (!price) {
        return ctx.reply('❌ Можно купить только еду или монеты');
    }
    
    if (amount === 'all') {
        const maxCanBuy = Math.floor(user.gold / price);
        if (maxCanBuy === 0) {
            return ctx.reply(`❌ Не хватает золота. Нужно минимум ${price}💰`);
        }
        amount = maxCanBuy;
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
        return ctx.reply('❌ Укажи количество. Пример: купить еда 10');
    }
    
    const cost = amount * price;
    if (user.gold < cost) {
        return ctx.reply(`❌ Нужно ${cost}💰, у тебя ${user.gold}💰`);
    }
    
    user.gold -= cost;
    user[resource] = (user[resource] || 0) + amount;
    await saveUser(ctx.from.id, user);
    
    await ctx.reply(`✅ Куплено ${amount} ${resource} за ${cost}💰`);
}

// ===== ПОСТРОИТЬ ЗДАНИЕ =====
async function handleBuild(ctx, user, target) {
    const cost = BUILDING_COSTS[target];
    if (!cost) {
        return ctx.reply('❌ Неизвестное здание');
    }
    
    // Проверка золота
    if (cost.gold > 0 && user.gold < cost.gold) {
        return ctx.reply(`❌ Нужно ${cost.gold}💰, у тебя ${user.gold}💰`);
    }
    
    // Проверка монет
    if (cost.coins > 0 && user.coins < cost.coins) {
        return ctx.reply(`❌ Нужно ${cost.coins}🪙, у тебя ${user.coins}🪙`);
    }
    
    // Снятие золота
    if (cost.gold > 0) {
        user.gold -= cost.gold;
    }
    
    // Снятие монет
    if (cost.coins > 0) {
        user.coins -= cost.coins;
    }
    
    // Строим
    user.buildings[target] += 1;
    
    if (target === 'hut') user.citizens += 3;
    if (target === 'barracks') user.soldiers += 2;
    
    const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
    user.level = totalBuildings + 1;
    
    await saveUser(ctx.from.id, user);
    await ctx.reply(`✅ ${BUILDING_NAMES[target]} построена! Уровень города: ${user.level}`);
}

// ===== НАНЯТЬ СОЛДАТ =====
async function handleHire(ctx, user, amount) {
    if (amount === 'all') {
        amount = Math.floor(user.coins / 6);
        if (amount === 0) {
            return ctx.reply('❌ Не хватает монет для найма хотя бы одного солдата');
        }
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
        return ctx.reply('❌ Укажи количество. Пример: нанять 10');
    }
    
    const cost = amount * 6;
    if (user.coins < cost) {
        return ctx.reply(`❌ Нужно ${cost} монет, у тебя ${user.coins}`);
    }
    
    user.coins -= cost;
    user.soldiers += amount;
    await saveUser(ctx.from.id, user);
    
    await ctx.reply(`✅ Нанято ${amount} солдат за ${cost} монет`);
}

// ===== АТАКА БОССА =====
async function handleAttack(ctx, user, text) {
    const words = text.toLowerCase().split(/\s+/);
    const bossActions = require('../actions/bossActions');
    
    if (words.includes('глобального') || words.includes('global')) {
        return bossActions.attackGlobal(ctx);
    } else {
        return bossActions.attackPersonal(ctx);
    }
}

// ============================================================
// 3️⃣ ГЛАВНЫЙ ОБРАБОТЧИК
// ============================================================

async function handleAdvancedCommand(ctx) {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const user = await getUser(userId);
    
    const parsed = parseCommand(text);
    
    // ===== ЕСЛИ НЕ РАСПОЗНАЛИ =====
    if (!parsed.action && !parsed.resource && !parsed.target) {
        return; 
    }
    
    // ===== МЕНЮ / НАЗАД =====
    if (parsed.action === 'menu_show') {
        const { showMainMenu } = require('../handlers/menu');
        return showMainMenu(ctx);
    }
    
    // ===== ПРОСТЫЕ КОМАНДЫ (БЕЗ ПАРАМЕТРОВ) =====
    if (parsed.action === 'market_show') {
        return require('./market').showMarketMenu(ctx);
    }
    if (parsed.action === 'build_menu') {
        return require('./build').showMenu(ctx);
    }
    if (parsed.action === 'city_show') {
        return require('./city').show(ctx);
    }
    if (parsed.action === 'boss_show') {
        return require('./boss').show(ctx);
    }
    if (parsed.action === 'barracks_show') {
        return require('./barracks').show(ctx);
    }
    if (parsed.action === 'daily_show') {
        return require('./daily').get(ctx);
    }
    if (parsed.action === 'olymp_show') {
        return require('./olymp').show(ctx);
    }
    if (parsed.action === 'referral_show') {
        return require('./referral').show(ctx);
    }
    if (parsed.action === 'help_show') {
        return ctx.reply(
            '📖 СПИСОК КОМАНД\n\n' +
            'Текстовые команды:\n' +
            '• продать еда 10\n' +
            '• купить монеты 5\n' +
            '• построить хижину\n' +
            '• нанять 10\n' +
            '• атаковать босса\n' +
            '• рынок / город / босс / бонус / топ\n\n' +
            'Кнопки в меню для быстрого доступа!'
        );
    }
    if (parsed.action === 'about_show') {
        return ctx.reply(
            'ℹ️ АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК\n\n' +
            'Версия: 1.3.5\n' +
            'Разработчик: @DEDAYSON\n\n' +
            'Экономическая стратегия в Telegram.\n' +
            'Строй, воюй, приводи друзей!'
        );
    }
    if (parsed.action === 'collect_income') {
        return require('./income').collect(ctx);
    }
    
    // ===== ДЕЙСТВИЯ С ПАРАМЕТРАМИ =====
    if (parsed.action === 'sell' && parsed.resource && parsed.amount) {
        return handleSell(ctx, user, parsed.resource, parsed.amount);
    }
    
    if (parsed.action === 'buy' && parsed.resource && parsed.amount) {
        return handleBuy(ctx, user, parsed.resource, parsed.amount);
    }
    
    // ===== СТРОИТЕЛЬСТВО С ЗАЩИТОЙ ОТ ЛИШНИХ ЧИСЕЛ =====
    // ===== СТРОИТЕЛЬСТВО =====
    if (parsed.action === 'build') {
        if (!parsed.target) {
            return require('./build').showMenu(ctx);
        }
        const hasNumber = /\d/.test(text);
        if (hasNumber) {
            return ctx.reply('❌ Для строительства укажи только название здания. Пример: построить фабрику');
        }
        return handleBuild(ctx, user, parsed.target);
    }
    
    if (parsed.action === 'attack') {
        return handleAttack(ctx, user, text);
    }
    
    if (parsed.action === 'hire' && parsed.amount) {
        return handleHire(ctx, user, parsed.amount);
    }
}

// ============================================================
// 4️⃣ ЭКСПОРТ
// ============================================================

module.exports = { handleAdvancedCommand, parseCommand };