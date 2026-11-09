---
name: dt-insight-datasource-center
description: 数据源中心（apps/publicService/pages/dataSource 的「新增数据源」三步向导）的代码结构、sessionStorage 状态键、版本选择机制，以及禅道 Bug 161496「去掉默认版本选择」的原因与修复方案；改数据源版本 / 授权相关代码前读。
metadata: dt-insight monorepo; app apps/publicService; bug 161496; source read 2026-11-01 on branch publicService/hotfix_6.3.x_161496
---

# 数据源中心（dataSource）

新增/编辑向导代码在 monorepo 的 `apps/publicService/src/pages/dataSource/`；console 包另有数据源页面（列表/告警等）在 `apps/console/src/views/dataSource/`，列表的「连接信息」列见 [[dt-insight-console-datasource-list-connection-info]]。仓库流程见 [[dt-insight-project-conventions]]；同一 bug 的更完整记录（含分支上已提交的上一版 ref 修法与待纠正点）见 [[bug-publicservice-datasource-version-161496]]；表单校验规范见 [[convention-dt-insight-coding-standards]]，交付闸门见 [[workflow-dt-insight-git-delivery-gates]]。

## 新增数据源：三步向导

入口 `addSource/index.tsx`（`withRouter(connect(mapStateToProps)(Index))`，`useState<number> current` + `switchContent(step)`）：

| 步骤 | 组件 | 关键动作 |
|---|---|---|
| 0 选择数据源 | `components/selectSource.tsx` | 选类型后 `setTimeout(() => nextType(true))` 进第 1 步 |
| 1 版本 / 授权 | `components/produceAuth.tsx` | 「下一步」= `verifyProject() && setCurrent(2)`；「上一步」会 `clearAuth()` |
| 2 信息配置 | `components/infoConfig/index.tsx` | 通过 `childRef` 调 `testForm()` / `submitForm()` / `syncInfoConfigForm()` |

- 步骤间表单暂存：`InfoConfig` 的 `tempFormValues` + 父级 `setInfoConfig`；切换数据源类型时 `cleanInfoConfig()` 把暂存置空。
- 第 0 步有 SKU 校验：`checkDSTypeNum` → `checkLicenseSku({ code: SKU_CHECK_CODE.DATASOURCE_TYPE_NUM, extraParams: { datasourceType } })`，`supportSku` 为假时直接 `onSelectType`。

## sessionStorage 状态键

`utils/handleSession.ts` 是唯一读写点：

- `current` — 左侧分类菜单回显（选中 classifyId）。
- `sqlType` — `JSON.stringify` 后的数据源类型对象（`dataType` / `typeId` / `imgUrl` / `haveVersion`）。
- `version` — 用户选中的版本号。

`getSaveStatus()` 返回 `{ menuSelected, sqlType, version }`（`version` 缺省为 `''`；`sqlType` JSON.parse 失败时退回 `{ dataType: '' }`）。`remove()` 清三个键 + `saveCheckedStatus([])`。授权勾选状态是模块级变量 `checks` / `checkProjects`（`saveCheckedStatus` / `saveCheckedProject` / `clearAuth`），不在 sessionStorage。

切类型时 `selectSource.onSelectType` 写 `sqlType`、并对不同 `dataType` 调 `cleanInfoConfig()`、同时 `sessionStorage.removeItem('version')`。

## 版本选择（Bug 161496 的核心）

`produceAuth.tsx` 里 `queryDsVersionByType({ dataType })` 取版本列表，原逻辑：

```ts
const echoVersion = saveStatus.version || data[0].dataVersion;
sessionStorage.setItem('version', echoVersion);
setDefaultSelect(echoVersion);
```

即**没选过就把第一项自动选中并写缓存**，这正是 Bug 161496 的症状。注意 `version.length === 0` 时整块版本 `Select` 不渲染（没有版本选项的数据源不需要选版本）；`Kafka` 类型的 `0.9` 选项 `disabled`。

