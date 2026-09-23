const { getUser } = require('../utils/storage');
const { isVIP, getIncomeInterval, calculateIncome } = require('../utils/helpers');
const { MAIN_MENU } = require('../config/constants');

module.exports = {
    show: async (ctx) => {
        const user = getUser(ctx.from.id);
        if (!user) return ctx.reply('❌ Сначала запусти бота командой /start');

        // Рассчитываем доход
        const income = calculateIncome(user, { preview: true });

        // --- Формируем текст города ---
        const vipStatus = isVIP(user) ? '✅ Активен' : '❌ Не активен';
        const soldiers = user.soldiers || 0;
        const foodStatus = user.food > 0 ? '✅ Сыты' : '❌ Голодают (-20%)';
        const incomeInterval = getIncomeInterval(user) / 1000;

        let reply = `🏙️ **ТВОЙ ГОРОД**\n\n`;
        reply += `💰 Золото: ${user.gold}\n`;
        reply += `🪙 Монеты: ${user.coins}\n`;
        reply += `👥 Жители: ${user.citizens}\n`;
        reply += `🍖 Еда: ${user.food} (${foodStatus})\n`;
        reply += `🏗️ Уровень: ${user.level}\n`;
        reply += `👑 VIP: ${vipStatus}\n\n`;
        reply += `📊 Доход за сбор:\n`;
        reply += `💰 +${income.gold || 0} золота\n`;
        reply += `🍖 +${income.food || 0} еды\n`;
        reply += `🪙 +${income.coins || 0} монет\n`;
        if (income.iron) reply += `⛏️ +${income.iron} железа\n`;
        if (income.metal) reply += `🔩 +${income.metal} металла\n`;
        reply += `\n⏱️ Сбор каждые ${incomeInterval} сек.`;

        // --- Клавиатура ---
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💰 Собрать доход', callback_data: 'collect_income' }],
                    [{ text: '🏗️ Строительство', callback_data: 'build_menu' }],
                    [{ text: '⚔️ Тренировка армии', callback_data: 'training_show' }],
                    [{text: '🔬 Ветки технологий', callback_data: 'branch_show'}],
                    [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
                ]
            }
        };

        // --- Отправка/редактирование ---
        if (ctx.callbackQuery) {
            // Вызов через кнопку — редактируем текущее сообщение
            await ctx.editMessageText(reply, { ...keyboard, parse_mode: 'Markdown' });
            await ctx.answerCbQuery();
        } else {
            // Вызов через команду — новое сообщение
            await ctx.reply(reply, { ...keyboard, parse_mode: 'Markdown' });
        }
    }
};