// handlers/tutorial.js

const { getUser, saveUser } = require('../utils/storage');
const TUTORIAL = require('../config/tutorialConfig');

const TUTORIAL_STEPS = Object.values(TUTORIAL);

function getStepById(id) {
    return TUTORIAL_STEPS.find(step => step.id === id);
}


async function showStep(ctx, step) {
    const user = getUser(ctx.from.id);
    if (!user || !step) return;

    user.tutorialStep = step.id;
    saveUser(ctx.from.id, user);

    const keyboard = [];

    if (step.buttons) {
        keyboard.push(...step.buttons);
    } else if (step.type !== 'action') {
        if (step.id < TUTORIAL_STEPS.length) {
            keyboard.push([
                {
                    text: 'Далее ▶️',
                    callback_data: 'tutorial_next'
                }
            ]);
        }
    }

    if (!user.tutorialComplete && step.id !== TUTORIAL_STEPS.length) {
        keyboard.push([
            {
                text: '⏭️ Пропустить обучение',
                callback_data: 'tutorial_skip'
            }
        ]);
    }

    await ctx.reply(
        `🎓 ОБУЧЕНИЕ\n\n` +
        `Шаг ${step.id}/${TUTORIAL_STEPS.length}\n\n` +
        step.text.trim(),
        {
            reply_markup: {
                inline_keyboard: keyboard
            }
        }
    );
}



// ===== ЗАПУСК =====

async function startTutorial(ctx) {
    const user = getUser(ctx.from.id);

    if (!user) {
        return ctx.reply('❌ Сначала используй /start');
    }

    if (user.tutorialComplete === true) {
        return ctx.reply(
            '📚 Ты уже прошёл обучение.\n\nХочешь пройти его ещё раз?',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '🔄 Пройти заново',
                                callback_data: 'tutorial_restart'
                            }
                        ],
                        [
                            {
                                text: '🔙 В меню',
                                callback_data: 'back_to_menu'
                            }
                        ]
                    ]
                }
            }
        );
    }

    // Если обучение ещё не начиналось
    if (!user.tutorialStep || user.tutorialStep < 1) {
        user.tutorialStep = 1;
        saveUser(ctx.from.id, user);
    }

    const step = getStepById(user.tutorialStep);

    await showStep(ctx, step);
}


// ===== ДАЛЕЕ =====

async function nextStep(ctx) {
    const user = getUser(ctx.from.id);

    if (!user || user.tutorialComplete) {
        return;
    }

    const currentStep = getStepById(user.tutorialStep || 1);

    if (!currentStep) {
        return finishTutorial(ctx);
    }

    // Нельзя пропустить обязательное действие.
    if (currentStep.type === 'action') {
        return ctx.answerCbQuery(
            '⚠️ Сначала выполни задание!'
        );
    }

    const nextStep = getStepById(currentStep.id + 1);

    if (!nextStep) {
        return finishTutorial(ctx);
    }

    await ctx.answerCbQuery();

    await showStep(ctx, nextStep);
}


// ===== ПРОПУСК =====

async function skipTutorial(ctx) {
    const user = getUser(ctx.from.id);

    if (!user) return;

    user.tutorialComplete = true;

    saveUser(ctx.from.id, user);

    await ctx.answerCbQuery('Обучение пропущено');

    await ctx.reply(
        '⏭️ Обучение пропущено.\n\n' +
        'Ты всегда можешь вернуться к нему через /tutorial.'
    );

    return require('./menu').showMainMenu(ctx);
}


// ===== ЗАВЕРШЕНИЕ =====

async function finishTutorial(ctx) {
    const user = getUser(ctx.from.id);

    if (!user) return;

    user.tutorialComplete = true;
    user.tutorialStep = TUTORIAL_STEPS.length;

    saveUser(ctx.from.id, user);

    await ctx.answerCbQuery();

    await ctx.reply(
        '🎉 ОБУЧЕНИЕ ЗАВЕРШЕНО!\n\n' +
        'Теперь ты знаешь основные механики «Античного Градоначальника».\n\n' +
        '🏛️ Удачи, градоначальник!'
    );

    return require('./menu').showMainMenu(ctx);
}


// ===== ПЕРЕЗАПУСК =====

async function restartTutorial(ctx) {
    const user = getUser(ctx.from.id);

    if (!user) return;

    user.tutorialComplete = false;
    user.tutorialStep = 1;

    saveUser(ctx.from.id, user);

    await ctx.answerCbQuery();

    await showStep(ctx, getStepById(1));
}

async function completeAction(ctx, action) {
    const user = getUser(ctx.from.id);
    if (!user || user.tutorialComplete) return;

    const currentStep = getStepById(user.tutorialStep);

    if (!currentStep || currentStep.type !== 'action') return;

    if (currentStep.action !== action) return;

    const nextStep = getStepById(currentStep.id + 1);

    if (!nextStep) {
        return finishTutorial(ctx);
    }

    user.tutorialStep = nextStep.id;
    saveUser(ctx.from.id, user);

    await showStep(ctx, nextStep);
}

module.exports = {
    startTutorial,
    nextStep,
    skipTutorial,
    finishTutorial,
    restartTutorial,
    showStep,
    completeAction
};