`onSelected` 会 `cleanInfoConfig()` + `saveCheckedStatus([])` + `saveCheckedProject({})`，所以改版本等于重置授权勾选。

版本还决定授权产品列表是否拉取：`produceAuth` 传 `dataVersionRequired={version.length > 0}`，`infoConfig/authForm/index.tsx` 里

```ts
const isVersionRequired = dataVersionRequired && dataType && dataVersion;
const needGetProductList = isVersionRequired || (!dataVersionRequired && dataType) || dataInfoId || isDataPreview;
```

→ 有版本选项但没选版本时，授权产品列表不请求。去掉默认选中后必须让「必选」校验先通过，否则会退化成空白授权页。

`authForm/index.tsx` 其他被依赖的行为：`isEditAuth` 回填已勾选（`isAuth === 1 || isImport === 1`）、`isDataPreview` 过滤 `HIDDEN_PRODUCTS = [APP_TYPE.TAG, APP_TYPE.INDEX_MANAGE, APP_TYPE.DATA_LAKE]`、产品名走 `getProductNameByAppType(appType)`、租户 `sessionDb.get('pub_tenantId')` 同时作 `tenantId` 与 `dtuIcTenantId`。

## 禅道 Bug 161496

- 标题：【数据源中心】数据源选择版本时，去掉默认版本的选择
- `product=48`、`type=产品BUG`、`severity=3`、`pri=3`、`openedBuild=trunk`、`steps` 只有一张截图 `/zentao/file-read-326425.png`（无文字步骤）
- openedBy `zhizhang` 2026-10-30 14:59 → resolvedBy `huaiju` 2026-10-30 17:59，`resolution=Fixed`、`resolvedBuild=1696`、`testtask=2228`，后 assignedTo `wangzai`（2026-10-30 17:59:53）。状态已 `resolved`，不是活跃 Bug。
- 会话当时的开发分支名：`publicService/hotfix_6.3.x_161496`（`<pkg>/hotfix_<ver>_<bugid>` 形式）；`git log` 头部是 `chore(release): 6.3.48-publicService`、`Merge origin/publicService/test_6.3.x_v703 into publicService/release_6.3.x`。

### 修复方案（只给方案、未改文件，未经页面验证）

1. `components/produceAuth.tsx`：删掉 `saveStatus.version || data[0].dataVersion` 的默认选中；首次进入保持未选，返回上一步时保留已选（`saveStatus.version` 仍作回显）；只有用户主动选择才 `sessionStorage.setItem('version', ...)`；把版本纳入必填校验（有版本选项时必选，提示「请选择版本」，无版本选项不要求）。
2. `addSource/index.tsx`：第 1 步「下一步」先跑版本校验，再走现有 `verifyProject()` 和 `setCurrent(2)`——原入口只有 `verifyProject()`，没有版本必填。

验收覆盖点：首次进入不默认选（只有一个版本也一样）、未选不能继续、选择后正常授权、返回保留已选、切数据源清空旧版本、无版本数据源正常放行。

### 项目对这条 Bug 的复盘（重要，别再犯）

`docs/agents/coding-standards.md`「Bug fix → 收敛优先于完备」把 161496 当反例：第一版改了 sessionStorage 里 `sqlType` 的结构、加了 `haveVersion` 推导和 ref，Shane 的反应是「为什么这么多，必选不就好了」；**终版只是把版本做成必填字段**。所以正确解法是最小改动 + 必填校验，不要顺手重构缓存结构和类型。

## 相关 skill / 文档

- 写码规范 SSOT：`docs/agents/coding-standards.md`（改代码或 review 前必读）
- 本地联调：`docs/agents/local-dev.md`、`.agents/skills/dt-insight-local-dev/SKILL.md`
- UI 取证（console 7.0）：`.agents/skills/verify-console-70/SKILL.md`；登录环境用 `env-api` / `env-cookie` / `env-open`（见 [[dt-insight-project-conventions]]）
- 排查沉淀目录：`docs/solutions/`；领域词 `CONCEPTS.md`
