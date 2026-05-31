# План реализации интеграции ai-bot ↔ Mesto

Двусторонняя модель, Mesto — авторитет расписания. Контракт API:
[bot-integration.md](api/bot-integration.md). Сторона бота:
`mesto-bot/docs/MESTO_INTEGRATION.md`.

**Последовательность.** Веб A→B→C идёт первым; шаг **C8** (mock + dev-ключ)
разблокирует команду бота. Фаза **D** (бот) пишется параллельно после заморозки
контракта и появления mock. **E** — позже.

Критический путь всего проекта — **A3 (`availability.ts`)**.

---

## Web · Фаза A — график и доступность (критический путь)

- [x] **A1.** Колонка `timezone` (IANA, default `Asia/Almaty`) в `src/db/schema/businesses.ts`
- [x] **A2.** Схемы `src/db/schema/work-schedules.ts` (businessId, employeeUserId?, weekday 0-6, startMinute, endMinute, validFrom?, validUntil?) и `src/db/schema/time-off.ts` (businessId, employeeUserId?, startsAt, endsAt, reason, note?) — миграция `0004_burly_meltdown.sql`
- [x] **A3.** `src/services/availability.ts`:
  - `getAvailability({businessId, from, to, serviceId?, employeeUserId?, granularityMinutes})` → дни open/closed + слоты (tz через `dayjs`)
  - `validateSlot({businessId, employeeUserId?, startsAt, durationMinutes})` → `ok` / `OUT_OF_HOURS` / `BLOCKED` / `SLOT_CONFLICT`
  - Тесты: `src/services/availability.test.ts` (13 кейсов)
- [x] **A4.** Источник правды для слотов в `availability.ts`. **Ручной календарь** (`createAppointment`/`updateAppointment`) проверяет ТОЛЬКО конфликт записей (`hasAppointmentConflict`) — владелец может писать вне часов (override). Рабочие часы/блоки (`validateSlot`) enforce'ит ТОЛЬКО внешний API бота. (Первый вариант навязывал часы и в ручной календарь — откатили по фидбеку: блокировало owner'а.)
- [x] **A5.** `/schedule` UI (часы по дням недели + блоки `time_off`). Сервис `src/services/schedule.ts` + action + view `SchedulePage.tsx`. Юнит-тесты сервиса; страница рендерится (200). Интерактивный authed-флоу в браузере не прогонял (нужна сессия).

**Готово, когда:** `getAvailability` верно отдаёт слоты/закрытые дни, `validateSlot` отклоняет вне часов/блок/конфликт; юнит-тесты зелёные. ✅ A1–A4 готовы (120 тестов, tsc, eslint зелёные). Остаётся A5 (UI).

## Web · Фаза B — авторизация ключом + колонки интеграции

- [x] **B1.** Схема `src/db/schema/api-keys.ts` (keyHash sha256, scopes, lastUsedAt, revokedAt) + `src/lib/api-auth.ts` (`generateApiKey`, `authenticateBearer`, `hasScope`, `parseBearer`) + тесты `api-auth.test.ts`
- [x] **B2.** `/settings/api` — генерация (показ ключа один раз) / список / отзыв. Сервис `src/services/api-keys.ts` (owner-only) + action + view `SettingsApiPage.tsx`. Юнит-тесты сервиса; страница рендерится (200). Интерактивный authed-флоу в браузере не прогонял (нужна сессия).
- [x] **B3.** `clients.telegram_id` (unique в бизнесе), `services.external_id` (unique в бизнесе), unique-индекс на `appointments.external_idempotency_key` — миграция `0005_powerful_longshot.sql`

**Готово, когда:** ключ аутентифицирует, отозванный → 403, scope-чек работает. ✅ B1/B3 готовы (128 тестов, tsc, eslint зелёные). Остаётся B2 (UI).

## Web · Фаза C — внешние эндпоинты

Все под `src/app/api/external/*`, за `authenticateBearer`, scoped на бизнес; логика в `src/services/external/`.

