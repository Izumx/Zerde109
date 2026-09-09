# Zerde 109 — План 5: Смарт-приём и маршрутизация (Модуль 1)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans / subagent-driven-development. Steps use `- [ ]`.

**Goal:** Наполнить `/intake`: очередь обращений (серверная `DataTable` с фильтрами/поиском/пагинацией), панель демо-классификации (`POST /classify`), вкладка «Качество модели» (`GET /model-eval`).

**Architecture:** `apps/web/src/features/intake/`. Данные — хуки TanStack Query в `features/intake/api.ts`. Композиция готовых компонентов (`DataTable`, `ChartCard`, `Badge`, `Tabs`). Фильтры очереди = глобальный `useFilters` + локальные (статус/приоритет/поиск).

## Global Constraints

- `npm run check` (tsc ×4) — 0. `npm test` — все воркспейсы зелёные.
- Данные только через `features/intake/api.ts` (тонкие обёртки над `apiGet`/`apiPost`).
- Пагинация/сортировка — серверные (`DataTable` прокидывает наружу; `page`/`pageSize`/`sort` в состоянии страницы, необязательно в URL).
- Новые i18n-строки — `locales/{ru,kk}.json` под ключом `intake.*`.
- Коммит после каждой задачи; в конце сообщения `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Что уже есть (Планы 1–4)

- **`@zerde/api`**: `GET /appeals` (query: `region,theme,from,to,status,priority,search,sort,page,pageSize` → `Paginated<AppealListItem>`), `GET /appeals/:id` → `Appeal` (404 envelope), `POST /classify` `{text, language?}` → `ClassifyResult`, `GET /model-eval` → `ModelEval` (или 404 `not_found` до `npm run eval`).
- **`apps/web`**: `DataTable` (серверная модель), `ChartCard`, `KpiCard`, `Badge`, `EmptyState`, `LoadingSkeleton`, `Tabs`, `useMeta`, `useFilters`, `lib/api.ts`, `lib/format.ts`. Оболочка с `FilterBar`. Тест-инфра: `tests/_meta.ts` (`stubMetaFetch`, `META_FIXTURE`), `Providers`/`makeRouter`, jsdom-полифиллы (Radix, ResizeObserver, getBoundingClientRect).
- `pages/IntakePage.tsx` — заглушка (её заменяем ре-экспортом).

## Целевая структура файлов

```
apps/web/src/features/intake/
  IntakePage.tsx        Tabs: Очередь · Демо-классификация · Качество модели
  api.ts                useAppeals(params), useAppeal(id), useClassify() mutation, useModelEval()
  QueueTab.tsx          DataTable + локальные фильтры (статус/приоритет/поиск/«низкая уверенность»)
  ClassifyPanel.tsx     textarea (KK/RU) -> карточка результата + сущности + JSON
  ModelQualityTab.tsx   overall accuracy/macroF1 + per-theme таблица + матрица (тепловая)
  AppealDetailPage.tsx  карточка обращения (используется на /appeals/:id)
