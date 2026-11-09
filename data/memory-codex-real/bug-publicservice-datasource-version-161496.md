---
name: bug-publicservice-datasource-version-161496
description: 禅道 Bug 161496「数据源中心：选择版本时去掉默认版本的选择」— code map (produceAuth.tsx / addSource/index.tsx / handleSession.ts), root cause of the auto-selected first version, the accepted two-file fix plan, the two 161496 commits already on the hotfix branch, and 2026-11-02 re-checks in worktrees 161496-r1/-r2 (HEAD still defaults to the first version and still has no form validateFields wiring). Read for datasource add-source / version work in publicService 6.3.x.
---

# Bug 161496 · 数据源中心：去掉默认版本选择

- 链接 `http://zenpms.dtstack.cn/zentao/bug-view-161496.html`；标题「【数据源中心】数据源选择版本时，去掉默认版本的选择」。
- 禅道记录（`zentao bug 161496 --json`）：product `48`、type `产品BUG`、pri/severity `3`、openedBy `zhizhang` 2026-10-30 14:59、openedBuild `trunk`、assignedTo `wangzai`、status `resolved`、resolution `Fixed`、resolvedBy `huaiju` 2026-10-30 17:59、resolvedBuild `1696`、testtask `2228`。步骤只有一张截图。
- 分支：`publicService/hotfix_6.3.x_161496`，从 `chore(release): 6.3.48-publicService`（`28cf7fde97`）拉出；`git config` 里有 `case = 161496`。

## 代码位置（apps/publicService）

- 加数据源三步页：`src/pages/dataSource/addSource/index.tsx`（Step 1 选数据源 → Step 2 `ProduceAuth` 版本 + 授权 → Step 3 `InfoConfig`）。Step 2 的「下一步」按钮原来直接 `verifyProject() && setCurrent(2)`。
- `src/pages/dataSource/components/produceAuth.tsx`：挂载时 `queryDsVersionByType({ dataType })`（`services/newApi/dataSource`，`dataType` 取自 `getSaveStatus().sqlType.dataType`），成功则 `setVersion(data)`；版本下拉的 option 值是 `item.dataVersion`，且 `sqlType.dataType === 'Kafka' && item.dataVersion === '0.9'` 的选项 disabled。
- 版本下拉只在 `version.length > 0` 时才渲染；`<AuthForm dataVersionRequired={version.length > 0} dataVersion={defaultSelect} />`，`AuthForm` = `components/infoConfig/authForm/index.tsx`，据 `dataType` + `dataVersion` 拉产品授权列表。
- sessionStorage 键：`sqlType`（`{ dataType, haveVersion, imgUrl, typeId }`）、`version`、`current`（当前步骤）。读写都在 `src/utils/handleSession.ts`：`getSaveStatus()` 返回 `{ menuSelected, sqlType, version }`；`remove()` 清 `current` / `sqlType` / `version` 并清空授权勾选；模块级变量 `checks` / `checkProjects` + `clearAuth()` / `saveCheckedStatus()` / `saveCheckedProject()`。`components/selectSource.tsx` 里换数据源时 `sessionStorage.removeItem('version')`。
- `verifyProject()` 在 `components/infoConfig/authForm/utils.ts`：`checks.every(item => checkProjects[item]?.some(i => i === ALL_PROJECT_VALUE || Number(String(i).split('-')[0]) === item))`，`ALL_PROJECT_VALUE = -1`，失败 `message.error(...authForm.utils.A)`。
- 授权缓存 value 形如 `${appType}-${projectId}`，`checkedObjectToJson` 按 `-` 拆再拼逗号。
- 授权产品列表是否请求由版本决定（`AuthForm` = `components/infoConfig/authForm/index.tsx` 顶层 effect）：

  ```ts
  const isVersionRequired = dataVersionRequired && dataType && dataVersion;
  const needGetProductList = isVersionRequired || (!dataVersionRequired && dataType) || dataInfoId || isDataPreview;
  ```

  即有版本选项但**未**选版本时产品列表不请求 → 去掉默认选中后必须先让版本必填校验通过再进第 3 步，否则会退化成空白授权页。
