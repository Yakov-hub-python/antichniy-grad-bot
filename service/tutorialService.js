const { saveUser } = require('../utils/storage');

const ACTIONS = {
    BUILD_HUT: 'build_hut',
    BUILD_FARM: 'build_farm',
    BUILD_MINE: 'build_mine',
    COLLECT_INCOME: 'collect_income'
};

const STEPS = {
    1: {
        type: 'info',
        text: `
🏛️ ДОБРО ПОЖАЛОВАТЬ В «АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК»!

У тебя есть собственный полис.

Сейчас мы быстро пройдём основные механики игры,
причём прямо во время игры.

Начнём со строительства.
        `
    },

    2: {
        type: 'action',
        action: ACTIONS.BUILD_HUT,
        text: `
🏠 ПЕРВЫЙ ШАГ

Построй хижину.

Нажми кнопку строительства и выбери 🏠 Хижину.

После постройки обучение продолжится автоматически.
        `
    },

    3: {
        type: 'action',
        action: ACTIONS.BUILD_FARM,
        text: `
🌾 ЕДА ДЛЯ ЖИТЕЛЕЙ

Теперь построй ферму.

Она поможет обеспечивать твой полис едой.

После строительства появится следующее задание.
        `
    },

    4: {
        type: 'action',
        action: ACTIONS.BUILD_MINE,
        text: `
⛏️ ДОБЫЧА ЗОЛОТА

Построй шахту.

Она увеличит производство золота твоего полиса.
        `
    },

    5: {
        type: 'action',
        action: ACTIONS.COLLECT_INCOME,
        text: `
💰 СОБЕРИ ДОХОД

Теперь собери накопившийся доход.

Для этого нажми кнопку:

💰 Собрать доход

После этого перейдём к следующим механикам.
        `
    }
};

const REWARDS = {
    [ACTIONS.BUILD_HUT]: 20,
    [ACTIONS.BUILD_FARM]: 25,
    [ACTIONS.BUILD_MINE]: 30,
    [ACTIONS.COLLECT_INCOME]: 40
};

function getStep(user) {
    const stepId = user.tutorialStep || 1;
    return STEPS[stepId] || null;
}

function isActive(user) {
    return Boolean(user && !user.tutorialComplete);
}

function isActionStep(user) {
    const step = getStep(user);
    return step?.type === 'action';
}

function handleAction(user, action) {
    if (!isActive(user)) {
        return null;
    }

    const stepId = user.tutorialStep || 1;
    const step = STEPS[stepId];

    if (!step || step.type !== 'action') {
        return null;
    }

    if (step.action !== action) {
        return null;
    }

    const reward = REWARDS[action] || 0;

    user.gold = (user.gold || 0) + reward;

    const completedStep = stepId;
    const nextStepId = stepId + 1;

    user.tutorialStep = nextStepId;

    saveUser(user.id, user);

    return {
        completedStep,
        nextStepId,
        reward,
        completed: false
    };
}

function setTutorialMessage(user, messageId) {
    if (!user) return;

    user.tutorialMessageId = messageId;

    saveUser(user.id, user);
}

function completeTutorial(user) {
    if (!user) return;

    user.tutorialComplete = true;
    user.tutorialMessageId = null;

    saveUser(user.id, user);
}

module.exports = {
    ACTIONS,
    STEPS,
    REWARDS,
    getStep,
    isActive,
    isActionStep,
    handleAction,
    setTutorialMessage,
    completeTutorial
};