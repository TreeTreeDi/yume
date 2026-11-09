---
name: datasource-center-add-source-flow
description: Structure of the publicService 数据源中心 新建数据源 wizard (SelectSource → ProduceAuth → InfoConfig), its sessionStorage state and version-selection wiring; bug 161496 points to [[publicservice-datasource-version-select-default]].
metadata: apps/publicService/src/pages/dataSource; bug 161496, observed 2026-11-01
---

# 数据源中心 新建数据源 flow (apps/publicService)

Entry: `apps/publicService/src/pages/dataSource/addSource/index.tsx`, an antd `Steps` wizard with three steps whose labels come from `I18N.pages.dataSource.addSource.index.H/I/J`:

0. `components/selectSource.tsx` — `SelectSource`: left menu of classifications (`queryDsClassifyList`) + icon grid of data source types (`queryDsTypeByClassify({ classifyId, search })`). Icons are served from `apps/publicService/src/public/assets/imgs/dataSource/logo/<imgUrl>`. Picking a type calls `checkLicenseSku({ code: SKU_CHECK_CODE.DATASOURCE_TYPE_NUM, extraParams: { datasourceType } })` when `supportSku`, then `nextType(true)` **inside a `setTimeout`** (deliberate: the next step must not read sessionStorage before the write lands).
1. `components/produceAuth.tsx` — `ProduceAuth`: fetches versions with `API.queryDsVersionByType({ dataType })`, renders a version `Select` (`showSearch`, width 500) when `version.length > 0`, plus `AuthForm` (授权产品 / 项目 checkboxes).
2. `components/infoConfig/index.tsx` — `InfoConfig`: connection form; `authForm/` subdir holds `AuthForm` and `utils.ts`.

## sessionStorage state (apps/publicService/src/utils/handleSession.ts)

Keys: `current` (selected classification for menu echo), `sqlType` (JSON of the chosen type: `typeId`, `dataType`, `imgUrl`, `haveVersion`), `version` (chosen data version).

- `getSaveStatus()` → `{ menuSelected, sqlType, version }` (version defaults to `''`).
- `remove()` clears all three; `clearAuth()` / `saveCheckedStatus(checks)` / `saveCheckedProject(checkProjects)` hold授权 selections in module-level vars (`apps/publicService/src/pages/dataSource/components/infoConfig/authForm/utils.ts` exports `checks`, `checkProjects`, `clearAuth`, `verifyProject`, `ALL_PROJECT_VALUE = -1`).
- `selectSource.tsx` `onSelectType` writes `sqlType` and **removes `version`** whenever the data source type changes; it also calls `cleanInfoConfig()` when `item.dataType !== lastDataType`, wiping cached step-2 form values.
- `produceAuth.tsx` `onSelected(value)` writes `version`, clears InfoConfig cache, resets授权 (`saveCheckedStatus([])`, `saveCheckedProject({})`).

## Version selection

- `AuthForm` gets `dataVersionRequired={version.length > 0}`, `dataType`, `dataVersion={defaultSelect}`; it loads the product list when a required version is chosen, or when no version is required and `dataType` exists (also for `dataInfoId` / `isDataPreview`).
- Kafka version `0.9` is rendered `disabled` (`sqlType.dataType === 'Kafka' && item.dataVersion === '0.9'`).
- 「下一步」in `addSource/index.tsx` (step 1 → 2) currently only runs `verifyProject() && setCurrent(2)`. `verifyProject()` just checks each checked product has a project (or `ALL_PROJECT_VALUE`); with an empty授权 list it returns true, so it cannot block a missing version.

## Bug 161496 — do not default the version

Ticket, root cause and fix plan are kept in [[publicservice-datasource-version-select-default]]. Code-side facts worth knowing while editing:

- Root cause in `produceAuth.tsx` `queryDsVersionByType`: `const echoVersion = saveStatus.version || data[0].dataVersion;` then `sessionStorage.setItem('version', echoVersion); setDefaultSelect(echoVersion);` — the first API version is auto-selected and persisted, so "no selection" is unrepresentable.
- 「下一步」cannot catch a missing version today: it only runs `verifyProject()`, whose `checks.every(...)` is vacuously true when no授权 product is ticked (authorization list empty). Any required-field fix therefore also touches `addSource/index.tsx`. Confirmed again on 2026-11-02 in worktree `161496-r2` (session 01a199f0): line 95 still `verifyProject() && setCurrent(2)`, `ProduceAuth` still gets only `cleanInfoConfig`, and `produceAuth.tsx:43` still holds `saveStatus.version || data[0].dataVersion`. Re-verified 161496 code state is logged in [[bug-publicservice-datasource-version-161496]].
- `docs/agents/coding-standards.md` records 161496 twice as a counter-example (see [[dt-insight-frontend-conventions]]): a `message.error` guard instead of `Form.Item` rules, and a refactor of the `sqlType` sessionStorage shape / `haveVersion` derivation that Shane rejected (「为什么这么多，必选不就好了」). Keep the change to "version is a required field".

Related: [[dt-insight-project-workflow]], [[publicservice-datasource-version-select-default]] (bug-only zentao card, root cause and fix plan for 161496), [[dt-insight-frontend-conventions]], [[bug-publicservice-datasource-version-161496]], [[datasource-add-version-flow]]
