# TODO

## Идеи и нерешённые вопросы

### Подтверждение аккаунта через Telegram / WhatsApp

Email-верификация и magic-link сейчас не работают по-настоящему — нет
своего домена, письма уходят через `onboarding@resend.dev` и часто падают
в спам. До покупки домена и настройки SPF/DKIM попробовать альтернативу:

- Подтверждение телефона / аккаунта через **Telegram Login Widget**
  (https://core.telegram.org/widgets/login) — пользователь нажимает кнопку
  «Войти через Telegram», мы получаем верифицированный `id` + `phone_number`
  (опционально, если он сам поделится). Минимум кода, не нужен свой бот.
- Альтернатива: **свой Telegram-бот** через `node-telegram-bot-api` или
  Grammy — присылает 6-значный код в чат, юзер вводит на сайте. Чуть
  больше работы, но независим от Login Widget.
- **WhatsApp Business API** для кода в WA — есть Twilio / Vonage / Meta
  Cloud API. Стоит денег за каждое сообщение, регистрация шаблонов через
  Meta. Подождать пока не вырастем.

**Что нужно решить:** Telegram Login Widget или свой бот? Widget проще,
бот даёт больше контроля (можно слать уведомления о записях клиентам).

**Где трогать в коде:**
- `src/services/auth.ts` — добавить `requestTelegramLogin`, заменить
  flow в `LoginOTPPage` и при регистрации
- Новая таблица `telegram_accounts` (user_id, telegram_id, username,
  verified_at) либо колонки `telegram_id`/`phone` в `users`
- Удалить или переименовать `email_tokens` → `verification_tokens`
  если разнесём на email/telegram

---

### Автоматическая выгрузка контактов из Telegram / WhatsApp в базу клиентов

Чтобы не заводить клиентов руками — синхронизировать с мессенджером.

- **Telegram:**
  - Через свой бот: добавил бота в чат с клиентом → бот видит `phone_number`
    (если клиент его шарил) → создаём запись в `clients`. Работает только
    для тех, кто реально начал чат с ботом.
  - Через MTProto-клиент (`gram.js`, `mtcute`) — может выгрузить весь
    список контактов аккаунта. Серая зона: нужны API ID/Hash, пользователь
    логинит свой Telegram через свой телефон. Полная синхронизация, но
    повышенный риск блокировки аккаунта Telegram'ом.
- **WhatsApp:**
  - Официального способа выгрузить контакты нет.
  - WhatsApp Business API — клиент пишет нам сам, мы записываем номер.
  - Парсинг VCF-экспорта из приложения — фиговый UX, ручной импорт.

**Что нужно решить:** какой источник первым — Telegram-бот (проще, легально,
требует чтобы клиент сам открыл диалог) или MTProto-импорт всего контакт-листа.

**Где трогать в коде:**
- Новая таблица `contact_sources` (client_id, source: 'telegram'|'whatsapp',
  external_id, raw)
- `src/services/imports/telegram.ts` (новый модуль) + воркер для
  периодической синхронизации (Vercel cron / Inngest)
- В `clients` добавить колонку `telegram_id` (nullable, unique) для
  идемпотентного upsert
- Кнопка «Подключить Telegram» в `/settings` или отдельная страница
  `/integrations`

---

### Интеграция с AI-bot (приём записей из Telegram-ботов)

**Контекст.** В соседнем проекте https://github.com/savisafe/ai-bot
живёт мультибот-платформа: один процесс держит несколько Telegram-ботов
(по JSON-конфигу на каждый бизнес), FSM-скрипты собирают слоты записи
(`service`, `date`, `time`, `client_name`, `phone`, `master`) и
складывают `Booking` в свою БД. В их TODO пункт **11b** прямо
сформулирован: «CRM API integration with idempotency, sync status
tracking, retry logic, error observability» — это про нас.

**Что нужно сделать с нашей стороны:**
- API-ключи на бизнес: новая таблица `api_keys` (key_hash, business_id,
  name, scopes, created_at, last_used_at) + страница `/settings/api`
  для генерации/отзыва
- HTTP endpoint `POST /api/external/bookings` для приёма записей
  с идемпотентностью (полное описание контракта — в
  `docs/api/bot-integration.md`)
- Сначала появятся таблицы `services` и `appointments` (этап Calendar
  в основном плане). До этого endpoint можно заглушить за фича-флагом.

**Где трогать в коде:**
- `src/db/schema/api-keys.ts` — таблица
- `src/services/external/bookings.ts` — приём + идемпотентность
- `src/app/api/external/bookings/route.ts` — POST handler
- `src/lib/api-auth.ts` — проверка Bearer-токена + поиск бизнеса
- `src/views/settings/api-keys.tsx` — UI генерации
