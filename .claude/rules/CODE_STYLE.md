# Единые правила кода

Свод правил, как писать код в проекте, чтобы он был **читаемым**,
**поддерживаемым** и чтобы **баги быстро отслеживались**. Это рабочий
стандарт: на него опирается генерация кода и `REVIEW.md` при ревью.

Три цели, которым подчинены все правила ниже:

- **Читаемость** — код понятен с первого прохода: предсказуемый нейминг,
  простой JSX, маленькие модули, типы вместо догадок.
- **Поддерживаемость** — изменение в одном месте не ломает пять других:
  единый источник правды, общие хелперы, стабильные контракты, тесты.
- **Отслеживаемость** — когда что-то падает, причина находится за минуты:
  стабильные коды ошибок, логи с контекстом, request-id, тесты на ветки
  ошибок. См. раздел [Ошибки и отслеживаемость](#ошибки-и-отслеживаемость-багов).

> Дополнительно действуют `REVIEW.md` (критерии ревью) и `MOCKS.md` (моки).
> При конфликте правил приоритет у более конкретного файла.

---

## Стек

- **Next.js 15.3** (App Router, Turbopack в dev), **React 19**, **TypeScript 5** (`strict`).
- **Drizzle ORM 0.45** + **Neon Postgres** (`@neondatabase/serverless`), **PGlite** в тестах.
- **Tailwind CSS 4**, токены в `globals.css`, `clsx` для условных классов.
- **Vitest** (`*.test.ts` рядом с кодом).
- Auth: argon2, session-cookie, OTP / magic-link, Telegram-verify. RBAC: `UserRole` + `useAccess`.
- Внешний API на api-ключах: `app/api/external/*`.

---

## Структура проекта (слои)

Проект **не на FSD** — раскладка по техническим слоям. Новый код клади
в соответствующий слой, не сваливай всё в один файл.

| Слой | Назначение | Директива |
|------|------------|-----------|
| `src/app/*` | Роуты App Router (страницы) + `app/api/*` (route handlers, в т.ч. внешний API `app/api/external/*`). | — |
| `src/views/*` | Страничные компоненты (UI экрана). | `export default` |
| `src/ui/*` | Переиспользуемые UI-примитивы без знания домена (button, modal, form, select…). | `export const` |
| `src/services/*` | Серверная бизнес-логика и доступ к БД. Покрывай тестами (`*.test.ts` рядом). | `import 'server-only'` |
| `src/actions/*` | Server actions: тонкие обёртки над `services`, маппинг `ServiceResult → ActionResult` + `revalidatePath`. | `'use server'` |
| `src/lib/*` | Инфраструктура (auth, session, crypto, external-api, rate-limit, telegram), с тестами. | `import 'server-only'` для серверного |
| `src/hooks/*`, `src/contexts/*` | Клиентские хуки и контексты (`AuthContext`, `BusinessContext`, `NotificationContext`). | — |
| `src/db/schema/*` | Drizzle-схемы и выводимые типы; `src/db/index.ts` — клиент БД. | — |
| `src/routes/routes.ts` | Единый источник путей. Новый маршрут добавляй сюда, не хардкодь строкой. | — |

**Границы слоёв (нарушать нельзя):**

- `ui/*` не знает домена и не лезет в `services`/`db`; доменная логика — в `services/*`.
- Клиентские компоненты (`views`, `ui`, `hooks`, `contexts`) **не импортируют** `services`/`lib`
  напрямую — только через `actions/*` или API. Серверные модули помечены `server-only`,
  что превращает случайный импорт в ошибку сборки.
- Импорты — через алиас `@/*` (→ `src/*`). Прямые импорты — норма; баррель `index.ts`
  заводи только при реальной необходимости (как `ui/form`).

---

## Именование и объявления

- **Компоненты** — PascalCase.
  - UI-примитив (`src/ui/*`): `export const Button = (props: ButtonProps) => { … }`.
  - Страница (`src/views/*`): `export default function CalendarPage() { … }`.
  - Подкомпонент экрана — именованная функция в том же файле (`function DateNav(...)`),
    не экспортируется наружу. **Не объявляй компонент внутри тела другого компонента.**
- **Props** — `interface <Name>Props`, поля camelCase. Boolean-пропсы с префиксом
  `is/has/can` (`isOpen`, `hasAccess`, `canManage`).
- **Обработчики** — `handleX` (`handleSubmit`, `handleCancel`). В JSX передавай
  ссылку (`onClick={handleSave}`); inline-стрелка — только для простого проброса
  аргумента (`onClick={() => openCreate(null)}`).
- **Хуки** — `useX` (`useAccess`, `useEffectiveRole`, `usePwaInstall`).
- **Файлы** — компонент = имя компонента (`Button.tsx`); сервис/lib — kebab или
  по домену (`api-keys.ts`, `external-api.ts`); тест — `<имя>.test.ts` рядом.

---

## TypeScript

- **`any` запрещён** (в `src` его сейчас нет — держим планку). Нужна гибкость —
  `unknown` + type guard.
- **Доменные типы выводи из Drizzle-схемы**, не дублируй вручную:
  ```ts
  import type { Client, NewClient, UserRole } from '@/db/schema';
  ```
  Для «безопасной» формы — производный тип: `type PublicUser = Omit<User, 'passwordHash'>`.
- **Не злоупотребляй `as`** — type assertion только когда без неё нельзя; обычно это
  сигнал, что тип где-то потерян.
- **`*Input`-типы** сервисов — публичный контракт; описывай их явным `interface`.
- Предпочитай `implicit return` и сужение типов через `if (!result.ok) return …`
  (после такой проверки TS сам выводит, что дальше `result.data` доступно).

---

## React, JSX и компоненты

- **JSX держи простым.** Сложные вычисления выноси в переменные, хелперы или хуки
  до `return`. В разметке — только данные и ветвление.
- **Не вызывай тяжёлые функции прямо в JSX** в цикле рендера; считай заранее.
- **`key`** в списках — стабильный доменный id (`key={appt.id}`), не индекс массива.
- **Декомпозируй крупные компоненты.** Ориентир — ~250–300 строк. Сложные экраны
  (календарь, расписание) разбивай на подкомпоненты (пример: `CalendarDayGrid`
  вынесен из `CalendarPage`).
- **Условные классы — через `clsx`**, не конкатенацией строк с тернарниками.
- Не используй `forwardRef` и другой legacy React без критической необходимости.
- Не оставляй пустые callback'и: не нужен обработчик — не передавай проп.
- **`eslint-disable`** — только с явным согласованием и комментарием-причиной.

### Состояние, эффекты и данные на клиенте

- Контролируй зависимости `useEffect` / `useMemo` / `useCallback` — без скрытых
  гонок и утечек. Подписки в `useEffect` всегда снимай в cleanup.
- Производные значения — через `useMemo` (как `currentRole` в `BusinessContext`),
  а не пересчётом в рендере.
- **Загрузка данных** — единый паттерн: `fetch`-функция в `useCallback`, флаг
  `loading`, `try/finally`, ошибку показываем пользователю через `useNotification`:
  ```ts
  const fetchClients = useCallback(async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const r = await listClientsAction({ businessId: currentBusiness, page });
      if (r.ok) setClients(r.data.clients);
      else alert('error', r.error); // тост из NotificationContext
    } finally {
      setLoading(false);
    }
  }, [currentBusiness, page, alert]);
  ```
- **Доступ/роли на клиенте** — через `useAccess` / `useEffectiveRole`
  (`getVisibleNavGroups(role)` для меню), а не сравнением id с массивом из бандла.
  Клиентский гейтинг — это UX; **источник истины по доступу — сервер**.

---

## Серверный код: контракты результата

Сервисы и экшены не бросают исключения на ожидаемых ошибках — они возвращают
типизированный результат. Это и есть единая точка трассировки ошибки.

```ts
// services/* — детальный результат с машинным кодом
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

// actions/* — то же, но без code (наружу клиенту код не нужен)
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

- **`error`** — человекочитаемое сообщение на русском (его покажут пользователю).
- **`code`** — стабильный машинный код (см. раздел про отслеживаемость).
  Один контракт на проект: `{ ok: true | false }`. **Не вводи параллельных форм**
  (`success`/`data`/`message`) — это ломает предсказуемость и трассировку.
- **Сервис** (`server-only`) знает `code`; **экшен** (`'use server'`) — тонкая
  обёртка: маппит `ServiceResult → ActionResult` и после мутации делает
  `revalidatePath`:
  ```ts
  export async function createServiceAction(input: CreateServiceInput): Promise<ActionResult<Service>> {
    const r = await createService(input);
    if (r.ok) revalidatePath(routes.CALENDAR);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
  }
  ```
- **Публичный контракт** (`ServiceResult`/`ActionResult`, `*Input`) не меняй без
  явной причины и без правки всех мест использования.

### Доступ и мультитенантность (обязательная последовательность)

Каждый сервис, который читает или меняет данные, идёт по шагам **auth → access → filter**:

```ts
export async function listServices(businessId: string): Promise<ServiceResult<Service[]>> {
  const user = await getCurrentUser();              // 1. кто
  if (!user) return UNAUTHORIZED;                   //    → UNAUTHORIZED
  const access = await checkBusinessAccess(businessId, user.id); // 2. имеет ли доступ к бизнесу
  if (!access) return FORBIDDEN;                    //    → FORBIDDEN

  return {
    ok: true,
    data: await db.select().from(services)
      .where(and(eq(services.businessId, businessId), eq(services.isActive, true))) // 3. фильтр по businessId
      .orderBy(asc(services.name)),
  };
}
```

- **Проверки доступа — общие**, из `services/_access.ts`
  (`checkBusinessAccess`, `getBusinessRole`, `isOwnerOrManager`), **не копии** в каждом файле.
- **Каждый запрос к БД фильтруй по `businessId`.** Проверки доступа недостаточно —
  без фильтра данные одного бизнеса утекут в другой.
- **Роль проверяй и на сервере**, а не только в UI: операцию уровня
  OWNER/MANAGER гейтуй через `getBusinessRole` + `isOwnerOrManager`, иначе участник
  дёрнет экшен напрямую в обход меню.
- **Валидируй вход:** `trim` строк, проверка на пустоту, clamp пагинации:
  ```ts
  const DEFAULT_PER_PAGE = 25;
  const MAX_PER_PAGE = 100;
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, input.perPage ?? DEFAULT_PER_PAGE));
  ```

### Внешний API (`app/api/external/*`)

- Аутентификация — **`requireAuth(req, '<scope>')`**: проверяет Bearer-ключ и scope,
  при ошибке сразу возвращает `NextResponse`.
- **`businessId` бери из `auth.ctx`**, никогда из тела запроса.
- Ответы — только через **`apiOk`** / **`apiError`** (они же прокидывают `x-request-id`):
  ```ts
  export async function POST(req: NextRequest) {
    const auth = await requireAuth(req, 'bookings:write');
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    if (!body) return apiError(req, 400, 'INVALID_PAYLOAD', 'Пустое тело');

    const r = await createExternalBooking({ businessId: auth.ctx.businessId, /* … */ });
    if (!r.ok) return apiError(req, bookingErrorStatus(r.code), r.code, r.error, r.field);
    return apiOk(req, { appointment_id: r.appointmentId }, r.idempotentReplay ? 200 : 201);
  }
  ```
- **Идемпотентность** записей — через `idempotency_key`: повтор по существующему
  ключу возвращает прежний результат (`replay`), гонку параллельных вставок ловим
  `try/catch` и повторным поиском по ключу. Не плоди дубли.

---

## Ошибки и отслеживаемость багов

Цель раздела — чтобы по логу/коду ошибки за минуты находить причину. Это самая
частая «дешёвая» инвестиция в поддерживаемость.

1. **Каждая ожидаемая ошибка — стабильный машинный `code`.** Коды — `SCREAMING_SNAKE`,
   стабильны во времени (на них завязываются HTTP-статусы внешнего API, тесты, будущие
   алерты). Текущий каталог:
   - доступ: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`;
   - валидация: `INVALID_PAYLOAD`, `INVALID_NAME`, `INVALID_PHONE`, `INVALID_EMAIL`,
     `INVALID_AMOUNT`, `INVALID_DURATION`, `INVALID_DATE`, `INVALID_RATING`;
   - слоты: `OUT_OF_HOURS`, `BLOCKED`, `SLOT_CONFLICT`;
   - домен: `BUSINESS_INACTIVE`, `EMAIL_TAKEN`, `ALREADY_REVIEWED`, `INVALID_CREDENTIALS`,
     `INVALID_TOKEN`, `KEY_REVOKED`.

   Новый код добавляй в каталог и используй ту же формулировку, не выдумывай синонимы.
