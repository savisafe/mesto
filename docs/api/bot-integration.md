# Mesto CRM — External Bookings API (v2, двусторонний)

Спека HTTP-эндпоинтов, через которые внешние системы (в первую очередь
[ai-bot](https://github.com/savisafe/ai-bot)) **читают расписание** и
**управляют записями** в Mesto: консультируют по свободным окнам, заводят
клиента, создают / переносят / отменяют записи.

> **Статус:** дизайн, согласован с командой ai-bot. Endpoint'ы ещё не
> реализованы. Этот файл — канонический контракт; на стороне бота ему
> соответствует `mesto-bot/docs/MESTO_INTEGRATION.md`.

> **v2 заменяет v1.** v1 был односторонним async-«приёмником» (бот сам ведёт
> весь диалог и POST'ит готовую запись, Mesto пассивно складывает). Цель
> продукта — чтобы бот **не мог записать на закрытую дату** и **консультировал
> по реальному расписанию** — это невозможно без чтения доступности, поэтому
> модель изменена на **двустороннюю, где Mesto — авторитет расписания.**

---

## 1. Модель

- **Mesto — источник правды по расписанию и авторитет записи.** Бот не
  «придумывает» свободное время: он спрашивает его у Mesto (`GET /availability`),
  предлагает клиенту реальные слоты и пишет уже конкретный `starts_at`.
- **Запись валидируется синхронно при создании/переносе.** Mesto проверяет
  рабочий график, блоки (обед/отгул/отпуск) и пересечения и отклоняет
  невалидное (`OUT_OF_HOURS` / `BLOCKED` / `SLOT_CONFLICT`). Бот по ответу
  переспрашивает дату/время.
- **Связь двусторонняя:** бот может создать, перенести (`PATCH`) и отменить
  (`cancel`) запись, а также завести клиента (`POST /clients`).
- **Идемпотентность создания** — по `(business_id, idempotency_key)`: повторный
  POST возвращает прежний результат без дубля.

Диаграмма потока «запись»:

```
бот: GET /availability ──▶ Mesto отдаёт свободные слоты (в tz бизнеса)
бот: показал клиенту слоты, клиент выбрал ──▶ starts_at зафиксирован
бот: POST /bookings (starts_at) ──▶ Mesto валидирует график/блоки/конфликты
        ├─ 201 ──▶ бот подтверждает клиенту реальное время
        ├─ 422 OUT_OF_HOURS / BLOCKED ──▶ бот переспрашивает дату/время
        └─ 409 SLOT_CONFLICT (гонка) ──▶ бот заново GET /availability
```

---

## 2. Аутентификация

Per-business API-ключ в заголовке:

```
Authorization: Bearer mst_live_<32-byte-hex>
```

- Ключ создаёт владелец бизнеса в `/settings/api`, видит один раз.
- В БД храним `sha256(key)` (как для сессий).
- Ключ привязан к **одному** бизнесу — бот не пишет в чужой бизнес.
- Каждый запрос обновляет `last_used_at`.
- **Scopes** (на ключе): `availability:read`, `bookings:read`,
  `bookings:write`, `clients:write`. Бот по умолчанию получает все четыре.

Опционально клиент шлёт `X-Request-Id` (UUID) — эхо-вернём в ответе и логах.

---

## 3. Часовые пояса — владелец Mesto

- Tz бизнеса хранится в **Mesto** (`businesses.timezone`, IANA, напр.
  `Asia/Almaty`). Бот **не** шлёт offset'ы из ниоткуда.
- `GET /availability` отдаёт `starts_at`/`ends_at` уже с offset бизнеса
  (RFC 3339). Бот возвращает в `POST /bookings` ровно то значение, что получил.
- Внутри Mesto всё хранится в UTC, рендерится в локали.

> Для Казахстана с марта 2024 — единый `UTC+5` (`Asia/Almaty`), offset `+05:00`.

---

## 4. Эндпоинты

### 4.1 `GET /api/external/availability` — свободные слоты ⭐

Линчпин интеграции: даёт боту реальные окна (для консультации и для записи) и
показывает, какие даты закрыты.

```http
GET /api/external/availability?from=2026-06-15&to=2026-06-21&service_external_id=correction&master_name=Дарья&granularity_minutes=30
Authorization: Bearer mst_live_...
```

| Query                 | Тип     | Обяз. | Описание                                                              |
|-----------------------|---------|-------|----------------------------------------------------------------------|
| `from`                | date    | ✓     | Начало окна, `YYYY-MM-DD` в tz бизнеса                                |
| `to`                  | date    | ✓     | Конец окна включительно; макс. 31 день от `from`                     |
| `service_external_id` | string  | —     | Для расчёта длительности слота (см. §4.7 о маппинге id)              |
| `service_name`        | string  | —     | Fallback к `service_external_id`                                     |
| `master_name`         | string  | —     | Конкретный мастер; опущен = «любой свободный» (слоты по всем)        |
| `master_id`           | uuid    | —     | Точнее, чем `master_name`                                            |
| `granularity_minutes` | integer | —     | Шаг сетки слотов; дефолт 30. Игнорируется, если известна услуга      |

```json
{
  "ok": true,
  "timezone": "Asia/Almaty",
  "service": { "id": "01HX...", "name": "Коррекция бровей", "duration_minutes": 30 },
  "days": [
    {
      "date": "2026-06-15",
      "status": "open",
      "closed_reason": null,
      "slots": [
        { "starts_at": "2026-06-15T14:00:00+05:00", "ends_at": "2026-06-15T14:30:00+05:00", "master_id": "01HX...", "master_name": "Дарья" },
        { "starts_at": "2026-06-15T15:30:00+05:00", "ends_at": "2026-06-15T16:00:00+05:00", "master_id": "01HX...", "master_name": "Дарья" }
      ]
    },
    {
      "date": "2026-06-16",
      "status": "closed",
      "closed_reason": "day_off",
      "slots": []
    }
  ]
}
```

- `status` ∈ `open | closed`. `closed_reason` ∈
  `day_off | holiday | time_off | out_of_business_hours | null`.
- Слот свободен = попадает в рабочий график мастера/бизнеса, не пересекается
  с блоком (`time_off`) и с существующей записью.
- Закрытый день (`status: "closed"`) бот использует, чтобы прямо сказать
  клиенту «в этот день не записываем» и предложить ближайший открытый.

---

### 4.2 `POST /api/external/bookings` — создать запись

```http
POST /api/external/bookings
Authorization: Bearer mst_live_...
Content-Type: application/json
X-Request-Id: 8f3d...   (необязательно)

{
  "idempotency_key": "daria-mokko:clx9a8",
  "service_external_id": "correction",
  "service_name": "Коррекция бровей",
  "starts_at": "2026-06-15T14:00:00+05:00",
  "duration_minutes": 30,
  "amount": 4000,
  "currency": "KZT",
  "client": { "name": "Анна", "phone": "+77001234567", "telegram_id": 123456789 },
  "master_name": "Дарья",
  "source": { "channel": "telegram", "bot_id": "daria-mokko", "conversation_id": "tg:7891" },
  "notes": ""
}
```

| Поле                  | Тип      | Обяз. | Описание                                                                              |
|-----------------------|----------|-------|---------------------------------------------------------------------------------------|
| `idempotency_key`     | string   | ✓     | Уникален в рамках бизнеса; повтор → прежний ответ без дубля                            |
| `starts_at`           | RFC 3339 | ✓     | Конкретный момент из `GET /availability` (с offset бизнеса)                           |
| `duration_minutes`    | integer  | ✓     | 1..1440                                                                                |
| `service_external_id` | string   | —     | Точный матч услуги по стабильному id каталога бота (см. §4.7)                          |
| `service_name`        | string   | ✓     | Каноническое имя; fallback-матч если нет `service_external_id`; нет матча → ad-hoc    |
| `amount`              | integer  | —     | Целые мажорные единицы (тенге/рубли). `null` = «уточняется у мастера». `0` = бесплатно |
| `currency`            | string   | —     | ISO-4217; если опущено — из бизнеса                                                   |
| `client.name`         | string   | ✓     | Имя как ввёл клиент                                                                    |
| `client.phone`        | E.164    | ✓     | `+77001234567`, без пробелов/скобок                                                    |
| `client.telegram_id`  | integer  | —     | Если есть — primary-ключ дедупа клиента (см. §6)                                       |
| `master_name`         | string   | —     | Матч по имени в команде; `null` = «любой». Нет матча → запись без сотрудника           |
| `master_id`           | uuid     | —     | Точнее `master_name`                                                                   |
| `source.channel`      | enum      | ✓    | `telegram` \| `whatsapp` \| `other`                                                   |
| `source.bot_id`       | string   | —     | Идентификатор бота                                                                     |
| `source.conversation_id` | string | —    | Трассировка                                                                           |
| `notes`               | string   | —     | До 2000 символов                                                                      |

Mesto при создании:
1. find-or-create клиента по `telegram_id` или `phone` в рамках бизнеса (§6).
2. Валидирует `starts_at`+`duration` против рабочего графика и блоков (§7).
3. Проверяет пересечение с существующими записями мастера.
4. Создаёт `appointment` (`source = 'external'`, фиксирует `amount`/`currency`).

#### Успех

```http
HTTP/1.1 201 Created

{
  "ok": true,
  "appointment_id": "01HXY...",
  "client_id": "01HXZ...",
  "client_created": true,
  "service_matched": true,
  "master_matched": true,
  "idempotent_replay": false,
  "starts_at": "2026-06-15T14:00:00+05:00",
  "ends_at": "2026-06-15T14:30:00+05:00"
}
```

При повторе с тем же `idempotency_key`: `HTTP 200` + тот же `appointment_id`,
`idempotent_replay: true`. Тело при повторе не сравнивается.

---

### 4.3 `PATCH /api/external/bookings/:appointment_id` — перенос / изменение

Любое подмножество полей. Перенос времени и смена услуги/мастера
**ревалидируются** как при создании (те же коды ошибок).

```http
PATCH /api/external/bookings/01HXY...
Authorization: Bearer mst_live_...

{
  "starts_at": "2026-06-16T11:00:00+05:00",
  "duration_minutes": 30,
  "master_name": "Василиса",
  "notes": "перенос по просьбе клиента"
}
```

Ответ — обновлённое состояние записи (как `GET`, §4.5).

---

### 4.4 `POST /api/external/bookings/:appointment_id/cancel` — отмена

```http
POST /api/external/bookings/01HXY.../cancel
Authorization: Bearer mst_live_...

{ "reason": "client_cancelled" }
```

`reason` ∈ `client_cancelled | rescheduled | bot_false_trigger`.
Идемпотентно: отмена уже отменённой → `200`, `status: "cancelled"`.
Нужно среди прочего для **ложного триггера** диалога-записи (мусорная запись
уезжает в Mesto — её надо уметь снять).

---

### 4.5 `GET /api/external/bookings/:appointment_id` — состояние записи

```json
{
  "ok": true,
  "appointment_id": "01HXY...",
  "status": "scheduled",
  "starts_at": "2026-06-15T14:00:00+05:00",
  "ends_at": "2026-06-15T14:30:00+05:00",
  "client": { "id": "01HXZ...", "name": "Анна", "phone": "+77001234567" },
  "service": { "name": "Коррекция бровей", "amount": 4000, "currency": "KZT" },
  "master": { "id": "01HX...", "name": "Дарья" },
  "created_at": "2026-05-29T20:01:23+05:00"
}
```

`status` ∈ `scheduled | completed | cancelled | no_show`.

### 4.6 `GET /api/external/bookings` — список записей клиента

Чтобы бот нашёл `appointment_id` для отмены/переноса, если потерял его локально
(клиент отменяет из другого диалога).

```http
GET /api/external/bookings?telegram_id=123456789&status=scheduled&from=2026-06-01
GET /api/external/bookings?phone=%2B77001234567&status=scheduled
```

Возвращает массив в формате §4.5 (только записи этого бизнеса).

### 4.7 `POST /api/external/clients` — завести / найти клиента

Бот заводит клиента в `clients` (имя, телефон, telegram_id) — в т.ч. **без
записи** (проконсультировал, контакт сохранили). find-or-create по
`telegram_id` или `phone`.

```http
POST /api/external/clients
{ "name": "Анна", "phone": "+77001234567", "telegram_id": 123456789, "note": "" }
```

```json
{ "ok": true, "client_id": "01HXZ...", "client_created": true }
```

> `clients` — это **клиенты салона** (без логина), не `users` (сотрудники с
> аутентификацией). Бот никогда не создаёт `users`.

### 4.8 `GET /api/external/services` — каталог услуг

Для пред-валидации `service_name`, показа реального прайса и сверки маппинга
`external_id`.

```json
{
  "ok": true,
  "services": [
    { "id": "01HX...", "external_id": "correction", "name": "Коррекция бровей",
      "amount": 4000, "currency": "KZT", "duration_minutes": 30, "active": true }
  ]
}
```

**Владелец каталога (V1): бот** (`config/businesses/<id>/data/services.json`).
Mesto матчит входящие записи по `service_external_id`; для этого в `services`
заводится колонка `external_id` (nullable, unique в рамках бизнеса), маппинг
настраивается один раз. `service_name` остаётся человекочитаемым fallback'ом.

### 4.9 `GET /api/external/team` — каталог сотрудников

```json
{
  "ok": true,
  "members": [
    { "id": "01HX...", "name": "Дарья", "role": "EMPLOYEE" },
    { "id": "01HX...", "name": "Василиса", "role": "EMPLOYEE" }
  ]
}
```

---

## 5. Коды ошибок

```json
{ "ok": false, "code": "OUT_OF_HOURS", "error": "starts_at вне рабочих часов мастера", "field": "starts_at" }
```

| HTTP | `code`             | Когда                                                         | Действие бота                          |
|------|--------------------|---------------------------------------------------------------|----------------------------------------|
| 401  | `UNAUTHORIZED`     | Bearer отсутствует/невалиден                                   | не ретраить                            |
| 403  | `KEY_REVOKED`      | Ключ отозван владельцем                                        | не ретраить                            |
| 403  | `SCOPE_DENIED`     | У ключа нет нужного scope                                      | не ретраить                            |
| 400  | `INVALID_PAYLOAD`  | Не прошла валидация полей (`field`)                           | не ретраить                            |
| 404  | `NOT_FOUND`        | `appointment_id` не найден (для GET/PATCH/cancel)             | не ретраить                            |
| 422  | `OUT_OF_HOURS`     | `starts_at` вне рабочего графика мастера/бизнеса              | **переспросить дату/время**            |
| 422  | `BLOCKED`          | Попадает в блок (обед/отгул/отпуск/закрытая дата)            | **переспросить дату/время**            |
| 409  | `SLOT_CONFLICT`    | Слот заняли между `GET /availability` и `POST` (гонка)       | **заново `GET /availability`**         |
| 422  | `BUSINESS_INACTIVE`| Бизнес `is_active = false`                                    | не ретраить, алерт                     |
| 429  | `RATE_LIMITED`     | Лимит (заголовок `Retry-After`)                               | ретрай по `Retry-After`                |
| 500  | `INTERNAL`         | Наша ошибка                                                   | ретрай exp backoff                     |
| 503  | `UPSTREAM_DOWN`    | Деградация БД                                                 | ретрай exp backoff                     |

- `OUT_OF_HOURS` / `BLOCKED` / `SLOT_CONFLICT` — **не** сетевые сбои: бот не
  «ждёт и повторяет», а возвращается в диалог и переспрашивает.
- Сетевые/`5xx`: exp backoff (2s,4s,8s,16s,32s,60s) до 5 мин. После —
  бот **не может гарантировать слот**: сообщает клиенту «подтвердим в течение
  N минут» и шлёт алерт в служебный чат бизнеса (не подтверждает время жёстко).
- Ретраи на `5xx` не должны ловить ложный `429`.

---

## 6. Дедуп клиента

- find-or-create в рамках бизнеса по `telegram_id` **или** `phone`.
- `telegram_id` (если есть) — приоритетный ключ; иначе `phone` (E.164).
- Для этого в `clients` добавляется колонка `telegram_id` (nullable, unique
  в рамках бизнеса).

---

## 7. Валидация расписания (зависимость)

`OUT_OF_HOURS` / `BLOCKED` и весь `GET /availability` опираются на фичу
**«Рабочий график и блокировка слотов»** (см. `TODO.md`), которой пока нет:

- `work_schedules` — график (business_id, employee_user_id?, weekday, start/end
  minute, valid_from/until).
- `time_off` — блоки (business_id, employee_user_id?, starts_at, ends_at, reason).
- `services/availability.ts` — расчёт свободных слотов и валидация; **общий**
  для ручного создания записи в календаре И для этого внешнего API.

**Это критический путь: без него `GET /availability` и валидация закрытых дат
невозможны.** Реализуется до внешних endpoint'ов.

---

## 8. Что Mesto должен построить (чек-лист)

Порядок — снизу вверх (зависимости первыми):

1. `businesses.timezone` (IANA) — колонка.
2. `work_schedules` + `time_off` + `services/availability.ts` (§7) — **критический путь**.
3. `clients.telegram_id` (nullable, unique в бизнесе); `services.external_id`
   (nullable, unique в бизнесе).
4. `api_keys` (key_hash, business_id, name, scopes, last_used_at) +
   `src/lib/api-auth.ts` (Bearer → бизнес + scope-чек) + `/settings/api` UI.
5. `src/services/external/bookings.ts` — приём + идемпотентность (по уже
   существующей `appointments.external_idempotency_key`, unique в бизнесе).
6. Роуты `src/app/api/external/*`: `availability`, `bookings` (POST/GET/PATCH),
   `bookings/[id]/cancel`, `bookings` (list), `clients`, `services`, `team`.

---

## 9. Идемпотентность — детально

- Ключ уникален в рамках `(business_id, idempotency_key)`.
- Хранение: колонка `appointments.external_idempotency_key` (уже есть) +
  unique-индекс `(business_id, external_idempotency_key)`. Повторный POST →
  возвращаем тот же ответ, `HTTP 200`, `idempotent_replay: true`.
- `PATCH`/`cancel` идемпотентны по состоянию (повторная отмена безопасна).
- Если бот шлёт **разное** тело на тот же ключ — вернём первый ответ; боту
  полезно логировать расхождение.

---

## 10. Webhook'и обратно (V2)

После первой итерации бот подпишется на события (`appointment.cancelled`
сотрудником, `appointment.completed`, `client.blacklisted`), чтобы
предупреждать клиента и слать напоминания. Отдельный документ.

---

## 11. Локальное тестирование (после реализации)

```bash
npm run dev:bot-api   # endpoint'ы на отдельном порту, фиктивный ключ mst_live_dev,
                      # сид с рабочим графиком + парой блоков для проверки 422
```

Плюс curl-snippets и Bruno-коллекция — `docs/api/bot-integration.bru`.
