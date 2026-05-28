# Mesto.pro — Frontend

CRM-система для малого бизнеса. Next.js приложение, ходящее во внешний NestJS API.

> **Статус.** Проект в активной разработке. Реально подключены к API: вход/регистрация и управление бизнесами. Остальные страницы (клиенты, календарь, финансы, отзывы, сотрудники, настройки) пока работают на мок-данных — интеграция в плане. См. `docs/plan.md` если он создан, или ветку с миграцией на Neon.

## Стек

- Next.js 15 (App Router) / React 19 / TypeScript (strict)
- Tailwind CSS 4
- Framer Motion, `@headlessui/react`, `chart.js`
- Состояние: React Context
- БД: Neon (serverless Postgres, регион `aws-eu-central-1` Frankfurt) + Drizzle ORM
- Деплой: Vercel (регион функций `fra1`)

## Быстрый старт

1. `yarn install`
2. Переменные окружения:
   - Если есть доступ к Vercel-проекту: `npx vercel link && npx vercel env pull .env.local`
   - Иначе: скопировать `.env.example` → `.env.local`, заполнить вручную (`DATABASE_URL` из Neon-консоли)
3. Накатить миграции: `yarn db:migrate`
4. `yarn start:dev` — приложение поднимется на `http://localhost:3001`.

## Скрипты

| Команда | Что делает |
|---------|------------|
| `yarn start:dev` | dev-сервер (Next + Turbopack) |
| `yarn build` | production-сборка |
| `yarn start` | запуск production-сборки |
| `yarn lint` | ESLint |
| `yarn lint:fix` | ESLint --fix |
| `yarn db:generate` | Drizzle: сгенерировать SQL-миграцию из схемы |
| `yarn db:migrate` | Drizzle: накатить миграции в БД |
| `yarn db:push` | Drizzle: пушнуть схему напрямую (для прототипирования) |
| `yarn db:studio` | Drizzle: GUI для просмотра БД |

## Структура

```
src/
├── app/                     # Next.js App Router (страницы — обёртки над src/pages)
├── pages/                   # реализация страниц (будет перемещено в app/ при миграции на Neon)
├── ui/                      # UI-кит: Button, Input, Popup, Select, Spinner, Header, Footer
├── contexts/                # AuthContext, BusinessContext, NotificationContext
├── hooks/                   # useAccess (контроль доступа)
├── lib/apiClient.ts         # клиент текущего внешнего бэкенда (удалится после Neon)
├── db/                      # Drizzle: схема (schema/) + клиент Neon (index.ts)
├── routes/                  # карта маршрутов
├── types/                   # общие типы
└── consts/

drizzle/                     # SQL-миграции (генерятся `yarn db:generate`)
drizzle.config.ts            # конфиг Drizzle Kit
vercel.json                  # регион функций Vercel
```

## Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_APP_URL` | URL фронта (используется для ссылок) |
| `NEXT_PUBLIC_API_URL` | URL внешнего NestJS API (временно, до миграции на Neon) |

## Подключённые к API экраны

- `/login`, `/login-otp`, `/registration`
- `/dashboard` (список бизнесов)
- `/my-business` (CRUD бизнесов)

Остальное — UI-прототипы на мок-данных.

## Деплой

Production: https://mesto-nine.vercel.app/

## Лицензия

MIT
