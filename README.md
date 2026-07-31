🏛️ Античный Градоначальник — Telegram-бот

Экономическая стратегия с рынком, боями и рейтингом.
Написана на Node.js + Telegraf, данные хранятся в JSON.

---

📦 Технологии

· Node.js (v20+)
· Telegraf (v4)
· node-cron
· dotenv
· JSON (хранение данных)

---

⚙️ Установка и запуск

```bash
git clone https://github.com/Yakov-hub-python/antichniy-grad-bot.git
cd antichniy-grad-bot
npm install
cp .env.example .env   # добавьте BOT_TOKEN
node index.js
```

---

🧩 Основные команды (для игроков)

Команда Действие
/start Начать игру
/city Город
/build Строительство
/income Собрать доход
/sell food 10 Продать ресурс
/buy food 10 Купить ресурс
/boss Боссы
/olymp Топ-10
/daily Бонус
/referral Рефералка
/help Помощь

Админ-команды
/admin, /give_gold, /give_vip, /say, /list_users, /delete_user, /reset_user, /backup

---

📁 Структура

```
├── index.js
├── config/
├── handlers/       # команды, кнопки, callback
├── hears/          # логика кнопок
├── actions/        # обработчики callback
└── utils/          # storage.js, helpers.js
```

---

👤 Разработчик

Яша (DEDAYSON)
GitHub · Telegram

---

📄 MIT License