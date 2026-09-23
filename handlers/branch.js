const { getUser, saveUser } = require('../utils/storage');
const { TECH_TREE } = require('../config/constants');
const {sendOrEdit} = require('../utils/helpers');

module.exports = async (ctx) => {
    const args = ctx.message?.text?.split(' ') || [];
    const user = getUser(ctx.from.id);
    if (!user) return ctx.reply('Сначала /start');

    // ===== ВЕТКА 1: показать список =====
    if (args.length < 2) {
        let reply = '🏛️ ВЕТКИ РАЗВИТИЯ\n\n';
        for (const [key, branch] of Object.entries(TECH_TREE)) {
            const level = user.techTree?.[key] || 0;
            const maxLevel = Object.keys(branch.levels).length;
            reply += `${branch.name} — уровень ${level}/${maxLevel}\n`;
        }
        reply += '\nИспользуй /branch <economy|army> для улучшения.';
        return sendOrEdit(ctx,reply,{
            reply_markup:{
                inline_keyboard: [
                    [
                        {text:"Назад",callback_data:"back_to_menu"}
                    ]
                ]
            }
        });
    }

    // ===== ВЕТКА 2: улучшить =====
    const nameTree = args[1].toLowerCase();
    const tree = TECH_TREE[nameTree];
    if (!tree) return ctx.reply('❌ Доступно: economy, army.');

    const currentLevel = user.techTree?.[nameTree] || 0;
    const maxLevel = Object.keys(tree.levels).length;

    if (currentLevel >= maxLevel) {
        return ctx.reply('🎉 Эта ветка прокачена на максимум');
    }

    const nextLevel = currentLevel + 1;
    const levelData = tree.levels[nextLevel];

    // --- Проверка уровня города ---
    if ((user.level || 1) < levelData.requirements.level) {
        return ctx.reply(`❌ Нужен уровень города ${levelData.requirements.level}`);
    }

    // --- Проверка кулдауна ---
    const now = Date.now();
    const lastUpgrade = user.techTreeLastUpgrade?.[nameTree] || 0;
    if (now - lastUpgrade < levelData.cooldown) {
        const left = Math.ceil((levelData.cooldown - (now - lastUpgrade)) / 3600000);
        return ctx.reply(`⏳ Подожди ${left} ч.`);
    }

    // --- Проверка ресурсов ---
    if (user.gold < levelData.cost.gold) {
        return ctx.reply(`❌ Нужно ${levelData.cost.gold}💰`);
    }
    if (user.coins < levelData.cost.coins) {
        return ctx.reply(`❌ Нужно ${levelData.cost.coins}🪙`);
    }

    // --- Действия ---
    user.gold -= levelData.cost.gold;
    user.coins -= levelData.cost.coins;

    user.techTree = user.techTree || {};
    user.techTree[nameTree] = nextLevel;

    user.techTreeLastUpgrade = user.techTreeLastUpgrade || {};
    user.techTreeLastUpgrade[nameTree] = now;

    // --- Бонусы армии ---
    if (nameTree === 'army') {
        if (levelData.bonus.damageBonus) {
            user.soldierDamage = (user.soldierDamage || 0) + levelData.bonus.damageBonus;
        }
        if (levelData.bonus.defenseBonus) {
            user.soldierDefense = (user.soldierDefense || 0) + levelData.bonus.defenseBonus;
        }
    }
    // --- Бонусы экономики ---
    if (nameTree === 'economy') {
        if (levelData.bonus?.taxReduction) {
            user.taxReduction =
                Math.max(
                    user.taxReduction || 0,
                    levelData.bonus.taxReduction
                );
        }

        if (levelData.bonus?.sellBonus) {
            user.sellBonus =
                Math.max(
                    user.sellBonus || 1,
                    levelData.bonus.sellBonus
                );
        }
    }
    saveUser(ctx.from.id, user);

    // --- Ответ ---
    let reply = `✅ ${tree.name} улучшена до ${nextLevel} уровня!\n`;
    if (levelData.unlocks) reply += `🔓 Открыто: ${levelData.unlocks.join(', ')}\n`;
    if (levelData.bonus?.description) reply += `📈 Бонус: ${levelData.bonus.description}`;

    sendOrEdit(ctx,reply);
};