- `ProduceAuth.onSelected`（换版本）会 `cleanInfoConfig()` + `saveCheckedStatus([])` + `saveCheckedProject({})`，换版本等于重置授权勾选。授权列表请求带租户 `sessionDb.get('pub_tenantId')`（同时作 `tenantId` 与 `dtuIcTenantId`），`isDataPreview` 时过滤 `HIDDEN_PRODUCTS = [APP_TYPE.TAG, APP_TYPE.INDEX_MANAGE, APP_TYPE.DATA_LAKE]`，产品名走 `getProductNameByAppType(appType)`。
- 第 1 步选类型还有 SKU 闸门：`checkLicenseSku({ code: SKU_CHECK_CODE.DATASOURCE_TYPE_NUM, extraParams: { datasourceType } })`；`supportSku` 为假时直接放行。
- 数据源中心不在 console 包，全在 `apps/publicService`；模块级状态键语义与三步向导细节另见 [[dt-insight-datasource-center]]。

### 复盘：coding-standards 把这条 bug 当反例

`docs/agents/coding-standards.md`「Bug fix → 收敛优先于完备」写着：第一版改了 sessionStorage 里 `sqlType` 的结构、加了 `haveVersion` 推导和 `ref`，Shane 的原话是「为什么这么多，必选不就好了」；**终版只是把版本做成必填字段**。所以这块的正确解是最小改动 + 必填校验，不要顺手重构缓存结构、类型或校验通道（也是 [[convention-dt-insight-coding-standards]] 禁止 ref 校验的由来之一）。

## 根因与修复方案（本次会话结论，只给方案未改文件）

根因：`produceAuth.tsx` 取版本列表后写了

```ts
const echoVersion = saveStatus.version || data[0].dataVersion;
sessionStorage.setItem('version', echoVersion);
setDefaultSelect(echoVersion);
```

即「缓存为空就自动选中接口第一个版本」，并在挂载时就写进 sessionStorage。这是默认选择的直接来源。

方案（两个文件）：

1. `produceAuth.tsx`
   - 去掉 `|| data[0].dataVersion`；首次进入 `defaultSelect` 保持空，显示 placeholder（`I18N.pages.dataSource.components.produceAuth.H`，zh-CN 值「请选择对应版本」）。
   - 保留用户主动选择后的缓存（`onSelected` 里 `sessionStorage.setItem('version', value)`）、授权列表加载、以及从 Step 3 返回时的版本回显（`saveStatus.version`）。
   - 版本下拉包 `Form.Item name="version" rules={[{ required: true, message: H }]}`，不再用 `validateStatus` / `help`。
2. `addSource/index.tsx`
   - 父组件 `const [form] = Form.useForm()`，把 `form` 作为 prop 传给 `ProduceAuth`；「下一步」改成 `form.validateFields().then(() => verifyProject() && setCurrent(2))`。
   - 无版本选项的数据源（`version.length === 0`）不挂条件必填字段，原流程不受影响。

`H` 目前同时充当 placeholder 和必填提示文案。验收点：首次进入未默认选中、未选时报错在字段下方、选择后可前进、返回保留选择、切换数据源清掉旧版本、无版本数据源正常前进。

## r2 工作树复核（session 01a199f0，2026-11-02，`/Users/mac/.factory/ws/161496-r2`）

同一张单子的第二次「只给方案」会话，用户把要求说得更硬：

- 「这里看下 不需要默认版本了 所有数据源」；
- 「必选呢 不就好了，没选版本点下一步要拦住，作为表单下面的校验，不要用 message 提示」；
- 「只回复你的修复方案（改哪些文件、怎么改、为什么），不要修改任何文件」。

即验收口径就是：删掉隐式默认，版本必填，拦截点在「下一步」，报错显示在字段下方（`Form.Item rules`），**不用 `message`**。`所有数据源` 应理解为「所有有版本选项的数据源类型都适用」，`version.length === 0` 的类型照旧不出现版本字段（推断，单卡描述只写「去掉默认版本的选择」）。

该 worktree 读到的 HEAD 代码（仍未修）：

- `components/produceAuth.tsx:43` 仍是 `const echoVersion = saveStatus.version || data[0].dataVersion;`，紧接 `sessionStorage.setItem('version', echoVersion); setDefaultSelect(echoVersion);`（42–46 行）。
- `addSource/index.tsx:95` 的下一步仍是 `verifyProject() && setCurrent(2)`；`<ProduceAuth cleanInfoConfig={...} />` 只传了一个 prop（第 77 行），**没有** `form`。也就是说这个 worktree 的代码里看不到 `b92329ec4` 的「父组件 `Form.useForm()` + `validateFields()`」形状——先 `git log` / `git show` 确认基线再动手，别假设两笔 commit 已在当前分支。
- 版本 `Select` 本身不在 `Form` 里，`*` 是手写的：`.version-sel > span.version > b`（内联 `color: 'red'`）+ `I18N...produceAuth.G`；`Select` 固定 `style={{ width: 500 }}`、`showSearch`、`optionFilterProp="children"`、`value={defaultSelect}`、placeholder 用 `produceAuth.H`（96–128 行）。改成 `Form.Item rules` 后 antd 自己会渲染必填星，要同时删掉这个手写 `b`，否则两个星；`required` 标记与 `.version-sel` 的 flex 布局（`justify-content: space-between`，`addSource/style.scss`）也要一起看。
- `<AuthForm dataVersionRequired={version.length > 0} ... dataVersion={defaultSelect} />` 在 `produceAuth.tsx:131-136`；`AuthForm` 的 `needGetProductList` 判定在 `infoConfig/authForm/index.tsx:65-68`。
- `verifyProject()`（`infoConfig/authForm/utils.ts:6-14`）失败时用 `message.error(I18N...authForm.utils.A)`。这是仓库里既有的 `message` 用法，但用户明确说版本校验不要走 `message`：保留 `verifyProject` 管授权，版本另用 `Form.Item rules`。

