# Zerde 109 — План 4: Ситуационный центр (Модуль 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Наполнить экран `/command-center` реальными данными: KPI-строка + вкладки **Обзор · Всплески · Прогноз · Запрос · Отчёты** на готовых эндпоинтах `@zerde/api`, с графиками Recharts по скиллу `dataviz`.

**Architecture:** `apps/web/src/features/command-center/` — страница + вкладки. Данные через хуки TanStack Query (`features/command-center/api.ts`), завязанные на глобальные фильтры (`useFilters`). Графики — тонкие обёртки `components/charts/*` над Recharts (одна ось, hover-тултип, легенда при ≥2 сериях, table-view). Палитра тем — из `/api/meta` (`themes.color`), проверена валидатором `dataviz`.

## Global Constraints

- `npm run check` (tsc ×4) — без ошибок. `npm test` — все воркспейсы зелёные.
- Все данные — через хуки в `features/command-center/api.ts` (тонкие `useQuery` над `apiGet`/`apiPostBlob` из `@/lib/api`), `queryKey` включает фильтры.
- Графики: **одна ось**, никаких dual-axis. Recharts. Hover-тултип обязателен. Легенда при ≥2 сериях. Цвета серий — фиксированный порядок из `themes.color`, не циклятся. Текст — токенами (`foreground`/`muted-foreground`), не цветом серии.
- Никаких новых зависимостей кроме уже стоящей `recharts`.
- i18n: новые строки — в `locales/{ru,kk}.json`.
- Коммит после каждой задачи; в конце сообщения:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```

## Что уже есть (Планы 1–3)

- **`@zerde/api`** под `/api`: `GET /kpi /timeseries /breakdown /spikes /forecast`, `POST /nl-query /report`. Формы ответов — типы `@zerde/types` (`Kpi`, `TimeseriesResponse`, `BreakdownRow[]`, `SpikeRow[]`, `ForecastResponse`, `NlQueryResult`; `/report` → бинарь).
- **`apps/web`**: `lib/api.ts` (`apiGet`, `apiPost`, `apiPostBlob`, `ApiError`), `lib/useMeta.ts`, `lib/useFilters.ts` (`useFilters` → `RangeFilter` из URL), `lib/format.ts` (`fmtInt`/`fmtPct`/`fmtDelta`/`fmtHours`/`fmtDate`).
- **Общие компоненты**: `KpiCard`, `ChartCard` (loading/error/empty + «показать таблицей»), `RankedBarList`, `DataTable`, `EmptyState`, `ErrorBoundary`. Оболочка с `FilterBar` в шапке.
- **shadcn ui**: `card, tabs, select, button, badge, skeleton, separator, dropdown-menu`. Есть `recharts`.
- Тесты web: jsdom + RTL, `tests/_meta.ts` (`stubMetaFetch`, `META_FIXTURE`), `Providers`/`makeRouter`. Радикс-примитивы работают (полифиллы в `tests/setup.ts`), но для селектов в фичах предпочитаем нативный `<select>` (как во `FilterBar`).

---

## Целевая структура файлов

```
apps/web/src/
  features/command-center/
    CommandCenterPage.tsx        KPI-строка + Tabs (заменяет заглушку из pages/)
    api.ts                       useKpi, useTimeseries, useBreakdown, useSpikes,
                                 useForecast, useNlQuery (mutation), downloadReport
    KpiRow.tsx
    OverviewTab.tsx  SpikesTab.tsx  ForecastTab.tsx  NlQueryTab.tsx  ReportsTab.tsx
  components/charts/
    chartTheme.ts                useSeriesColors() из meta + дефолтная палитра (валидир.)
    LineChartFig.tsx             линия(и) + опц. полоса прогноза; crosshair-тултип
    BarChartFig.tsx              вертикальные бары; per-mark hover
  pages/CommandCenterPage.tsx    → ре-экспорт features/command-center/CommandCenterPage
