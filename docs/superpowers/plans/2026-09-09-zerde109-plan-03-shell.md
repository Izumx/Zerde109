# Zerde 109 — План 3: Оболочка фронта

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять `apps/web` — Vite + React + Tailwind + shadcn/ui — с работающей оболочкой (шапка с глобальными фильтрами, боковое меню, роутинг, роль/язык/тема), типизированным API-клиентом против `@zerde/api`, и общими компонентами (`FilterBar`, `DataTable`, `ChartCard`, `KpiCard`, `EmptyState`, `ErrorBoundary`). Экраны трёх модулей — заглушки; их наполняют Планы 4–6.

**Architecture:** SPA (`apps/web`). Провайдеры (QueryClient, Theme, i18n, Router) оборачивают `AppShell` (topbar + sidebar + `<Outlet/>`). Данные — только через `src/lib/api.ts` (тонкий типизированный `fetch`) + хуки TanStack Query. Глобальные фильтры (регион/период/тема) живут в query-параметрах URL через `useFilters()`; роль/язык/тема — в `localStorage`. Все ответы API типизированы `@zerde/types`. В деве Vite проксирует `/api` → `http://127.0.0.1:3001`.

**Tech Stack:** Vite 5, React 18, TypeScript, Tailwind 3 + `tailwindcss-animate`, shadcn/ui (Radix), React Router 6 (`createBrowserRouter`), TanStack Query 5, TanStack Table 8, Recharts 2, `react-i18next` + `i18next`, `lucide-react`, `sonner` (тосты). Тесты: Vitest + jsdom + `@testing-library/react`. `concurrently` (root, запуск api+web вместе).

## Global Constraints

