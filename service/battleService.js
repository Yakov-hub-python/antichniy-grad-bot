const { getArmyToType, ARMY_UNITS } = require('../config/army');
const { saveUser } = require('../utils/storage');
const { getEconomyBonuses, syncSoldierCount } = require('../utils/helpers');

// ============================================================
// 1. ПОЛУЧЕНИЕ ХАРАКТЕРИСТИК АРМИИ
// ============================================================

function getArmyStats(user) {
    const armyStats = {};

    for (const unit of Object.keys(ARMY_UNITS)) {
        const count = user.army?.[unit] || 0;

        if (count > 0) {
            const unitStats = getArmyToType(unit);

            if (unitStats) {
                armyStats[unit] = {
                    count,
                    damage: unitStats.damage,
                    defense: unitStats.defense,
                    hp: unitStats.hp
                };
            }
        }
    }

    return armyStats;
}


// ============================================================
// 2. РАСЧЁТ ОБЩЕГО УРОНА АРМИИ
// ============================================================

function getArmyBonuses(user) {
    let damageBonus = 0;
    let defenseBonus = 0;
    let lossReduction = 0;
    let bossDamage = 0;

    const level = Math.max(0, Number(user?.techTree?.army) || 0);
    const levels = require('../config/constants').TECH_TREE.army.levels;

    for (let current = 1; current <= level; current++) {
        const bonus = levels[current]?.bonus || {};
        damageBonus += Number(bonus.damageBonus) || 0;
        defenseBonus += Number(bonus.defenseBonus) || 0;
        lossReduction = Math.max(lossReduction, Number(bonus.lossReduction) || 0);
        bossDamage += Number(bonus.bossDamage) || 0;
    }

    // Forge is a persistent +1 total army damage per building, not a side effect of income collection.
    damageBonus += Number(user?.buildings?.forge) || 0;

    return { damageBonus, defenseBonus, lossReduction, bossDamage };
}

function calculateArmyDamage(user) {
    const armyStats = getArmyStats(user);
    const bonuses = getArmyBonuses(user);
    let damage = bonuses.damageBonus;

    for (const unit in armyStats) {
        damage += armyStats[unit].damage * armyStats[unit].count;
    }

    return Math.max(0, damage + bonuses.bossDamage);
}


// ============================================================
// 3. РАСЧЁТ ОБЩЕЙ ПРОЧНОСТИ АРМИИ
// ============================================================

function calculateArmyHp(user) {
    const armyStats = getArmyStats(user);
    let hp = 0;

    for (const unit in armyStats) {
        hp +=
            armyStats[unit].hp *
            armyStats[unit].count;
    }

    return hp;
}


// ============================================================
// 4. РАСЧЁТ ОБЩЕЙ ЗАЩИТЫ АРМИИ
// ============================================================

function calculateArmyDefense(user) {
    const armyStats = getArmyStats(user);
    const bonuses = getArmyBonuses(user);
    let defense = bonuses.defenseBonus;

    for (const unit in armyStats) {
        defense += armyStats[unit].defense * armyStats[unit].count;
    }

    return Math.max(0, defense);
}


// ============================================================
// 5. РАСЧЁТ УРОНА ИГРОКА ПО БОССУ
// ============================================================

function calculateDamageToBoss(user, boss) {
    const armyDamage = calculateArmyDamage(user);
    const bossDefense = boss.defense || 0;

    return Math.max(
        armyDamage - bossDefense,
        0
    );
}


// ============================================================
// 6. РАСЧЁТ АТАКИ БОССА
// ============================================================

function calculateBossDamage(user, boss) {
    const armyDefense = calculateArmyDefense(user);

    return Math.max(
        (boss.damage || 0) - armyDefense,
        0
    );
}


// ============================================================
// 7. РАСЧЁТ ПРОЦЕНТА ПОТЕРЬ
// ============================================================

function calculateLossPercent(user, damage) {
    const armyHp = calculateArmyHp(user);

    if (armyHp <= 0) {
        return 100;
    }

    const lossPercent =
        (damage / armyHp) * 100;

    return Math.min(
        Math.max(lossPercent, 0),
        100
    );
}


// ============================================================
// 8. РАСПРЕДЕЛЕНИЕ ПОТЕРЬ ПО ТИПАМ ВОЙСК
// ============================================================
//
// ВАЖНО:
// Теперь остаточный урон не теряется.
//
// damagePool — накопленный урон, который ещё не хватил
// для уничтожения следующего юнита.
//
// Например:
// 25 → pool = 25
// ещё 25 → pool = 50
// ещё 50 → pool = 100 → погибает юнит с HP 100
//
// Функция возвращает:
// {
//     losses,
//     remainingDamage
// }
// ============================================================

