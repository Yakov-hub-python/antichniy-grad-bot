// ============================================================
// ОБУЧЕНИЕ ДЛЯ НОВИЧКОВ (ОНБОРДИНГ)
// ============================================================

const TRAINING_STEPS = [
    {
        id: 1,
        title: '🏠 Первый шаг',
        description: 'Построй хижину, чтобы появились жители. Напиши /city или город, и нажми на кнопку строительство, потом хижина',
        action: 'build_hut',
        reward: 20,
        next: 2
    },
    {
        id: 2,
        title: '🌾 Еда для жителей',
        description: 'Построй ферму, чтобы жители не голодали.',
        action: 'build_farm',
        reward: 25,
        next: 3
    },
    {
        id: 3,
        title: '⛏️ Добыча золота',
        description: 'Построй шахту, чтобы получать золото.',
        action: 'build_mine',
        reward: 30,
        next: 4
    },
    {
        id: 4,
        title: '💰 Сбор дохода',
        description: 'Собери доход — получи ресурсы. Нажми "Собрать доход" в городе',
        action: 'collect_income',
        reward: 40,
        next: null
    }
];

function getTrainingStep(stepId) {
    return TRAINING_STEPS.find(s => s.id === stepId) || null;
}

function getFirstStep() {
    return TRAINING_STEPS[0];
}

function isTrainingComplete(user) {
    return user.training && user.training.completed === true;
}

function startTraining(user) {
    if (!user.training) {
        user.training = { currentStep: 1, completed: false };
    }
}

function advanceTraining(user, action) {
    if (!user.training || user.training.completed) return null;

    const currentStep = getTrainingStep(user.training.currentStep);
    if (!currentStep) return null;

    if (currentStep.action === action) {
        user.gold += currentStep.reward;
        if (currentStep.next === null) {
            user.training.completed = true;
            return { completed: true, step: currentStep };
        } else {
            user.training.currentStep = currentStep.next;
            const nextStep = getTrainingStep(currentStep.next);
            return { completed: false, step: currentStep, nextStep: nextStep };
        }
    }
    return null;
}

module.exports = {
    TRAINING_STEPS,
    getTrainingStep,
    getFirstStep,
    isTrainingComplete,
    startTraining,
    advanceTraining
};