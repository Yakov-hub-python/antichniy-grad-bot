const { getUser } = require('../utils/storage');
const {
    BUILDING_NAMES,
    BUILDING_DESCRIPTIONS,
    BUILDING_COSTS,
    BUILDING_CATEGORIES,
    TECH_TREE
} = require('../config/constants');
const { ARMY_UNITS } = require('../config/army');
const { getEconomyBonuses, getPortLimit, getMarketCommission, getIncomeInterval } = require('../utils/helpers');

const PAGES = ['main', 'resources', 'buildings', 'economy', 'army', 'boss', 'trade'];

function getPageText(user, page) {
    if (page === 'main') {
        return `📖 ГАЙД «АНТИЧНЫЙ ГРАДОНАЧАЛЬНИК»\n\n` +
            `🏛️ Твоя цель — развивать полис: строить здания, собирать доход, открывать ветви развития, создавать армию и побеждать боссов.\n\n` +
            `🧭 С чего начать:\n` +
            `1. Построй хижину, ферму и шахту.\n` +
            `2. Собери первый доход.\n` +
            `3. Следи за едой: жители и армия её потребляют.\n` +
            `4. Поднимай уровень города строительством.\n` +
            `5. Развивай экономику и армию, когда выполняются требования.\n` +
            `6. Используй рынок для быстрых сделок, а порт — для торговли между игроками.\n\n` +
            `💡 В этом гайде ниже есть не только описание кнопок, но и основные формулы и правила игры.`;
    }

    if (page === 'resources') {
        const interval = Math.floor(getIncomeInterval(user) / 1000);
        return `📦 РЕСУРСЫ И ЭКОНОМИКА\n\n` +
            `💰 Золото\n` +
            `Главный ресурс. Используется для строительства, найма части войск, ветвей и торговли.\n\n` +
            `🪙 Монеты\n` +
            `Нужны для продвинутого развития, ветвей и некоторых торговых операций. При большом запасе монет действует налог на богатство.\n\n` +
            `🍖 Еда\n` +
            `Производится фермами и полями. За каждый сбор город сначала получает произведённую еду, затем из запаса вычитается потребление жителей и армии.\n` +
            `Потребление: 1 еды на жителя + 1.5 еды на каждого солдата за сбор.\n\n` +
            `⛏️ Железо\n` +
            `Поздний ресурс. Используется зданиями и отдельными старыми механиками найма.\n\n` +
            `📈 Эффективность\n` +
            `Производство зависит от рабочих. Если зданий требуется больше рабочих, чем есть жителей, производство уменьшается пропорционально: рабочие / необходимые рабочие.\n\n` +
            `⏱️ Сбор дохода: каждые ${interval} сек. Для VIP интервал короче.\n\n` +
            `💸 Налог на богатство\n` +
            `После превышения порога в 500 000 монет взимается 0.5% с превышения. Экономическая ветка может уменьшить налог.`;
    }

    if (page === 'buildings') {
        const sections = Object.entries(BUILDING_CATEGORIES).map(([category, ids]) => {
            const lines = ids.map(id => {
                const cost = BUILDING_COSTS[id] || {};
                const price = [
                    cost.gold ? `${cost.gold}💰` : '',
                    cost.coins ? `${cost.coins}🪙` : '',
                    cost.iron ? `${cost.iron}⛏️` : ''
                ].filter(Boolean).join(' + ') || 'бесплатно';
                return `${BUILDING_NAMES[id]} — ${BUILDING_DESCRIPTIONS[id] || 'Без описания.'}\n` +
                    `   База: ${price}, требуется ${cost.level || 1} ур.`;
            }).join('\n');
            return `📌 ${category}\n${lines}`;
        }).join('\n\n');

        return `🏗️ ЗДАНИЯ\n\n` +
            `Уровень города повышается за строительство: текущий уровень = количество построенных зданий + 1.\n` +
            `Цены строительства растут с количеством уже построенных зданий: базовая цена × (1 + 0.15 × количество).\n` +
            `На 13 уровне экономики действует скидка 10% на строительство.\n\n` +
            sections;
    }

    if (page === 'economy') {
        const economy = getEconomyBonuses(user);
        const levels = Object.entries(TECH_TREE.economy.levels).map(([level, data]) => {
            const cost = `${data.cost.gold || 0}💰 + ${data.cost.coins || 0}🪙`;
            return `${level}. ${data.unlocks.join(', ')} — ${data.bonus.description}\n` +
                `   Требование: город ${data.requirements.level} ур.; стоимость: ${cost}.`;
        }).join('\n');

        return `🌿 ВЕТКА ЭКОНОМИКИ\n\n` +
            `Текущий уровень: ${user.techTree?.economy || 0}/15\n\n` +
            `Важно: множитель дохода в ветке — это итоговое значение текущего уровня, а не произведение всех прошлых процентов. Поэтому на 10 уровне используется 1.30×, а не сумма/произведение всех предыдущих бонусов.\n\n` +
            `Текущие эффекты: доход ${economy.incomeMultiplier.toFixed(2)}×, монеты ${economy.coinMultiplier.toFixed(2)}×, комиссия рынка ${Math.round(getMarketCommission(user) * 100)}%, слотов порта ${getPortLimit(user)}, скидка строительства ${Math.round(economy.buildDiscount * 100)}%.\n\n` +
            levels;
    }

    if (page === 'army') {
        const lines = Object.entries(ARMY_UNITS).map(([id, unit]) =>
            `${unit.name} — открытие с ${unit.unlockLevel} ур. армии\n` +
            `⚔️ ${unit.damage} урона | 🛡️ ${unit.defense} защиты | ❤️ ${unit.hp} HP\n` +
            `💰 ${unit.cost.gold} + 🍖 ${unit.cost.food} за 1` 
        ).join('\n\n');

        return `⚔️ АРМИЯ\n\n` +
            `В бою используется армия из отдельных типов войск. Поле soldiers — только совместимый общий счётчик; реальные количества хранятся в army.\n\n` +
            `Урон армии = сумма (урон юнита × количество) + постоянные бонусы ветки/кузницы.\n` +
            `Защита армии = сумма (защита юнита × количество) + бонусы ветки.\n` +
            `Урон по боссу уменьшается на его защиту. Урон босса уменьшается на защиту армии.\n` +
            `Уровень 4 ветки армии снижает потери на 10%, уровень 6 добавляет +15 к урону по боссу.\n\n` +
            lines;
    }

    if (page === 'boss') {
        const bossKills = Number(user.bossKills) || 0;
        const current = Math.max(1, bossKills + 1);
        const hp = Math.floor(1000 * Math.pow(1.25, current - 1));
        const damage = Math.floor(75 * Math.pow(1.10, current - 1));
        const defense = Math.floor(20 * Math.pow(1.08, current - 1));

        return `👹 БОССЫ\n\n` +
            `Бой запускается кнопкой «Начать бой» и полностью проходит автоматически. Раунд происходит раз в 1 секунду. Во время активного боя нельзя вручную ускорить раунды.\n\n` +
            `📈 Прогрессия\n` +
            `Номер следующего босса = количество побед + 1.\n` +
            `HP = 1000 × 1.25^(номер − 1).\n` +
            `Урон = 75 × 1.10^(номер − 1).\n` +
            `Защита = 20 × 1.08^(номер − 1).\n\n` +
            `Сейчас у тебя побед: ${bossKills}. Следующий босс №${current}: примерно ${hp} HP, ${damage} урона, ${defense} защиты.\n\n` +
            `⚔️ В каждом раунде армия наносит урон боссу, после чего босс наносит ответный урон. Остаточный урон босса не теряется между раундами: он накапливается до уничтожения очередного юнита.\n\n` +
            `🏆 За победу выдаются золото, монеты и еда. Награда масштабируется от силы босса и учитывает потери армии.`;
    }

    return `⚓ ТОРГОВЛЯ\n\n` +
        `🏪 Рынок\n` +
        `Быстрый обмен по фиксированным базовым ценам. Комиссия зависит от экономики: 15% на ранних уровнях, 10% с 3 уровня, 7% с 7 и 5% с 11. С 5 уровня экономики продажи получают бонус +10%. С 15 уровня покупки ресурсов на рынке получают скидку 10%.\n\n` +
        `⚓ Порт\n` +
        `Игрок выставляет собственный лот и ждёт другого игрока. Ресурс резервируется сразу после выставления, поэтому его нельзя потратить второй раз. При покупке ресурс переходит покупателю, а продавец получает валюту. При отмене или истечении срока резерв возвращается продавцу.\n\n` +
        `📦 Слоты порта\n` +
        `Базовый лимит: ${getPortLimit(user)} лота. На 14 уровне экономики открываются ещё 2 слота. Дубликаты лотов разрешены: можно выставлять несколько отдельных выгодных предложений.`;
}

