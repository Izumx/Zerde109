# Zerde 109 — План 6: Ассистент оператора (Модуль 2)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Наполнить `/operator`: список назначенных обращений + трёхколоночный рабочий экран `/operator/:id` (текущее обращение · похожие кейсы · черновик ответа + флаги дублей + панель действий). На эндпоинтах `@zerde/api` (`/appeals`, `/appeals/:id`, `/appeals/:id/similar`, `/appeals/:id/duplicates`, `/templates`, `/appeals/:id/route`).

**Architecture:** `apps/web/src/features/operator/`. Хуки в `features/operator/api.ts`. Композиция готовых компонентов. Действия оператора идут в `POST /appeals/:id/route` (пишет в `mutations`, меняет статус).

## Global Constraints

- `npm run check` (tsc ×4) — 0. `npm test` — все воркспейсы зелёные. `npm run build -w @zerde/web` — ок.
- Данные только через `features/operator/api.ts`.
- Новые i18n-строки — `locales/{ru,kk}.json`, ключ `operator.*`.
- Рабочий экран desktop-first (3 колонки ≥ lg, стек ниже).
- Коммит после каждой задачи; `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Что уже есть (Планы 1–5)

- **`@zerde/api`**: `GET /appeals` (пагинация/фильтры), `GET /appeals/:id` → `Appeal`, `GET /appeals/:id/similar` → `SimilarAppeal[]`, `GET /appeals/:id/duplicates` → `DuplicateInfo`, `GET /templates` (query `theme,service,lang`) → `Template[]`, `POST /appeals/:id/route` `{kind:"route"|"draft"|"mark_duplicate", payload}` → `{id:number}` (404 если обращения нет).
- **`apps/web`**: `features/intake/api.ts` (`useAppeal`, `useAppeals`), общие компоненты, `DataTable`, `Badge`, `Button`, `Tabs`, `Textarea`? (нет — используем нативный `<textarea>`), `useMeta`, `useFilters`, `lib/api.ts`, `lib/format.ts`. `pages/OperatorPage.tsx` — заглушка. Роутер: `/operator` есть, `/operator/:id` — **добавить** в `app/router.tsx`.
- Тест-инфра: `tests/_meta.ts`, `Providers`/`makeRouter`, jsdom-полифиллы.

## Целевая структура файлов

```
apps/web/src/features/operator/
  OperatorPage.tsx      список назначенных (DataTable) -> ссылка на /operator/:id
  WorkspacePage.tsx     /operator/:id — 3 колонки
  api.ts                useAssigned(), useSimilar(id), useDuplicates(id), useTemplates(theme,service),
                        useRoute(id) mutation
  CurrentAppealCol.tsx
  SimilarCol.tsx
  DraftCol.tsx          шаблоны + черновик + флаги дублей + панель действий
