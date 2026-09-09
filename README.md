# Zerde 109

AI-платформа аналитики обращений граждан в call-центры 109 (Казахстан):
приём и классификация обращений, помощь оператору, ситуационный центр
руководителя. Построена на реальных исторических данных — ~1 млн обращений
из 7 регионов.

Полный дизайн-документ: [`docs/superpowers/specs/2026-09-09-zerde109-frontend-design.md`](docs/superpowers/specs/2026-09-09-zerde109-frontend-design.md).
Планы реализации по фазам: [`docs/superpowers/plans/`](docs/superpowers/plans/).

---

## Архитектура

Монорепо (npm workspaces), три слоя:

```
CSV (7 схем, ~1 млн строк)
      │  packages/ingest — ETL: 7 мапперов → единая витрина, нормализация,
      │                    матвьюхи, детектор всплесков, прогноз
      ▼
PostgreSQL 16  (БД `zerde109`)
      │  apps/api — Fastify: 16 эндпоинтов под /api, слой repo изолирует SQL,
      │             zod-валидация, единый конверт ошибок
      ▼
apps/web — Vite + React + TS + Tailwind + shadcn/ui
           3 модуля: ситуационный центр · смарт-приём · ассистент оператора
           TanStack Query, React Router, i18n (KK/RU), светлая/тёмная тема
```

| Пакет | Назначение |
|---|---|
| `packages/types` | общие TS-типы фронт↔бэк |
| `packages/ingest` | ETL CSV → PostgreSQL + аналитика (всплески, прогноз, бэктест модели) |
| `apps/api` | `@zerde/api` — Fastify-сервис поверх витрины |
| `apps/web` | `@zerde/web` — SPA ([свой README](apps/web/README.md)) |
| `db/` | SQL-миграции и сиды (справочники, таксономия тем, шаблоны) |

**Таксономия тем:** 17 кодов (`water`, `electricity`, `heating`, `gas`, `sewer`,
`roads`, `lighting`, `improvement`, `waste`, `transport`, `health`, `animals`,
`housing`, `info`, `quarantine`, `emergency`, `other`).
**Единый ЖЦ статуса:** `new · routed · in_progress · done · cancelled`.

---

## Требования

- **Node.js 22.x**
- **PostgreSQL 16** с расширением `pg_trgm`. Для локальной разработки —
  trust-аутентификация для `localhost` (или задайте пароль в `DATABASE_URL`).
- Сырые CSV обращений в папке `Аналитика обращений граждан по call-центрам 109/`
  (в `.gitignore`, ~300 МБ).

---

## Установка и наполнение БД

```bash
npm install

# создать БД (один раз)
psql -U postgres -h localhost -c "CREATE DATABASE zerde109"
psql -U postgres -h localhost -c "CREATE DATABASE zerde109_test"   # для тестов

# конфигурация
cp .env.example .env        # при необходимости поправить DATABASE_URL

# схема + справочники
npm run db:migrate
npm run db:seed

# перегнать CSV в data/raw/ под ASCII-именами и загрузить всё
npm run prepare:data
npm run ingest -- --all     # ~несколько минут (Павлодар ~666k строк)

# проверить целостность витрины (9 проверок)
npm run verify:data

# (опц.) бэктест классификатора тем → таблицы model_eval*
npm run eval
```

Точечная загрузка одного региона: `npm run ingest -- --region=akmola`.

---

## Запуск

```bash
npm run dev        # API :3001 + фронт :5173 одновременно (concurrently)
```

Открыть **http://localhost:5173**. Vite проксирует `/api` → `http://127.0.0.1:3001`.

Отдельно:

```bash
npm run dev:api    # только Fastify
npm run dev:web    # только Vite (API нужно поднять самому)
```

---

## Команды

| Команда | Что делает |
|---|---|
| `npm run check` | `tsc --noEmit` по всем 4 пакетам |
| `npm test` | тесты всех воркспейсов (Vitest) |
| `npm run lint` | ESLint |
| `npm run db:migrate` / `db:seed` | схема / справочники |
| `npm run prepare:data` | CSV → `data/raw/` (ASCII-имена) |
| `npm run ingest -- --all` | полная загрузка витрины |
| `npm run verify:data` | проверки целостности |
| `npm run eval` | бэктест классификатора тем |
| `npm run smoke:api` | прогон всех эндпоинтов против рабочей БД |
| `npm run build -w @zerde/web` | прод-сборка фронта |

---

## API (кратко)

Все под `/api`, ответы типизированы `@zerde/types`, ошибки —
`{ "error": { "code", "message" } }`.

- **Центр:** `GET /kpi` · `/timeseries` · `/breakdown` · `/spikes` · `/forecast` ·
  `POST /nl-query` · `POST /report` (xlsx/pdf)
- **Приём:** `GET /appeals` (пагинация/фильтры/поиск) · `/appeals/:id` ·
  `POST /classify` · `GET /model-eval`
- **Оператор:** `GET /appeals/:id/similar` · `/appeals/:id/duplicates` ·
  `/templates` · `POST /appeals/:id/route` (пишет в `mutations`)
- `GET /meta` — справочники для фильтров и i18n

---

## Тесты

```bash
npm test
```

Юнит: мапперы, нормализаторы, классификатор тем, аналитика (ingest);
компоненты и хуки (web). Интеграционные: `fastify.inject` по тестовой БД
`zerde109_test` (api); RTL + jsdom (web). DB-тесты идут последовательно и
пересоздают схему.

---

## Что реализовано как заглушка (non-goals)

- Классификация — **правило-классификатор + интент-паттерны**, не KazLLM 8B.
  Метрики `model-eval` считаются на прокси-тексте (`raw_category + subcategory`)
  и потому завышены; настоящий текст обращения даст ниже.
- Поиск похожих — **`pg_trgm`**, не векторная БД.
- Прогноз — **сезонный-наив**, не Prophet/ARIMA.
- Роль (Руководитель/Оператор) — UI-тумблер, не авторизация.
- Данные по 7 регионам из 20; приём — из статичных CSV, не real-time.
