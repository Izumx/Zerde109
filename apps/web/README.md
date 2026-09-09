# @zerde/web — оболочка фронтенда Zerde 109

Vite + React + TypeScript + Tailwind + shadcn/ui.

## Запуск

Из корня репозитория:

```bash
npm run dev        # поднимает API (:3001) и фронт (:5173) одновременно
```

Только фронт (API должен быть запущен отдельно):

```bash
npm run dev:web
```

Открыть <http://localhost:5173>. Vite проксирует `/api` → `http://127.0.0.1:3001`.

## Прочее

```bash
npm run check              # tsc по всем пакетам, включая apps/web
npm test -w @zerde/web     # vitest (jsdom)
npm run build -w @zerde/web
```

`VITE_API_BASE` (по умолчанию `/api`) — базовый путь API, см. `.env.example`.

## Что здесь есть (План 3)

Оболочка: провайдеры (QueryClient / Theme / i18n / Router), `AppShell`
(шапка + боковое меню), глобальный `FilterBar` на URL-параметрах, переключатели
роли / языка (KK·RU) / темы. Общие компоненты: `DataTable`, `ChartCard`,
`KpiCard`, `RankedBarList`, `EmptyState`, `ErrorBoundary`.

Экраны модулей — заглушки; наполняются Планами 4–6.