apps/web/src/pages/IntakePage.tsx        → ре-экспорт features/intake/IntakePage
apps/web/src/pages/AppealDetailPage.tsx  → ре-экспорт features/intake/AppealDetailPage
```

---

## Task 1: Хуки `features/intake/api.ts`

**Files:** Create `apps/web/src/features/intake/api.ts`; Test `apps/web/tests/intake-api.test.ts`.

**Interfaces:**
- Produces:
  - `type QueueParams = RangeFilter & { status?: AppealStatus; priority?: Priority; search?: string; sort: "created_desc" | "created_asc"; page: number; pageSize: number }`
  - `useAppeals(p: QueueParams)` → `UseQueryResult<Paginated<AppealListItem>>` (`queryKey: ["intake","appeals",p]`, `placeholderData: keepPreviousData` для плавной пагинации).
  - `useAppeal(id: string | undefined)` → `UseQueryResult<Appeal>` (`enabled: Boolean(id)`).
  - `useClassify()` → `UseMutationResult<ClassifyResult, ApiError, { text: string; language?: "kk" | "ru" }>` (`mutationFn` → `apiPost("/classify", vars)`).
  - `useModelEval()` → `UseQueryResult<ModelEval>` (`retry: false` — 404 до `eval` это норм, отдаём в `isError`/`error.code`).

- [ ] **Step 1: Тест** — `renderHook(useAppeals(...))` с моком `/api/appeals` → `{ items:[{id:"a"}], page:1, pageSize:50, total:1 }`; `data.total === 1`. `useModelEval` с моком 404 → `isError` и `(error as ApiError).code === "not_found"`.
- [ ] **Step 2: падает → Step 3: реализация → Step 4: PASS. Step 5: Commit** `feat(web): intake data hooks`.

---

## Task 2: `QueueTab`

**Files:** Create `apps/web/src/features/intake/QueueTab.tsx`; Test `apps/web/tests/queue-tab.test.tsx`.

**Interfaces:**
- Consumes: `useAppeals` (T1), `DataTable`, `Badge`, `useFilters`, `useMeta` (лейблы тем/статусов), `useNavigate` (`react-router-dom`), `fmtDate`.
- Produces: `QueueTab` — над таблицей строка локальных контролов (нативные `<select>` статус/приоритет + `<input>` поиск с дебаунсом 300мс + чекбокс «только низкая уверенность» — фильтрует клиентски по `confidence < 0.6`, если поле есть; иначе контрол скрыт). Состояние `page`/`sort` — локальный `useState` (сброс `page` на 1 при смене любого фильтра). `DataTable` колонки: № (`sourceId`), дата (`fmtDate(createdAt)`), регион (лейбл), превью (`preview`), тема (лейбл + бейдж-цвет из meta), приоритет (`Badge` low/med/high), статус (лейбл). `onRowClick` → `navigate('/appeals/' + row.id)`. `onSortChange`/`onPageChange` → локальный стейт → перезапрос. `total`/`page`/`pageSize` в `DataTable`.

- [ ] Тест: мок `/api/meta` + `/api/appeals` (2 элемента, `total:2`); рендер в `Providers`-обёртке; видно превью обеих строк; выбор статуса «Выполнено» в `<select>` → новый запрос содержит `status=done` (проверить по `fetch` mock calls); клик по строке → `navigate` на `/appeals/<id>` (проверить через `LocationProbe`). Commit `feat(web): intake Queue tab`.

---

## Task 3: `ClassifyPanel`

**Files:** Create `apps/web/src/features/intake/ClassifyPanel.tsx`; Test `apps/web/tests/classify-panel.test.tsx`.

**Interfaces:**
- Consumes: `useClassify` (T1), `useMeta` (лейбл службы/темы), `Badge`, `Button`.
- Produces: `ClassifyPanel` — `textarea` + кнопка «Классифицировать» (+ «Загрузить пример» → подставляет случайную строку из зашитого списка 4–5 примеров KK/RU). На `data`:
  - карточка: **тема** (лейбл + бейдж-цвет), **служба** (лейбл из meta.services), **приоритет** (Badge), **язык** (`kk`/`ru`), **уверенность** (`fmtPct(confidence)` + полоска прогресса).
  - **сущности**: адрес / объект / проблема (три строки, «—» если null).
  - мини-схема маршрута: `обращение → <служба>` (просто текст со стрелкой).
  - `<details>` «JSON» → `<pre>{JSON.stringify(data, null, 2)}</pre>`.
  Ошибка → текст `common.error`.

- [ ] Тест: мок `POST /api/classify` → `{ theme:"heating", service:"teploseti", priority:"high", language:"ru", confidence:0.92, entities:{address:"ул. Абая 5", object:"батарея", problem:"нет тепла"} }`; ввод текста + клик → видно лейбл темы «Отопление», «92%», «ул. Абая 5», раскрытие JSON показывает `"theme": "heating"`. Commit `feat(web): intake Classify panel`.

---

## Task 4: `ModelQualityTab`

**Files:** Create `apps/web/src/features/intake/ModelQualityTab.tsx`; Test `apps/web/tests/model-quality-tab.test.tsx`.

**Interfaces:**
- Consumes: `useModelEval` (T1), `useMeta` (лейблы тем), `KpiCard`, `DataTable`, `EmptyState`, `fmtPct`.
- Produces: `ModelQualityTab`:
  - если `isError && code==="not_found"` → `EmptyState` «Метрики не рассчитаны — выполните `npm run eval`».
  - иначе: две `KpiCard` (Accuracy, Macro-F1 — `fmtPct`), подпись `method` и `nHoldout`.
  - `DataTable` по `perTheme`: тема (лейбл) · precision · recall · f1 · support (`fmtPct` для трёх, `fmtInt` для support), сортировка по f1.
  - тепловая матрица ошибок из `confusion`: таблица тема×тема, ячейка = `n`, фон — интенсивность по max (`background: rgba(theme-accent, n/max)`); диагональ выделена. Небольшой размер (топ-8 тем по support).

- [ ] Тест: мок `/api/model-eval` → `{ method:"keyword-baseline", computedAt:"2025-01-01T00:00:00Z", nHoldout:1000, accuracy:0.9, macroF1:0.88, perTheme:[{theme:"water",precision:0.95,recall:0.9,f1:0.92,support:200}], confusion:[{actual:"water",predicted:"water",n:180},{actual:"water",predicted:"sewer",n:20}] }`; видно «90%», «88%», строку «Водоснабжение» с «92%». Отдельный тест: мок 404 → видно «npm run eval». Commit `feat(web): intake Model-quality tab`.

---

## Task 5: `AppealDetailPage`

**Files:** Create `apps/web/src/features/intake/AppealDetailPage.tsx`; Modify `apps/web/src/pages/AppealDetailPage.tsx` (ре-экспорт); Test `apps/web/tests/appeal-detail.test.tsx`.

**Interfaces:**
- Consumes: `useAppeal` (T1), `useParams`, `useMeta`, `Badge`, `Link` (назад), `fmtDate`, `LoadingSkeleton`.
- Produces: `AppealDetailPage` — по `:id`: если `isLoading` → skeleton; `isError` (404) → «Обращение не найдено» + ссылка назад; иначе карточка: заголовок `sourceId`, бейджи темы/статуса/приоритета, блок мета (регион/район/адрес/канал/тип/дата создания/закрытия/срок/просрочка), `rawCategory`/`subcategory`/`serviceOrg`/`resolution` строками. Ссылка «← к очереди» → `/intake`.

- [ ] Тест: мок `/api/appeals/akmola:1` → полноценный `Appeal`; рендер по маршруту `/appeals/akmola:1` (через `makeRouter`) → виден `sourceId`, лейбл темы, адрес. Мок 404 → «Обращение не найдено». Commit `feat(web): appeal detail page`.

---

## Task 6: `IntakePage` + сборка

**Files:** Create `apps/web/src/features/intake/IntakePage.tsx`; Modify `apps/web/src/pages/IntakePage.tsx` (ре-экспорт); Modify `locales/{ru,kk}.json` (`intake.*`); Test `apps/web/tests/intake-page.test.tsx`.

**Interfaces:**
- Produces: `IntakePage` — `Tabs`: `queue` (default) · `classify` · `quality`, активный таб в `?tab=`. `QueueTab` / `ClassifyPanel` / `ModelQualityTab` в контенте.
- `pages/IntakePage.tsx` → `export { IntakePage } from "@/features/intake/IntakePage";`
- `pages/AppealDetailPage.tsx` → `export { AppealDetailPage } from "@/features/intake/AppealDetailPage";`
- i18n `intake.tab.queue/classify/quality`, `intake.queue.*`, `intake.classify.*`, `intake.quality.*`.

- [ ] **Step 1:** i18n-строки в обе локали.
- [ ] **Step 2: Тест** — `/intake` через `Providers`+`makeRouter` c `stubMetaFetch` + мок `/api/appeals` (`{items:[],page:1,pageSize:50,total:0}`); видно 3 таба; переключение на «Демо-классификация» → есть `textarea`.
- [ ] **Step 3:** обновить `tests/pages.test.tsx` — цель заглушки перевести с `IntakePage` на `OperatorPage` (единственная оставшаяся заглушка). Обновить `tests/shell.test.tsx` если ломается на `/intake`.
- [ ] **Step 4:** `npm run check` → 0; `npm test` → зелено; `npm run build -w @zerde/web` → ок.
- [ ] **Step 5: Ручная проверка** `npm run dev` → `/intake`: очередь грузит реальные обращения, пагинация/фильтры работают, классификация возвращает результат, вкладка качества (404 или метрики).
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): intake page — queue + classify + model-quality tabs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Definition of Done

- [ ] `npm run check` (tsc ×4) — 0. `npm test` — все зелёные (`@zerde/web` +~6 файлов).
- [ ] `npm run build -w @zerde/web` — успешно.
- [ ] `/intake`: очередь с серверной пагинацией/фильтрами/поиском по ~990k обращений; `/appeals/:id` открывается; демо-классификация возвращает тему/службу/приоритет/сущности; вкладка качества показывает метрики или подсказку про `npm run eval`.
- [ ] Каждая задача — отдельный коммит.

## Self-review (против спеки §6.4)

- §6.4 Очередь (DataTable, фильтры, серверная пагинация, клик → карточка) → T2 + T5. Демо-классификации (textarea KK/RU, карточка результата, сущности, JSON) → T3. Качество модели (accuracy + per-category + матрица) → T4. Сборка табов + URL → T6. ✓
- Данные только через хуки (T1); очередь завязана на глобальный `FilterBar` + локальные фильтры. ✓
- `/appeals/:id` (общая карточка, §6.2) → T5. ✓
- Плейсхолдеры: T2–T5 ужаты (сигнатуры + тест-суть + перечень полей/колонок), паттерн «хук + композиция + RTL» повторяется; T1 и T6 — детальнее.