```

---

## Task 1: Хуки данных `features/command-center/api.ts`

**Files:** Create `apps/web/src/features/command-center/api.ts`; Test `apps/web/tests/cc-api.test.ts`.

**Interfaces:**
- Consumes: `apiGet`/`apiPost`/`apiPostBlob` (`@/lib/api`), `useFilters` (`@/lib/useFilters`), типы `@zerde/types`.
- Produces (все хуки — `useQuery`, `queryKey` = `["cc", <name>, filters, ...extra]`, `enabled` где нужны обяз. параметры):
  - `useKpi()` → `UseQueryResult<Kpi>` (params: текущие `filters`)
  - `useTimeseries(granularity: Granularity)` → `UseQueryResult<TimeseriesResponse>`
  - `useBreakdown(dim: BreakdownDim)` → `UseQueryResult<BreakdownRow[]>`
  - `useSpikes()` → `UseQueryResult<SpikeRow[]>`
  - `useForecast(region: string | undefined, theme: ThemeCode | undefined)` → `UseQueryResult<ForecastResponse>` (`enabled: Boolean(region && theme)`)
  - `useNlQuery()` → `UseMutationResult<NlQueryResult, ApiError, string>` (`mutationFn: (q) => apiPost("/nl-query", { q })`)
  - `downloadReport(view: "overview"|"regions"|"themes", format: "xlsx"|"pdf", filters: RangeFilter): Promise<void>` — `apiPostBlob("/report", { view, format, filters })` → создаёт `<a download>` с objectURL, кликает, revoke.
- Хелпер `rangeParams(f: RangeFilter): Record<string,string|undefined>` — плоский объект для `apiGet`.

- [ ] **Step 1: Тест `cc-api.test.ts`** — рендер хука `useKpi` через `renderHook` c `QueryClientProvider` + `MemoryRouter` (для `useFilters`), `stubMetaFetch`-подобный мок `fetch` возвращает `{ total: 5, ... }` для `/api/kpi`; ждём `result.current.data.total === 5`. Плюс: `useForecast(undefined, undefined)` → `isPending && !isFetching` (запрос не ушёл, `enabled:false`).
- [ ] **Step 2: падает → Step 3: реализация → Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(web): command-center data hooks`.

---

## Task 2: `components/charts/chartTheme.ts` + палитра (dataviz)

**Files:** Create `apps/web/src/components/charts/chartTheme.ts`; Test `apps/web/tests/chart-theme.test.ts`.

**Interfaces:**
- Produces:
  - `DEFAULT_SERIES: string[]` — валидированная категориальная палитра (прогнать `dataviz/scripts/validate_palette.js` для light И dark surface; зафиксировать проходящий набор из ~8 hex; в комментарии — вывод валидатора).
  - `useSeriesColors(): (keys: string[]) => Record<string,string>` — по `keys` (коды тем) отдаёт `themes.color` из `useMeta()`; для не-тем-ключей (регионы, статусы) — берёт по порядку из `DEFAULT_SERIES` (фиксированный порядок, не циклится; 9-й ключ → тот же последний цвет + предупреждение в консоль в dev).
  - `AXIS_STYLE`, `GRID_STYLE`, `TOOLTIP_WRAPPER_CLS` — общие ненавязчивые стили осей/сетки (recessive), из CSS-переменных темы.

- [ ] **Step 1:** прогнать `node <dataviz>/scripts/validate_palette.js "<hex,...>" --mode light` и `--mode dark`; подобрать проходящий набор. Записать в `DEFAULT_SERIES` + коммент с результатом.
- [ ] **Step 2: Тест** — `DEFAULT_SERIES.length >= 6`, все `^#[0-9a-f]{6}$`; `useSeriesColors()(["water","roads"])` (с `stubMetaFetch`) → `{ water: "#2563eb", roads: "#475569" }` (из `META_FIXTURE`).
- [ ] **Step 3: Commit** `feat(web): chart theme + validated categorical palette`.

---

## Task 3: `LineChartFig` + `BarChartFig`

**Files:** Create `apps/web/src/components/charts/{LineChartFig,BarChartFig}.tsx`; Test `apps/web/tests/charts.test.tsx`.

**Interfaces:**
- Consumes: `recharts`, `chartTheme` (T2).
- Produces:
  - `LineChartFig`:
    ```ts
    interface LineSeries { key: string; label: string; color: string }
    interface Props {
      data: Record<string, number | string>[];   // строки с полем xKey + по полю на серию
      xKey: string;
      series: LineSeries[];
      band?: { lowerKey: string; upperKey: string; color: string }; // полоса прогноза (Area)
      height?: number;                            // дефолт 260
      yLabel?: string;
    }
    ```
    Один `YAxis`. `CartesianGrid` recessive. `Tooltip` (crosshair). `Legend` только при `series.length >= 2`. `band` рисуется как `Area` (полупрозрачный) под линиями. Линии 2px, точки скрыты (`dot={false}`), активная точка ≥8px.
  - `BarChartFig`:
    ```ts
    interface Props {
      data: { key: string; label: string; value: number; color?: string }[];
      height?: number; // дефолт 260
      horizontal?: boolean; // дефолт false
      onBarClick?: (key: string) => void;
    }
    ```
    Один бар-ряд. Скруглённые концы (`radius`). `Tooltip` per-mark. Клик по бару → `onBarClick(key)`. Цвет бара — `color` или первый из `DEFAULT_SERIES`.