- **Node:** 22.x. **Package manager:** npm workspaces. **Модули:** ESM.
- **TypeScript:** strict, `noUncheckedIndexedAccess`. `npm run check` = tsc `--noEmit` по `packages/types`, `packages/ingest`, `apps/api`, `apps/web` — проходит.
- **Порты:** web dev — `5173`, API — `3001`. Vite dev-proxy: `/api` → `http://127.0.0.1:3001`.
- **Стиль/дизайн:** при вёрстке оболочки и токенов следовать скиллу **frontend-design**; обёртки графиков — скиллу **dataviz**. Цвета тем берём из `themes.color` (`/api/meta`), не хардкодим палитру в компонентах.
- **i18n:** все строки UI — через `t()` из `locales/{ru,kk}.json`. Значения данных (темы, статусы, каналы) — двуязычные лейблы из `/api/meta`. Дефолт — RU.
- **Тема оформления:** `class`-стратегия Tailwind (`dark` на `<html>`), уважает системную, тумблер, `localStorage`.
- **URL как источник фильтров:** регион/период/тема — в `?region=&from=&to=&theme=`. Ссылки шарятся/закладываются. Ключи TanStack Query включают эти фильтры.
- **Коммиты:** после каждой задачи, тело по необходимости, в конце каждого:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```

## Что уже есть (Планы 1–2) — не трогать

- **`@zerde/api`** (`apps/api`) — Fastify на `zerde109`, эндпоинты под `/api/*`: `meta, kpi, timeseries, breakdown, spikes, forecast, nl-query, report, appeals, appeals/:id, classify, model-eval, appeals/:id/similar, appeals/:id/duplicates, templates, appeals/:id/route`. Запуск: `npm run dev:api` (порт 3001). Конверт ошибки: `{ error: { code, message } }`.
- **`@zerde/types`** — доменные типы + API-типы: `Meta`, `Kpi`, `TimeseriesResponse`, `TimePoint`, `Granularity`, `BreakdownDim`, `BreakdownRow`, `SpikeRow`, `ForecastResponse`, `NlQueryResult`, `AppealListItem`, `Paginated<T>`, `ClassifyResult`, `ModelEval`, `SimilarAppeal`, `DuplicateInfo`, `Template`, `RangeFilter`, `RegionRef`, `ThemeRef`, `ServiceRef`, `AppealStatus`, `ThemeCode`, `Channel`, `Priority`, `Language`, `Appeal`.
- Монорепо: корневой `package.json` (`workspaces: ["apps/*","packages/*"]`, scripts `check`/`test`/`dev:api`), `tsconfig.base.json`, `eslint.config.js` (в `ignores` НЕ должно быть `apps/**`).
- БД `zerde109` заполнена (~990k обращений) — фронт ходит в неё через `@zerde/api`.

---

## Целевая структура файлов (создаётся в этом плане)

```
apps/web/
  index.html
  package.json  tsconfig.json  tsconfig.node.json  vite.config.ts  vitest.config.ts
  components.json                       конфиг shadcn
  tailwind.config.ts  postcss.config.js
  .env.example                          VITE_API_BASE=/api
  src/
    main.tsx                            монтирование + провайдеры
    index.css                           Tailwind + CSS-переменные тем (shadcn)
    app/
      providers.tsx                     QueryClient + Theme + I18n + Router
      router.tsx                        createBrowserRouter, роуты -> страницы
      shell.tsx                         AppShell: topbar + sidebar + <Outlet/>
    lib/
      api.ts                            apiGet/apiPost (типизированный fetch, конверт ошибки)
      queryClient.ts                    настроенный QueryClient
      useMeta.ts                        useMeta() -> Meta (TanStack Query)
      useFilters.ts                     чтение/запись region/from/to/theme в URL
      useRole.ts  useLang.ts  useTheme.ts   localStorage-хуки
      format.ts                         форматтеры чисел/дат/процентов
      cn.ts                             clsx + tailwind-merge (для shadcn)
    components/
      ui/                               примитивы shadcn (button, card, select, table, tabs, …)
      FilterBar.tsx  RoleSwitch.tsx  LangToggle.tsx  ThemeToggle.tsx
      DataTable.tsx  ChartCard.tsx  KpiCard.tsx  RankedBarList.tsx
      EmptyState.tsx  ErrorBoundary.tsx  LoadingSkeleton.tsx
    pages/
      CommandCenterPage.tsx  IntakePage.tsx  OperatorPage.tsx  AppealDetailPage.tsx
      NotFoundPage.tsx
    locales/ru.json  locales/kk.json
  tests/
    api.test.ts  shell.test.ts  filterbar.test.ts  i18n-theme.test.ts
    datatable.test.ts  errorboundary.test.ts
```

Placeholder-страницы модулей рендерят оболочку + плашку «модуль в разработке (План N)» + подключённый `FilterBar`, чтобы навигация и фильтры работали end-to-end против реального `/api/meta` уже сейчас.

---

## Task 1: Скелет `apps/web` (Vite + React + Tailwind + shadcn)

**Files:**
- Create: `apps/web/{index.html, package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, vitest.config.ts, tailwind.config.ts, postcss.config.js, components.json, .env.example}`
- Create: `apps/web/src/{main.tsx, index.css, lib/cn.ts}`
- Create: `apps/web/src/App.tsx` (временный, заменится в Task 3)
- Modify: корневой `package.json` (scripts), `eslint.config.js`
- Test: `apps/web/tests/smoke-render.test.tsx`

**Interfaces:**
- Produces: рабочий `npm run dev:web` (Vite на :5173, проксирует `/api`), `npm run check` включает `apps/web`, `npm test -w @zerde/web` гоняет Vitest в jsdom. `lib/cn.ts` экспортирует `cn(...classes)`.

- [ ] **Step 1: `apps/web/package.json`**

```json
{
  "name": "@zerde/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-table": "^8.20.5",
    "@zerde/types": "*",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "i18next": "^23.15.2",
    "lucide-react": "^0.451.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-i18next": "^15.0.2",
    "react-router-dom": "^6.27.0",
    "recharts": "^2.13.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.6.0",
    "vite": "^5.4.8",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: конфиги Vite/TS/Tailwind/PostCSS**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: true } },
  },
});
```

`vitest.config.ts`:
```ts
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
    },
  }),
);
```

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client", "@testing-library/jest-dom"],
    "noEmit": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

`tsconfig.node.json`:
```json
{ "compilerOptions": { "composite": true, "module": "ESNext", "moduleResolution": "Bundler" }, "include": ["vite.config.ts"] }
```

`tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
    },
  },
  plugins: [animate],
} satisfies Config;
```

`postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 3: `components.json` (shadcn), `index.html`, `src/index.css`, `src/lib/cn.ts`, `src/main.tsx`, `src/App.tsx`, `.env.example`**

`components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "tailwind.config.ts", "css": "src/index.css", "baseColor": "slate", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/cn" }
}
```

`index.html`:
```html
<!doctype html>
<html lang="ru">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Zerde 109</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`src/index.css` — Tailwind-директивы + переменные тем (light + dark) в стиле shadcn slate. Полный блок:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%; --foreground: 222 47% 11%;
    --card: 0 0% 100%; --card-foreground: 222 47% 11%;
    --muted: 210 40% 96%; --muted-foreground: 215 16% 47%;
    --primary: 222 47% 31%; --primary-foreground: 210 40% 98%;
    --accent: 210 40% 94%; --accent-foreground: 222 47% 20%;
    --destructive: 0 72% 51%; --destructive-foreground: 210 40% 98%;
    --border: 214 32% 91%; --radius: 0.5rem;
  }
  .dark {
    --background: 222 47% 8%; --foreground: 210 40% 96%;
    --card: 222 47% 11%; --card-foreground: 210 40% 96%;
    --muted: 217 33% 17%; --muted-foreground: 215 20% 65%;
    --primary: 210 40% 90%; --primary-foreground: 222 47% 15%;
    --accent: 217 33% 20%; --accent-foreground: 210 40% 96%;
    --destructive: 0 63% 45%; --destructive-foreground: 210 40% 96%;
    --border: 217 33% 22%;
  }
  * { @apply border-border; }
  body { @apply bg-background text-foreground; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
}
```

`src/lib/cn.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...i: ClassValue[]): string => twMerge(clsx(i));
```

`src/App.tsx` (временный):
```tsx
export default function App() {
  return <div className="p-8 text-lg">Zerde 109 — оболочка (Task 1)</div>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
```

`.env.example`: `VITE_API_BASE=/api`

- [ ] **Step 4: `apps/web/tests/setup.ts` и `tests/smoke-render.test.tsx`**

`tests/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`tests/smoke-render.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../src/App";

test("App renders", () => {
  render(<App />);
  expect(screen.getByText(/Zerde 109/)).toBeInTheDocument();
});
```

- [ ] **Step 5: корневой `package.json` scripts + eslint**

`package.json` (обновить/добавить):
```json
"check": "tsc -p packages/types --noEmit && tsc -p packages/ingest --noEmit && tsc -p apps/api --noEmit && tsc -p apps/web --noEmit",
"dev:web": "npm run dev -w @zerde/web",
"dev": "concurrently -n api,web -c blue,green \"npm:dev:api\" \"npm:dev:web\"",
"test": "npm test --workspaces --if-present"
```
Добавить `"concurrently": "^9.0.1"` в корневые `devDependencies`.
`eslint.config.js`: убедиться, что `apps/**` НЕ в `ignores` (Plan 2 уже убрал); добавить в конфиг блок для React если нужно — минимально оставить как есть (tseslint recommended достаточно для `--noEmit` не отвечает; линт JSX не обязателен в этом плане).

- [ ] **Step 6: Установить, проверить**

Run:
```bash
npm install
npm run check
npm test -w @zerde/web
```
Expected: install ок; `check` exit 0 (4 пакета); smoke-render PASS.

- [ ] **Step 7: shadcn init + базовые примитивы**

Run:
```bash
cd apps/web && npx shadcn@latest add button card select tabs table skeleton badge separator dropdown-menu sonner --yes && cd ../..
```
Ожидаемо: появятся `src/components/ui/*.tsx`, добавятся зависимости (`@radix-ui/*`). Если CLI спросит про конфиг — `components.json` уже есть, `--yes` берёт его. Затем `npm install` (подтянуть новые radix-зависимости), `npm run check` → 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(web): scaffold Vite + React + Tailwind + shadcn/ui (@zerde/web)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: API-клиент + QueryClient + `useMeta`

**Files:**
- Create: `apps/web/src/lib/{api.ts, queryClient.ts, useMeta.ts, format.ts}`
- Test: `apps/web/tests/api.test.ts`

**Interfaces:**
- Produces:
  - `api.ts`:
    - `class ApiError extends Error { code: string; status: number }`
    - `apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>` — строит query-string (пропускает `undefined`), `fetch(base + path)`, при `!res.ok` парсит `{error:{code,message}}` → `throw new ApiError(...)`, иначе `res.json() as T`. `base = import.meta.env.VITE_API_BASE ?? "/api"`.
    - `apiPost<T>(path: string, body: unknown): Promise<T>` — `content-type: application/json`, та же обработка ошибок.
    - `apiBlob(path, body): Promise<Blob>` — для `/report`.
  - `queryClient.ts`: `makeQueryClient()` — `staleTime: 60_000`, `retry: 1`, не рефетчить на фокус.
  - `useMeta.ts`: `useMeta(): UseQueryResult<Meta>` — `queryKey: ["meta"]`, `queryFn: () => apiGet<Meta>("/meta")`. Плюс селекторы-хелперы: `useRegionOptions()`, `useThemeOptions()` (из meta, с учётом `isActive` для регионов — неактивные помечены `disabled`).
  - `format.ts`: `fmtInt(n)`, `fmtPct(x /*0..1*/)`, `fmtDelta(x)`, `fmtDate(iso)`, `fmtHours(h)`.

- [ ] **Step 1: Тест `apps/web/tests/api.test.ts`**

```ts
import { afterEach, expect, test, vi } from "vitest";
import { ApiError, apiGet } from "../src/lib/api";

