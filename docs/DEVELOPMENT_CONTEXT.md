# Development Context

## Project
- Name: `mesto-frontend` (Mesto) — CRM для бьюти-студий/салонов: клиенты, услуги,
  команда, календарь записей, рабочий график. Плюс внешний API для приёма записей
  из ai-bot (Telegram).
- Stack: **Next.js 15** (App Router, Turbopack), **React 19**, TypeScript;
  **Drizzle ORM** + **Neon** serverless Postgres; `@node-rs/argon2` (пароли);
  session-cookie (sha256 токена); Tailwind v4; framer-motion; **vitest + pglite**
  (тесты, миграции из `./drizzle`); resend (email).
- Current stage: рабочее ядро CRM (auth, бизнесы/команда, клиенты, услуги, календарь)
  + **фича «рабочий график/доступность»** + **интеграция с ai-bot** (внешний API +
  UI ключей) реализованы. Интеграция проверена e2e на боевой Neon (19/19).

## Implemented

### Auth & sessions
- `users` (argon2 `passwordHash`, `role`), `sessions` (`sha256(token)`, TTL 30д,
  авто-refresh), `email-tokens`. `lib/crypto` (`randomToken`/`sha256`),
  `lib/session`, `lib/auth` (`getCurrentUser`). Magic-link/OTP частично (email
  через `resend.dev` — TODO свой домен/SPF).

### Data model (Drizzle, `src/db/schema`)
- `businesses` (+`timezone` IANA def `Asia/Almaty`, +`archivedAt` — архив с
  авто-очисткой ~30д), `business-members` (роли OWNER/MANAGER/EMPLOYEE),
  `clients` (+`telegram_id` unique-в-бизнесе, `isBlacklisted`),
  `services` (+`external_id` unique-в-бизнесе, `amount`/`currency`/`durationMinutes`),
  `appointments` (`startsAt`/`endsAt`, `status`, `source: manual|external`,
  `external_idempotency_key` unique-в-бизнесе, snapshot `amount`/`currency`),
  `work-schedules` (business/employee, `weekday` 0-6, `start`/`endMinute`,
  `validFrom`/`validUntil`), `time-off` (блоки), `api-keys` (`keyHash` sha256,
  `scopes[]`, `lastUsedAt`, `revokedAt`), `invites`.

### Рабочий график и доступность (`services/availability.ts`)
- `getAvailability({businessId, from, to, serviceId?, employeeUserId?, granularity})`
  → дни `open`/`closed` (+`closedReason`) + слоты с offset бизнеса (tz через `dayjs`
  utc/timezone). Команда = владелец + `business_members` (`getBusinessTeam`).
- `validateSlot()` → `OUT_OF_HOURS` / `BLOCKED` / `SLOT_CONFLICT` / ok. Permissive
  по часам, если график в бизнесе не настроен (не ломать пустую конфигурацию).
- `hasAppointmentConflict` / `windowsFor` (экспортируются, переиспользуются).
- UI **`/schedule`** (часы по дням + блоки `time_off`), сервис `services/schedule.ts`.

### Внешний API для бота (`/api/external/*`) — Mesto = авторитет
- Аутентификация: Bearer per-business (`api-keys`, `sha256`). `lib/api-auth`
  (`authenticateBearer`, `hasScope`, `generateApiKey`, `parseBearer`),
  `lib/external-api` (`requireAuth`+scope, `apiOk`/`apiError`, маппинг кодов→HTTP,
  эхо `X-Request-Id`, `bookingDetailJson`).
- Роуты: `GET availability`, `POST clients`, `POST`/`GET bookings`,
  `GET`/`PATCH bookings/[id]`, `POST bookings/[id]/cancel`, `GET services`, `GET team`.
- `services/external/`: `bookings` (`createExternalBooking` — идемпотентность,
  find-or-create клиента telegram‖phone, матч услуги `external_id`→имя→ad-hoc,
  матч мастера, `validateSlot`; `get`/`list`/`update`/`cancel`), `clients`
  (`findOrCreateClient`), `catalog` (`listExternalServices`).
- UI генерации/отзыва ключей **`/settings/api`** (`services/api-keys.ts`, owner-only,
  raw-ключ показывается один раз).
- Контракт: `docs/api/bot-integration.md`. План/статус: `docs/integration-plan.md`.
  Как связать с ботом: `mesto-bot/docs/CONNECTING_TO_MESTO.md`.

### CRM-функционал (services + views)
- `appointments` (CRUD; конфликт-валидация), `clients`, `businesses`, `employees`
  (invite/accept/revoke/remove), `services`, `dashboard`, `_access`
  (`checkBusinessAccess`: OWNER/MEMBER/null).
