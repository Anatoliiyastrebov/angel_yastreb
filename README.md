# Health Questionnaire App (Анкета по здоровью)

Многоязычное веб-приложение для сбора анкет по здоровью с поддержкой DSGVO/GDPR, интеграцией с Telegram и поддержкой трех языков (RU, EN, DE).

## 🚀 Возможности

- ✅ Многоязычный интерфейс (Русский, Английский, Немецкий)
- ✅ DSGVO/GDPR соответствие с политикой конфиденциальности
- ✅ Интеграция с Telegram Bot API для отправки анкет
- ✅ Безопасное хранение анкет в Supabase с шифрованием
- ✅ Аутентификация через одноразовые коды (OTP)
- ✅ Четыре типа анкет: для младенцев, детей, женщин и мужчин
- ✅ Просмотр, редактирование и удаление отправленных анкет
- ✅ Поиск анкет по контакту (Telegram или телефон)
- ✅ Валидация форм
- ✅ Адаптивный дизайн

## 📋 Требования

- Node.js **20.9+** и npm (Next.js 15)
- Telegram Bot Token (получить у [@BotFather](https://t.me/BotFather))
- Telegram Chat ID (получить у [@userinfobot](https://t.me/userinfobot))
- Supabase проект (для хранения анкет)
- Vercel аккаунт (для деплоя)

## 🛠️ Установка и запуск

### 1. Клонирование репозитория

```bash
git clone https://github.com/Anatoliiyastrebov/angel_yastreb.git
cd angel_yastreb
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` в корне проекта и заполните значения (локально Next читает только файлы из корня репозитория).

**Важно:** не коммитьте `.env.local`. Полный список переменных — в `.env.example` и `DEPLOYMENT_CHECKLIST.md`.

### 4. Запуск dev-сервера

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3001` (порт задан в `package.json`).

## 📦 Сборка для продакшена

```bash
npm run build
npm run start
```

Сборка Next.js — каталог `.next/` (на Vercel выводит платформа автоматически, **не** указывайте `dist` как Output Directory).

## 🌐 Деплой

### Деплой на Vercel

#### Быстрый деплой через Vercel CLI:

1. **Установите Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Войдите в Vercel:**
   ```bash
   vercel login
   ```

3. **Деплой проекта:**
   ```bash
   vercel
   ```

#### Деплой через GitHub

1. **Проект на Vercel должен быть именно этим репозиторием (Next.js).**
   - [vercel.com](https://vercel.com) → **Add New Project** → импорт **[angel_yastreb](https://github.com/Anatoliiyastrebov/angel_yastreb)** (или ваш форк).
   - **Framework Preset:** Next.js (или автоматически по `next` в зависимостях).
   - **Root Directory:** корень репозитория (где лежит `package.json`).
   - **Build Command:** `npm run build` (уже задано в `vercel.json`).
   - **Output Directory:** оставьте **пустым** / значение по умолчанию для Next. Если указано **`dist`** от старого Vite — админские URL (`/admin/submissions/…`) будут отдавать один `index.html` и давать **404** в приложении.

2. **Домен:** актуальный продакшен этого репозитория — **`https://angel-yastreb.vercel.app`**. В **Project Settings → Domains** убедитесь, что нужный домен привязан к проекту, который собирается из GitHub **`angel_yastreb`** (старый статический деплой на другом имени даст 404 на `/admin/...`).

3. **Переменные окружения:** см. `.env.example` и `DEPLOYMENT_CHECKLIST.md`. Обязательно для админки и формы: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, при необходимости `TELEGRAM_PUBLIC_APP_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ADMIN_EMAILS`, `CRON_SECRET`.

4. **Проверка после деплоя:** откройте `https://<ваш-домен>/api/health`. Должен вернуться **JSON** вида `{"ok":true,"stack":"next",...}`. Если видите HTML с `<div id="root">` и скрипт `/assets/index-*.js` — на домене всё ещё **не** этот Next-проект.

5. После смены переменных — **Redeploy** (при необходимости включите очистку кэша сборки в интерфейсе Vercel).


## 🔧 Технологии

- **Next.js** (App Router) — фреймворк и прод-сервер
- **React** — UI
- **TypeScript**
- **Tailwind CSS**, **shadcn/ui**
- **Supabase** — БД и auth для админки
- **Sonner** — уведомления

## 📝 Структура проекта

```
src/
├── app/               # Маршруты Next.js (страницы, api/*)
├── views/             # Крупные экраны анкеты (импортируются из app/)
├── components/        # UI и формы
├── contexts/
├── lib/               # Утилиты, серверная логика (server/), Supabase-клиенты
└── middleware.ts      # Защита /admin
```

## 🔐 Безопасность

- ✅ Все секретные ключи хранятся только в переменных окружения Vercel
- ✅ Данные анкет шифруются перед сохранением в Supabase (AES-256-CBC)
- ✅ Row Level Security (RLS) настроен в Supabase
- ✅ Аутентификация через одноразовые коды (OTP)
- ✅ Сессионные токены с автоматическим истечением
- ✅ Файл `.env` в `.gitignore` (не попадает в репозиторий)
- ✅ API endpoints защищены проверкой сессий
- ✅ Ошибки не раскрывают детали реализации клиенту

**Важно:** 
- Никогда не публикуйте `SUPABASE_SERVICE_ROLE_KEY` или `ENCRYPTION_KEY` в клиентском коде
- Регулярно ротируйте ключи шифрования
- Используйте HTTPS (обязательно в продакшене)

## 📄 Лицензия

MIT

## 👤 Автор

Создано с помощью [Lovable](https://lovable.dev)