afterEach(() => vi.restoreAllMocks());

test("apiGet builds query string, skips undefined, returns json", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: 1 }), { status: 200, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const out = await apiGet<{ ok: number }>("/kpi", { region: "akmola", theme: undefined, page: 2 });
  expect(out).toEqual({ ok: 1 });
  const url = fetchMock.mock.calls[0][0] as string;
  expect(url).toContain("/api/kpi?");
  expect(url).toContain("region=akmola");
  expect(url).toContain("page=2");
  expect(url).not.toContain("theme=");
});

test("apiGet throws ApiError with code on error envelope", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: { code: "bad_request", message: "bad" } }), { status: 400 }),
  ));
  await expect(apiGet("/kpi")).rejects.toMatchObject({ name: "ApiError", code: "bad_request", status: 400 });
});
```

- [ ] **Step 2: Запустить — падает. Step 3: Реализация `api.ts` (+ прочее). Step 4: Запустить — PASS.**
- [ ] **Step 5: Commit** `feat(web): typed API client + QueryClient + useMeta`.

---

## Task 3: Провайдеры + оболочка + роутинг

**Files:**
- Create: `apps/web/src/app/{providers.tsx, router.tsx, shell.tsx}`
- Create: `apps/web/src/pages/{CommandCenterPage,IntakePage,OperatorPage,AppealDetailPage,NotFoundPage}.tsx` (заглушки)
- Modify: `apps/web/src/main.tsx` (рендерить `<Providers/>`), удалить `src/App.tsx`
- Test: `apps/web/tests/shell.test.tsx`

**Interfaces:**
- Consumes: `makeQueryClient` (T2), `ThemeProvider`/`I18nProvider` (T4/T5 — до них использовать заглушки-пустышки, заменить в тех задачах), `useRole` (T6 — временно хардкод `"director"`).
- Produces:
  - `providers.tsx`: `<Providers>` = `QueryClientProvider` → `ThemeProvider` → `I18nProvider` → `RouterProvider(router)`; плюс `<Toaster/>` (sonner).
  - `router.tsx`: `createBrowserRouter([{ element: <AppShell/>, children: [
      { path: "/", element: <RoleRedirect/> },
      { path: "/command-center", element: <CommandCenterPage/> },
      { path: "/intake", element: <IntakePage/> },
      { path: "/operator", element: <OperatorPage/> },
      { path: "/appeals/:id", element: <AppealDetailPage/> },
      { path: "*", element: <NotFoundPage/> } ]}])`. `RoleRedirect` — `<Navigate to={role === "operator" ? "/operator" : "/command-center"} replace/>`.
  - `shell.tsx`: `<AppShell>` — `<header>` (лого «Zerde 109», слот под `FilterBar` — в T6, справа слоты `RoleSwitch`/`LangToggle`/`ThemeToggle` — T4–T6) + `<aside>` (навигация: Ситуационный центр `/command-center`, Смарт-приём `/intake`, Ассистент оператора `/operator`; активный пункт подсвечен через `NavLink`) + `<main><Outlet/></main>`. Адаптив: sidebar сворачивается < 1024px в бургер.
  - Заглушки-страницы: каждая — `<PagePlaceholder module="…" plan={N}/>` (общий компонент в `pages/`, рендерит заголовок + «Модуль в разработке — План N»).

- [ ] **Step 1: Тест `shell.test.tsx`** — рендер `<Providers/>` (мемори-роутер вариант: экспортировать `makeRouter(initialEntries?)` для тестов на `createMemoryRouter`); проверить: есть ссылки «Ситуационный центр»/«Смарт-приём»/«Ассистент оператора»; `/` редиректит на `/command-center`; неизвестный путь → текст NotFound.
- [ ] **Step 2: падает → Step 3: реализация → Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(web): providers, app shell layout, router with module placeholders`.

