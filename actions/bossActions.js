const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');
const { getSoldiers, getPersonalBossHP, getBossReward } = require('../utils/helpers');
const { updateQuestProgress } = require('../utils/quests');
const { checkAchievements, claimAchievementReward } = require('../utils/achievements');

module.exports = {
    // ============================================================
    // 1️⃣ ЛИЧНЫЙ БОСС
    // ============================================================
    
    attackPersonal: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const personal = user.personalBoss || { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 };

        if (personal.respawnAt > Date.now()) {
            const left = Math.floor((personal.respawnAt - Date.now()) / 60000);
            return ctx.reply(`⏳ Личный босс перерождается через ${left} минут`);
        }

        const soldiers = getSoldiers(user);
        const damage = soldiers * 3;
        personal.hp -= damage;

        if (personal.hp <= 0) {
            personal.hp = getPersonalBossHP(user);
            personal.respawnAt = Date.now() + 3 * 60 * 60 * 1000;
            personal.kills = (personal.kills || 0) + 1;

            const reward = getBossReward(user);
            user.gold += reward;
            user.bossKills = (user.bossKills || 0) + 1;

            if (Math.random() < 0.1) {
                user.vip = { active: true, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
                await ctx.reply(`🎉 Ты получил VIP на 1 день за убийство личного босса!`);
            }

            user.personalBoss = personal;
            saveUser(userId, user);

            // Квест
            const questResult = updateQuestProgress(user, 'boss');
            if (questResult?.completed) {
                await ctx.reply(`🎉 КВЕСТ ВЫПОЛНЕН!\n${questResult.quest.name}\nНаграда: ${questResult.quest.reward === 'vip_3' ? 'VIP 3 дня' : questResult.quest.reward + '💰'}`);
            }

            // Достижения
            const newAchievements = checkAchievements(user);
            for (const ach of newAchievements) {
                await ctx.reply(`🏆 НОВОЕ ДОСТИЖЕНИЕ!\n${ach.name}\n${ach.description}`);
                claimAchievementReward(user, ach);
                await ctx.reply(`🎁 Награда: ${ach.reward === 'vip_3' || ach.reward === 'vip_7' ? ach.reward.replace('_', ' ').toUpperCase() : ach.reward + '💰'}`);
            }

            await ctx.reply(
                `⚔️ ЛИЧНЫЙ БОСС ПОВЕРЖЕН!\n` +
                `💰 +${reward} золота!\n` +
                `🏆 Убийств: ${personal.kills}\n` +
                `⏳ Следующий через 3 часов.`
            );
        } else {
            user.personalBoss = personal;
            saveUser(userId, user);

            await ctx.reply(
                `⚔️ Урон: ${damage}. Осталось HP: ${personal.hp}/${getPersonalBossHP(user)}`
            );
        }
    },

    // ============================================================
    // 2️⃣ ГЛОБАЛЬНЫЙ БОСС
    // ============================================================

    attackGlobal: async (ctx) => {
        const userId = ctx.from.id;
        const user = getUser(userId);
        const db = readDB();
        const global = db.globalBoss || { hp: 5000, maxHp: 5000, active: true, participants: [] };

        if (!global.active) {
            return ctx.reply('💤 Глобальный босс повержен. Следующий в 12:00 или 18:00.');
        }

        const soldiers = getSoldiers(user);
        const damage = soldiers * 2;
        global.hp -= damage;

        if (!global.participants) global.participants = [];
        const existing = global.participants.find(p => p.id === userId);
        if (existing) {
            existing.damage += damage;
        } else {
            global.participants.push({ id: userId, damage: damage });
        }

        if (global.hp <= 0) {
            global.active = false;
            const sorted = global.participants.sort((a, b) => b.damage - a.damage);
            const top = sorted.slice(0, 3);

            // ===== НАГРАДЫ ТОП-3 =====
            for (let i = 0; i < top.length; i++) {
                const player = getUser(top[i].id);
                if (i === 0) {
                    player.vip = { 
                        active: true, 
                        expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 
                    };
                    player.gold += 1000;
                    await ctx.telegram.sendMessage(top[i].id, 
                        '🏆 Ты занял 1 место!\n👑 VIP на 3 дня\n💰 +1000 золота!'
                    );
                } else {
                    player.gold += 500;
                    await ctx.telegram.sendMessage(top[i].id, 
                        `🥈 ${i+1} место! +500 золота!`
                    );
                }
                // ✅ СОХРАНЯЕМ КАЖДОГО ИЗ ТОП-3
                saveUser(top[i].id, player);
            }

            // ===== ВСЕМ УЧАСТНИКАМ =====
            const share = Math.floor(5000 / (global.participants.length || 1));
            for (const p of global.participants) {
                const player = getUser(p.id);
                player.coins += share;
                // ✅ СОХРАНЯЕМ КАЖДОГО УЧАСТНИКА
                saveUser(p.id, player);
            }

            // ===== СОЗДАЁМ НОВОГО БОССА =====
            const userCount = Object.keys(db.users || {}).length;
            global.hp = 5000 + 1000 * Math.floor(userCount / 2) || 5000;
            global.maxHp = global.hp;
            global.active = true;
            global.participants = [];
            db.globalBoss = global;
            writeDB(db);

            await ctx.reply(
                `🌍 ГЛОБАЛЬНЫЙ БОСС ПОВЕРЖЕН!\n` +
                `🪙 Все участники получили +${share} монет!\n` +
                `⏳ Новый босс уже появился!`
            );
        } else {
            db.globalBoss = global;
            writeDB(db);
            await ctx.reply(`⚔️ Урон: ${damage}. Осталось HP: ${global.hp}/${global.maxHp}`);
        }
    }
};