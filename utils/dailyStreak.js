function getDailyReward(streak) {
    const gold = Math.min(200 + streak * 50, 700);
    const food = Math.min(10 + streak * 10, 100);
    const coins = streak >= 3 ? Math.min(Math.floor((streak - 2) * 1.5), 20) : 0;
    const vip = (streak % 7 === 0 && streak > 0) ? 3 : 0;
    return { gold, food, coins, vip };
}

function getStreakInfo(user) {
    const now = Date.now();
    const lastDaily = user.lastDaily || 0;
    const streak = user.dailyStreak || 0;

    if (lastDaily === 0) {
        return { streak: 0, canClaim: true, waitTime: null };
    }

    const diff = now - lastDaily;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay) {
        const waitTime = oneDay - diff;
        return { streak, canClaim: false, waitTime };
    }

    if (diff < 2 * oneDay) {
        return { streak, canClaim: true };
    }

    return { streak: 0, canClaim: true };
}

function applyDailyBonus(user) {
    const info = getStreakInfo(user);
    if (!info.canClaim) {
        const minutes = Math.ceil(info.waitTime / 60000);
        return { error: `⏳ Подожди ${minutes} минут до следующего бонуса` };
    }

    const newStreak = info.streak === 0 ? 1 : info.streak + 1;
    const reward = getDailyReward(newStreak);

    user.gold += reward.gold;
    user.food += reward.food;
    user.coins += reward.coins;
    if (reward.vip > 0) {
        user.vip = {
            active: true,
            expiresAt: Date.now() + reward.vip * 24 * 60 * 60 * 1000
        };
    }

    user.dailyStreak = newStreak;
    user.lastDaily = Date.now();

    return { reward, newStreak };
}

module.exports = { getDailyReward, getStreakInfo, applyDailyBonus };