---

## Task 4: i18n (KK / RU)

**Files:**
- Create: `apps/web/src/lib/useLang.ts`, `apps/web/src/app/i18n.tsx`, `apps/web/src/components/LangToggle.tsx`
- Create: `apps/web/src/locales/{ru,kk}.json`
- Modify: `providers.tsx` (реальный `I18nProvider`), `shell.tsx` (вставить `<LangToggle/>`)
- Test: `apps/web/tests/i18n-theme.test.tsx` (часть про i18n)

**Interfaces:**
- Produces:
  - `i18n.tsx`: инициализация `i18next` (ресурсы из `locales/*.json`, `lng` из `useLang` начального значения, `fallbackLng: "ru"`), экспорт `<I18nProvider>` (обёртка `I18nextProvider`) и переэкспорт `useTranslation`.
  - `useLang.ts`: `useLang(): { lang: "ru" | "kk"; setLang(l): void }` — `localStorage["zerde.lang"]`, дефолт `"ru"`; при `setLang` дергает `i18n.changeLanguage`.
  - `LangToggle.tsx`: сегмент-переключатель `RU | KK`.
  - `locales/ru.json` / `kk.json` — ключи: `nav.commandCenter`, `nav.intake`, `nav.operator`, `filter.region`, `filter.period`, `filter.theme`, `filter.allRegions`, `filter.allThemes`, `period.7d`, `period.30d`, `period.90d`, `period.custom`, `role.director`, `role.operator`, `common.loading`, `common.empty`, `common.error`, `common.retry`, `common.showTable`, `placeholder.inDevelopment` (с `{{plan}}`), `notFound.title`.

