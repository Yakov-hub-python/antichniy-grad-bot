// ============================================================
// БОССЫ
// ============================================================

const BASE_BOSS = {
    name: 'Гоблин',
    hp: 1000,
    maxHp: 1000,
    damage: 75,
    defense: 20
};

// Каждый следующий побеждённый босс становится сильнее.
// Номер текущего босса = bossKills + 1.
function getBossLevel(user) {
    return Math.max(1, (Number(user?.bossKills) || 0) + 1);
}

function getBossForUser(user) {
    const level = getBossLevel(user);

    // Рост силы с каждым побеждённым боссом.
    // Формулы сделаны плавными, чтобы поздние боссы не росли слишком резко.
    const hpMultiplier = Math.pow(1.25, level - 1);
    const damageMultiplier = Math.pow(1.10, level - 1);
    const defenseMultiplier = Math.pow(1.08, level - 1);

    const maxHp = Math.max(
        BASE_BOSS.hp,
        Math.floor(BASE_BOSS.maxHp * hpMultiplier)
    );

    return {
        ...BASE_BOSS,
        level,
        hp: maxHp,
        maxHp,
        damage: Math.max(
            BASE_BOSS.damage,
            Math.floor(BASE_BOSS.damage * damageMultiplier)
        ),
        defense: Math.max(
            BASE_BOSS.defense,
            Math.floor(BASE_BOSS.defense * defenseMultiplier)
        )
    };
}

module.exports = {
    BASE_BOSS,
    getBossLevel,
    getBossForUser
};
