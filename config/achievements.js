// ============================================================
// 🏆 СПИСОК ДОСТИЖЕНИЙ
// ============================================================

const ACHIEVEMENTS = [
    {
        id: 'first_house',
        name: '🏠 Первый дом',
        description: 'Построить первую хижину',
        condition: (u) => u.buildings?.hut >= 1,
        reward: 20
    },
    {
        id: 'farmer',
        name: '🌾 Фермер',
        description: 'Построить 5 ферм',
        condition: (u) => u.buildings?.farm >= 5,
        reward: 50
    },
    {
        id: 'miner',
        name: '⛏️ Шахтёр',
        description: 'Построить 10 шахт',
        condition: (u) => u.buildings?.mine >= 10,
        reward: 100
    },
    {
        id: 'builder',
        name: '🏛️ Градостроитель',
        description: 'Построить 50 зданий',
        condition: (u) => {
            const total = Object.values(u.buildings || {}).reduce((a, b) => a + b, 0);
            return total >= 50;
        },
        reward: 500
    },
    {
        id: 'architect',
        name: '👑 Архитектор',
        description: 'Построить 100 зданий',
        condition: (u) => {
            const total = Object.values(u.buildings || {}).reduce((a, b) => a + b, 0);
            return total >= 100;
        },
        reward: 'vip_3'
    },
    {
        id: 'millionaire',
        name: '💰 Миллионер',
        description: 'Накопить 1 000 000 золота',
        condition: (u) => u.gold >= 1000000,
        reward: 'vip_7'
    },
    {
        id: 'boss_killer',
        name: '⚔️ Победитель',
        description: 'Убить 10 боссов',
        condition: (u) => u.bossKills >= 10,
        reward: 200
    },
    {
        id: 'legionnaire',
        name: '🪖 Легионер',
        description: 'Нанять 100 солдат',
        condition: (u) => u.soldiers >= 100,
        reward: 150
    },
    {
        id: 'leader',
        name: '👥 Лидер',
        description: 'Привести 5 друзей',
        condition: (u) => (u.referrals?.length || 0) >= 5,
        reward: 'vip_3'
    },
    {
        id: 'olympian',
        name: '🏆 Олимпиец',
        description: 'Достичь 100 уровня',
        condition: (u) => u.level >= 100,
        reward: 100
    }
];

module.exports = { ACHIEVEMENTS };