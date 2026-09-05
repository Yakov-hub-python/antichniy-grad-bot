const { getUser, saveUser } = require('../utils/storage');
const { TECH_TREE } = require('../config/constants');

module.exports = async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        const user = getUser(ctx.from.id);
        if (!user) return ctx.reply('Сначала /start');
        const level = user.techTree?.economy || 0;
        let reply = `🏛️ ВЕТКА ЭКОНОМИКИ\nУровень: ${level}/10\n\n`;
        if (level < 10) {
            const next = TECH_TREE.economy.levels[level + 1];
            reply += `📌 Следующий уровень (${level + 1}):\n💰 ${next.cost.gold} золота, 🪙 ${next.cost.coins} монет\n⏳ ${next.cooldown/3600000} ч. ожидания\n🔓 Открывает: ${next.unlocks.join(', ')}\n\nИспользуй /branch economy, чтобы улучшить.`;
        } else reply += '🎉 Максимальный уровень достигнут!';
        return ctx.reply(reply);
    }
    const branchName = args[1];
    if (branchName !== 'economy') return ctx.reply('❌ Доступна только ветка economy.');
    const user = getUser(ctx.from.id);
    if (!user) return ctx.reply('Сначала /start');
    if (user.techTree?.economy >= 10) return ctx.reply('🎉 Ветка экономики уже максимальна!');
    const nextLevel = (user.techTree?.economy || 0) + 1;
    const levelData = TECH_TREE.economy.levels[nextLevel];
    if ((user.level || 1) < levelData.requirements.level) return ctx.reply(`❌ Требуется уровень города ${levelData.requirements.level}. У тебя ${user.level || 1}.`);
    const now = Date.now();
    const lastUpgrade = user.techTreeLastUpgrade?.economy || 0;
    if (now - lastUpgrade < levelData.cooldown) {
        const left = Math.ceil((levelData.cooldown - (now - lastUpgrade)) / 3600000);
        return ctx.reply(`⏳ Подожди ${left} ч. до следующего улучшения.`);
    }
    const { gold, coins } = levelData.cost;
    if (user.gold < gold) return ctx.reply(`❌ Нужно ${gold}💰, у тебя ${user.gold}.`);
    if (user.coins < coins) return ctx.reply(`❌ Нужно ${coins}🪙, у тебя ${user.coins}.`);
    user.gold -= gold; user.coins -= coins;
    user.techTree = user.techTree || {};
    user.techTree.economy = nextLevel;
    user.techTreeLastUpgrade = user.techTreeLastUpgrade || {};
    user.techTreeLastUpgrade.economy = now;
    saveUser(ctx.from.id, user);
    let reply = `✅ Экономика улучшена до ${nextLevel} уровня!\n`;
    if (levelData.unlocks) reply += `🔓 Открыто: ${levelData.unlocks.join(', ')}\n`;
    if (levelData.bonus) {
        const bonusText = Object.entries(levelData.bonus).filter(([k]) => k !== 'activeAbility').map(([k,v]) => `${k}: +${Math.round((v-1)*100)}%`).join(', ');
        if (bonusText) reply += `📈 Бонус: ${bonusText}\n`;
        if (levelData.bonus.activeAbility) reply += `✨ Активная способность: ${levelData.bonus.activeAbility}\n`;
    }
    ctx.reply(reply);
};