function keyboard(page) {
    const rows = [
        [
            { text: '📦 Ресурсы', callback_data: 'guide:resources' },
            { text: '🏗️ Здания', callback_data: 'guide:buildings' }
        ],
        [
            { text: '🌿 Экономика', callback_data: 'guide:economy' },
            { text: '⚔️ Армия', callback_data: 'guide:army' }
        ],
        [
            { text: '👹 Боссы', callback_data: 'guide:boss' },
            { text: '⚓ Торговля', callback_data: 'guide:trade' }
        ]
    ];

    if (page !== 'main') rows.push([{ text: '📖 Разделы', callback_data: 'guide:main' }]);
    rows.push([{ text: '🏛️ В меню', callback_data: 'back_to_menu' }]);
    return { reply_markup: { inline_keyboard: rows } };
}

async function show(ctx, page = 'main') {
    const user = getUser(ctx.from.id);
    if (!user) return ctx.reply('❌ Сначала /start');

    const safePage = PAGES.includes(page) ? page : 'main';
    const text = getPageText(user, safePage);
    const options = keyboard(safePage);

    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(text, options);
        } catch (error) {
            if (!error.description?.includes('message is not modified')) throw error;
        }
        await ctx.answerCbQuery().catch(() => {});
    } else {
        await ctx.reply(text, options);
    }
}

module.exports = { show, PAGES };