2. **`throw` — только для «не должно случиться никогда».** Ожидаемое (нет доступа,
   плохой ввод, конфликт слота) — это `ServiceResult`, а не исключение.
3. **Никаких проглоченных ошибок.** Пустой `catch {}` запрещён. `catch` либо
   возвращает результат с логом, либо пробрасывает дальше:
   ```ts
   try {
     const [appt] = await db.insert(appointments).values({ …, externalIdempotencyKey: key }).returning();
     return ok(appt);
   } catch (e) {
     const raced = await findByIdempotencyKey(businessId, key); // гонка по ключу
     if (raced) return replay(raced);
     throw e; // не наша ситуация — пробрасываем, не глотаем
   }
   ```
4. **Логируй неожиданное с тегом и контекстом.** Префикс `'<scope>.<fn> failed:'`
   делает лог grep-абельным; в контекст клади id, **но не секреты**:
   ```ts
   console.error('registerAction failed:', { email }, err);
   ```
   Фоновые побочные эффекты (email, telegram) логируй и не роняй основной поток:
   ```ts
   void sendEmailVerification(user.id, user.email)
     .catch((err) => console.error('sendEmailVerification failed:', { userId: user.id }, err));
   ```
5. **Двухуровневые сообщения.** Пользователю — человеческое (`error`); в лог —
   техническое + `code` + ids. Не показывай пользователю стек/детали БД.
