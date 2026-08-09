const DAILY_BONUSES = [
    { 
        id: 0, 
        type: 'mine', 
        multiplier: 1.2, 
        name: 'Золотая лихорадка', 
        emoji: '⛰️',
        description: 'x1.2 золота с шахт и карьеров сегодня'
    },
    { 
        id: 1, 
        type: 'sell_food', 
        multiplier: 1.3, 
        name: 'Хлебный день', 
        emoji: '🍞',
        description: 'x1.3 прибыли с продажи еды сегодня'
    },
    { 
        id: 2, 
        type: 'coins', 
        multiplier: 1.5, 
        name: 'Монетный дождь', 
        emoji: '🪙',
        description: 'x1.5 монет с фабрик и монетных дворов сегодня'
    },
    { 
        id: 3, 
        type: 'soldiers', 
        multiplier: 2.0, 
        name: 'Воинский призыв', 
        emoji: '⚔️',
        description: 'x2 солдат при найме сегодня'
    },
    { 
        id: 4, 
        type: 'vip_chance', 
        multiplier: 1.5, 
        name: 'Божественное благословение', 
        emoji: '⛪',
        description: 'x1.5 шанс получить VIP сегодня'
    },
    { 
        id: 5, 
        type: 'market', 
        multiplier: 1.4, 
        name: 'Торговый бум', 
        emoji: '🏪',
        description: 'x1.4 цены на рынке сегодня'
    },
    { 
        id: 6, 
        type: 'build', 
        discount: 0.7, 
        name: 'Строительный бум', 
        emoji: '🏗️',
        description: 'Скидка 30% на постройки сегодня'
    }
];

function getTodayBonus() {
    const day = new Date().getDate();
    const index = day % DAILY_BONUSES.length;
    return DAILY_BONUSES[index];
}

function getBonusByDay(day) {
    const index = day % DAILY_BONUSES.length;
    return DAILY_BONUSES[index];
}

module.exports = {
    DAILY_BONUSES,
    getTodayBonus,
    getBonusByDay
};