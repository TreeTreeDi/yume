---
name: bug-dataassets-permission-strategy-149812
description: ZenTao bug 149812（资产多模态 · 权限策略-文件：正则规则/文件为空时保存报 SQL 异常，改成必填提示）— 卡片字段、apps/dataAssets permissionStrategy 代码地图、根因（matchValue 的 Form.Item 没有 rules）、提出的修法与验收点，以及「不要手改 locales/**」的 i18n 冲突。动 apps/dataAssets/src/views/unStructured/permissionStrategy 或遇到「空值绕过校验打到后端」的 Bug 时先读。
metadata: codex 2026-11-02 两个只读方案会话 — 01a199f0（worktree /Users/mac/.factory/ws/149812-r1）与 01a199f8（worktree /Users/mac/.factory/ws/149812-r2，跑了 `zentao bug 149812 --json` 并读码出方案）；两次都没有改代码
---

# Bug 149812 — 权限策略「文件」正则/文件为空时保存报 SQL 异常

模块代码地图见 [[dataassets-unstructured-permission-strategy]] / [[dt-insight-dataassets-permission-strategy]] / [[dt-insight-unstructured-file-permission-strategy]]；表单校验规范见 [[dt-insight-coding-standards]]、[[convention-dt-insight-coding-standards]]。

## 卡片（`zentao bug 149812 --json`，读取于 2026-11-02）

| 字段 | 值 |
|------|----|
| title | 【资产多模态】权限策略-文件，正则规则为空时保存，报错sql异常，改成必填提示 |
| product | `207`（资产多模态 / dataAssets） |
| type / severity / pri | 产品BUG / 3 / 3 |
| status | `closed`；`activatedCount 1`，`activatedDate 2026-04-24 10:42:28` |
| openedBy / openedDate | kesong / 2026-04-23 17:42:59，`openedBuild 1605` |
| assignedTo | huaiju（`assignedDate 2026-04-24 17:39:56`） |
| closedBy / closedDate | kesong / 2026-04-24 17:39:56 |
| resolvedBy / resolution / resolvedBuild | **全空** — 卡片是直接 closed，没有记录解决人和构建 |
| testtask / customer / compliance | `2139` / 标准版本_袋鼠云 / 3 |
| module / branch / project / story | 全为 `0`（卡片没有钉模块和分支） |
| steps 环境 | uic `http://shuzhan70-test-wz.k8s.dtstack.cn/`，租户 `aac` |

Steps 里产品的要求是两句：可以去掉后端报错、由前端做校验；**并且「选择文件时，文件选择框也做必填校验」**（两张截图 `file-read-280381.png` / `file-read-280382.png`）。所以两个分支（正则输入框、文件多选框）都要必填，不能只修正则。

`status closed` + 空的 `resolvedBy` 说明**不能把 closed 当成「已修」**：2026-11 的会话仍然认为校验缺失。动手前先 `git log --oneline -- apps/dataAssets/src/views/unStructured/permissionStrategy` 看有没有同类改动。

## 本机上下文

- worktree / session 对应：**01a199f8 = `/Users/mac/.factory/ws/149812-r2`**（`SESSION` 头的 cwd，2026-11-02T01:56Z 创建）、01a199f0 = `/Users/mac/.factory/ws/149812-r1`。早前本页把两者记反过，认 session 一律以 transcript `SESSION` 头的 cwd 为准。两次都在分支 `dataAssets/fix_7.0.x_149812`（app 前缀 + `fix_7.0.x_<id>`），`git status --short` 为空。
- 用户要求「只回复你的修复方案（改哪些文件、怎么改、为什么），不要修改任何文件」，因此**方案未落地、未验证**；不要当成已修好的事实。
- 01a199f8 的执行路径：`zentao bug 149812 --json`（上表字段即该次输出）→ 读 `docs/agents/coding-standards.md`、triage skill、`docs/solutions/conventions/form-validation-next-step.md` → `rg` 定位到 `views/unStructured/permissionStrategy/addOrEdit/components/fileObjectSelector/index.tsx`。回复按「正则模式 / 选择文件模式 / 提交拦截」三点给方案，结尾自认「以上仅为方案，未修改文件」。精确锚点：文件里 `:319` 是正则分支的 `Form.Item name={[field.name,'matchValue']} className="type-value"`（内套 `Input`），`:328` 是同一个 `name` 的文件分支（内套 `FileSelect`）。
- 该目录近期提交里有 `5f34d79274 refactor(dataAssets): #149627 improve constants and utils readability in permissionStrategy`、`6b6acb4103 fix(dataAssets): #149576 filter permission strategy users by finalRoles`，合并来自 `dataAssets/test_7.0.x_multimodal_0330_2`。

## 根因（代码证据）

`apps/dataAssets/src/views/unStructured/permissionStrategy/addOrEdit/components/fileObjectSelector/index.tsx` 里，表格前两列（`bucket`、`path`）的 `Form.Item` 都有 `rules: [{ required: true, message: … }]`，但第三列「类型」下的 `matchValue` 两个 `Form.Item` 都**没有 `rules`**：

- 正则分支：`matchType === MatchMode.Regex` → `<Form.Item name={[field.name, 'matchValue']} className="type-value"><Input placeholder="请输入正则表达式，例如abc*" /></Form.Item>`
- 文件分支：否则 → 同一个 `name`，里面是 `<FileSelect catalogId={pathIsAll ? undefined : path} disabled={pathIsAll} />`

空值能过 `form.submit()` 的校验，进 `onFinish` → `buildStrategyPayload` → `fileObjectRowToTarget` 在 `MatchMode.Regex` 分支返回 `fileRegex: undefined`（Exact 分支返回 `targetIds: undefined`），请求照样发到 `/unstructuredPermission/strategy/create|update`，后端 SQL 异常。这是「已有校验漏在路径差异」，不是整段缺失（对照 [[dt-insight-coding-standards]] 的 Bug fix 一节）。

组件本身会主动清空 `matchValue`，所以空值是正常操作路径产生的，不是脏数据：改 `bucket` 清 `path` + `matchValue`；路径 `onChange` 里只有 `val === PATH_ALL_OPTION && matchType !== Regex` 才补 `[FILE_ALL_OPTION]`，否则 `undefined`；切换类型时只有 `Exact && pathIsAll` 才补 `[FILE_ALL_OPTION]`，**切到 Regex 直接清空**，用户不输入就提交。`path === PATH_ALL_OPTION` 时 `FileSelect` 是 `disabled` 且预填 `[FILE_ALL_OPTION]`，这就是「朴素的 required 会误拦」的那个合法分支。

页面层也解释得通为什么漏了：`permissionScopeSection/index.tsx` 给 `<FileObjectSelector />` 外面套的 `Form.Item` 只写了 `required`、没有 `name`，那个星号不参与校验；真正能挂规则的只有表格单元格里的 `Form.Item name={[field.name, 'matchValue']}`。

## 关键常量与契约（`.../permissionStrategy/constants.ts`、`addOrEdit/utils.ts`）

- `EffectiveType { File=1, Catalog=2, Tag=3, Dataset=4, StoragePath=5 }`；`PermissionCode` = `upload | preview | download | delete`；`ValidPeriodType { Permanent='permanent', Custom='custom' }`；`SubjectType { AllUser=1, User=2, Group=3 }`。
- `MatchMode { Exact=0, AllFileInDir=1, Regex=2, AllFileInBucket=3 }`；`PATH_ALL_OPTION '__path_all__'`、`FILE_ALL_OPTION '__all__'`、`USER_ALL_OPTION '__all_user__'`。
- `UPLOAD_SUPPORTED_TYPES = [Dataset, StoragePath]` 决定 `getPermissionOptions` 是否显示「上传」，`handleEffectiveTypeChange` 也用它把 `upload` 从已选 `permissionRange` 里剔除。
- Regex target = `{ bucketId, catalogId: path !== PATH_ALL_OPTION ? path : undefined, matchMode: Regex, fileRegex: matchValue }`；`PATH_ALL_OPTION` 优先于 `FILE_ALL_OPTION`；`mapDetailToForm` 用 `TARGET_TO_ROW_BUILDERS` 反向回填，`Regex` 把 `fileRegex` 直接塞回 `matchValue`。
- 接口都在 `@/api/fileManage`：`getStrategyDetail` / `checkStrategyName` / `createStrategy` / `updateStrategy` / `getBucketList` / `getAllCatalogTree` / `getFileList`；数据 hook：`useGetAllCatalog`、`useGetAllLabelWithDetail`、`useGetAllDataset`、`useGetAllCatalogTree`（+ `loopAllCatalogTree`）、`useUserGroupList`、`useUserList`。
- i18n 锚点：`I18N.views.unStructured.permissionStrategy.addOrEdit.components.fileObjectSelector.index.A…N`（`K` = `请输入正则表达式，例如abc*`，`M` 删除，`N` 新增；`E` `请选择 bucket`、`H` `请选择路径`），en-US 镜像 `apps/dataAssets/src/locales/en-US/index.ts`。
- 「选择文件」的选项来自 `getFileList({ catalogId, current: 1, size: 200, fileType: [Docs,Image,Video,Audio,Zip,Other] })`，单目录超过 200 个文件后面的选不到（潜在缺陷，未验证）。

## 提出的修复方案

只动 `fileObjectSelector/index.tsx`：

1. 正则分支的 `matchValue` `Form.Item` 增加 `required` + `whitespace` 规则，消息「请输入正则规则」（或「请输入正则表达式」），空值/纯空格时错误显示在输入框下方。
2. 文件分支的 `matchValue` `Form.Item` 增加 `required` 规则，消息「请选择文件」，未选或清空后提示。
3. 保留「全部」选项和现有自动赋值逻辑（合法的「全部」= `[FILE_ALL_OPTION]` 仍可提交）。
4. 提交链路不动：页面已经是 `form.submit()` → 校验 → `onFinish`，补齐 `rules` 即可挡住空值，无需改 `onFinish` / `buildStrategyPayload`，也就不会再有 SQL 异常。

**文案不要按会话回复里的做法手改 `locales/**`。** 两份只读方案回复都写了「更新对应的 zh-CN/en-US 语言文件」（01a199f0 更明确写「改 zh-CN/index.ts + en-US/index.ts 新增 key」），但仓库规范（`docs/agents/coding-standards.md`、[[convention-dt-insight-coding-standards]]）要求源码里直接写中文 → `fnm exec --using 18 pnpm extract` → 只翻 en-US 新增项 → `pnpm extract check`，评审见到 `locales/**` 新增字段算硬违规。按 extract 流程做。

验收覆盖：新增策略、编辑策略、多行 fileObjects、切换匹配类型（正则 ↔ 精确）后再清空、清空文件、纯空格正则；确认提示落在对应字段下且**没有发出保存请求**；合法输入与「全部文件」仍可保存；最后 `dtis ready`。

## 坑 / 待确认

- 文件分支复用了同一个 `name={[field.name,'matchValue']}`，切换 `matchType` 时子树会被换掉；给 `Form.Item` 加 `required` 时不要用 `noStyle`，否则提示没有落点。
- 编辑态回显走 `mapDetailToForm` → `TARGET_TO_ROW_BUILDERS[MatchMode.Regex]` 会把 `fileRegex` 塞回 `matchValue`；历史脏数据里 `fileRegex` 为空时，加 `required` 后编辑页会直接标红——这是预期，验收时要说明。
- 「正则 + 全部路径」往返会丢：`Regex` 的 target 允许没有 `catalogId`，但回填时 `path: t.catalogId`（undefined）撞上路径的 `required` → 编辑页报「请选择路径」。修 `matchValue` 必填时别把这个既有问题当成新回归。
- 只读方案会话的 todo 用 `skip:` 标明跳过的步骤（`skip: 只读方案，使用禅道现象并标注尚未现场复现`、`skip: 不实施`、`skip: 不改文件`），回复结尾写「尚未现场复现 SQL 异常」。保持「实际验证 vs 推断」分开（AGENTS.md 原则 11）。
- 禅道卡片已经把两处需求（正则必填、文件选择必填）写在 steps 里，所以不需要为澄清再问一轮，复现成本也不值得——符合 [[workflow-dt-insight-triage-routing]] 的「标题能看懂就不复现」。
