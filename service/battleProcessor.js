const {
    readDB,
    getUser,
    saveUser
} = require('../utils/storage');

const {
    battleRound,
    checkBattleResult,
    giveBattleReward
} = require('./battleService');

const {
    getArmyToType
} = require('../config/army');


// ============================================================
// НАСТРОЙКИ
// ============================================================

const CHECK_INTERVAL = 1000;
const ROUND_INTERVAL = 1000;


// ============================================================
// TELEGRAM BOT
// ============================================================

let bot = null;


// ============================================================
// ЗАПУСК PROCESSOR
// ============================================================

function startBattleProcessor(telegramBot) {
    if (bot) {
        console.log('[BattleProcessor] Already running.');
        return;
    }

    bot = telegramBot;

    console.log(
        '[BattleProcessor] Started. Check every 1 second.'
    );

    setInterval(async () => {
        try {
            await processBattles();
        } catch (error) {
            console.error(
                '[BattleProcessor] Error:',
                error
            );
        }
    }, CHECK_INTERVAL);
}


// ============================================================
// ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================

function getUsersFromDB(db) {
    if (!db) {
        return [];
    }

    // Если база сама является массивом пользователей
    if (Array.isArray(db)) {
        return db;
    }

    // Самый частый вариант
    if (Array.isArray(db.users)) {
        return db.users;
    }

    if (db.users && typeof db.users === 'object') {
        return Object.values(db.users);
    }

    // Возможные названия коллекции
    if (Array.isArray(db.players)) {
        return db.players;
    }

    if (db.players && typeof db.players === 'object') {
        return Object.values(db.players);
    }

    return [];
}


// ============================================================
// ФОРМАТ ПОТЕРЬ
// ============================================================

function formatLosses(losses) {
    let text = '';

    for (const [unit, count] of Object.entries(losses || {})) {
        if (count <= 0) {
            continue;
        }

        const unitInfo = getArmyToType(unit);

        if (unitInfo) {
            text += `${unitInfo.name}: −${count}\n`;
        }
    }

    return text || 'Нет потерь 🎉';
}


// ============================================================
// ПРОВЕРКА ВСЕХ БОЁВ
// ============================================================

async function processBattles() {
    const db = readDB();

    const users = getUsersFromDB(db);

    if (!users.length) {
        return;
    }

    for (const dbUser of users) {
        try {
            if (!dbUser) {
                continue;
            }

            const userId =
                dbUser.id ??
                dbUser.userId ??
                dbUser.telegramId;

            if (!userId) {
                continue;
            }

            const user = getUser(userId);

            if (!user?.activeBattle) {
                continue;
            }

            await processUserBattle(user);

        } catch (error) {
            console.error(
                '[BattleProcessor] User battle error:',
                error
            );
        }
    }
}


// ============================================================
// ОБРАБОТКА ОДНОГО БОЯ
// ============================================================

async function processUserBattle(user) {
    const battle = user.activeBattle;

    if (!battle || !battle.boss) {
        return;
    }

    const now = Date.now();

    // Раунд ещё не наступил
    if (
        battle.nextRoundAt &&
        now < battle.nextRoundAt
    ) {
        return;
    }

    const boss = battle.boss;

    // Босс уже мёртв
    if (boss.hp <= 0) {
        await finishBattle(
            user,
            'win'
        );

        return;
    }


    // ========================================================
    // ПРОВОДИМ ОДИН РАУНД
    // ========================================================

    const result =
        battleRound(
            user,
            boss
        );


    // ========================================================
    // СОХРАНЯЕМ СТАТИСТИКУ
    // ========================================================

    battle.round =
        (battle.round || 0) + 1;

    battle.totalPlayerDamage =
        (battle.totalPlayerDamage || 0) +
        (result.playerDamage || 0);

    battle.totalBossDamage =
        (battle.totalBossDamage || 0) +
        (result.bossDamage || 0);


    // ========================================================
    // СОХРАНЯЕМ ПОТЕРИ
    // ========================================================

    if (!battle.totalLosses) {
        battle.totalLosses = {};
    }

    for (
        const [unit, count]
        of Object.entries(result.armyLosses || {})
    ) {
        battle.totalLosses[unit] =
            (battle.totalLosses[unit] || 0) +
            count;
    }


    // ========================================================
    // ПРОВЕРЯЕМ РЕЗУЛЬТАТ
    // ========================================================

    const battleResult =
        checkBattleResult(
            user,
            boss
        );


    // ========================================================
    // ПОБЕДА
    // ========================================================

    if (battleResult === 'win') {
        saveUser(
            user.id,
            user
        );

        await finishBattle(
            user,
            'win'
        );

        return;
    }


    // ========================================================
    // ПОРАЖЕНИЕ
    // ========================================================

    if (battleResult === 'lose') {
        saveUser(
            user.id,
            user
        );

        await finishBattle(
            user,
            'lose'
        );

        return;
    }


    // ========================================================
    // БОЙ ПРОДОЛЖАЕТСЯ
    // ========================================================

    battle.nextRoundAt =
        now + ROUND_INTERVAL;

    saveUser(
        user.id,
        user
    );
}


