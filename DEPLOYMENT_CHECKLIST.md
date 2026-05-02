# ✅ Чеклист готовности к деплою на Vercel

## 🔐 Безопасность

- [x] Удалены все файлы Netlify (`netlify.toml`)
- [x] Удалены упоминания Netlify из кода
- [x] Убран `console.log` с OTP кодами (безопасность)
- [x] `ENCRYPTION_KEY` обязателен (нет fallback)
- [x] Все секретные ключи только в переменных окружения
- [x] `.env` файлы в `.gitignore`

## 📦 Зависимости

- [x] `next`, `react`, `@supabase/supabase-js`, `@supabase/ssr` установлены
- [x] Проект собирается локально: `npm run build` (Next.js, не Vite `dist`)

## 🗄️ База данных

- [ ] Создан проект в Supabase
- [ ] Применена SQL миграция (`supabase/migrations/001_initial_schema.sql`)
- [ ] Получены ключи доступа (Project URL и service_role key)

## 🔑 Переменные окружения в Vercel

Добавьте переменные в **Project Settings → Environment Variables**. Полный список и комментарии — в **`.env.example`**.

### Обязательные для сайта и админки (Supabase)

1. **NEXT_PUBLIC_SUPABASE_URL** — URL проекта Supabase  
2. **NEXT_PUBLIC_SUPABASE_ANON_KEY** — anon key  
3. **SUPABASE_URL** — обычно тот же URL, что и публичный  
4. **SUPABASE_SERVICE_ROLE_KEY** — service_role (только сервер)  

### Админ-панель и уведомления

5. **ADMIN_EMAILS** — список email админов через запятую (совпадает с аккаунтом после входа через Supabase Auth)  
6. **TELEGRAM_BOT_TOKEN** и **TELEGRAM_CHAT_ID** — для OTP и уведомлений (допустимы legacy имена **VITE_*** как запасной вариант)  
7. **TELEGRAM_PUBLIC_APP_URL** — публичный https URL этого Next-деплоя (канонические ссылки в Telegram)  
8. **CRON_SECRET** — секрет для вызова `/api/cron/cleanup-submissions` из Vercel Cron  

### Прочее

9. **ENCRYPTION_KEY** — для legacy шифрования анкет (hex); без него старые записи не расшифровать  
10. **NEXT_PUBLIC_SITE_URL** — канонический URL сайта в продакшене  

Опционально: Turnstile, лимиты — см. `.env.example`.

### Вложения (анализы, УЗИ, сканы)

1. В Supabase: **Storage → New bucket** (private), имя совпадает с **`SUBMISSION_FILES_BUCKET`** в Vercel.  
2. Загрузка на сервер идёт через **service_role**; политики могут запрещать публичный доступ — так и нужно.  
3. Консультант открывает файлы в **админке** на странице заявки (`/admin/submissions/<id>`), блок «Анализы…» — временная подписанная ссылка.  
4. В Telegram приходит только ссылка на карточку заявки, не сами файлы.

## 🚀 Деплой

1. Импортируйте репозиторий с **Next.js** (этот код): Framework **Next.js**, **не** статический вывод Vite; поле **Output Directory** не должно быть `dist`.
2. Убедитесь, что домен в **Settings → Domains** указывает на **этот** проект (иначе будет старый фронт и 404 на `/admin/...`).
3. Задайте переменные окружения и выполните **Redeploy**.

## ✅ Проверка после деплоя

1. **Обязательно:** откройте `https://<ваш-домен>/api/health` — ожидается JSON `{"ok":true,"stack":"next",...}`. Если приходит HTML с `<div id="root">` и `/assets/index-*.js`, домен всё ещё смотрит на старый Vite-проект.
2. Отправьте тестовую анкету; проверьте строки в таблице `submissions` в Supabase. Если включён bucket — отправьте анкету **с файлом** и убедитесь, что объект появился в Storage и скачивается из админки.
3. **Проверьте безопасность:**
   - Убедитесь, что OTP коды не выводятся в консоль
   - Проверьте, что данные шифруются в Supabase
   - Убедитесь, что переменные окружения не видны в клиентском коде

4. **Проверьте Supabase:**
   - Откройте Supabase Dashboard → Table Editor
   - Проверьте, что таблицы созданы
   - Проверьте, что анкеты сохраняются с зашифрованными данными

## 🐛 Устранение проблем

### Ошибка "Supabase URL and Service Role Key must be set"
- Проверьте, что переменные `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` добавлены в Vercel
- Убедитесь, что проект был пересобран после добавления переменных

### Ошибка "ENCRYPTION_KEY environment variable is required"
- Проверьте, что переменная `ENCRYPTION_KEY` добавлена в Vercel
- Убедитесь, что ключ сгенерирован правильно (64 символа hex)

### Ошибка "relation does not exist"
- Убедитесь, что SQL миграция была выполнена в Supabase
- Проверьте в Supabase Dashboard → Table Editor, что таблицы существуют

### Данные не сохраняются
- Проверьте логи в Vercel Dashboard → Functions
- Проверьте логи в Supabase Dashboard → Logs
- Убедитесь, что RLS политики настроены правильно

## 📝 Дополнительные настройки

### Настройка Telegram Webhook (для автоматической отправки OTP)

1. **Примените дополнительную SQL миграцию:**
   - Откройте Supabase Dashboard → SQL Editor
   - Скопируйте содержимое файла `supabase/migrations/002_add_telegram_chat_ids.sql`
   - Вставьте и выполните (Run)

2. **Настройте webhook после деплоя:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.vercel.app/api/telegram/webhook"}'
   ```

3. **Попросите пользователей написать боту `/start`:**
   - Это необходимо для сохранения их `chat_id`
   - После этого OTP коды будут отправляться автоматически

### Отправка OTP

Логика на сервере Next.js: `src/lib/server/send-otp-flow.ts`, эндпоинт **`POST /api/auth/send-otp`**. Нужны **`TELEGRAM_BOT_TOKEN`** (или legacy **`VITE_TELEGRAM_BOT_TOKEN`**) и webhook/chat id по необходимости.

**Для Telegram (концептуально):**
```typescript
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (BOT_TOKEN && contactType === 'telegram') {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `Ваш код подтверждения: ${otp}`,
    }),
  });
}
```

**Для SMS:**
Используйте сервис типа Twilio, AWS SNS или аналогичный.

## 🎉 Готово!

После выполнения всех шагов ваш проект готов к работе на Vercel с безопасным хранением данных в Supabase!
