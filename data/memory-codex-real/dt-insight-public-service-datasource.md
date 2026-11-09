---
name: dt-insight-public-service-datasource
description: Structure of the dt-insight data source center (公共数据源 / 数据源中心) wizard under apps/publicService, including the 161496 "no default version" bug root cause, fix shape, sessionStorage keys and APIs. Read before touching data source add/edit flows.
metadata: verified 2026-11-01 against worktree /Users/mac/.factory/ws/161496-r3 on branch publicService/hotfix_6.3.x_161496
---

# 数据源中心 (publicService) — 新建数据源流程

The line-level code map of this wizard (InfoConfig internals, AuthForm gating, session cache helpers) is written up in [[dt-insight-data-source-version-flow]]; this file adds the 161496 card fields, the exact fix plan proposed in the `-r3` session, and the path pitfalls.

**The data source center wizard lives in `apps/publicService`, not `apps/console`.** Greps scoped to `apps/console/src/pages/dataSource*` fail (zsh: `no matches found`). `apps/publicService/src/pages/dataSource/index.tsx` and `components/index.tsx` do not exist — the entry is `addSource/index.tsx`. Console does own the data-source **list** page under a different root (`apps/console/src/views/dataSource/`), see [[dt-insight-console-datasource-list]]. See [[dt-insight-workflow]] for branch/gate conventions.

## Wizard (`apps/publicService/src/pages/dataSource/addSource/index.tsx`)

antd `Steps` with three stages held in local `current` state, rendered by `switchContent(step)`:

| step | component | notes |
|------|-----------|-------|
| 0 | `components/selectSource.tsx` | data source type grid; `nextType` → `setCurrent(1)` |
| 1 | `components/produceAuth.tsx` | version `Select` + `AuthForm` (product/project 授权); 下一步 = `verifyProject() && setCurrent(2)` |
| 2 | `components/infoConfig/index.tsx` | connection form; test connectivity via `childRef.current.testForm()`, submit via `submitForm()` |

`addSource` also holds `infoConfig` temp form values (passed to `InfoConfig` as `tempFormValues`) and `clearAuth()` on mount.

## State plumbing: sessionStorage + module-level caches

`apps/publicService/src/utils/handleSession.ts`:

- `getSaveStatus()` → `{ menuSelected, sqlType, version }`, reading sessionStorage keys `current`, `sqlType` (JSON of the selected data-source type item), `version`.
- `remove()` clears `current`, `sqlType`, `version`; `clearAuth()` resets module-level `checks` / `checkProjects`.
- `saveCheckedStatus` / `saveCheckedProject` mutate exported `checks` / `checkProjects`.

`selectSource.tsx` on picking a type: if `dataType` changed → `cleanInfoConfig()`; `setTimeout(() => nextType(true))` (deliberate delay so the type is in sessionStorage before step 1 renders); `sessionStorage.setItem('sqlType', JSON.stringify(item))`; `sessionStorage.removeItem('version')`.

## Version selection (`components/produceAuth.tsx`)

- `queryDsVersionByType({ dataType })` fills `version` from `saveStatus.sqlType?.dataType`; the `version` array items are `{ dataVersion }`.
- `onSelected(value)` → `cleanInfoConfig()`, `setDefaultSelect(value)`, `sessionStorage.setItem('version', value)`, `saveCheckedStatus([])`, `saveCheckedProject({})`.
- Passes `dataVersionRequired={version.length > 0}` and `dataVersion={defaultSelect}` to `AuthForm` (`components/infoConfig/authForm/index.tsx`), where `isVersionRequired = dataVersionRequired && dataType && dataVersion` decides whether the授权 product list is fetched.
- Kafka + `dataVersion === '0.9'` option is `disabled` (deprecated ZooKeeper version). `infoConfig` and the `dsForm/*` children branch on `dataType`/`dataVersion` pairs (`Kafka 2.x` no batch address, `Elasticsearch 7.x` SSL, `Kafka CKafka 1.x/2.x/3.x` auth options, `toLower(dataVersion).includes('huawei')` for load tooltip).
- `infoConfig` reads the version from `saveStatus.version` or `record?.dataVersion` for `findTemplateByTypeVersion`.

## Bug 161496 — 「数据源选择版本时，去掉默认版本的选择」

ZenTao fields (`zentao bug 161496 --json`, product 48): openedBy `zhizhang` 2026-10-30 14:59:37, build `trunk`, assignedTo `wangzai`, status `resolved`, resolution `Fixed`, resolvedBy `huaiju` resolvedDate 2026-10-30 17:59:12, resolvedBuild `1696`, testtask `2228`, severity/pri 3, type 产品BUG.

**Root cause:** in `produceAuth.tsx`, `const echoVersion = saveStatus.version || data[0].dataVersion;` followed by `sessionStorage.setItem('version', echoVersion)` + `setDefaultSelect(echoVersion)` — the first version is auto-selected and persisted, so a user can advance without ever choosing.

**Fix plan produced in that session** (no files were modified; the turn was方案-only):
1. `produceAuth.tsx` — drop the `data[0].dataVersion` fallback and the automatic cache write on load; echo only a previously user-chosen version, otherwise show the placeholder; wrap the version `Select` in a `Form.Item` with a required `rules` entry so the error renders under the field; keep `onSelected` caching, the授权 refresh, and the Kafka `0.9` disable.
2. `addSource/index.tsx` — create a form instance, pass it to `ProduceAuth`, run `form.validateFields()` before `verifyProject()`/step change; don't mount the required version item when the version list is empty (data sources without versions must still advance).

**Known final shape (recorded in the project's own `docs/agents/coding-standards.md`):** the accepted 终版 was only "make version a required field" — Shane's review comment on the earlier attempts was 「为什么这么多，必选不就好了」, after a first pass that rewrote the sessionStorage `sqlType` structure and added a `haveVersion` derivation plus a `ref`, and a first validation pass that used `if (!version) { message.error(...); return; }` in 下一步 instead of `Form.Item` rules. So: do **not** restructure sessionStorage or add derivations — see [[dt-insight-coding-standards]] ("收敛优先于完备", form-field validation).