6. **Связывай запрос с логом.** Во внешнем API `apiOk`/`apiError` прокидывают
   `x-request-id` (`echoId`) — при разборе инцидента с ботом этот id связывает их
   запрос с нашим логом. Не убирай проброс.
7. **Тесты на ветки ошибок.** На каждую значимую ошибку (UNAUTHORIZED/FORBIDDEN/
   NOT_FOUND/валидация/конфликт) — тест. Баг доступа должен ловиться в CI, а не в проде.

**Рекомендации к развитию (улучшают поддерживаемость и трассировку):**

- Свести повторяющиеся константы `UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND` в один модуль
  (рядом с `services/_access.ts`) и импортировать, а не переобъявлять в каждом сервисе.
- Завести тонкий `logger` (один формат строки, уровни) вместо россыпи `console.*` —
  это точка, куда позже подключается Sentry/структурные логи без правок по всему коду.

---

## Данные и Drizzle

- **Enum — const-кортеж + выводимый тип**, применяется через `.$type<>()`:
  ```ts
  export const userRoles = ['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'] as const;
  export type UserRole = (typeof userRoles)[number];
  // …
  role: text('role').$type<UserRole>().notNull().default('OWNER'),
  ```
- **Типы строк — из таблицы**, не вручную: `type Client = typeof clients.$inferSelect`,
  `type NewClient = typeof clients.$inferInsert`.
