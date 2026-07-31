const { getAllUsers, getUser, saveUser } = require('../utils/storage');
const { MAIN_MENU } = require('../config/constants');
const { sellResource, buyResource } = require('./hears/market');
// ===== ПРОВЕРКА АДМИНА =====
function isAdmin(userId) {
    const ADMINS = process.env.ADMINS ? process.env.ADMINS.split(',').map(id => id.trim()) : [];
    return ADMINS.includes(userId.toString());
}

// ===== /ADMIN =====
async function adminPanel(ctx) {
    if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Доступ запрещён.');
    await ctx.reply(
        `👑 АДМИН-ПАНЕЛЬ\n\n` +
        `📌 Команды:\n` +
        `/give_gold @user 100\n` +
        `/give_vip @user 7\n` +
        `/say текст\n` +
        `/list_users\n` +
        `/delete_user @user\n` +
        `/reset_user @user\n` +
        `/backup — скачать бекап БД`,
        MAIN_MENU
    );
}

// ===== /GIVE_GOLD =====
async function giveGold(ctx) {
    if (!isAdmin(ctx.from.id)) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 3) return ctx.reply('❌ /give_gold @user 100');
    const username = args[1].replace('@', '');
    const amount = parseInt(args[2]);
    
    try {
        const users = await getAllUsers();
        let found = false;
        for (const user of users) {
            if (user.username === username) {
                user.gold += amount;
                await saveUser(user.id, user);
                found = true;
                break;
            }
        }
        if (!found) return ctx.reply('❌ Игрок не найден');
        await ctx.reply(`✅ ${username} получил ${amount} золота`);
    } catch (err) {
        await ctx.reply('❌ Ошибка при выдаче золота');
    }
}

// ===== /GIVE_VIP =====
async function giveVip(ctx) {
    if (!isAdmin(ctx.from.id)) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 3) return ctx.reply('❌ /give_vip @user 7');
    const username = args[1].replace('@', '');
    const days = parseInt(args[2]);
    
    try {
        const users = await getAllUsers();
        let found = false;
        for (const user of users) {
            if (user.username === username) {
                user.vip = { active: true, expiresAt: Date.now() + days * 24 * 60 * 60 * 1000 };
                await saveUser(user.id, user);
                found = true;
                break;
            }
        }
        if (!found) return ctx.reply('❌ Игрок не найден');
        await ctx.reply(`✅ ${username} получил VIP на ${days} дней`);
    } catch (err) {
        await ctx.reply('❌ Ошибка при выдаче VIP');
    }
}

// ===== /SAY =====
async function say(ctx) {
    if (!isAdmin(ctx.from.id)) return;
    const text = ctx.message.text.replace('/say ', '');
    if (!text || text.length < 2) {
        return ctx.reply('❌ Введите текст рассылки: /say Текст');
    }
    
    try {
        const users = await getAllUsers();
        let count = 0;
        for (const user of users) {
            try {
                await ctx.telegram.sendMessage(user.id, `📢 ${text}`);
                count++;
                await new Promise(r => setTimeout(r, 50));
            } catch (err) {}
        }
        await ctx.reply(`✅ Рассылка отправлена ${count} игрокам`);
    } catch (err) {
        await ctx.reply('❌ Ошибка при рассылке');
    }
}

// ===== /LIST_USERS =====
async function listUsers(ctx) {
    if (!isAdmin(ctx.from.id)) return;
    try {
        const users = await getAllUsers();
        if (users.length === 0) return ctx.reply('📭 Нет игроков');
        
        let text = `👥 ВСЕ ИГРОКИ (${users.length}):\n\n`;
        for (const user of users) {
            text += `🆔 ${user.id} | @${user.username || 'unknown'} | 💰 ${user.gold} | 🏗️ ${user.level}\n`;
            if (text.length > 3900) break;
        }
        await ctx.reply(text);
    } catch (err) {
        await ctx.reply('❌ Ошибка при получении списка');
    }
}

// ===== /DELETE_USER =====
async function deleteUser(ctx) {
    if (!isAdmin(ctx.from.id)) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('❌ /delete_user @user');
    const username = args[1].replace('@', '');
    
    try {
        const users = await getAllUsers();
        let found = false;
        for (const user of users) {
            if (user.username === username) {
                // Удаляем через выбранную БД
                const { supabase } = require('../utils/storage');
                await supabase.from('users').delete().eq('id', user.id);
                found = true;
                break;
            }
        }
        if (!found) return ctx.reply('❌ Игрок не найден');
        await ctx.reply(`✅ ${username} удалён`);
    } catch (err) {
        await ctx.reply('❌ Ошибка при удалении');
    }
}

// ===== /RESET_USER =====
async function resetUser(ctx) {
    if (!isAdmin(ctx.from.id)) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('❌ /reset_user @user');
    const username = args[1].replace('@', '');
    
    try {
        const users = await getAllUsers();
        let found = false;
        for (const user of users) {
            if (user.username === username) {
                await saveUser(user.id, {
                    ...user,
                    gold: 200,
                    food: 0,
                    coins: 0,
                    citizens: 5,
                    level: 1,
                    buildings: { hut: 0, farm: 0, mine: 0, mint: 0, market: 0, barracks: 0 },
                    lastIncome: Date.now(),
                    lastDaily: null,
                    vip: { active: false, expiresAt: 0 },
                    referrals: [],
                    referredBy: null,
                    referralCompleted: false,
                    bossKills: 0,
                    totalDamage: 0,
                    personalBoss: { hp: 5000, maxHp: 5000, respawnAt: 0, kills: 0 },
                    exp: 0
                });
                found = true;
                break;
            }
        }
        if (!found) return ctx.reply('❌ Игрок не найден');
        await ctx.reply(`✅ ${username} сброшен до начального состояния`);
    } catch (err) {
        await ctx.reply('❌ Ошибка при сбросе');
    }
}

// ===== /BACKUP =====
async function backup(ctx) {
    if (!isAdmin(ctx.from.id)) return;
    try {
        const users = await getAllUsers();
        const json = JSON.stringify(users, null, 2);
        await ctx.replyWithDocument({
            source: Buffer.from(json, 'utf-8'),
            filename: `backup_${new Date().toISOString().slice(0,10)}.json`
        });
        await ctx.reply(`✅ Бекап создан!`);
    } catch (err) {
        await ctx.reply('❌ Ошибка при создании бекапа');
    }
}

module.exports = {
    isAdmin,
    adminPanel,
    giveGold,
    giveVip,
    say,
    listUsers,
    deleteUser,
    resetUser,
    backup
};