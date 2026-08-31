const { getUser, saveUser } = require('../utils/storage');
const { getQuizQuestion, getTotalQuestions, checkAnswer } = require('../utils/quiz');

async function startQuiz(ctx) {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const today = new Date();

    if (today.getMonth() !== 8 || today.getDate() !== 1) {
        return ctx.reply('🎓 Викторина доступна только 1 сентября!');
    }

    const quizData = user.quiz || {};
    if (quizData.completed && quizData.date === today.toDateString()) {
        const score = quizData.score || 0;
        return ctx.reply(`✅ Ты уже прошёл викторину! Твой результат: ${score}/10`);
    }

    user.quiz = { currentQuestion: 0, score: 0, completed: false, date: today.toDateString() };
    saveUser(userId, user);

    const question = getQuizQuestion(0);
    await sendQuestion(ctx, question, 0);
}

async function sendQuestion(ctx, question, index) {
    if (!question) return ctx.reply('❌ Вопрос не найден.');
    const text =
        `📚 ВОПРОС ${index + 1} / 10\n\n` +
        `${question.question}\n\n` +
        question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n') +
        `\n\n💡 Подсказка: ${question.hint}\n✏️ Отправь номер ответа (1, 2 или 3)`;
    await ctx.reply(text);
}

async function handleQuizAnswer(ctx) {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const text = ctx.message.text.trim();
    const quiz = user.quiz || {};
    if (!quiz || quiz.completed) return;

    const answerIndex = parseInt(text) - 1;
    if (isNaN(answerIndex) || answerIndex < 0 || answerIndex > 2) {
        return ctx.reply('❌ Отправь номер ответа: 1, 2 или 3');
    }

    const currentIndex = quiz.currentQuestion || 0;
    const question = getQuizQuestion(currentIndex);
    if (!question) return ctx.reply('❌ Что-то пошло не так. Попробуй начать заново командой /question');

    const isCorrect = checkAnswer(question.id, answerIndex);
    if (isCorrect) {
        quiz.score += 1;
        user.gold += 20;
        await ctx.reply('✅ Правильно! +20💰 🎉');
    } else {
        await ctx.reply(`❌ Неправильно. Правильный ответ: ${question.options[question.correct]}`);
    }

    quiz.currentQuestion += 1;

    if (quiz.currentQuestion >= getTotalQuestions()) {
        quiz.completed = true;
        const score = quiz.score;
        let bonusText = '';
        if (score === 10) {
            user.vip = { active: true, expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 };
            user.gold += 200;
            bonusText = '👑 VIP 3 дня и 200💰 за идеальный результат!';
        } else if (score >= 7) {
            user.gold += 100;
            bonusText = '100💰 за отличный результат!';
        } else if (score >= 4) {
            user.gold += 50;
            bonusText = '50💰 за хороший результат!';
        } else {
            bonusText = 'В следующий раз повезёт 😊';
        }
        saveUser(userId, user);
        await ctx.reply(
            `🎓 ВИКТОРИНА ЗАВЕРШЕНА!\n\n📊 Твой результат: ${score} / 10\n🎁 ${bonusText}\n\nСпасибо за участие! 🏛️`
        );
    } else {
        saveUser(userId, user);
        const nextQuestion = getQuizQuestion(quiz.currentQuestion);
        await sendQuestion(ctx, nextQuestion, quiz.currentQuestion);
    }
}

module.exports = { startQuiz, handleQuizAnswer };