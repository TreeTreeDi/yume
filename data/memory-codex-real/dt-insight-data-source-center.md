---
name: dt-insight-data-source-center
description: 数据源中心 module map in apps/publicService — entry points, the three-step add-source wizard and each step's footer actions, the shared auth form, the sessionStorage echo keys, and where the data-source version Select lives. Read before editing data-source create/edit/list/preview/alarm code. The 161496 bug narrative lives in [[publicservice-datasource-version-select-default]].
metadata:
  source: codex session 01a197d1 (2026-11-01), worktree /Users/mac/.factory/ws/161496-r2, branch publicService/hotfix_6.3.x_161496
---

# 数据源中心 (data source center, apps/publicService)

Scope note: this file covers the **publicService** add-source wizard. The console app also has
data-source code under `apps/console/src/views/dataSource/` — the list page and its 连接信息 cell
(`list/components/extTableCell.tsx`) — covered in [[dt-insight-console-datasource-list]] and, with
the full `showMapArr` / `getLinkInfoMap` detail, [[dt-insight-console-datasource-list-connection-info]].

Repo-wide rules: [[dt-insight-studio-agent-conventions]] / [[dt-insight-studio-agent-rules]].
Wizard flow detail: [[datasource-center-add-source-flow]]. Bug 161496:
[[publicservice-datasource-version-select-default]], [[bug-publicservice-datasource-version-161496]].

## Folder / entry points (`apps/publicService/src/pages/dataSource/`)

- `addSource/index.tsx` — 新建数据源 wizard (`BreadComponent` + antd `Steps`, labels
  `I18N.pages.dataSource.addSource.index.H/I/J`, state `current` 0/1/2).
- `editSource/index.tsx` — edit; `list/index.tsx` (+ `components/detail.tsx`,
  `components/tenantSelect.tsx`, `list/constants.tsx`) — the list page.
- `alarm/` — alarm config and records (`config/components/lazySelectDS.tsx`,
  `record/components/search.tsx`).
- `dataPreview/` — preview (`configForm.tsx`, `type.ts` with `ISelectedProduct`).
- `sftp/`, `constants/` (`theme.ts`, `dataSource.ts`), `connector/` modals
  (`modalConnector.tsx`, `deleteConnectorModal.tsx`, `unbindModal.tsx` — these call
  `form.validateFields()` before acting).

## Wizard footer actions (state lives in `addSource/index.tsx`)

- step 0 `<SelectSource nextType supportSku cleanInfoConfig>`: footer only has the cancel
  button (`…addSource.index.A`) → `props.router.push('/public/data-source/list')`. There is
  no 下一步; clicking a data-source card advances by itself.
- step 1 `<ProduceAuth cleanInfoConfig={() => setInfoConfig(undefined)}>`: 上一步 →
  `setCurrent(0)` + `clearAuth()`; 下一步 (`…index.C`) → today `verifyProject() &&
  setCurrent(2)` (no version check).
- step 2 `<InfoConfig cRef tempFormValues={infoConfig} changeBtnStatus>`: 测试连通性
  (`SyncOutlined`, `childRef.current.testForm()`), 上一步 (`syncInfoConfigForm()` →
  `setInfoConfig(values)` → `setCurrent(1)`), 确定 (`submitForm()`, disabled while
  `submitBtnStatus`; `changeBtnStatus` re-enables).
- `useEffect` on mount runs `clearAuth()` (授权 project cache).

## Shared pieces

- `components/selectSource.tsx` — classify `Menu` from `API.queryDsClassifyList()` (echo
  `saveStatus.menuSelected || data[0].classifyId`), icon grid from
  `API.queryDsTypeByClassify({ classifyId, search })`, `imgUrl` prefixed
  `assets/imgs/dataSource/logo/`. Card 216×108 scaled by
  `ratio = (containerWidth - 16*len)/len/216` (`computeScaleRatio`, lodash debounce 500,
  resize listener). SKU gate `checkLicenseSku({ code: SKU_CHECK_CODE.DATASOURCE_TYPE_NUM,
  extraParams: { datasourceType: item.dataType } })` when `supportSku`.
- `components/produceAuth.tsx` — step 1: versions from
  `API.queryDsVersionByType({ dataType })`; version `Select` rendered only when
  `version.length > 0`; Kafka `0.9` option disabled; `onSelected` clears InfoConfig cache
  and authorization caches.
- `components/infoConfig/authForm/index.tsx` — 授权产品和项目 picker reused by edit auth and
  preview (`IProps`: `dataType`, `dataVersion`, `dataInfoId`, `dataVersionRequired`,
  `isEditAuth`, `isDataPreview`, `getSelectedInDataPreview`, `setChecksList`,
  `getProductApi`, `selectWidth`). Filters `HIDDEN_PRODUCTS = [APP_TYPE.TAG,
  APP_TYPE.INDEX_MANAGE, APP_TYPE.DATA_LAKE]`, `IMPORT_STATUS = 1` disables checked
  modules. `./utils` holds `verifyProject()`, `ALL_PROJECT_VALUE`.