- [ ] Тест: рендер оболочки, по умолчанию видно «Ситуационный центр»; клик по `KK` в `LangToggle` → появляется казахская строка `nav.commandCenter` из `kk.json`; значение сохраняется в `localStorage`. Commit `feat(web): i18n (ru/kk) with LangToggle`.

---

## Task 5: Тема оформления

**Files:**
- Create: `apps/web/src/lib/useTheme.ts`, `apps/web/src/app/theme.tsx`, `apps/web/src/components/ThemeToggle.tsx`
- Modify: `providers.tsx`, `shell.tsx`
- Test: `apps/web/tests/i18n-theme.test.tsx` (часть про тему)

**Interfaces:**
- Produces:
  - `theme.tsx`: `<ThemeProvider>` — на монтировании читает `localStorage["zerde.theme"]` (`"light"|"dark"|"system"`, дефолт `"system"`), ставит/снимает класс `dark` на `document.documentElement`, слушает `matchMedia("(prefers-color-scheme: dark)")` при `system`.
  - `useTheme.ts`: `useTheme(): { theme; setTheme; resolved: "light"|"dark" }`.
  - `ThemeToggle.tsx`: dropdown (Светлая / Тёмная / Системная), иконки `lucide-react`.

- [ ] Тест: `setTheme("dark")` → `document.documentElement.classList.contains("dark")` === true; `setTheme("light")` → false; значение в `localStorage`. Commit `feat(web): light/dark theme with system option`.

