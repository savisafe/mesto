# Mesto CRM — External Bookings API

Спека HTTP-эндпоинта, через который внешние системы (в первую очередь
[ai-bot](https://github.com/savisafe/ai-bot)) присылают в Mesto завершённые
записи клиентов.

> **Статус:** дизайн. Endpoint ещё не реализован — публикуется как контракт
> для согласования с командой ai-bot до того, как мы начнём писать код.
> Реализация запланирована после ввода таблиц `services` и `appointments`
> (этап Calendar основного roadmap'а).

---

## 1. Идея

AI-бот ведёт диалог с клиентом, собирает слоты записи (услуга, дата,
время, имя, телефон, мастер), и по завершении FSM POST'ит сюда — мы
заводим/находим клиента, создаём запись (`appointment`) и подтверждаем
синхронизацию.

Бот может слать одно и то же повторно при сбое сети — повторный POST
с тем же `idempotency_key` должен вернуть тот же результат без дубля.

---

## 2. Аутентификация

Per-business API-ключ в заголовке:

```
Authorization: Bearer mst_live_<32-byte-hex>
```

- Ключ создаёт владелец бизнеса в `/settings/api`, видит один раз
- В БД храним `sha256(key)` (как для сессий)
- Ключ привязан к одному бизнесу — бот не может слать записи в чужой бизнес
- Каждый запрос обновляет `last_used_at`

Опционально клиент может слать `X-Request-Id` (UUID) — мы его эхо-вернём
в ответе и в логах, чтобы упростить корреляцию.

---

## 3. Эндпоинты

### `POST /api/external/bookings` — создать запись

#### Request

```http
POST /api/external/bookings HTTP/1.1
Host: mesto.example.com
Authorization: Bearer mst_live_a1b2c3d4...
Content-Type: application/json
X-Request-Id: 8f3d...   (необязательно)

{
  "idempotency_key": "tg-bot-7891:msg-1234",
  "service_name": "Маникюр классический",
  "starts_at": "2026-06-15T14:30:00+06:00",
  "duration_minutes": 60,
  "amount": 5000,
  "currency": "KZT",
  "client": {
    "name": "Анна",
    "phone": "+77001234567",
    "telegram_id": 123456789
  },
  "master_name": "Дарья",
  "source": {
    "channel": "telegram",
    "bot_id": "studio-beauty-bot",
    "conversation_id": "tg:7891",
    "message_id": "1234"
  },
  "notes": "Хочет тёмно-розовый цвет"
}
```

#### Поля

| Поле                       | Тип       | Обязат. | Описание                                                                                          |
|----------------------------|-----------|---------|---------------------------------------------------------------------------------------------------|
| `idempotency_key`          | string    | ✓       | Уникален в рамках бизнеса; повторный POST с тем же ключом возвращает прежний ответ без дубля     |
| `service_name`             | string    | ✓       | Название услуги. Если такой `services` строки нет — создаём ad-hoc запись с пометкой `external` |
| `starts_at`                | RFC 3339  | ✓       | Начало записи **с tz offset** (бот должен резолвить tz бизнеса сам)                              |
| `duration_minutes`         | integer   | ✓       | 1..1440                                                                                            |
| `amount`                   | integer   | ✓       | В минимальных единицах валюты (тиины/копейки) — `5000` для 5000 ₸ если currency=KZT (без дробных) |
| `currency`                 | string    | ✓       | ISO-4217 (`KZT`, `RUB`, `USD`)                                                                    |
| `client.name`              | string    | ✓       | Имя клиента как ввёл бот                                                                          |
| `client.phone`             | E.164     | ✓       | `+77001234567` — без пробелов и скобок                                                            |
| `client.telegram_id`       | integer   | —       | Если знаем Telegram user id — используем как primary key для дедупа клиента                       |
| `master_name`              | string    | —       | Имя мастера. Матчим по имени в команде бизнеса. Если не нашли — запись без привязки к сотруднику  |
| `source.channel`           | enum      | ✓       | `telegram` \| `whatsapp` \| `other`                                                               |
| `source.bot_id`            | string    | —       | Идентификатор бота в платформе ai-bot                                                             |
| `source.conversation_id`   | string    | —       | Для трассировки                                                                                   |
| `source.message_id`        | string    | —       | Для трассировки                                                                                   |
| `notes`                    | string    | —       | Свободный комментарий, до 2000 символов                                                           |

#### Response — успех

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-Id: 8f3d...

{
  "ok": true,
  "appointment_id": "01HXY...",
  "client_id": "01HXZ...",
  "client_created": true,
  "service_matched": true,
  "master_matched": false,
  "idempotent_replay": false
}
```

| Поле                  | Описание                                                       |
|-----------------------|----------------------------------------------------------------|
| `appointment_id`      | UUID созданной записи                                          |
| `client_id`           | UUID клиента (найденного или созданного)                       |
| `client_created`      | true если клиент только что создан, false если совпал по phone |
| `service_matched`     | false если услуга создана ad-hoc, true если совпала с каталогом|
| `master_matched`      | true если `master_name` совпал с сотрудником бизнеса           |
| `idempotent_replay`   | true если это повтор по существующему `idempotency_key`        |

При повторе с тем же `idempotency_key`: `HTTP 200 OK` (не 201) + тот же
`appointment_id`, `idempotent_replay: true`. Тело запроса при повторе
не сравнивается — бот ответственен за идемпотентность тела.

#### Response — ошибки

```http
HTTP/1.1 4xx | 5xx
Content-Type: application/json

{
  "ok": false,
  "code": "INVALID_PAYLOAD",
  "error": "duration_minutes must be between 1 and 1440",
  "field": "duration_minutes"
}
```

| HTTP | `code`               | Когда                                                                  | Retry?  |
|------|----------------------|------------------------------------------------------------------------|---------|
| 401  | `UNAUTHORIZED`       | Bearer отсутствует или не валиден                                      | нет     |
| 403  | `KEY_REVOKED`        | Ключ когда-то был, но владелец его отозвал                             | нет     |
| 400  | `INVALID_PAYLOAD`    | Не прошла валидация полей (`field` указывает на конкретное поле)       | нет     |
| 409  | `SLOT_CONFLICT`      | На это же `starts_at` + `master` уже стоит другая запись               | да, после ручного разруливания |
| 422  | `BUSINESS_INACTIVE`  | Бизнес помечен `is_active = false`                                     | нет     |
| 429  | `RATE_LIMITED`       | Лимит запросов (заголовок `Retry-After`)                               | да      |
| 500  | `INTERNAL`           | Наша ошибка                                                            | да, exp backoff |
| 503  | `UPSTREAM_DOWN`      | Деградация БД, кратковременно                                          | да, exp backoff |

Retry-стратегия для бота: экспоненциальный backoff (2s, 4s, 8s, 16s, 32s,
60s) до 5 минут на сетевые/5xx; после — fail с алертом владельцу бота.

---

### `GET /api/external/bookings/:appointment_id` — получить состояние записи

Чтобы бот мог сверить или забрать `appointment_id` если ответ POST'а
потерян по сети.

```http
GET /api/external/bookings/01HXY...
Authorization: Bearer mst_live_...
```

```json
{
  "ok": true,
  "appointment_id": "01HXY...",
  "status": "scheduled",
  "starts_at": "2026-06-15T14:30:00+06:00",
  "duration_minutes": 60,
  "client": { "id": "01HXZ...", "name": "Анна", "phone": "+77001234567" },
  "service": { "name": "Маникюр классический", "amount": 5000, "currency": "KZT" },
  "master": null,
  "created_at": "2026-05-29T20:01:23+06:00"
}
```

`status` ∈ `scheduled | completed | cancelled | no_show`.

---

### `GET /api/external/services` — справочник услуг бизнеса

Чтобы бот мог пред-валидировать `service_name` или показать клиенту
в чате реальный прайс.

```http
GET /api/external/services
Authorization: Bearer mst_live_...
```

```json
{
  "ok": true,
  "services": [
    {
      "id": "01HX...",
      "name": "Маникюр классический",
      "amount": 5000,
      "currency": "KZT",
      "duration_minutes": 60,
      "active": true
    }
  ]
}
```

---

### `GET /api/external/team` — справочник сотрудников

Для матчинга мастеров.

```json
{
  "ok": true,
  "members": [
    { "id": "01HX...", "name": "Дарья", "role": "EMPLOYEE" },
    { "id": "01HX...", "name": "Виктория", "role": "EMPLOYEE" }
  ]
}
```

---

## 4. Идемпотентность — детально

- `idempotency_key` уникален в рамках `(business_id, key)`
- Храним в отдельной таблице `external_idempotency`:
  - `business_id`, `key`, `appointment_id`, `response_body_json`,
    `created_at` (TTL ~30 дней)
- Повторный POST: возвращаем `response_body_json` 1:1, HTTP 200, флаг
  `idempotent_replay: true`
- Если бот шлёт **разное** тело на тот же ключ — это его баг, мы всё
  равно вернём первый сохранённый ответ. Боту полезно логировать
  расхождение

---

## 5. Webhook'и обратно (V2, после первой итерации)

Когда понадобится — бот сможет подписаться на события (`appointment.cancelled`,
`appointment.completed`, `client.blacklisted`), чтобы предупреждать клиента
в чате. Спека вебхуков — отдельный документ.

---

## 6. Что бот может предположить про текущее состояние Mesto

- Клиент создаётся `find-or-create by phone within business`
- Если `telegram_id` задан — используется как secondary ключ
  (мы дедуплицируем по `phone OR telegram_id`)
- Конфликты не решаются автоматически: если два бота шлют ту же
  запись в одно время на одного мастера — побеждает первый,
  второй получает `SLOT_CONFLICT`
- `notes` копится в свободной форме, не парсится
- Часовые пояса: бот сам резолвит tz бизнеса. У нас всё хранится
  в UTC, рендерим в локали клиента

---

## 7. Локальное тестирование (после реализации)

Будет добавлен `mock-server` режим:

```bash
npm run dev:bot-api  # поднимет endpoint в отдельном порту с фиктивным API-ключом mst_live_dev
```

Плюс curl-snippets и Bruno/Postman коллекция — `docs/api/bot-integration.bru`.

---

## 8. Открытые вопросы

- **Сервис-каталог.** Если бот шлёт `service_name` которого нет — создаём
  ad-hoc или возвращаем ошибку? Сейчас спека предлагает ad-hoc (чтобы
  не блокировать запись). Можно сделать поведение настраиваемым через
  заголовок `X-On-Unknown-Service: create | reject`
- **Tz бизнеса.** Хранить в `businesses.timezone`? Или бот всегда шлёт
  с offset'ом? Спека требует второе — проще нам, дешевле для бота если
  он это уже знает
- **Цена при ad-hoc сервисе.** Из `amount` поля; если 0 — считаем
  «бесплатно» или ошибка? Предлагаю принимать 0 как валидный
- **Лимиты.** Per-key rate limit (например, 30 req/min) и per-business
  cap (1000 записей/день?). Обсудить с командой ai-bot реальные
  ожидаемые объёмы