function calculateArmyLosses(user, damage, previousDamage = 0) {
    const losses = {};
    const armyStats = getArmyStats(user);

    let damagePool =
        Math.max(previousDamage, 0) +
        Math.max(damage, 0);

    // Сначала всем типам ставим 0 потерь
    for (const unit in armyStats) {
        losses[unit] = 0;
    }

    // Распределяем накопленный урон
    // по типам войск.
    for (const unit in armyStats) {

        if (damagePool <= 0) {
            break;
        }

        const count = armyStats[unit].count;
        const hp = armyStats[unit].hp;

        if (count <= 0 || hp <= 0) {
            continue;
        }

        const killed = Math.min(
            Math.floor(damagePool / hp),
            count
        );

        if (killed <= 0) {
            continue;
        }

        losses[unit] = killed;

        damagePool -= killed * hp;
    }

    return {
        losses,
        remainingDamage: damagePool
    };
}


// ============================================================
// 9. ПРИМЕНЕНИЕ ПОТЕРЬ
// ============================================================

function applyArmyLosses(user, losses) {

    if (!user.army) {
        user.army = {};
    }

    for (const unit in losses) {

        const lossCount =
            Math.max(
                Number(losses[unit]) || 0,
                0
            );

        const currentCount =
            user.army?.[unit] || 0;

        user.army[unit] = Math.max(
            currentCount - lossCount,
            0
        );
    }

    syncSoldierCount(user);
    return saveUser(user.id, user);
}


// ============================================================
// 10. РАСЧЁТ ШАНСА ПОБЕДЫ
// ============================================================

function calculateWinChance(user, boss) {
    const armyDamage =
        calculateArmyDamage(user);

    const armyHp =
        calculateArmyHp(user);

    const bossDamage =
        boss.damage || 0;

    const bossHp =
        boss.hp || 0;

    if (
        armyDamage <= 0 ||
        armyHp <= 0 ||
        bossHp <= 0
    ) {
        return 0;
    }

    const playerRounds =
        bossHp /
        Math.max(
            armyDamage - (boss.defense || 0),
            1
        );

    const bossRounds =
        armyHp /
        Math.max(
            bossDamage -
            calculateArmyDefense(user),
            1
        );

    if (bossRounds <= 0) {
        return 0;
    }

    const winChance =
        (bossRounds /
            (playerRounds + bossRounds)) *
        100;

    return Math.min(
        Math.max(winChance, 0),
        100
    );
}


// ============================================================
// 11. ПРОВЕДЕНИЕ ОДНОГО РАУНДА
// ============================================================

function battleRound(user, boss) {

    // --------------------------------------------------------
    // Атака игрока
    // --------------------------------------------------------

    const playerDamage =
        calculateDamageToBoss(user, boss);

    boss.hp = Math.max(
        boss.hp - playerDamage,
        0
    );


    // --------------------------------------------------------
    // Если босс погиб — он больше не атакует
    // --------------------------------------------------------

    if (boss.hp <= 0) {

        return {
            playerDamage,
            bossDamage: 0,
            bossHp: 0,
            armyLosses: {},
            remainingDamage:
                user.activeBattle?.lossDamage || 0
        };
    }


    // --------------------------------------------------------
    // Атака босса
    // --------------------------------------------------------

    const rawBossDamage =
        calculateBossDamage(user, boss);
    const lossReduction = getArmyBonuses(user).lossReduction;
    const bossDamage = Math.floor(rawBossDamage * (1 - lossReduction));


    // --------------------------------------------------------
    // НАКОПЛЕНИЕ УРОНА
    // --------------------------------------------------------
    //
    // Здесь находится главное изменение.
    //
    // Старый код:
    //   25 урона → 0 погибших → 25 урона исчезли
    //
    // Новый код:
    //   25 урона → сохраняем 25
    //
    // --------------------------------------------------------

    const previousDamage =
        user.activeBattle?.lossDamage || 0;

    const lossResult =
        calculateArmyLosses(
            user,
            bossDamage,
            previousDamage
        );

    const armyLosses =
        lossResult.losses;

    const remainingDamage =
        lossResult.remainingDamage;


    // --------------------------------------------------------
    // Сохраняем остаточный урон
    // --------------------------------------------------------

    if (user.activeBattle) {
        user.activeBattle.lossDamage =
            remainingDamage;
    }


    // --------------------------------------------------------
    // Применяем только новые потери
    // --------------------------------------------------------

    const hasLosses =
        Object.values(armyLosses)
            .some(count => count > 0);

    if (hasLosses) {
        applyArmyLosses(
            user,
            armyLosses
        );
    }


    // --------------------------------------------------------
    // Возвращаем результат
    // --------------------------------------------------------

    return {
        playerDamage,
        bossDamage,
        lossPercent:
            calculateLossPercent(
                user,
                bossDamage
            ),
        bossHp: boss.hp,
        armyLosses,
        remainingDamage
    };
}