---

## Task 6: Глобальные фильтры + роль

**Files:**
- Create: `apps/web/src/lib/{useFilters.ts, useRole.ts}`, `apps/web/src/components/{FilterBar.tsx, RoleSwitch.tsx}`
- Modify: `shell.tsx` (вставить `FilterBar` в topbar, `RoleSwitch` справа), `router.tsx` (`RoleRedirect` берёт реальную роль)
- Test: `apps/web/tests/filterbar.test.tsx`

**Interfaces:**
- Consumes: `useMeta`/`useRegionOptions`/`useThemeOptions` (T2), `useSearchParams` (react-router).
- Produces:
  - `useFilters.ts`: `useFilters(): { filters: RangeFilter; setFilters(patch: Partial<RangeFilter>): void }` — читает `region/from/to/theme` из `useSearchParams`, `setFilters` мёржит в query (удаляя пустые). Плюс `usePeriodPreset()` — хелпер: пресет `7d/30d/90d` вычисляет `from`/`to` от «сегодня» (клиентское `new Date()`), пишет в фильтры; `custom` — оставляет как есть.
  - `FilterBar.tsx`: три контрола — `Select` регион (опции из meta, первая «Все регионы», неактивные регионы `disabled`), сегменты периода (`7д | 30д | 90д | Свой` + два `input[type=date]` при `Свой`), `Select` тема (из meta, «Все темы»). Всё завязано на `useFilters`. Показывает skeleton пока `useMeta` грузится.
  - `useRole.ts`: `useRole(): { role: "director" | "operator"; setRole(r): void }` — `localStorage["zerde.role"]`, дефолт `"director"`.
  - `RoleSwitch.tsx`: сегмент `Руководитель | Оператор`; при смене — `navigate` на дефолтный экран роли.

- [ ] Тест: замокать `useMeta` (или поднять с `QueryClient` + мок `fetch` на `/api/meta` фикстурой) → `FilterBar` показывает опции регионов; выбор региона «Акмолинская» → в URL появляется `?region=akmola`; выбор пресета `30д` → в URL `from`/`to`; `RoleSwitch` на «Оператор» → роут меняется на `/operator`. Commit `feat(web): global FilterBar (URL-backed) + role switch`.

---

## Task 7: `DataTable`

**Files:** Create `apps/web/src/components/DataTable.tsx`; Test `apps/web/tests/datatable.test.tsx`.

**Interfaces:**
- Produces: `DataTable<T>` — обёртка над `@tanstack/react-table` (`getCoreRowModel`). Пропсы: `columns: ColumnDef<T>[]`, `data: T[]`, `total?: number`, `page?: number`, `pageSize?: number`, `onPageChange?(p)`, `sort?: { id: string; desc: boolean }`, `onSortChange?(s)`, `onRowClick?(row: T)`, `isLoading?: boolean`, `density?: "comfortable" | "compact"`. Серверная модель: сортировку/пагинацию НЕ считает сам — прокидывает наружу. При `isLoading` — 5 строк skeleton. Пустые данные — `<EmptyState/>` (T9; до неё — просто текст).

- [ ] Тест: рендер с 3 колонками и 4 строками фикстуры → 4 `<tr>` в body; клик по строке → `onRowClick` с объектом строки; клик по заголовку сортируемой колонки → `onSortChange` вызван; `isLoading` → нет строк данных, есть skeleton. Commit `feat(web): server-driven DataTable wrapper`.

---

## Task 8: Примитивы визуализации — `ChartCard`, `KpiCard`, `RankedBarList`

**Files:** Create `apps/web/src/components/{ChartCard.tsx, KpiCard.tsx, RankedBarList.tsx}`; Test `apps/web/tests/viz-primitives.test.tsx`.

