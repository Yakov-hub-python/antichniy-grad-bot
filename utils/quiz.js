const QUIZ_QUESTIONS = [
    {
        id: 1,
        question: 'Как назывался главный город-государство Древней Греции?',
        options: ['Афины', 'Спарта', 'Коринф'],
        correct: 0,
        hint: 'Этот город называют «колыбелью демократии».'
    },
    {
        id: 2,
        question: 'Какой ресурс в боте нужен для постройки элитных зданий?',
        options: ['Золото', 'Монеты', 'Еда'],
        correct: 1,
        hint: 'нету'
    },
    {
        id: 3,
        question: 'Сколько жителей даёт одна хижина?',
        options: ['1', '3', '5'],
        correct: 1,
        hint: 'нету'
    },
    {
        id: 4,
        question: 'Как часто можно собирать доход (обычный игрок)?',
        options: ['1 минута', '1.5 минуты', '3 минуты'],
        correct: 1,
        hint: 'Раньше было 5 минут, теперь быстрее.'
    },
    {
        id: 5,
        question: 'Какое здание в боте даёт солдат?',
        options: ['Казарма', 'Арена', 'Храм'],
        correct: 0,
        hint: 'Там тренируют воинов.'
    },
    {
        id: 6,
        question: 'Какой босс появляется по расписанию?',
        options: ['Личный', 'Глобальный'],
        correct: 1,
        hint: 'нету'
    },
    {
        id: 7,
        question: 'Сколько монет стоит карьер?',
        options: ['500', '750', '1000'],
        correct: 1,
        hint: 'нету'
    },
    {
        id: 8,
        question: 'Что даёт VIP-статус в боте?',
        options: ['Больше дохода', 'Чаще сбор', 'И то и другое'],
        correct: 2,
        hint: 'нету'
    },
    {
        id: 9,
        question: 'Какой год основания Рима?',
        options: ['753 до н.э.', '476 до н.э.', '27 до н.э.'],
        correct: 0,
        hint: 'Это легендарная дата основания города.'
    },
    {
        id: 10,
        question: 'Как называется главная площадь в боте?',
        options: ['Агора', 'Форум', 'Площадь'],
        correct: 0,
        hint: 'Это слово означает «рыночная площадь» по-гречески.'
    }
];

function getQuizQuestion(index) {
    return QUIZ_QUESTIONS[index] || null;
}

function getTotalQuestions() {
    return QUIZ_QUESTIONS.length;
}

function checkAnswer(questionId, answerIndex) {
    const question = QUIZ_QUESTIONS.find(q => q.id === questionId);
    if (!question) return false;
    return question.correct === answerIndex;
}

module.exports = { QUIZ_QUESTIONS, getQuizQuestion, getTotalQuestions, checkAnswer };