const { getUser, saveUser, readDB, writeDB } = require('../utils/storage');

// ===== ПРОВЕРКА АДМИНА =====
function isAdmin(userId) {
    const admins = (process.env.ADMINS || '').split(',').map(id => id.trim());
    return admins.includes(String(userId));
}

// ===== СОЗДАТЬ ПРОМОКОД =====
function createPromo(code, type, amount, createdBy) {
    const db = readDB();
    if (!db.promocodes) db.promocodes = {};

    if (db.promocodes[code]) {
        return { ok: false, error: '❌ Промокод уже существует' };
    }

    db.promocodes[code] = {
        type,
        amount,
        createdBy,
        uses: 0,
        maxUses: 100,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 дней
        active: true
    };

    writeDB(db);
    return { ok: true };
}

// ===== АКТИВИРОВАТЬ ПРОМОКОД =====
function usePromo(code, userId) {
    const db = readDB();
    const promo = db.promocodes?.[code];

    if (!promo) return { ok: false, error: '❌ Промокод не найден' };
    if (!promo.active) return { ok: false, error: '❌ Промокод неактивен' };
    if (promo.expiresAt < Date.now()) return { ok: false, error: '❌ Промокод истёк' };
    if (promo.uses >= promo.maxUses) return { ok: false, error: '❌ Промокод использован' };

    const user = getUser(userId);
    if (user.usedPromos?.includes(code)) {
        return { ok: false, error: '❌ Вы уже активировали этот промокод' };
    }

    // Начисляем награду
    switch (promo.type) {
        case 'gold': user.gold += promo.amount; break;
        case 'coins': user.coins += promo.amount; break;
        case 'food': user.food += promo.amount; break;
        case 'vip':
            user.vip = {
                active: true,
                expiresAt: Date.now() + promo.amount * 24 * 60 * 60 * 1000
            };
            break;
        default: return { ok: false, error: '❌ Неизвестный тип награды' };
    }

    if (!user.usedPromos) user.usedPromos = [];
    user.usedPromos.push(code);
    promo.uses += 1;

    saveUser(userId, user);
    writeDB(db);

    return { ok: true, reward: `${promo.amount} ${promo.type}` };
}

// ===== УДАЛИТЬ ПРОМОКОД =====
function deletePromo(code) {
    const db = readDB();
    if (!db.promocodes?.[code]) {
        return { ok: false, error: '❌ Промокод не найден' };
    }
    delete db.promocodes[code];
    writeDB(db);
    return { ok: true };
}

// ===== СПИСОК ПРОМОКОДОВ =====
function getPromos() {
    const db = readDB();
    return db.promocodes || {};
}

// ===== КОМАНДЫ ДЛЯ БОТА =====
module.exports = (bot) => {

    // === АДМИН: создать промокод ===
    bot.command('newpromo', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            return ctx.reply('⛔ Только для админа');
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 4) {
            return ctx.reply(
                '❌ Формат: /newpromo <тип> <кол-во> <код>\n' +
                'Типы: gold, coins, food, vip\n' +
                'Пример: /newpromo gold 100 HELLO'
            );
        }

        const type = args[1];
        const amount = parseInt(args[2]);
        const code = args[3].toUpperCase();

        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ Количество — число > 0');
        }

        const result = createPromo(code, type, amount, ctx.from.id);
        if (!result.ok) return ctx.reply(result.error);

        await ctx.reply(`✅ Промокод ${code} создан!\n` +
            `📦 ${type} × ${amount}\n⏳ Действует 30 дней`);
    });

    // === АДМИН: удалить промокод ===
    bot.command('removepromo', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            return ctx.reply('⛔ Только для админа');
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            return ctx.reply('❌ /removepromo <код>');
        }

        const code = args[1].toUpperCase();
        const result = deletePromo(code);
        if (!result.ok) return ctx.reply(result.error);

        await ctx.reply(`✅ Промокод ${code} удалён`);
    });

    // === АДМИН: список промокодов ===
    bot.command('promolist', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            return ctx.reply('⛔ Только для админа');
        }

        const promos = getPromos();
        const codes = Object.keys(promos);

        if (codes.length === 0) {
            return ctx.reply('📭 Нет активных промокодов');
        }

        let text = '📋 СПИСОК ПРОМОКОДОВ:\n\n';
        for (const code of codes) {
            const p = promos[code];
            text += `${code}\n`;
            text += `   📦 ${p.type} × ${p.amount}\n`;
            text += `   📊 ${p.uses}/${p.maxUses}\n`;
            text += `   ${p.active ? '✅ Активен' : '❌ Неактивен'}\n\n`;
        }

        await ctx.reply(text);
    });

    // === ИГРОК: активировать промокод ===
    bot.command('promo', async (ctx) => {
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            return ctx.reply('❌ /promo <код>\n' +
                'Пример: /promo HELLO');
        }

        const code = args[1].toUpperCase();
        const result = usePromo(code, ctx.from.id);

        if (!result.ok) {
            return ctx.reply(result.error);
        }

        await ctx.reply(`🎉 Промокод ${code} активирован!\n✅ +${result.reward}`);
    });
};