**Interfaces:**
- Следовать скиллу **dataviz** (цвета — из `themes.color` meta, единые оси/сетка/тултип). Recharts.
- Produces:
  - `ChartCard`: `{ title: string; isLoading?: boolean; isError?: boolean; isEmpty?: boolean; onRetry?(): void; tableSlot?: ReactNode; children: ReactNode }` — карточка (shadcn `Card`) с заголовком; состояния loading (skeleton) / error (текст + кнопка «Повторить») / empty (`EmptyState`); тумблер «Показать таблицей» переключает `children` ↔ `tableSlot`.
  - `KpiCard`: `{ label: string; value: string; delta?: number; hint?: string; isLoading?: boolean }` — крупное число, стрелка-дельта (зелёная/красная), подпись.
  - `RankedBarList`: `{ items: { key: string; label: string; value: number; color?: string }[]; max?: number; onItemClick?(key) }` — горизонтальные бары-полоски (div-based, без Recharts), значение справа, клик по строке.

- [ ] Тест: `KpiCard` c `delta={-0.2}` → в DOM есть `-20%` и класс/атрибут «снижение»; `ChartCard isError onRetry` → есть кнопка, клик → `onRetry`; `ChartCard` тумблер «таблицей» → показывает `tableSlot`; `RankedBarList` из 3 элементов → 3 строки, клик → `onItemClick(key)`. Commit `feat(web): ChartCard/KpiCard/RankedBarList viz primitives`.

---

## Task 9: `EmptyState`, `ErrorBoundary`, `LoadingSkeleton`, тосты

**Files:** Create `apps/web/src/components/{EmptyState.tsx, ErrorBoundary.tsx, LoadingSkeleton.tsx}`; Modify `shell.tsx` (обернуть `<Outlet/>` в `ErrorBoundary`); Test `apps/web/tests/errorboundary.test.tsx`.

**Interfaces:**
- Produces:
  - `EmptyState`: `{ title?: string; hint?: string; icon?: ReactNode }` — центрированная плашка.
  - `ErrorBoundary`: классовый компонент, ловит ошибки рендера потомков, показывает «Что-то пошло не так» + кнопку «Обновить» (сброс через `key`/`resetKeys`), логирует в консоль. Оборачивает каждый feature-роут (в `shell.tsx` — вокруг `<Outlet/>`).
  - `LoadingSkeleton`: `{ rows?: number; className?: string }` — набор shadcn `Skeleton`.
  - Тосты: реэкспорт `toast` из `sonner`; `<Toaster/>` уже в `providers.tsx` (T3).

- [ ] Тест: компонент, кидающий в рендере → внутри `ErrorBoundary` виден текст «Что-то пошло не так» и кнопка; клик по кнопке + починка пропа → дети снова рендерятся. Commit `feat(web): EmptyState / ErrorBoundary / LoadingSkeleton`.

---

## Task 10: Заглушки страниц модулей с рабочим FilterBar

**Files:** Modify `apps/web/src/pages/{CommandCenterPage,IntakePage,OperatorPage,AppealDetailPage}.tsx`; Create `apps/web/src/pages/PagePlaceholder.tsx`; Test `apps/web/tests/pages.test.tsx`.

**Interfaces:**
- Produces:
  - `PagePlaceholder`: `{ titleKey: string; plan: number }` — `<h1>{t(titleKey)}</h1>` + плашка `t("placeholder.inDevelopment", { plan })` + маленький блок «данные подключены» который делает реальный `useMeta()` и показывает число регионов/тем (доказывает сквозную связь фронт→API→БД).
  - `CommandCenterPage` → `<PagePlaceholder titleKey="nav.commandCenter" plan={4}/>`; `IntakePage` → `plan={5}`; `OperatorPage` → `plan={6}`; `AppealDetailPage` → показывает `:id` из `useParams` + `plan={5}`.

- [ ] Тест: с `QueryClient` + мок `fetch` `/api/meta` (фикстура: 20 регионов, 17 тем) → `CommandCenterPage` показывает заголовок и «20 регионов, 17 тем». Commit `feat(web): module page placeholders wired to /api/meta`.

