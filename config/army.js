const ARMY_UNITS = {
    warriors: {
        name: 'Мечники',
        unlockLevel: 1,
        damage: 10,
        defense: 5,
        hp: 100,
        cost: {gold:100, food: 20}
    },

    spearmen: {
        name: 'Копейщики',
        unlockLevel: 2,
        damage: 8,
        defense: 10,
        hp: 120,
        cost: {gold:120, food: 30}
    },

    archers: {
        name: 'Лучники',
        unlockLevel: 3,
        damage: 15,
        defense: 3,
        hp: 70,
        cost: {gold:150, food: 40}
    },

    knights: {
        name: 'Рыцари',
        unlockLevel: 5,
        damage: 25,
        defense: 15,
        hp: 140,
        cost: {gold:200, food: 50}
    },

    siege: {
        name: 'Осадные орудия',
        unlockLevel: 6,
        damage: 40,
        defense: 5,
        hp: 80,
        cost: {gold:300, food: 60}
    },

    catapults: {
        name: 'Катапульты',
        unlockLevel: 7,
        damage: 60,
        defense: 5,
        hp: 100,
        cost: {gold:400, food: 80}
    },

    legion: {
        name: 'Легион',
        unlockLevel: 9,
        damage: 50,
        defense: 25,
        hp: 200,
        cost: {gold:500, food: 100}
    },

    immortals: {
        name: 'Бессмертные',
        unlockLevel: 10,
        damage: 80,
        defense: 40,
        hp: 250,
        cost: {gold:600, food: 120}
    }
};

const armyName = [
    'archers',
    'catapults',
    'immortals',
    'knights',
    'legion',
    'siege',
    'spearmen',
    'warriors'
];

function getArmyToType(type) {
    const { ARMY_UNITS } = require('../config/army');
    return ARMY_UNITS[type];
}

module.exports = { ARMY_UNITS, getArmyToType, armyName };