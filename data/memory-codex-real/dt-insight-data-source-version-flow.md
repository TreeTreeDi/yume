---
name: dt-insight-data-source-version-flow
description: Code map of the 数据源中心 add-source wizard in apps/publicService (SelectSource → ProduceAuth → InfoConfig), how the data-source version lives in sessionStorage and when it defaults, plus zentao bug 161496 and the accepted fix direction.
metadata:
  source: codex session 01a197d1 (worktree 161496-r1, 2026-11-01), file reads of the real tree
  staleness: paths/line anchors valid for that worktree snapshot; re-grep before editing
---

# 数据源中心 (data source center): add-source version flow

Product: dt-insight console `publicService` app. Code root: `apps/publicService/src/pages/dataSource/`.

## Wizard skeleton — `pages/dataSource/addSource/index.tsx`
Three antd `Steps`, `current` state:
- step 0 → `components/selectSource` (`nextType` sets current 1; `cleanInfoConfig` clears the stashed step-2 form).
- step 1 → `components/produceAuth` (product/project authorization + version select). 「下一步」 only advances when `verifyProject()` from `components/infoConfig/authForm/utils.ts` returns true.
- step 2 → `components/infoConfig` (`InfoConfig`), driven through a ref: `cRef: Ref<InfoConfigRef>` with `testForm(cb)`, `submitForm(cb)`, `syncInfoConfigForm()`. 「上一步」 stores `childRef.current.syncInfoConfigForm()` into `infoConfig` state and `setCurrent(1)`; that value comes back as `tempFormValues` when step 2 remounts (form re-echo).
- Wizard `useEffect` on mount calls `clearAuth()` (clears cached authorized products/projects).

## Version state — `components/produceAuth.tsx`
- `queryDsVersionByType({ dataType })` on mount, `dataType` from `getSaveStatus().sqlType?.dataType`.
- On success: `setVersion(data)`, `setSqlType(saveStatus.sqlType)`, and when versions exist
  ```ts
  const echoVersion = saveStatus.version || data[0].dataVersion;
  sessionStorage.setItem('version', echoVersion);
  setDefaultSelect(echoVersion);
  ```
  → **the version defaults to the first list entry**, and it is persisted to sessionStorage immediately.
- `onSelected(value)`: `cleanInfoConfig()`, `setDefaultSelect(value)`, `sessionStorage.setItem('version', value)`, `saveCheckedStatus([])`, `saveCheckedProject({})`.
- The select renders `*` (红色必填星) itself; it is not inside a `Form`, so nothing validates it.
- Kafka option `0.9` is `disabled` when `sqlType.dataType === 'Kafka'`.
- Renders `<AuthForm dataVersionRequired={version.length > 0} getProductApi={API.queryProductList} dataType={sqlType.dataType} dataVersion={defaultSelect} />`.

## Session cache — `src/utils/handleSession.ts`
- Mutable module-level `checks` (`saveCheckedStatus`) and `checkProjects` (`saveCheckedProject`), `clearAuth()` resets both.
- `getSaveStatus()` → `{ menuSelected: sessionStorage 'current', sqlType: JSON.parse(sessionStorage 'sqlType'), version: sessionStorage 'version' || '' }`.
- `remove()` drops `current`, `sqlType`, `version` and empties `checks`.
- Related: `authForm/utils.ts` `ALL_PROJECT_VALUE = -1`, `verifyProject()` (validates every product in `checks` has a project, all-projects `-1` or matching appType prefix), `checkedObjectToJson()`.

## InfoConfig consumption — `components/infoConfig/index.tsx`
- `handleSpace(dataType, dataVersion)` → `` `${dataType} ${dataVersion}` `` (e.g. `Kafka CKafka 1.x`, `Elasticsearch 7.x`); this string is set into the `dataType` field (`setFieldValue('dataType', handleSpace(...))`), and the `dsForm/*` components branch on it (`dsKafkaReact`, `dsKafkaAuthReact`, `dsSSL`, `dsKerberos`, `dsTransform`, `dsUploadFieldGroup`).
- `getParams()` builds `otherParams = { dataType, dataVersion, appTypeList, projectIdJson }` from `record` or the session values: `const dataVersion = record?.dataVersion || saveStatus.version`.
- `templateForm()` calls `API.findTemplateByTypeVersion({ dataType, dataVersion, dataInfoId })`; field templates filtered by `invisible !== 1`; `isMeta` 1/2 disables all fields except a few.
- Edit mode: `API.detail({ dataInfoId })` → `dataJson` is `Base64` + `utf8to16` + `JSON.parse`; `API.authProductList({ dataInfoId, tenantId: sessionDb.get('pub_tenantId'), dtuicTenantId: sessionDb.get('pub_tenantId') })`.
- Connect/test requests are wrapped in `request()` which aborts at `window.APP_CONF.CONNECT_TIMEOUT` ms.

## Credential/authorization gate — `components/infoConfig/authForm/index.tsx`
- `useEffect` on `[dataType, dataVersion, dataInfoId, isDataPreview]` recomputes:
  ```ts
  const isVersionRequired = dataVersionRequired && dataType && dataVersion;
  const needGetProductList = isVersionRequired || (!dataVersionRequired && dataType) || dataInfoId || isDataPreview;
  ```
  i.e. when a version is required but still empty, the product list is **not** fetched.

## zentao bug 161496 — "数据源中心 … 这个修复好"
- Card: `http://zenpms.dtstack.cn/zentao/bug-view-161496.html`; session asked for the fix **plan only** (which files, how, why), explicitly no file edits; worktree `/Users/mac/.factory/ws/161496-r1`.
- Symptom recorded in the repo's own standards: the data-source version should not default to the first option. Mechanism in code: `echoVersion = saveStatus.version || data[0].dataVersion` in `produceAuth.tsx`, which both selects and persists it.
- Accepted direction (Shane, recorded in `docs/agents/coding-standards.md`): **make version a required field** validated by the form (message under the field) rather than a `message.error` guard in 「下一步」; the rejected first attempt restructured `sqlType` in sessionStorage (`haveVersion` derivation) and added a ref — "为什么这么多，必选不就好了". Keep the diff to the minimum: stop the implicit default, then let the existing required-version path validate.
- Cross-links: rule details in [[dt-insight-coding-standards]] (Form-rules validation, minimal diff); workflow/verification gates in [[dt-insight-harness-conventions]].
- The card's ZenTao fields (`product 48`, `openedBy zhizhang` 2026-10-30, `resolvedBy huaiju`, `resolvedBuild 1696`, `testtask 2228`), the branch actually checked out (`publicService/hotfix_6.3.x_161496`), the exact two-file plan proposed in a later session (`produceAuth.tsx` + `addSource/index.tsx` form instance) and the `apps/publicService` vs `apps/console` path pitfall are recorded in [[dt-insight-public-service-datasource]]; the CLI used to read the card is [[zentao-cli]].

## Process notes
- Grepping `version|dataVersion|infoConfig` inside `apps/publicService/src/pages/dataSource` is dominated by `I18N.pages.dataSource.components.infoConfig…` keys (313 matches / 40 files, almost all i18n paths). Anchor greps on `getSaveStatus|queryDsVersionByType|sessionStorage|setDefaultSelect|dataVersionRequired` instead.
- Codex `exec_command` output goes through rtk: long results are truncated in-band and the full log is written to `$HOME/Library/Application Support/rtk/tee/<…>.log` (`tail -n +N …` to read more).
- The session's final reply was an encrypted `send_message` payload, so the transcript shows no readable plan text; conclusions here come from the code the agent read plus the repo's standards doc.