- Обе обёртки в `ResponsiveContainer`. Пустой `data` → ничего не рисуют (родитель показывает `EmptyState` через `ChartCard`).

- [ ] **Step 1: Тест `charts.test.tsx`** — Recharts в jsdom рисует SVG. `render(<LineChartFig data=[{d:"2025-01",a:10},{d:"2025-02",a:20}] xKey="d" series=[{key:"a",label:"A",color:"#f00"}]/>)` → в DOM есть `<svg>` и хотя бы один `<path>` (класс `recharts-line`... или просто `container.querySelector("svg path")` не null). `BarChartFig` с 2 элементами + `onBarClick` → клик по `<rect class="recharts-rectangle">` (или по первому `path` бара) вызывает `onBarClick`. Примечание: Recharts требует ненулевой размер контейнера — обернуть в `<div style={{width:400,height:300}}>` и/или мокнуть `ResizeObserver` (уже в setup).
- [ ] **Step 2: падает → Step 3: реализация → Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(web): LineChartFig + BarChartFig (recharts wrappers)`.

---

## Task 4: `KpiRow`

**Files:** Create `apps/web/src/features/command-center/KpiRow.tsx`; Test `apps/web/tests/kpi-row.test.tsx`.

**Interfaces:**
- Consumes: `useKpi` (T1), `KpiCard`, `fmtInt`/`fmtPct`/`fmtDelta`/`fmtHours` (`@/lib/format`).
- Produces: `KpiRow` — сетка (`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3`) из 6 `KpiCard`:
  1. Всего за период — `fmtInt(total)`, `delta = deltaPct`
  2. Открыто сейчас — `fmtInt(openNow)`
  3. Доля просроченных — `fmtPct(overdueShare)`
  4. Ср. время закрытия — `fmtHours(avgCloseHours)`
  5. Повторные — `fmtPct(repeatShare)`
  6. Δ к прошлому периоду — `fmtDelta(deltaPct)`
  `isLoading` → все карточки в skeleton. Ошибка → строка «не удалось загрузить KPI».

- [ ] Тест: `stubMetaFetch` + мок `/api/kpi` → `{ total: 1234, prevTotal: 1000, deltaPct: 0.234, overdueShare: 0.12, avgCloseHours: 40, repeatShare: 0.08, openNow: 300 }`; в DOM: «1 234», «300», «12%», «+23%». Commit `feat(web): command-center KPI row`.

---

## Task 5: `OverviewTab`

**Files:** Create `apps/web/src/features/command-center/OverviewTab.tsx`; Test `apps/web/tests/overview-tab.test.tsx`.

**Interfaces:**
- Consumes: `useTimeseries`, `useBreakdown` (T1), `LineChartFig`/`BarChartFig` (T3), `ChartCard`, `RankedBarList`, `useSeriesColors` (T2), `useFilters` (для передачи в drill).
- Produces: `OverviewTab` — сетка карточек:
  - **Динамика** (`ChartCard` + `LineChartFig`): `useTimeseries(granularity)` с локальным `Select` гранулярности (день/неделя/месяц, нативный), две серии — `count` и `overdue`; `tableSlot` = `DataTable` из точек.
  - **Структура тем** (`ChartCard` + `BarChartFig` horizontal): `useBreakdown("theme")`, цвета из `useSeriesColors`, клик по бару → `setFilters({ theme: key })`.
  - **Обращения по регионам** (`ChartCard` + `RankedBarList`): `useBreakdown("region")`, клик → `setFilters({ region: key })`.
  - **Топ проблемных категорий** (`ChartCard` + `BarChartFig`): `useBreakdown("theme")` top-10 по `count`, показывает `deltaPct` бейджем в `tableSlot`.
  Каждая карточка: `isLoading`/`isError`(+retry через `refetch`)/`isEmpty` пробрасываются в `ChartCard`.

- [ ] Тест: моки `/api/timeseries` (2 точки) и `/api/breakdown` (3 строки для theme, 3 для region); рендер `OverviewTab` в `Providers`-обёртке; ждём появления `<svg>` в «Динамика» и текста метки региона из брейкдауна; клик по региону в `RankedBarList` → URL получает `?region=...`. Commit `feat(web): command-center Overview tab`.

---

## Task 6: `SpikesTab`

**Files:** Create `apps/web/src/features/command-center/SpikesTab.tsx`; Test `apps/web/tests/spikes-tab.test.tsx`.

**Interfaces:**
- Consumes: `useSpikes` (T1), `useMeta` (лейблы тем/регионов), `Badge`, `useFilters` (drill), `EmptyState`.
- Produces: `SpikesTab` — таблица/список: строка = регион · тема · день · `+NNN%` (из `ratio`) · бейдж `severity` (low/medium/high — цвета status, с иконкой) · мини-спарклайн (необяз.: `LineChartFig` height 40 без осей, если данных нет — пропустить). Клик по строке → `setFilters({ region, theme })` + переход на вкладку «Обзор» (через проп `onDrill(tab)` от родителя). Пусто → `EmptyState` «Всплесков не обнаружено».

- [ ] Тест: мок `/api/spikes` → `[{region:"akmola",theme:"water",day:"2025-03-10",ratio:4,baseline:5,current:20,zscore:5,severity:"high"}]`; рендер → видно «Водоснабжение», «+300%» либо «×4», бейдж «high»; клик по строке вызывает `onDrill`. Пустой ответ → «Всплесков не обнаружено». Commit `feat(web): command-center Spikes tab`.

---

## Task 7: `ForecastTab`

**Files:** Create `apps/web/src/features/command-center/ForecastTab.tsx`; Test `apps/web/tests/forecast-tab.test.tsx`.

**Interfaces:**
- Consumes: `useForecast` (T1), `useMeta` (списки регионов/тем), `LineChartFig` (с `band`), `ChartCard`, `DataTable`.
- Produces: `ForecastTab` — два нативных `<select>` (регион — активные из meta; тема — из meta) с локальным состоянием (дефолт: `filters.region ?? "akmola"`, `filters.theme ?? "water"`). `useForecast(region, theme)` → `LineChartFig`: серия `history.count` (сплошная) + серия `forecast.yhat` (пунктир/др. цвет) + `band {lowerKey:"yhatLower",upperKey:"yhatUpper"}`. Данные склеиваются в один массив по `month` (история и прогноз в общей оси X). Подпись метода (`response.method`) под графиком. `tableSlot` — помесячная таблица.

- [ ] Тест: мок `/api/forecast?region=akmola&theme=water` → `{region:"akmola",theme:"water",method:"seasonal-naive",history:[{month:"2024-12-01",count:10}],forecast:[{month:"2025-01-01",yhat:12,yhatLower:8,yhatUpper:16}]}`; рендер → `<svg>` есть, текст «seasonal-naive» виден; смена региона в select → новый запрос (мок отвечает по-другому, проверить обновление). Commit `feat(web): command-center Forecast tab`.

---

## Task 8: `NlQueryTab`

**Files:** Create `apps/web/src/features/command-center/NlQueryTab.tsx`; Test `apps/web/tests/nl-query-tab.test.tsx`.

**Interfaces:**
- Consumes: `useNlQuery` (T1, mutation), `LineChartFig`/`BarChartFig`, `ApiError`.
- Produces: `NlQueryTab` — `input` + кнопка «Спросить» + чипсы-примеры (5 строк из спеки §5: «Сколько обращений по дорогам в Шымкенте за последний месяц?» и т.п.; клик по чипсу подставляет текст и сразу шлёт). На `data`:
  - если `chart` → рисует `BarChartFig`/`LineChartFig` из `rows` (`x`/`y` из `chart`);
  - большое число (`value`) крупно, если не null;
  - `summary` строкой;
  - `<details>` «Показать SQL» → `<pre>{sql}</pre>`.
  На ошибке `422` (`ApiError.code === "unrecognized_query"`) → показать `error.message` + подсказку «Примеры запросов ниже». На прочих ошибках — общий текст.

- [ ] Тест: мок `POST /api/nl-query` → `{intent:"count_by_theme_region_period", sql:"SELECT ...", value:42, rows:[], chart:null, summary:"42 обращения"}`; ввод текста + клик «Спросить» → видно «42» и «42 обращения»; раскрытие `<details>` → виден `SELECT ...`. Отдельный тест: мок 422 → видно текст ошибки. Commit `feat(web): command-center NL-query tab`.

---

## Task 9: `ReportsTab`

**Files:** Create `apps/web/src/features/command-center/ReportsTab.tsx`; Test `apps/web/tests/reports-tab.test.tsx`.

**Interfaces:**
- Consumes: `downloadReport` (T1), `useFilters`.
- Produces: `ReportsTab` — нативный `<select>` вида отчёта (`overview`/`regions`/`themes`), две кнопки «Скачать XLSX» / «Скачать PDF». По клику — `downloadReport(view, format, filters)`; на время — спиннер на кнопке; ошибка → `toast` (`sonner`).

- [ ] Тест: замокать `apiPostBlob` (через мок `fetch` возвращающий `Blob` с корректным `content-type`); замокать `URL.createObjectURL`/`revokeObjectURL` и `HTMLAnchorElement.prototype.click`; клик «Скачать XLSX» → `createObjectURL` вызван, `a.click()` вызван, `a.download` оканчивается на `.xlsx`. Commit `feat(web): command-center Reports tab`.

---

## Task 10: `CommandCenterPage` + сборка

**Files:** Create `apps/web/src/features/command-center/CommandCenterPage.tsx`; Modify `apps/web/src/pages/CommandCenterPage.tsx` (ре-экспорт); Modify `locales/{ru,kk}.json` (строки вкладок/меток); Test `apps/web/tests/command-center-page.test.tsx`.

**Interfaces:**
- Produces: `CommandCenterPage` — `<KpiRow/>` сверху, ниже `Tabs` (shadcn) с 5 вкладками: `overview` (default) · `spikes` · `forecast` · `query` · `reports`. Активная вкладка — в URL (`?tab=`), чтобы drill из `SpikesTab` мог переключить (`setSearchParams`). `SpikesTab` получает `onDrill={() => setTab("overview")}`.
- `pages/CommandCenterPage.tsx` → `export { CommandCenterPage } from "@/features/command-center/CommandCenterPage";`

- [ ] **Step 1:** i18n-строки: `cc.tab.overview/spikes/forecast/query/reports`, `cc.kpi.*`, `cc.overview.*`, `cc.spikes.empty`, `cc.query.ask`, `cc.query.showSql`, `cc.reports.*`.
- [ ] **Step 2: Тест** — рендер `/command-center` через `Providers`+`makeRouter` c моками `fetch` на `/api/meta`, `/api/kpi`, `/api/timeseries`, `/api/breakdown` (минимальные валидные ответы); ждём KPI-число и наличие 5 табов (`role="tab"`); клик по вкладке «Всплески» (мок `/api/spikes` → `[]`) → видно «Всплесков не обнаружено».
- [ ] **Step 3:** `npm run check` → 0; `npm test -w @zerde/web` → зелено; `npm run build -w @zerde/web` → ок.
- [ ] **Step 4: Ручная проверка** — `npm run dev`, открыть `/command-center`: KPI реальные, графики рисуются, вкладки переключаются, NL-запрос из чипса возвращает ответ, отчёт скачивается.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): command-center page — KPI + Overview/Spikes/Forecast/Query/Reports tabs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Definition of Done

- [ ] `npm run check` (tsc ×4) — 0. `npm test` — все воркспейсы зелёные (`@zerde/web` +~9 файлов).
- [ ] `npm run build -w @zerde/web` — успешно.
- [ ] `/command-center` в `npm run dev`: KPI по ~990k обращений, графики динамики/тем/регионов, список всплесков, прогноз с полосой, NL-запрос отвечает, XLSX/PDF скачиваются.
- [ ] Каждая задача — отдельный коммит.

## Self-review (против спеки §6.3)

- §6.3 KPI-строка → T4. Обзор (динамика/темы/регионы/топ-категории) → T5. Всплески → T6. Прогноз → T7. Запрос (NL) → T8. Отчёты (PDF/Excel) → T9. Сборка табов + URL-таб → T10. ✓
- Скилл `dataviz`: палитра валидируется скриптом (T2), графики — одна ось, hover, легенда ≥2 серий, table-view через `ChartCard` (T3, T5). ✓
- Данные — только через хуки (T1), завязаны на глобальный `FilterBar`/`useFilters`. Drill из всплесков пишет фильтры и переключает вкладку. ✓
- Плейсхолдеры: задачи T4–T9 ужаты (сигнатура + тест-суть + перечень карточек), т.к. паттерн «хук + композиция готовых компонентов + RTL-тест» повторяется; T1–T3 и T10 — детальнее. Полный список файлов/интерфейсов задан.