- `components/infoConfig/index.tsx` — dynamic connection form; template from
  `API.findTemplateByTypeVersion({ dataType, dataVersion })`; `handleSpace(dataType,
  dataVersion)` → `"${dataType} ${dataVersion}"`; version comes from
  `record?.dataVersion || saveStatus.version`.
- `components/infoConfig/dsForm/*` — per-source fields branching on `dataType` /
  `dataVersion` (`Kafka 3.x`, `Kafka CKafka 1.x|2.x`, `Elasticsearch 7.x`, `huawei` in the
  version string).

## sessionStorage echo contract (`apps/publicService/src/utils/handleSession.ts`)

- `current` (left-menu classify id), `sqlType` (JSON of the chosen type: `typeId`,
  `dataType`, `imgUrl`, …), `version` (chosen data version string).
- `getSaveStatus()` → `{ menuSelected, sqlType, version }`; `sqlType` degrades to
  `{ dataType: '' }`, `version` to `''`.
- `remove()` clears all three; module-level `checks` / `checkProjects` and `clearAuth()` /
  `saveCheckedStatus()` / `saveCheckedProject()` cache 授权 selections.
- Choosing a data-source card rewrites `sqlType`, deletes `version` and (when the type
  changed) wipes the cached step-2 form via `cleanInfoConfig()`.

## S3 列表连接信息：hostname → endpoint + region（禅道需求 16537）

- 需求卡：`http://zenpms.dtstack.cn/zentao/story-view-16537.html`，标题「s3 数据源整合」；会话 worktree `/Users/mac/.factory/ws/16537-r1`（codex，2026-11-02）。
- 用户描述（唯一来源，未在代码里核实）：控制台**数据源列表**里 S3 的连接信息现在显示 `hostname`，**后端已改成 `endpoint` 和 `region`**，前端要跟上——即 S3 的列表列/详情改成展示 endpoint 与 region，凡仍读 `hostname` 的地方都要核。
- 展示位置在**控制台** app，不是 publicService：`apps/console/src/views/dataSource/list/constants.tsx` 的连接信息列 → `list/components/extTableCell.tsx` 的 `getLinkInfoMap` 表里 `DATA_SOURCE.S3: [['hostname','hostname']]`。因此最可能的改法是同一张表里把 S3 行换成 `[['endpoint','endpoint'],['region','region']]`，不动渲染函数；细节见 [[dt-insight-console-datasource-list]]。
- 换字段前先 `rg -n 'hostname' apps packages --glob '*.{ts,tsx,js,jsx}'` 确认全部读取点（同一 `hostname` 字段可能被其他数据源类型共用，按 `DATA_SOURCE.<TYPE>` 分支改，不要全局替换）。
- 会话归属：本文件记录的方案会话是 `ws/16537-r1` 里的 codex session `01a199f4`（2026-11-02），它读完了 `extTableCell.tsx` 并给出方案；同一 worktree 还跑过一次只回空 `NEW_TASK` 信封的会话 `01a199f0`（见 [[codex-new-task-empty-payload]]），别把两者混成一个。同一 worktree 的 session `01a199f8-fb67-7860-ae6a-7a29c7daaa7d`（cwd `/Users/mac/.factory/ws/16537-r1`，2026-11-02，同为只出方案的 prompt）给出了逐字方案：只改 `extTableCell.tsx:174`，把 `[['hostname','hostname']]` 换成 `[['endpoint','endpoint'],['region','region']]`；不要把它算到 `ws/16537-r2` 名下。方案明确不动渲染函数、不加 i18n key、不碰 AWSS3/CSPS3。该方案未在真实接口/页面上验证——`linkJson` 是否真有 `endpoint`/`region` 待用 `env-api` 或页面确认后再实施。

## Version Select / bug 161496 in one line

`produceAuth.tsx` used to auto-select the first API version
(`saveStatus.version || data[0].dataVersion` → `sessionStorage.version` +
`defaultSelect`), so "未选择" was unrepresentable; the accepted fix is to drop that
fallback and make version a required `Form.Item` field validated by
`form.validateFields()` in step 1's 下一步 — no `message.error` guard, no
`validateStatus`/`help`, no `sqlType`/`haveVersion` restructuring. Before re-implementing,
check `git log` on the branch: an earlier `forwardRef` + `useImperativeHandle` attempt may
already be committed and must be replaced, not extended
([[bug-publicservice-datasource-version-161496]]).