- [x] **C1.** `GET /availability` — `src/app/api/external/availability/route.ts`
- [x] **C2.** `POST /clients` (find-or-create по telegram_id‖phone)
- [x] **C3.** `POST /bookings` (идемпотентность → клиент → матч услуги/мастера → `validateSlot` → insert `source='external'`)
- [x] **C4.** `GET /bookings/:id` + `GET /bookings?telegram_id=…`
- [x] **C5.** `PATCH /bookings/:id` (ревалидация)
- [x] **C6.** `POST /bookings/:id/cancel`
- [x] **C7.** `GET /services`, `GET /team`
- [x] **~~C8. Mock~~ → реальные данные.** Mock/демо-сид не делали. Миграции `0004`/`0005` применены к Neon. UI B2/A5 готовы. E2E: `scripts/e2e-external.ts` (self-cleaning тест-бизнес в Neon) — **19/19 проверок ✅** (availability с вырезанным блоком, booking 201, идемпотентный replay, BLOCKED 422, OUT_OF_HOURS 422, cancel, services/team, 401). Поймал и пофикшен баг: `/availability` отдавал camelCase вместо контрактного snake_case.

> **Прогресс:** сервис-слой + все HTTP-роуты готовы. Helper `src/lib/external-api.ts`
> (`requireAuth`+scope, `apiOk`/`apiError`, маппинг кодов→HTTP, эхо `X-Request-Id`).
> Роуты под `src/app/api/external/*`: availability, clients, bookings (POST/GET-list),
> bookings/[id] (GET/PATCH), bookings/[id]/cancel, services, team.
> Smoke-тест: без ключа → `401` (ок); миграции на Neon ещё не применены.
> **TODO (полировка):** оборачивать необработанные исключения в роутах в `500 INTERNAL`
> (сейчас даёт пустой 500 — статус верный, тело не по контракту).

**Готово, когда:** happy-path запись через curl, 422 на блок, 409 на двойную бронь, идемпотентный повтор. ✅ Логика + роуты + 150 тестов, tsc, eslint зелёные. Остаётся: миграции на Neon + UI (B2/A5) для end-to-end проверки.

## Bot · Фаза D — потребление API (параллельно после C8)

- [x] **D1.** `src/modules/skills/mesto-client.service.ts` (Bearer per-bot из `crm.apiKeyEnv`, методы availability/booking/patch/cancel/list/clients, ретраи только 5xx/сеть). Зарегистрирован в `SkillsModule`.
- [x] **D2.** Блок `crm` (provider/baseUrl/apiKeyEnv): zod-схема v2 + `ResolvedCrm` + адаптер + блок в `daria-mokko/configuration.json` + `.env.example`.
- [x] **D3.** `check-availability.skill.ts` — резолв услуги из каталога (id+name) + резолв даты (сегодня/завтра/день недели/ДД.ММ/«ДД месяц» или окно 7 дней) → `getAvailability` → дни+времена для LLM. Зарегистрирован, сборка зелёная.
- [x] **D4.** Стабильные `id` в `data/services.json` уже есть (`correction`, `lamination`…) — навык шлёт их как `service_external_id`. Осталось операционно: проставить совпадающие `external_id` у услуг в Mesto.
- [ ] **D5.** Переписать FSM записи: услуга/мастер → `check_availability` → выбор реального слота → `starts_at`. Новый тип шага «выбор из динамических опций»
- [ ] **D6.** `book-slot.skill.ts`: синхронный `POST /bookings`, разбор 201/422/409/5xx; локальный `Booking` — аудит + sync-state
- [x] **D7.** Колонки `mestoAppointmentId`, `mestoClientId`, `syncStatus`, `syncedAt` в `prisma/schema.prisma` (нужна `prisma migrate` когда поднимут Postgres бота; `generate` сделан).
- [ ] **D8.** Реальные потоки отмены/переноса → `cancel`/`PATCH`

**Готово, когда:** против mock бот проводит запись end-to-end, на закрытую дату переспрашивает, умеет отменить.

## Фаза E — V2 (потом)

Webhooks Mesto→бот (отмена сотрудником, напоминания, blacklist) + web push.