抓代码的锚点（这次实测）：

- `rg -n 'dataSourceVersion|datasourceVersion|sourceVersion' apps packages --glob '*.{ts,tsx}'` → **0 命中**（exit 1）。字段名是 `dataVersion`，接口是 `queryDsVersionByType`，按 `dataSourceVersion` 搜会白费一轮。
- `rg --files | rg -i 'datasource.*(form|step|create|edit)|datasource'` → 约 130 条路径（大量 `assets/imgs/dataSource/logo/*.png`），只适合定位目录，不适合定位逻辑。逻辑用 `rg -n 'queryDsVersionByType|setDefaultSelect|dataVersionRequired|getSaveStatus|validateFields' apps/publicService/src/pages/dataSource`。
- 本次 `exec_command` 的结果都是内联完整返回的（`original_token_count` 2k–4k），没有触发 rtk 截断，与另一会话里 `git show` 被截断的情况不同。

本会话的最终答复是一条加密的 `send_message` 载荷（`gAAAAA…` base64），transcript 里没有可读的方案正文；上面的结论全部来自 agent 实际读到的代码和用户原话。

与下面「本次会话（`01a199f0`，worktree `161496-r1`）」一节的关系：同一个 session id，但本 transcript 的 `environment_context` 里 `cwd` 是 `/Users/mac/.factory/ws/161496-r2`，所以 `r1` 那个标注与 transcript 冲突（很可能是并行 agent 的 worktree 记错）。两个 worktree 读到的都是未修代码，结论不受影响。另，`produceAuth.H` 的确切 zh-CN 文案本 transcript 没有直接读到（本文件另一节记为 `'请选择对应版本'`，`apps/publicService/src/locales/zh-CN/index.ts` 约 2167 行；更早的笔记里曾写成「请选择版本」）：写代码前先 `rg -n 'produceAuth' apps/publicService/src/locales/zh-CN/index.ts` 确认，不要照记忆硬编文案。

## 分支上已有的「上一版」修复（重要）

该分支已有两条引用 #161496 的 commit，说明「把版本做成必填」这件事已经被改过一轮：

- `467a4323bd hotfix(publicService): #161496 require datasource version`
- `b92329ec4 hotfix(publicService): #161496 validate version in form`（2 文件，+139/−163：`addSource/index.tsx` 19 行、`components/produceAuth.tsx` 283 行）

`b92329ec4` 的 diff（+139/−163，只动 `addSource/index.tsx` 19 行与 `components/produceAuth.tsx` 283 行）方向是**删掉**第一版的 ref 方案：移除 `forwardRef` / `useImperativeHandle(ref, () => ({ validateVersion }))` / `versionError` / `validateStatus={...}` / `help={...}`，`addSource` 去掉了 `ProduceAuthRef` 与 `authRef`，改成 antd 表单；`produceAuth` 新增 `defaultSelect` state，并接到 `Select value` 和 `<AuthForm dataVersion={defaultSelect}>`。也就是说，「Form.Item rules + 父组件 validateFields」这条路线在 commit 里已经出现过一次，本次方案是在它基础上再补一刀（去掉默认选中）。

要点（现场核对过的）：

- 本轮读到的 `produceAuth.tsx` **仍然**保留 `const echoVersion = saveStatus.version || data[0].dataVersion;`，即默认选中首版的行为在 HEAD 上没被去掉——禅道状态虽然是 `resolved / Fixed`（resolvedBuild 1696），代码并未真正修掉这一点。**不要拿禅道 status 当已修复的证据。**
- 同时，`addSource/index.tsx` 的「下一步」在读取时仍是 `verifyProject() && setCurrent(2)`，`ProduceAuth` 也没收到 `form` prop；而 commit diff 里对应位置是 `form.validateFields().then(...)` + `form={form}`。两者不一致（`git show` 输出被截断 883 tokens），所以**动手前先用 `git show b92329ec4 -- apps/publicService/src/pages/dataSource/components/produceAuth.tsx apps/publicService/src/pages/dataSource/addSource/index.tsx` 确认 HEAD 到底落了哪一版**，别基于记忆里的形状改。