---

## Task 11: `npm run dev` (api+web), env, сборка

**Files:** Modify корневой `package.json` (`dev` уже добавлен в T1 — проверить), `apps/web/.env.example`; Create `apps/web/README.md` (короткий: как запустить).

- [ ] **Step 1:** Убедиться: `npm run dev` поднимает и `:3001`, и `:5173` (concurrently). Проверить вручную: открыть `http://localhost:5173`, оболочка рендерится, `FilterBar` заполнен реальными регионами из `/api/meta` (через прокси), переключение темы/языка/роли работает, навигация между заглушками работает.
- [ ] **Step 2:** `npm run build -w @zerde/web` → успешная сборка (tsc + vite build), без ошибок типов.
- [ ] **Step 3: Commit** `chore(web): dev orchestration (api+web) + build + README`.

---

## Task 12: Финал — check, тесты, smoke

- [ ] **Step 1:** `npm run check` → 0 (4 пакета).
- [ ] **Step 2:** `npm test` → все воркспейсы зелёные (`@zerde/web` ~10+ тестов, api 34, ingest 144).
- [ ] **Step 3:** `npm run dev` вручную → пройти чек-лист: оболочка, фильтры из meta, тема/язык/роль, роутинг, ErrorBoundary (временно кинуть ошибку в заглушке — убрать после).
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): shell complete — routing, filters, i18n, theme, shared components

Оболочка Zerde 109 готова: провайдеры, AppShell, глобальный FilterBar на
URL, KK/RU, светлая/тёмная тема, роль, DataTable/ChartCard/KpiCard,
EmptyState/ErrorBoundary. Экраны модулей — заглушки под Планы 4-6,
уже связаны с реальным /api/meta.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Definition of Done (План 3)

- [ ] `npm run check` (tsc ×4) — без ошибок.
- [ ] `npm test` — `@zerde/web` зелёный (клиент API, оболочка, FilterBar, i18n+тема, DataTable, ErrorBoundary, страницы), api/ingest не сломаны.
- [ ] `npm run build -w @zerde/web` — успешная прод-сборка.
- [ ] `npm run dev` поднимает api+web; `http://localhost:5173` рендерит оболочку, `FilterBar` заполнен из реального `/api/meta`, тема/язык/роль/навигация работают.
- [ ] Каждая задача — отдельный коммит.

## Self-review (план против спеки §6)

- **§6.1 структура** (`app/`, `components/ui`, `components`, `features/*`, `lib`, `locales`) — оболочка ставит `app/`, `components/ui`, `components`, `lib`, `locales`, `pages/` (вместо `features/*` — модули появятся папками `features/*` в Планах 4–6; заглушки пока в `pages/`). Отклонение задокументировано.
- **§6.2 роутинг:** `/` → редирект по роли, `/command-center`, `/intake` (+`/intake/quality` — в Плане 5), `/operator` (+`/operator/:id` — План 6), `/appeals/:id`, глоб. фильтры в query — всё в T3/T6. ✓
- **§6.6 сквозное:** `FilterBar` (URL) T6, `RoleSwitch` T6, i18n T4, тема T5, `DataTable` T7, обёртки графиков T8, API-клиент T2, Vite-прокси T1. ✓
- **§6.3–6.5 (экраны модулей)** — вне Плана 3, заглушки T10; наполнение — Планы 4–6. ✓
- **Скиллы:** Global Constraints обязывают следовать `frontend-design` (оболочка/токены) и `dataviz` (T8) при реализации. ✓
- **Плейсхолдеры:** T4–T11 ужаты до «тест-суть + сигнатуры + ключевой код», т.к. паттерн (компонент + localStorage-хук + RTL-тест) повторяется; T1–T3, T7 — с полным кодом ключевых файлов. Полный список файлов и интерфейсов задан для каждой задачи.
- **Согласованность:** все данные — через `apiGet`/`useMeta` (T2), типы из `@zerde/types`; фильтры — единый `useFilters` на `useSearchParams`; localStorage-ключи в одном неймспейсе `zerde.*`.