- Колонки в БД — `snake_case`, в TS-объекте — `camelCase` (`businessId → business_id`).
- **Внешние ключи** с явным `onDelete` (`{ onDelete: 'cascade' }`); под частые выборки —
  индексы; под идемпотентность — `uniqueIndex`.
- **Менял `db/schema/*` — сгенерируй миграцию** (`npm run db:generate`). PR со схемой
  без миграции не проходит.
- Доступ к БД — через `db` из `src/db/index.ts` (ленивый proxy: `neon()` не вызывается,
  пока нет обращения, — сборка/prerender работают без `DATABASE_URL`). Не создавай
  свой клиент.

---

## Стили

- Tailwind CSS 4 (`@import "tailwindcss"` в `globals.css`).
- **Цвета и токены — CSS-переменные** в `src/app/globals.css` (`:root` + `@theme inline`,
  `--color-*`, `--font-*`). **Не хардкодь hex** в компонентах — используй токен.
- Условные классы — через `clsx`, не строковой конкатенацией.
- Повторяющиеся наборы классов выноси в хелпер (как `inputClasses(error)` в `ui/form`),
  а не копируй между компонентами.

---

## Навигация

- Все пути — из `src/routes/routes.ts` (объект `routes` + билдеры вроде
  `publicBusinessPath(slug)`, `authPathWithParams(...)`). Новый маршрут добавляй туда,
  не хардкодь строкой в нескольких местах.