// ============================================================
// ЗАВЕРШЕНИЕ БОЯ
// ============================================================

async function finishBattle(user, result) {
    const battle =
        user.activeBattle;

    if (!battle) {
        return;
    }

    const boss =
        battle.boss;

    const totalPlayerDamage =
        battle.totalPlayerDamage || 0;

    const totalBossDamage =
        battle.totalBossDamage || 0;

    const rounds =
        battle.round || 0;

    const totalLosses =
        battle.totalLosses || {};


    // ========================================================
    // ПОБЕДА
    // ========================================================

    if (result === 'win') {
        user.bossKills = (Number(user.bossKills) || 0) + 1;

        const reward =
            giveBattleReward(
                user,
                boss,
                totalLosses
            );

        const lossesText =
            formatLosses(
                totalLosses
            );

        delete user.activeBattle;

        saveUser(
            user.id,
            user
        );

        await sendMessage(
            user.id,
            `🏆 БОСС ПОВЕРЖЕН!\n\n` +
            `👹 ${boss.name}\n` +
            `❤️ HP: 0/${boss.maxHp}\n\n` +
            `⚔️ Нанесено урона: ${totalPlayerDamage}\n` +
            `👹 Получено урона: ${totalBossDamage}\n` +
            `🔄 Раундов: ${rounds}\n\n` +
            `📉 ПОТЕРИ АРМИИ\n` +
            `${lossesText}\n\n` +
            `🎁 НАГРАДА\n` +
            `💰 +${reward.gold} золота\n` +
            `🪙 +${reward.coins} монет\n` +
            `🍖 +${reward.food} еды`
        );

        return;
    }


    // ========================================================
    // ПОРАЖЕНИЕ
    // ========================================================

    if (result === 'lose') {
        const lossesText =
            formatLosses(
                totalLosses
            );

        delete user.activeBattle;

        saveUser(
            user.id,
            user
        );

        await sendMessage(
            user.id,
            `💀 БОЙ ПРОИГРАН!\n\n` +
            `👹 ${boss.name}\n\n` +
            `⚔️ Нанесено урона: ${totalPlayerDamage}\n` +
            `👹 Получено урона: ${totalBossDamage}\n` +
            `🔄 Раундов: ${rounds}\n\n` +
            `📉 ПОТЕРИ АРМИИ\n` +
            `${lossesText}`
        );
    }
}


// ============================================================
// ОТПРАВКА СООБЩЕНИЯ
// ============================================================

async function sendMessage(userId, text) {
    if (!bot) {
        console.error(
            '[BattleProcessor] Bot is not initialized.'
        );

        return;
    }

    try {
        await bot.telegram.sendMessage(
            userId,
            text
        );
    } catch (error) {
        console.error(
            `[BattleProcessor] Failed to send message to ${userId}:`,
            error.message
        );
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    startBattleProcessor,
    processBattles,
    processUserBattle
};