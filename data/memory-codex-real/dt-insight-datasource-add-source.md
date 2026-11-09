---
name: dt-insight-datasource-add-source
description: Where the dt-insight 数据源中心 (data source center) wizard lives, its components/sessionStorage state, the version-select default bug (ZenTao 161496) and the accepted fix direction.
metadata: code read at branch publicService/hotfix_6.3.x_161496, 2026-11-01
---

# 数据源中心：新建数据源向导

The **add/edit wizard** of the data source center lives in **`apps/publicService/src/pages/dataSource/`**. Do not conclude from that that the feature is publicService-only: `apps/console` has data source pages too, under `apps/console/src/views/dataSource/` (`list/`, `editSource/`, `addSource/`, `alarm/`, `dataPreview/`, `components/connector/`, `components/infoConfig/`) — the console list page's 连接信息 column is `list/components/extTableCell.tsx` (story 16537; see [[dt-insight-console-datasource-list-connection-info]]). Scope greps by app+feature (`apps/console/src/views/dataSource`, `apps/publicService/src/pages/dataSource`), not "console has no dataSource". Logo assets also exist in `packages/dt-common/src/public/img/menu-icon/dataSource.svg` and `apps/publicService/src/public/assets/imgs/dataSource/logo/*.png` (console has its own copies under `apps/console/src/public/assets/imgs/dataSource/`).

## Wizard structure (`addSource/index.tsx`)

Three antd `Steps` (`current` 0/1/2 = 选择数据源 / 版本+授权 / 信息配置):

- step 0 → `<SelectSource nextType supportSku={props.sku?.supportSku} cleanInfoConfig />`; its 取消 button routes to `/public/data-source/list`.
- step 1 → `<ProduceAuth cleanInfoConfig />`; 返回 (key 3) → `setCurrent(0)` + `clearAuth()`; 下一步 → `verifyProject() && setCurrent(2)`.
- step 2 → `<InfoConfig cRef tempFormValues changeBtnStatus />`; 测试连通性 → `childRef.current.testForm()`; 返回 → `syncInfoConfigForm()` then `setCurrent(1)`; 确定 → `submitForm()` and disable the button while submitting.
- `verifyProject` comes from `components/infoConfig/authForm/utils` — note `authForm` is a **directory** (`index.tsx`, `utils.ts`, `style.scss`), so `cat .../authForm.tsx` fails.

## Shared session state (`apps/publicService/src/utils/handleSession.ts`)

- `sessionStorage.current` — selected classify (left menu) id, for echo.
- `sessionStorage.sqlType` — JSON of the picked data source type item (`dataType`, `typeId`, `haveVersion`, `imgUrl`, `selected`).
- `sessionStorage.version` — picked `dataVersion` string.
- `getSaveStatus()` → `{ menuSelected, sqlType, version }` (sqlType parse guarded, version defaults `''`); `remove()` clears current/sqlType/version; `clearAuth()` drops the in-memory `checks` / `checkProjects` auth caches (`saveCheckedStatus`, `saveCheckedProject`).

## `components/selectSource.tsx`

- Left antd `Menu` from `API.queryDsClassifyList()`; right icon grid from `API.queryDsTypeByClassify({ classifyId, search })`; icons resolved as `'assets/imgs/dataSource/logo/' + imgUrl`; selected tile gets class `selected`; tiles scale via a debounced `computeScaleRatio` (216×108 base, 16px gap).
- Selecting a type: clears the config form when `dataType` differs from the saved one (`cleanInfoConfig()`), writes `sessionStorage.sqlType`, removes `sessionStorage.version`, then `setTimeout(() => nextType(true))` — the delay exists because step 2 reads sessionStorage immediately.
- SKU gate: `checkLicenseSku({ code: SKU_CHECK_CODE.DATASOURCE_TYPE_NUM, extraParams: { datasourceType: item.dataType } })` before entering; skipped when `supportSku` is false.

## `components/produceAuth.tsx` (version + authorization)

- Fetches versions with `API.queryDsVersionByType({ dataType })`; state `version` (list), `defaultSelect` (chosen `dataVersion`), `sqlType`.
- antd `Select` width 500, `showSearch`, `optionFilterProp="children"`; the `Kafka` + `0.9` option is disabled.
- On change: `cleanInfoConfig()`, store `sessionStorage.version`, reset auth selections (`saveCheckedStatus([])`, `saveCheckedProject({})`).
- Renders `<AuthForm dataVersionRequired={version.length > 0} getProductApi={API.queryProductList} dataType={sqlType.dataType} dataVersion={defaultSelect} />`; `authForm/index.tsx` already derives `isVersionRequired = dataVersionRequired && dataType && dataVersion`, so a "version needed" signal exists in the domain — reuse it instead of inventing a second one.
- `infoConfig/index.tsx` consumes `saveStatus.version` as `dataVersion` (e.g. `findTemplateByTypeVersion`), so a stale/auto value there silently changes later requests.

## Bug 161496 — 【数据源中心】数据源选择版本时，去掉默认版本的选择

ZenTao metadata (`zentao bug 161496 --json`): product 48, type 产品BUG, severity 3 / pri 3, status resolved / resolution Fixed, opened by zhizhang 2026-10-30 14:59:37, assigned to wangzai, resolved by huaiju 2026-10-30 17:59:12 on build 1696, testtask 2228, branch `0`, `steps` contains only a screenshot (`/zentao/file-read-326425.png`) — the title carries the requirement.

Root cause (branch `publicService/hotfix_6.3.x_161496`), in `produceAuth.tsx` `queryDsVersionByType`:

```ts
const echoVersion = saveStatus.version || data[0].dataVersion;
sessionStorage.setItem('version', echoVersion);
setDefaultSelect(echoVersion);
```

The first version is auto-selected and cached even for a first-time entry, and step 1's 下一步 only runs `verifyProject()` — nothing rejects a missing version.

Accepted fix direction (per Shane's review recorded in `docs/agents/coding-standards.md`): **make the version a required field**. Echo only a previously chosen `saveStatus.version`; leave the select empty with a placeholder on first entry; keep the user-initiated caching, config reset and auth refresh. Validate in `Form.Item` `rules` + `form.validateFields()` under the field — the first attempt used `if (!version) { message.error(...); return; }` in 下一步 and Shane asked why it wasn't field-level validation (lint `dt-correct/no-message-validation`). Data sources with no version list (`version.length === 0`) need no version, so the requirement must be conditional. Keep the diff minimal: the earlier over-built attempt (reshaping `sessionStorage.sqlType`, deriving `haveVersion`, threading a ref) was rejected with 「为什么这么多，必选不就好了」 — see [[dt-insight-coding-standards]] (收敛优先于完备).

The fix will touch `produceAuth.tsx` and, if a form instance is needed for `validateFields()`, `addSource/index.tsx` (pass the instance down, validate before `verifyProject()` / `setCurrent(2)`).

## Process notes

- `rg 'apps/console/src/pages/dataSource*'` fails with zsh `no matches found` and aborts the whole compound command — quote or use `rg --files | rg 'dataSource'` instead.
- `rg --files | rg dataSource` returns mostly logo PNGs; filter to `-g '*.tsx'` or search under `apps/publicService/src/pages/dataSource` directly.

Related: [[dt-insight-workflow-conventions]], [[dt-insight-coding-standards]], [[zentao-cli]]. Bug 161496 is also documented in [[publicservice-datasource-version-select-default]] (adds `verifyProject()`/`AuthForm` `needGetProductList` detail and the per-field acceptance list) and the wizard structure in [[datasource-center-add-source-flow]].
