const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { showMainMenu } = require('../handlers/menu');
const { updateQuestProgress } = require('../utils/quests');
const { checkAchievements, claimAchievementReward } = require('../utils/achievements');
const { startTraining, getFirstStep } = require('../utils/training');

module.exports = async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    let user = getUser(userId);
    user.username = ctx.from.username || ctx.from.first_name || 'unknown';
    user.first_name = ctx.from.first_name || 'Игрок';
    if (!user.nickname) {
        user.nickname = 'Игрок';
    }
    saveUser(userId, user);
    const { isEventDay, applyEventBonus } = require('../utils/event_handlers');
    if (isEventDay()) {
        const bonusApplied = applyEventBonus(user);
        if (bonusApplied) {
            saveUser(userId, user);
            await ctx.reply('🎁 С ДНЁМ ЗНАНИЙ! Ты получил +100💰 и VIP на 1 день!');
        }
    }
    // ===== ОБРАБОТКА РЕФЕРАЛЬНОЙ ССЫЛКИ =====
    if (text.includes('ref_')) {
        const refId = text.split('_')[1];
        if (refId == userId) return await ctx.reply('❌ Нельзя пригласить самого себя!');

        const db = readDB();
        const newUser = db.users[userId];
        if (newUser.referredBy) return await ctx.reply('❌ Ты уже был приглашён!');

        newUser.referredBy = refId;
        newUser.gold += 200;
        newUser.vip = { active: true, expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 };

        if (!db.users[refId].referrals) db.users[refId].referrals = [];
        db.users[refId].referrals.push(userId);
        db.users[refId].gold += 200;
        db.users[refId].vip = { active: true, expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 };

        writeDB(db);
        await ctx.reply(`🎉 Ты пришёл по ссылке друга! +200💰 и VIP 3 дня!`);
        
        try {
            await ctx.telegram.sendMessage(refId, `👤 Твой друг @${user.username} пришёл! +200💰 и VIP 3 дня!`);
        } catch (err) {}

        // ===== ОБНОВЛЯЕМ КВЕСТ У ПРИГЛАСИВШЕГО (referral) =====
        const refUser = getUser(refId);
        const questResult = updateQuestProgress(refUser, 'referral');
        if (questResult?.completed) {
            try {
                await ctx.telegram.sendMessage(refId, 
                    `🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\nНаграда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`
                );
            } catch (err) {}
        }

        // ===== ПРОВЕРЯЕМ ДОСТИЖЕНИЯ У ПРИГЛАСИВШЕГО =====
        const newAchievements = checkAchievements(refUser);
        for (const ach of newAchievements) {
            try {
                await ctx.telegram.sendMessage(refId, 
                    `🏆 НОВОЕ ДОСТИЖЕНИЕ!\n${ach.name}\n${ach.description}`
                );
                claimAchievementReward(refUser, ach);
                await ctx.telegram.sendMessage(refId, 
                    `🎁 Награда: ${ach.reward === 'vip_3' || ach.reward === 'vip_7' ? ach.reward.replace('_', ' ').toUpperCase() : ach.reward + '💰'}`
                );
            } catch (err) {}
        }
    }
    
    // ===== ОБНОВЛЯЕМ УРОВЕНЬ =====
    const totalBuildings = Object.values(user.buildings).reduce((a, b) => a + b, 0);
    user.level = totalBuildings + 1;
    saveUser(userId, user);

    // ===== ПРОВЕРЯЕМ ДОСТИЖЕНИЯ =====
    const newAchievements = checkAchievements(user);
    for (const ach of newAchievements) {
        await ctx.reply(`🏆 НОВОЕ ДОСТИЖЕНИЕ!\n${ach.name}\n${ach.description}`);
        claimAchievementReward(user, ach);
        await ctx.reply(`🎁 Награда: ${ach.reward === 'vip_3' || ach.reward === 'vip_7' ? ach.reward.replace('_', ' ').toUpperCase() : ach.reward + '💰'}`);
    }


    if (!user.training) {
        startTraining(user);
        const step = getFirstStep();
        
        await ctx.reply(
            `🏛️ ДОБРО ПОЖАЛОВАТЬ, ${ctx.from.first_name.toUpperCase()}!\n\n` +
            `📚 ОБУЧЕНИЕ: ШАГ 1 / 4\n\n` +
            `${step.title}\n${step.description}\n\n` +
            `🏆 Награда: ${step.reward}💰\n\n` +
            `💰 Золото: ${user.gold}\n` +
            `🏗️ Уровень: ${user.level}\n` +
            `👥 Друзей: ${user.referrals?.length || 0}`
        );
        saveUser(userId, user);
        return;
    }
    // ===== ПРИВЕТСТВИЕ =====
    await ctx.reply(
        `🏛️ ДОБРО ПОЖАЛОВАТЬ, ${ctx.from.first_name.toUpperCase()}!\n\n` +
        `💰 Золото: ${user.gold}\n` +
        `🏗️ Уровень города: ${user.level}\n` +
        `👥 Друзей: ${user.referrals ? user.referrals.length : 0}\n\n` +
        `Строй, воюй и приводи друзей!`,
        MAIN_MENU
    );
    await showMainMenu(ctx);
};