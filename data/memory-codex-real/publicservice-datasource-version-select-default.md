---
name: publicservice-datasource-version-select-default
description: 禅道 Bug 161496：数据源中心新增数据源第二步「选版本」默认选中第一项的根因、去掉默认选择的修复方案与验收点。查 publicService produceAuth / addSource 的版本必填逻辑时读。
metadata: bug 161496, publicService 6.3.x; plan only — no code changed; observed 2026-11-02 in /Users/mac/.factory/ws/161496-r3
---

# 数据源中心：选版本不要默认选第一项（Bug 161496）

三步向导的整体结构、sessionStorage 键（`sqlType` / `version` / `current`）、AuthForm 授权逻辑见 [[datasource-center-add-source-flow]]；这里只记这条 Bug 的单子、根因和修法。

## 单子与基线

- Bug 161496，产品 48，标题「【数据源中心】数据源选择版本时，去掉默认版本的选择」，type 产品BUG，pri/severity 3，openedBuild trunk。
- 提单 zhizhang 2026-10-30 14:59 → 指派 wangzai → huaiju 解决（Fixed，resolvedBuild 1696，resolvedDate 2026-10-30 17:59），testtask 2228，未关闭（closedDate 空）。steps 里只有一张截图 `/zentao/file-read-326425.png`，没有文字复现步骤。
- 工作分支 `publicService/hotfix_6.3.x_161496`；该 worktree `apps/` 下只有 `publicService/`，`git log` 顶部 `chore(release): 6.3.48-publicService`。

## 根因

`apps/publicService/src/pages/dataSource/components/produceAuth.tsx` 的 `queryDsVersionByType()`：

```ts
const echoVersion = saveStatus.version || data[0].dataVersion;
sessionStorage.setItem('version', echoVersion);
setDefaultSelect(echoVersion);
```

只要 `queryDsVersionByType` 返回非空，就把第一项自动选中并写进 `sessionStorage.version`；UI 上没有「未选择」这个状态，所以用户永远看到默认版本。

## 修复方案（会话只给方案，未改任何文件）

1. `components/produceAuth.tsx`：去掉 `|| data[0].dataVersion` 兜底，只回显 `saveStatus.version`；首次进入保持空值、显示 placeholder；版本 `Select` 包进 `Form.Item` 并用 `rules: [{ required: true, message: I18N.pages.dataSource.components.produceAuth.H }]`，错误显示在字段下方。`H` 的 zh-CN 值是 **`'请选择对应版本'`**（`locales/zh-CN/index.ts` 第 2167 行附近），这同一句也是 `Select` 的 placeholder，复用即可，不要新造文案。保留 `onSelected` 原有的 `cleanInfoConfig()` + `saveCheckedStatus([])` + `saveCheckedProject({})`（换版本要清配置和授权缓存）。
2. `addSource/index.tsx`：`Form.useForm()` 建实例传给 `ProduceAuth`；「下一步」由 `verifyProject() && setCurrent(2)` 改为先 `form.validateFields()` 通过，再跑原 `verifyProject()` 与 `setCurrent(2)`。`version.length === 0` 的数据源类型不要求版本，照旧直接进下一步。

必填校验必须走 `Form.Item rules` + `validateFields()`，不用 `message` 拦、不手写 `validateStatus`/`help`、不用 ref 把校验交给父组件（规范见 [[dt-insight-frontend-conventions]]）。分步页现成范式：`docs/solutions/conventions/form-validation-next-step.md`，正例 `apps/publicService/src/pages/approval/process/addProcess/index.tsx`（父组件 `Form.useForm()` 传给步骤组件，下一步 `await form.validateFields()`）+ `apps/publicService/src/pages/approval/process/components/basicInfoConfig/index.tsx`（子组件接 `form: FormInstance`）。

## 验收点

首次进入不默认选中（**只有一个版本时也一样**，用户原话是「不需要默认版本了 所有数据源」，范围是所有带版本下拉的类型，不限于多版本）；无版本选项的类型不加必填。未选时字段下方红字且点「下一步」不动；手动选择后能继续；返回上一步保留已选版本；换数据源类型后版本被清空（`selectSource.tsx` 已 `removeItem('version')`）。

校验形态是硬要求：拦住「下一步」的是 `Form.Item rules` 的字段校验（红字在下拉框下面），不是 `message` 弹提示——用户在本单原话「必选呢 不就好了，没选版本点下一步要拦住，作为表单下面的校验，不要用 message 提示」。

## 坑

- 版本值同时存在 `produceAuth` 的 `defaultSelect` state 和 `sessionStorage.version` 两处，改必填逻辑两处要一起对，否则返回上一步回显会错。
- `AuthForm` 的 effect 依赖 `[dataType, dataVersion, dataInfoId, isDataPreview]`：版本由空变有值会触发重新拉授权产品列表（`needGetProductList`），这是设计行为，不要当重复请求去「优化」。
- 后续接手先确认这条分支是否已经落过改动——本会话是纯方案阶段，仓库里当时还是旧代码。2026-11-02 在另一个 worktree `/Users/mac/.factory/ws/161496-r2`（session 01a199f0）复核，`produceAuth.tsx:43` 的 `saveStatus.version || data[0].dataVersion` 与 `addSource/index.tsx:95` 的 `verifyProject() && setCurrent(2)` 都还在，也没有 `form` prop，即那个基线同样没落改动。细节与 grep 锚点见 [[bug-publicservice-datasource-version-161496]]。
- 版本下拉的红色 `*` 现在是手写的（`produceAuth.tsx` 里 `.version-sel > span.version > b`，内联 `color: 'red'`）；换成 `Form.Item rules` 要顺手删掉，否则和 antd 的必填星重复。

## 分支上已有的两次提交（先看再改）

`publicService/hotfix_6.3.x_161496` 已经有两笔引用 #161496 的提交，说明「版本必填」被改过一轮：

| commit | message | 说明 |
|---|---|---|
| `467a4323bd` | `hotfix(publicService): #161496 require datasource version` | 第一版；diff 里可见的 `forwardRef` / `useImperativeHandle` / `validateVersion()` / `versionError` / `validateStatus`+`help` 就是这一版（或更早）留下的 |
| `b92329ec4` | `hotfix(publicService): #161496 validate version in form` | 2 文件 +139/−163（`addSource/index.tsx` 19 行、`components/produceAuth.tsx` 283 行）；移除 ref 方案，改为父组件 `Form.useForm()` + 「下一步」`form.validateFields()`；`produceAuth` 新增 `defaultSelect` state |

关键点：**`b92329ec4` 没有去掉 `saveStatus.version || data[0].dataVersion` 这行**（HEAD 上 `produceAuth.tsx` 仍保留），所以版本永远有值、必填规则永不触发——这正是本 Bug 剩下的那一刀。别以为禅道 `resolved / Fixed`（resolvedBuild 1696）等于代码已修。

另外，`git show b92329ec4` 的输出在本会话里被截断，读取到的 `addSource/index.tsx` 与 diff 里的 `+` 行不完全一致（读取时「下一步」仍是 `verifyProject() && setCurrent(2)`，`ProduceAuth` 也没有 `form` prop）。**动手前先 `git show b92329ec4 -- apps/publicService/src/pages/dataSource` 确认 HEAD 的真实形状**，不要照记忆里的 diff 改。已落地/未落地的边界详见 [[bug-publicservice-datasource-version-161496]]。
