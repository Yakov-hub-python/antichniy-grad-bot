// ============================================================
// 1️⃣ ЕЖЕНЕВНЫЕ БОНУСЫ
// ============================================================

function getWeeklyBonus() {
    const day = new Date().getDay(); // 0=ВС, 1=ПН, ...
    const bonuses = {
        1: { name: '⛰️ Шахтёрский день', type: 'mine', multiplier: 2, icon: '⛰️' },
        2: { name: '🌾 Фермерский день', type: 'farm', multiplier: 2, icon: '🌾' },
        3: { name: '⚔️ День призыва', type: 'hire', multiplier: 2, icon: '⚔️' },
        4: { name: '🪙 Монетный день', type: 'mint', multiplier: 2, icon: '🪙' },
        5: { name: '🏗️ День строителя', type: 'build', discount: 0.7, icon: '🏗️' },
        6: { name: '⚡ День босса', type: 'boss', multiplier: 2, icon: '⚡' },
        0: { name: '🎁 День отдыха', type: 'daily', multiplier: 2, icon: '🎁' }
    };
    return bonuses[day] || null;
}

// ============================================================
// 2️⃣ ПРИМЕНЕНИЕ БОНУСА К ДОХОДУ
// ============================================================

function applyWeeklyBonus(income, user) {
    const bonus = getWeeklyBonus();
    if (!bonus) return income;

    const result = { ...income };

    if (bonus.type === 'mine') {
        result.gold = Math.floor(result.gold * bonus.multiplier);
    } else if (bonus.type === 'farm') {
        result.food = Math.floor(result.food * bonus.multiplier);
    } else if (bonus.type === 'mint') {
        result.coins = Math.floor(result.coins * bonus.multiplier);
    }
    // Для hire, build, boss, daily — обработка в других местах

    return result;
}

// ============================================================
// 3️⃣ МНОЖИТЕЛЬ УРОНА ДЛЯ БОССА (ДЕНЬ БОССА)
// ============================================================

function getBossDamageMultiplier() {
    const bonus = getWeeklyBonus();
    if (bonus && bonus.type === 'boss') {
        return bonus.multiplier; // 2
    }
    return 1;
}

module.exports = { getWeeklyBonus, applyWeeklyBonus, getBossDamageMultiplier };