apps/web/src/pages/OperatorPage.tsx  → ре-экспорт features/operator/OperatorPage
apps/web/src/app/router.tsx          + route { path: "/operator/:id", element: <WorkspacePage/> }
```

---

## Task 1: Хуки `features/operator/api.ts`

**Files:** Create `apps/web/src/features/operator/api.ts`; Test `apps/web/tests/operator-api.test.ts`.

**Interfaces:**
- Consumes: `apiGet`/`apiPost` (`@/lib/api`), `useFilters`, `useAppeals` (переиспользовать из `features/intake/api`), типы `@zerde/types`.
- Produces:
  - `useAssigned()` → `UseQueryResult<Paginated<AppealListItem>>` — обёртка над `useAppeals` с фиксированными `status`-фильтрами (`new`/`routed`/`in_progress` — открытые), глобальными `region`/`theme` из `useFilters`, `pageSize: 25`, `sort: "created_desc"`. (Реального «назначения» нет — берём открытые по региону.)
  - `useSimilar(id: string | undefined)` → `UseQueryResult<SimilarAppeal[]>` (`enabled: !!id`).
  - `useDuplicates(id: string | undefined)` → `UseQueryResult<DuplicateInfo>` (`enabled: !!id`).
  - `useTemplates(theme: ThemeCode | undefined, service?: string)` → `UseQueryResult<Template[]>` (`enabled: !!theme`).
  - `useRoute(id: string)` → `UseMutationResult<{id:number}, ApiError, { kind: "route" | "draft" | "mark_duplicate"; payload: Record<string, unknown> }>` — `apiPost("/appeals/"+id+"/route", vars)`; при успехе `queryClient.invalidateQueries({ queryKey: ["intake","appeal", id] })`.

- [ ] Тест: `useSimilar(undefined)` — `fetchStatus === "idle"`. `useSimilar("akmola:1")` с моком `[{id:"x",similarity:0.8,...}]` → `data.length === 1`. Commit `feat(web): operator data hooks`.

---

## Task 2: `OperatorPage` (список назначенных) + маршрут `/operator/:id`

**Files:** Create `apps/web/src/features/operator/OperatorPage.tsx`; Modify `apps/web/src/pages/OperatorPage.tsx` (ре-экспорт), `apps/web/src/app/router.tsx` (+ route); Test `apps/web/tests/operator-page.test.tsx`.

**Interfaces:**
- Produces: `OperatorPage` — `DataTable` из `useAssigned()`: № · дата · регион · превью · тема · приоритет · статус; `onRowClick` → `navigate('/operator/'+row.id)`. Заголовок + подсказка «открытые обращения по выбранному региону». Пусто → `EmptyState`.
- `router.tsx`: добавить `{ path: "/operator/:id", element: <WorkspacePage/> }` (импорт `WorkspacePage` из `@/features/operator/WorkspacePage`).
- `pages/OperatorPage.tsx` → `export { OperatorPage } from "@/features/operator/OperatorPage";`

- [ ] Тест: `/operator` через `Providers`+`makeRouter` c `stubMetaFetch` + мок `/api/appeals` (1 элемент); видно превью; клик → `location.pathname === "/operator/<id>"`. Обновить `tests/pages.test.tsx` (заглушек не осталось — тест перевести на проверку `NotFoundPage` или удалить; проще: заменить на smoke `/appeals/:id` уже покрыт — удалить `pages.test.tsx`). Обновить `tests/shell.test.tsx` при необходимости. Commit `feat(web): operator assigned list + /operator/:id route`.

---

## Task 3: `CurrentAppealCol`

**Files:** Create `apps/web/src/features/operator/CurrentAppealCol.tsx`; Test `apps/web/tests/current-appeal-col.test.tsx`.

**Interfaces:**
- Consumes: `useAppeal` (из `features/intake/api`), `useMeta`, `Badge`, `fmtDate`, `LoadingSkeleton`.
- Produces: `CurrentAppealCol({ id })` — карточка: `sourceId`, бейджи темы/статуса/приоритета/просрочки, полный блок мета (регион/район/адрес/канал/тип/создано/срок), `rawCategory`/`subcategory`, и — если `address` есть — строка «История по адресу» (пока заглушка-подсказка: «повторные см. в колонке справа»). `isLoading` → skeleton; `isError` → «обращение не найдено».

- [ ] Тест: мок `/api/appeals/:id` → `Appeal`; рендер `<CurrentAppealCol id="akmola:1"/>` в Providers-обёртке; видно `sourceId` и адрес. Commit `feat(web): operator — current appeal column`.

---

## Task 4: `SimilarCol`

**Files:** Create `apps/web/src/features/operator/SimilarCol.tsx`; Test `apps/web/tests/similar-col.test.tsx`.

**Interfaces:**
- Consumes: `useSimilar` (T1), `useMeta`, `Badge`, `fmtInt`, `EmptyState`, `LoadingSkeleton`.
- Produces: `SimilarCol({ id, onUseResolution })` — список `SimilarAppeal`: превью · тема (лейбл) · `serviceOrg` · `daysToClose` («N дн») · `resolution` (обрезка) · `similarity` (`%`). Чекбокс/тумблер «только решённые» (клиентский фильтр `resolution != null`). Кнопка на карточке «Взять решение» → `onUseResolution(resolution)`. Пусто → `EmptyState`.

- [ ] Тест: мок `/api/appeals/:id/similar` → `[{id:"x",createdAt:"...",region:"akmola",theme:"water",preview:"нет воды",serviceOrg:"Су Арнасы",resolution:"устранено",daysToClose:2,similarity:0.83}]`; видно «нет воды», «83%», «устранено»; клик «Взять решение» → `onUseResolution("устранено")`. Commit `feat(web): operator — similar cases column`.

---

## Task 5: `DraftCol`

**Files:** Create `apps/web/src/features/operator/DraftCol.tsx`; Test `apps/web/tests/draft-col.test.tsx`.

**Interfaces:**
- Consumes: `useTemplates` (T1), `useDuplicates` (T1), `useRoute` (T1), `useMeta` (службы), `Badge`, `Button`, `toast` (sonner).
- Produces: `DraftCol({ appeal })` (получает уже загруженный `Appeal`):
  - **Флаги**: из `useDuplicates(appeal.id)` — если `nearDuplicates.length` → `Badge` «Дубликат?» + счётчик; если `repeats.length` → `Badge` «Повторное» + счётчик. Ссылки-заглушки (просто текст id).
  - **Типовое решение**: `useTemplates(appeal.theme)` — `<select>` шаблонов; выбор подставляет `body` в черновик (плейсхолдеры `{address}`/`{service}` заменяются из `appeal.address` / лейбла службы).
  - **Черновик**: `<textarea>` (managed), кнопка «Копировать» (`navigator.clipboard.writeText`).
  - **Панель действий**: `<select>` службы (из meta.services) + кнопка «Маршрутизировать» → `useRoute(appeal.id).mutate({ kind:"route", payload:{ status:"routed", service: <code> } })`; кнопка «Сохранить черновик» → `mutate({ kind:"draft", payload:{ text } })`; кнопка «Отметить дубликатом» → `mutate({ kind:"mark_duplicate", payload:{} })`. На успех — `toast.success`; на ошибку — `toast.error`.
  - Внешний проп `initialDraft?: string` — заполняется из `SimilarCol`'s `onUseResolution` (родитель поднимает состояние).

- [ ] Тест: моки `/api/templates` (`[{id:1,themeCode:"water",serviceCode:"vodokanal",lang:"ru",title:"Вода",body:"Заявка по адресу {address} направлена."}]`), `/api/appeals/:id/duplicates` (`{nearDuplicates:[],repeats:[{id:"y",...}]}`), `POST /api/appeals/:id/route` (`{id:7}`). Рендер `<DraftCol appeal={mockAppeal}/>`; видно бейдж «Повторное»; выбор шаблона → в `<textarea>` появляется «Заявка по адресу ... направлена.»; клик «Маршрутизировать» → `fetch` вызван с `POST .../route` и телом содержащим `"kind":"route"`. Commit `feat(web): operator — draft column (templates/flags/actions)`.

---

## Task 6: `WorkspacePage` (3 колонки) + сборка

**Files:** Create `apps/web/src/features/operator/WorkspacePage.tsx`; Modify `locales/{ru,kk}.json` (`operator.*`); Test `apps/web/tests/workspace-page.test.tsx`.

**Interfaces:**
- Produces: `WorkspacePage` — `useParams().id`; загружает `useAppeal(id)` (для передачи в `DraftCol`); layout `grid lg:grid-cols-3 gap-4`: `CurrentAppealCol` · `SimilarCol` · `DraftCol`. Поднятое состояние `draft` (строка): `SimilarCol onUseResolution={(r)=>setDraft(r)}`, `DraftCol initialDraft={draft}`. Ссылка «← к списку» → `/operator`. Если `useAppeal` 404 → «обращение не найдено».
- i18n `operator.list.*`, `operator.ws.*` (колонки, действия, флаги).

- [ ] **Step 1:** i18n-строки в обе локали.
- [ ] **Step 2: Тест** — `/operator/akmola:1` через `Providers`+`makeRouter` со всеми моками (`/api/appeals/:id`, `/similar` → `[]`, `/duplicates` → `{nearDuplicates:[],repeats:[]}`, `/templates` → `[]`); видно `sourceId` в левой колонке и `<textarea>` черновика.
- [ ] **Step 3:** `npm run check` → 0; `npm test` → зелено; `npm run build -w @zerde/web` → ок.
- [ ] **Step 4: Ручная проверка** `npm run dev` → `/operator`: список открытых обращений; открыть карточку → 3 колонки, похожие кейсы грузятся, шаблон подставляется, «Маршрутизировать» меняет статус (проверить в `/appeals/:id`).
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): operator workspace — 3-column assistant screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Definition of Done

- [ ] `npm run check` (tsc ×4) — 0. `npm test` — все зелёные (`@zerde/web` +~6 файлов).
- [ ] `npm run build -w @zerde/web` — успешно.
- [ ] `/operator`: список открытых обращений по региону; `/operator/:id`: 3 колонки, похожие кейсы (`pg_trgm`), шаблоны RU/KK, черновик, флаги дублей, «Маршрутизировать»/«Сохранить черновик»/«Отметить дубликатом» пишут в `mutations` и меняют статус.
- [ ] Каждая задача — отдельный коммит.

## Self-review (против спеки §6.5)

- §6.5 список назначенных → T2. Рабочий экран 3 колонки → T6. Текущее обращение → T3. Похожие кейсы + решения → T4. Черновик + шаблоны + дубли/повторные + панель действий (маршрутизация/черновик/дубликат → `mutations`) → T5. ✓
- Данные только через хуки (T1). `pg_trgm`-поиск похожих — на бэке (План 2), фронт только показывает. ✓
- Плейсхолдеры: T3–T5 ужаты (сигнатуры + тест-суть + перечень полей); T1, T2, T6 — детальнее.