## 本次会话（`01a199f0`，worktree `161496-r1`，2026-11-02）核对到的事实

- 用户原话给的范围与验收口径：链接 + 「数据源中心 这里看下 不需要默认版本了 **所有数据源**」；「必选呢 不就好了，**没选版本点下一步要拦住，作为表单下面的校验，不要用 message 提示**」；以及「只回复你的修复方案（改哪些文件、怎么改、为什么），不要修改任何文件」。所以范围是**所有**带版本下拉的数据源类型，不是某个类型；校验必须是字段下方的 `Form.Item` 校验，`message.error` 拦不合格。
- 本轮交付的方案（回复原文要点）：只改 `produceAuth.tsx` 与 `addSource/index.tsx` 两个文件，**「覆盖所有带版本选择的数据源，单版本也不默认选中」**；`addSource` 建表单实例传给 `ProduceAuth`，「下一步」先 `form.validateFields()` 再走原 `verifyProject()` 与 `setCurrent(2)`，版本未选时停留当前步且不调 `message`；`onSelected` 里换版本清配置 + 清授权的逻辑保留；`version.length === 0` 的数据源不加必填。
- 必填提示文案**复用已有的 `I18N.pages.dataSource.components.produceAuth.H`**（zh-CN 值 `'请选择对应版本'`，`apps/publicService/src/locales/zh-CN/index.ts` 第 2167 行附近），这个 key 同时是版本 `Select` 的 placeholder；不要新造中文文案（`pnpm extract` 会拦裸中文）。注意不是「请选择版本」——那是 `addSource.index` 之外另一处的 `J: '请选择版本类型'`（同文件第 240 行）。
- **HEAD 形状已被完整读文件确认**（本会话 `cat` 了两个文件的全文，不是被截断的 `git show`）：`components/produceAuth.tsx:43` 仍是 `const echoVersion = saveStatus.version || data[0].dataVersion;`（后面紧跟 `sessionStorage.setItem('version', echoVersion)` 与 `setDefaultSelect(echoVersion)`）；`addSource/index.tsx` 第 1 步「下一步」仍是 `verifyProject() && setCurrent(2)`，`ProduceAuth` 也没收到 `form` prop，`SelectSource` 的 `nextType` 仍是 `setCurrent(1)`。这与 `b92329ec4` diff 里的 `form={form}` / `form.validateFields()` 的 `+` 行**不一致**，所以那笔 commit 的改动不能当作 HEAD 已生效；动手前以文件内容为准。
- `git branch --show-current` = `publicService/hotfix_6.3.x_161496`；`rg --files apps/console` 报 `No such file or directory`（该 worktree 只有 `apps/publicService`，数据源中心全在这里）。`git log -4 -- components/produceAuth.tsx` 顶部是 `785bb6f754 Merge branch 'publicService/release_6.3.x' into publicService/feat_6.3.x_15787`——分支名里带的是别的单号，别拿它判断当前任务。
- `zentao bug 161496` 的纯文本输出（未加 `--json`）一行给：`状态 resolved | 严重 3 | pri 3 | 产品 公共组件_STD | 项目 0`，指派 `wangzai`，创建 `zhizhang`，解决 `huaiju Fixed`。`--json` 里 `product: "48"`、`project: "0"`、`branch: "0"`、`steps` 只有 `/zentao/file-read-326425.png`。
- 与上面「r2 工作树复核」一节的关系：同一 session id（`01a199f0`）在本 transcript 里 header 写的是 `cwd=/Users/mac/.factory/ws/161496-r1`，另一份笔记记作 `161496-r2`；只是复核用的 worktree 不同，结论一致。本文的结论来自两个文件全量 `cat`，最终答复是**可读的修复方案正文**（不是加密 `send_message` 载荷）。

相关：[[convention-dt-insight-coding-standards]]、[[workflow-dt-insight-git-delivery-gates]]、[[system-dt-insight-studio-workspace]]、[[workflow-zentao-cli]]、[[publicservice-datasource-version-select-default]]、[[datasource-add-version-flow]]、[[datasource-center-add-source-flow]]、[[dt-insight-datasource-center]]。