- Pages (`src/app/<route>/page.tsx` → `src/views/*Page.tsx`): dashboard, calendar,
  clients, employees, my-business, settings, **settings/api**, **schedule**, reviews,
  finance, login/registration. Навигация — `src/ui/header/Header.tsx` (`routes.ts`).
  UI-кит `src/ui` (button/form/modal/select/spinner/…). Контексты Auth/Business/Notification.

### Tests
- vitest + pglite (в `tests/db.ts` миграции из `./drizzle`), **164 теста**
  (appointments, availability, api-auth, external/bookings+clients, api-keys, schedule, …).
- `scripts/e2e-external.ts` — self-cleaning e2e на боевой Neon (временный тест-бизнес
  → curl по реальным эндпоинтам → уборка): availability с вырезанным блоком, booking
  201, идемпотентный replay, BLOCKED/OUT_OF_HOURS 422, cancel, 401. **19/19.**

## Architecture Decisions
- **Mesto — авторитет расписания для бота.** Рабочие часы/блоки/закрытые даты
  enforce'ит ТОЛЬКО внешний API (`services/external/*` → `validateSlot`). **Ручной
  календарь** (`services/appointments.ts`) проверяет лишь конфликт записей
  (`hasAppointmentConflict`) — владелец может писать в любое время (override).
  Это сознательный откат первого варианта (A4 навязывал часы в ручной календарь и
  блокировал владельца — фидбек при тестировании).
- **`availability.ts` — единый источник правды:** один `validateSlot`/conflict для
  ручного календаря и бота, чтобы не разъезжалось.
- **API-ключи:** `sha256` (как сессии), raw показывается один раз, `scopes`,
  per-business; бизнес определяется ключом (бот не пишет в чужой бизнес).
- **Идемпотентность приёма:** по `(business_id, external_idempotency_key)` —
  unique-индекс на `appointments`; повтор → тот же `appointment_id`, `200`.
- **Дедуп клиента:** find-or-create по `telegram_id` ИЛИ `phone` в рамках бизнеса.
- **Timezone владеет Mesto** (`businesses.timezone`); availability отдаёт слоты с
  offset, бот их не пересчитывает.

## Risks / Open Questions
- **`/settings` (SettingsPage) — мок** (на `useState`/`console.log`, не подключён к данным).
- **Нет UI-редактора `timezone`** бизнеса (проставляется дефолт `Asia/Almaty`).
- **Баг инпутов в модалках** (репорт): «сбрасывается ввод» на каждый символ.
  В `TextField`/`Modal` из кода не воспроизводится (корректные controlled-компоненты) —
  нужна локализация вживую (повторяется ли в `/employees` invite-модалке?).
- **Удаление клиента** не работает: `appointments.clientId` → `onDelete: restrict`,
  клиента с записями БД не удаляет. Решено убрать функцию (вместо неё `isBlacklisted`) —
  отдельная задача (есть spawned chip).
- **`/schedule` — только бизнес-уровневые** часы/блоки в UI; per-employee override
  есть в схеме (`work_schedules.employeeUserId`), но не в UI.
- **Архив бизнесов** (`archivedAt` + `purgeExpiredArchives` + Vercel cron) — был
  репорт про поведение удаления; проверить.
- **External API и архив:** `createExternalBooking` проверяет только `isActive` —
  стоит учитывать `archivedAt` (бот не должен писать в архивный бизнес).
- **Prod email** не настроен (resend.dev → спам).

## Change Log
- **Интеграция с ai-bot (2026-05-29 … 05-31).** Двусторонняя модель (Mesto —
  авторитет), контракт `docs/api/bot-integration.md`.
  - Фаза A: `businesses.timezone`; `work_schedules`+`time_off`+`availability.ts`
    (`getAvailability`/`validateSlot`), подключён в `appointments` (позже откатили
    на conflict-only для ручного календаря); миграция `0004`. Тесты availability.
  - Фаза B: `api_keys` + `lib/api-auth`; `clients.telegram_id`,
    `services.external_id`, unique-индекс idempotency; миграция `0005`. Тесты api-auth.
  - Фаза C: `services/external/{bookings,clients,catalog}` + роуты
    `app/api/external/*` + `lib/external-api`. Тесты сервис-слоя.
  - UI: **B2** `/settings/api` (ключи), **A5** `/schedule` (график) + ссылки в навигации.
  - Откат A4: ручной календарь — conflict-only (см. Architecture Decisions).
  - Миграции `0004`/`0005` применены к боевой Neon; e2e `scripts/e2e-external.ts` 19/19.
- История CRM до интеграции — в `git log`.