---

## Env и секреты

- Прямой `process.env.X` допустим, но: **секреты, ключи, токены, списки доступа —
  только server-only env** + проверка на сервере.
- **`NEXT_PUBLIC_*`** уходит в клиентский бандл — туда кладут **только несекретные
  клиентские значения** (как `NEXT_PUBLIC_APP_URL`). Ключ/whitelist в `NEXT_PUBLIC_*` —
  это утечка.
- Для опциональной интеграции делай явный «configured?»-гард
  (как `isTelegramConfigured()`), а не падай на отсутствующей переменной.

---

## Тесты (Vitest)

- Тест — `*.test.ts` рядом с кодом. Новая серверная логика — с тестом.
- БД в тестах — **PGlite** (in-memory Postgres): `@/db` мокается на тестовый инстанс,
  миграции применяются на старте, `server-only` мокается в `tests/setup.ts`.
- Состояние между тестами чисти в `beforeEach` (`resetAll()` — удаление по таблицам).
  Тесты идут в один процесс (`fileParallelism: false`) — не полагайся на параллелизм.
- Данные готовь фабриками-хелперами (`makeUser`, `makeBusiness`), а не копипастой
  вставок. Логин подменяй моком `getCurrentUser`.
- Сужение результата в тесте:
  ```ts
  expect(result.ok).toBe(true);
  if (!result.ok) return;            // дальше result.data типобезопасен
  expect(result.data).not.toHaveProperty('passwordHash');
  ```
- Покрывай и happy-path, и ветки ошибок (доступ, валидация, конфликты).

---

## Чек-лист перед коммитом (Definition of Done)

- [ ] Код в правильном слое; границы слоёв не нарушены; `server-only` на месте.
- [ ] Сервис идёт по `getCurrentUser → checkBusinessAccess → фильтр по businessId`;
      где нужно — проверка роли на сервере.
- [ ] Ожидаемые ошибки — через `ServiceResult`/`ActionResult` со стабильным `code`;
      нет проглоченных `catch`; неожиданное логируется с тегом и контекстом (без секретов).
- [ ] Экшен после мутации делает `revalidatePath`.
- [ ] Вход валидируется (`trim`, пустота, clamp пагинации).
- [ ] Внешний API: `requireAuth(scope)`, `businessId` из `auth.ctx`, ответы `apiOk`/`apiError`.
- [ ] Менял схему — есть миграция (`npm run db:generate`).
- [ ] Нет `any`, лишних `as`, хардкода путей/цветов; типы выведены из схемы.
- [ ] JSX простой, крупные компоненты декомпозированы, `key` корректные.
- [ ] Новая серверная логика покрыта тестами (happy-path + ветки ошибок).
- [ ] `npm run lint` и `npm test` зелёные.