// ============================================================
// 12. ПРОВЕРКА РЕЗУЛЬТАТА БОЯ
// ============================================================

function checkBattleResult(user, boss) {

    if (boss.hp <= 0) {
        return 'win';
    }

    if (calculateArmyHp(user) <= 0) {
        return 'lose';
    }

    return 'continue';
}


// ============================================================
// 13. РАСЧЁТ СТОИМОСТИ ПОТЕРЯННОЙ АРМИИ
// ============================================================

function calculateLossesCost(losses) {

    const cost = {
        gold: 0,
        food: 0
    };

    for (const unit in losses) {

        const count =
            Math.max(
                Number(losses[unit]) || 0,
                0
            );

        const unitStats =
            getArmyToType(unit);

        if (!unitStats) {
            continue;
        }

        cost.gold +=
            count *
            (unitStats.cost?.gold || 0);

        cost.food +=
            count *
            (unitStats.cost?.food || 0);
    }

    return cost;
}


// ============================================================
// 14. НАГРАДА ЗА ПОБЕДУ
// ============================================================

function giveBattleReward(
    user,
    boss,
    losses = {}
) {

    const bossHp =
        boss.maxHp ||
        boss.hp ||
        0;


    // --------------------------------------------------------
    // Базовая награда от силы босса
    // --------------------------------------------------------

    const baseReward = {
        gold: Math.floor(
            bossHp * 0.5
        ),

        coins: Math.floor(
            bossHp * 0.1
        ),

        food: Math.floor(
            bossHp * 0.2
        )
    };


    // --------------------------------------------------------
    // Текущие ресурсы игрока
    // --------------------------------------------------------

    const resources = {
        gold: Math.max(
            user.gold || 0,
            0
        ),

        coins: Math.max(
            user.coins || 0,
            0
        ),

        food: Math.max(
            user.food || 0,
            0
        )
    };


    // --------------------------------------------------------
    // Целевые значения ресурсов
    // --------------------------------------------------------

    const target = {
        gold: 5000,
        coins: 500,
        food: 2000
    };


    // --------------------------------------------------------
    // Определяем дефицит
    // --------------------------------------------------------

    const need = {
        gold: Math.max(
            0,
            1 -
            resources.gold /
            target.gold
        ),

        coins: Math.max(
            0,
            1 -
            resources.coins /
            target.coins
        ),

        food: Math.max(
            0,
            1 -
            resources.food /
            target.food
        )
    };


    const totalNeed =
        need.gold +
        need.coins +
        need.food;


    let reward = {
        gold: baseReward.gold,
        coins: baseReward.coins,
        food: baseReward.food
    };


    // --------------------------------------------------------
    // Бонус за дефицит ресурсов
    // --------------------------------------------------------

    if (totalNeed > 0) {

        const bonusPool =
            Math.floor(
                (
                    baseReward.gold +
                    baseReward.coins * 5 +
                    baseReward.food * 2
                ) * 0.25
            );

        const totalWeight =
            need.gold +
            need.coins +
            need.food;


        reward.gold +=
            Math.floor(
                bonusPool *
                (
                    need.gold /
                    totalWeight
                )
            );


        reward.coins +=
            Math.floor(
                (bonusPool / 5) *
                (
                    need.coins /
                    totalWeight
                )
            );


        reward.food +=
            Math.floor(
                (bonusPool / 2) *
                (
                    need.food /
                    totalWeight
                )
            );
    }


    // --------------------------------------------------------
    // Компенсация потерь армии
    // --------------------------------------------------------

    const lossCost =
        calculateLossesCost(losses);


    reward.gold +=
        Math.floor(
            lossCost.gold * 0.5
        );

    reward.coins +=
        Math.floor(
            lossCost.gold * 0.1
        );

    reward.food +=
        Math.floor(
            lossCost.food * 0.2
        );


    // --------------------------------------------------------
    // Выдаём награду
    // --------------------------------------------------------

    user.gold =
        (user.gold || 0) +
        reward.gold;

    user.coins =
        (user.coins || 0) +
        reward.coins;

    user.food =
        (user.food || 0) +
        reward.food;


    saveUser(
        user.id,
        user
    );

    return reward;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getArmyStats,
    calculateArmyDamage,
    getArmyBonuses,
    calculateArmyHp,
    calculateArmyDefense,
    calculateDamageToBoss,
    calculateBossDamage,
    calculateLossPercent,
    calculateArmyLosses,
    applyArmyLosses,
    calculateWinChance,
    battleRound,
    checkBattleResult,
    calculateLossesCost,
    giveBattleReward
};