# GDPR Automatic Deletion Function

Edge Function для автоматического удаления анкет пользователей по GDPR запросам.

## Описание

Эта функция автоматически обрабатывает запросы на удаление данных (GDPR) и удаляет анкеты пользователей через 7 дней (1 неделю) после создания запроса. Удаляются только анкеты, которые старше 1 недели с момента их создания.

## Структура

- `index.ts` - основной код Edge Function
- `deno.json` - конфигурация Deno
- `.env.example` - пример переменных окружения (для справки)

## Установка и деплой

### 1. Применить миграцию базы данных

```bash
# Применить миграцию для создания таблицы gdpr_requests
supabase migration up
```

Или через Supabase Dashboard:
- Перейдите в Database > Migrations
- Примените миграцию `003_gdpr_requests.sql`

### 2. Установить переменные окружения

Edge Function автоматически получает переменные окружения от Supabase, но убедитесь, что они установлены:

```bash
# Получить значения из Supabase Dashboard:
# Settings > API > Project URL и Service Role Key

# Установить secrets (если нужно):
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Деплой Edge Function

```bash
# Из корня проекта
supabase functions deploy delete_old_profiles
```

### 4. Настроить расписание (Scheduled Task)

Рекомендуется запускать **чаще**, чем раз в месяц (иначе удаление может задерживаться после периода охлаждения). Пример — раз в неделю:

```bash
supabase functions schedule create delete_old_profiles --cron "0 5 * * 1"
```

Для Edge Function при использовании вложений задайте секрет с тем же именем, что и на Vercel: `SUBMISSION_FILES_BUCKET` (имя bucket в Supabase Storage).

## Как это работает

1. Запись в `gdpr_requests` создаётся через `POST /api/gdpr/create-request` с действующим OTP-сессионным токеном (или вручную оператором в исключительных случаях). Типичный путь пользователя сейчас — запрос удаления через страницу «Запрос данных» (Telegram/e-mail); оператор может удалить запись в админке или завести GDPR-запись при необходимости.
2. Запрос сохраняется в таблицу `gdpr_requests` со статусом `pending`
3. Поле `scheduled_delete_at` автоматически вычисляется как `created_at + 7 days` (1 неделя)
4. Edge Function `delete_old_profiles` запускается по расписанию (1 раз в месяц)
5. Функция находит все запросы со статусом `pending`, где `scheduled_delete_at <= now()`
6. Для каждого запроса:
   - Удаляет только строки из таблицы `questionnaires`, которые старше 1 недели (`submitted_at` как Unix-ms < now − 7 дней).
   - Если для этого `profile_id` всё ещё есть строки в `questionnaires`, запрос **остаётся pending** и будет обработан позже (статус `deleted` не выставляется).
   - Когда записей в `questionnaires` для профиля не осталось: удаляются совпадающие строки из `submissions` (через RPC `submission_ids_for_gdpr_profile`, см. миграцию `20260501120000_gdpr_submissions_match.sql`), при наличии секрета `SUBMISSION_FILES_BUCKET` — файлы вложений из Storage, затем `sessions` и `otp_codes`.
   - Обновляет статус GDPR-запроса на `deleted` или `failed`.

## Идемпотентность

Функция полностью идемпотентна:
- Если анкеты уже удалены - ошибок не будет
- Если запросов нет - функция завершится успешно
- Если произошла ошибка - запрос помечается как `failed` и может быть обработан при следующем запуске

## Мониторинг

Логи функции доступны в Supabase Dashboard:
- Edge Functions > delete_old_profiles > Logs

Функция возвращает JSON с результатами:
```json
{
  "success": true,
  "message": "Processed 5 GDPR requests",
  "processed": 5,
  "successful": 5,
  "failed": 0
}
```

## Ручной запуск (для тестирования)

```bash
# Запустить функцию вручную
supabase functions invoke delete_old_profiles
```

## Проверка расписания

```bash
# Посмотреть все запланированные задачи
supabase functions schedule list
```

## Важные замечания

- Функция использует `SUPABASE_SERVICE_ROLE_KEY` для полного доступа к базе данных
- Удаление необратимо - данные удаляются навсегда
- Функция запускается 1 раз в месяц, но обрабатывает все запросы, которые готовы к удалению
- Период ожидания 7 дней (1 неделя) дает время для отмены запроса (если нужно)
- Удаляются только анкеты, которые старше 1 недели с момента их создания (submitted_at)
- Новые анкеты (младше 1 недели) не удаляются и будут обработаны при следующем запуске
