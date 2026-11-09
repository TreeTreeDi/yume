---
name: dataassets-unstructured-permission-strategy
description: Code map of 资产多模态 (apps/dataAssets) 非结构化「权限策略管理」— directory layout under src/views (no src/pages), addOrEdit form flow, the fileObjects table and MatchMode→payload mapping, API URLs, i18n key nesting. Read before editing permissionStrategy / unstructured permission code.
metadata: session 01a199f8 (codex, 2026-11-02, worktree /Users/mac/.factory/ws/149812-r2) reading repo on `dataAssets/fix_7.0.x_149812`
---

# apps/dataAssets 非结构化「权限策略管理」代码地图

`apps/dataAssets` 是本仓库里【资产多模态】那个 app。改动走 app 前缀分支（本例 `dataAssets/fix_7.0.x_149812`），见 [[workflow-dt-insight-triage-routing]]。

同主题更详尽的另一份代码地图（其他 agent 同期整理，含 addOrEdit 的 effectiveType 切换、PermissionCode.Upload 联动、i18n 取 key 技巧）：[[dt-insight-dataassets-permission-strategy]]。

## 路径（先看这里，容易找错）

- 页面在 **`apps/dataAssets/src/views/unStructured/permissionStrategy/`**。`apps/dataAssets/src/pages` **不存在**（`rg` 会报 `IO error ... No such file or directory`）；dataAssets 用 `src/views/`，不要照 console/publicService 的 `src/pages` 习惯找。
- 找回入口：`rg --files apps/dataAssets/src | rg 'permissionStrategy/.+(tsx|ts)$'`。

```
views/unStructured/permissionStrategy/
├── index.tsx                       列表页（/permissionStrategy）
├── constants.ts                    EffectiveType / MatchMode / PermissionCode / SubjectType / ValidPeriodType / FILE_ALL_OPTION / PATH_ALL_OPTION / USER_ALL_OPTION, MatchModeOptions, getPermissionOptions
├── types.ts
├── components/{detailDrawer,searchForm,tableFooter}/index.tsx
└── addOrEdit/
    ├── index.tsx                   新增/编辑页（路由 /permissionStrategy/add|edit/:id）
    ├── utils.ts                    buildStrategyPayload / fileObjectRowToTarget / mapDetailToForm
    ├── index.scss
    └── components/{fileObjectSelector,permissionScopeSection,subjectSection,validityPeriodField}/index.tsx
```

## 新增 / 编辑页表单流

- `const [form] = Form.useForm()`，`<Form form={form} layout="vertical" onFinish={onFinish} colon={false}>`，`initialValues={{ effectivePeriod: ValidPeriodType.Permanent, permissionRange: [] }}`；底部按钮 primary 走 `onClick={() => form.submit()}`——所以校验只能靠 `Form.Item rules`，`rules` 缺失的字段会直接提交出去。
- `onFinish`：`fileManageAPI.checkStrategyName({ strategyName, ...(id ? { id: Number(id) } : {}) })` → `data === false` 时 `form.setFields([{ name: 'strategyName', errors: [I18N.…index.A] }])` 并 return → `buildStrategyPayload(values)` → `updateStrategy({ id, ...payload })` 或 `createStrategy(payload)` → `res.success` 后 `navigate('/permissionStrategy')`。（注意这是接口重名校验，不是字段规则。）
- `effectiveType`（生效对象）切到 `EffectiveType.File` 时才渲染 `FileObjectSelector`；其它类型渲染目录/标签/数据集/存储路径的 `effectiveObject`。
- `PermissionScopeSection` 用 `<Form.Item noStyle dependencies={['effectiveType']}>` + `getFieldValue` 分支；对外 props 是已拉好的 `catalogOptions / tagOptions / datasetOptions / storagePathTreeData` 及各自 `loading`。
- `SubjectSection` 收 `form` + `userGroupOptions / userOptions`；用户下拉只保留 `finalRoles` 全部属于 `DATA_ASSETS_ROLE.DATA_DEVELOPER` / `VISITOR` 的用户（`ALLOWED_USER_ROLE_VALUES`）。

## 权限范围 = 文件：`fileObjectSelector/index.tsx`

- 结构：`<Form.List name="fileObjects" initialValue={[defaultFileObjectItem]}>` + antd `Table`（`rowKey="key"`，`dataSource={fields}`，`pagination={false}`，footer 是「新增」链接按钮 `operation.add({ ...defaultFileObjectItem })`）。删除按钮在只有一行时 disabled。
- 行字段：`bucket`（Select，必填）、`path`（TreeSelect，必填，无 bucket 时 disabled，首项是「全部」= `PATH_ALL_OPTION`）、`matchType`（Select，`initialValue={MatchMode.Exact}`，选项来自 `MatchModeOptions`）、`matchValue`（见下）。
- `matchValue` 的两个形态（同一个 `name`，按 `matchType` 切换子树）：正则 → 纯 `Input`；其它 → 自定义 `FileSelect` 多选（`mode="multiple"`，含「全部」`FILE_ALL_OPTION`，`maxTagCount="responsive"`，`showSearch` + label 过滤）。`FileSelect` 在路径为「全部」时 `disabled` 且只给 `FILE_ALL_OPTION`。
- `FileSelect` 取数：`fileManageAPI.getFileList({ catalogId: Number(catalogId), current: 1, size: 200, fileType: permissionStrategyFileTypes })`，`permissionStrategyFileTypes = [FileType.Docs, Image, Video, Audio, Zip, Other]`；`res.data.contentList.map(f => ({ value: f.id, label: f.fileName }))`。`catalogId` 变化时清空已选（`isFirstRender` ref 跳过首次）。
- 自动联动（改这些联动时别破坏）：
  - 换 `bucket`：清该行 `path` 和 `matchValue`。
  - 选路径为「全部」且 `matchType !== Regex`：`matchValue = [FILE_ALL_OPTION]`。
  - `matchType` 切到 `Exact` 且路径是「全部」：`matchValue = [FILE_ALL_OPTION]`；切到别的类型则清空。
- **已知缺口**：`bucket`、`path` 有 `required` 规则，`matchValue` 的 Form.Item 完全没有 `rules` → 空值可提交，后端 SQL 异常。证据行号（2026-11-02 读到的树）：`fileObjectSelector/index.tsx:319` 正则分支、`:328` 文件分支，两处同名 `name={[field.name,'matchValue']}` 且都无 `rules`；`matchType` 的 `Form.Item` 只有 `initialValue={MatchMode.Exact}`（下拉必有值，不需要规则）。修法与验收见 [[bug-dataassets-permission-strategy-149812]]。

## MatchMode → 接口 payload（`addOrEdit/utils.ts`）

`MatchMode` 四个值：`Exact` / `Regex` / `AllFileInBucket` / `AllFileInDir`。`fileObjectRowToTarget` 的优先级：

| 行状态 | 提交 |
|--------|------|
| `matchType === Regex` | `{ bucketId, catalogId: path !== PATH_ALL_OPTION ? path : undefined, matchMode: Regex, fileRegex: matchValue }` |
| `path === PATH_ALL_OPTION`（非正则） | `{ bucketId, matchMode: AllFileInBucket }` |
| `matchValue` 含 `FILE_ALL_OPTION` | `{ bucketId, catalogId: Number(path), matchMode: AllFileInDir }` |
| 其它 | `{ bucketId, catalogId: Number(path), matchMode: Exact, targetIds: matchValue }` |

反方向 `mapDetailToForm` 用 `TARGET_TO_ROW_BUILDERS[MatchMode.*]`：`AllFileInBucket` → `path: PATH_ALL_OPTION + matchValue: [FILE_ALL_OPTION]`；`AllFileInDir` → `path: catalogId + [FILE_ALL_OPTION]`；`Regex` → `matchValue: fileRegex`；`Exact` → `matchValue: targetIds.map(String)`（`bucket: String(bucketId)`）。

`buildStrategyPayload` 其它字段：`effectType = effectiveType`；`permanent = effectivePeriod === ValidPeriodType.Permanent ? 1 : 0`，非永久时 `validityDeadline = values.validityDeadline?.format('YYYY-MM-DD HH:mm:ss')`；主体为 `subjectType`（`AllUser` / `Group` / `User`）+ 可选 `subjectIds`（全用户时省略）；非 File 生效对象时 `targets = [{ targetIds: effectiveObject.map(Number) }]`。

## API / 常量

- `apps/dataAssets/src/api/fileManage.ts` 暴露 `createStrategy` / `updateStrategy` / `checkStrategyName` / `getBucketList` / `getAllCatalogTree` / `getFileList` 等。
- URL 在 `apps/dataAssets/src/consts/reqUrls.ts`（前缀 `NEW_DATA_URL`），非结构化一套在 ~760 行：
  `PERMISSION_STRATEGY_CHECK_NAME` → `/unstructuredPermission/strategy/checkName`、`PAGE_QUERY` → `/unstructuredPermission/strategy/pageQuery`、`CREATE` → `.../create`、`UPDATE` → `.../update`、`BATCH_DELETE` → `.../batchDelete`、`DETAIL` → `.../detail`。
  另有旧的（结构化）权限策略：`ADD_OR_UPDATE_DATA_AUTH` → `/dataAuth/addOrUpdate`、`CHECK_AUTH_STRATEGY_EXIST` → `/dataAuth/checkNameExist`、`QUERY_PERMISSION_ASSIGN_LIST` → `/dataPermission/pageQueryStrategy`、`QUERY_PERMISSION_ASSIGN_DETAIL` → `/dataPermission/queryDetail`——两套别混。

## i18n

- 文案在 `apps/dataAssets/src/locales/**/index.ts`，按目录层级生成单字母 key，例如 `I18N.views.unStructured.permissionStrategy.addOrEdit.components.fileObjectSelector.index.A…N`。该组现有：A/B 两种「全部」label、C「请选择」、D「全部」、E「请选择 bucket」、F「请选择」、G「路径」、H「请选择路径」、I「请选择」、J「类型」、**K「请输入正则表达式，例如abc*」（正则输入框 placeholder）**、L「操作」、M「删除」、N「新增」。
- 规范和流程（源码写中文 → `pnpm extract` → 只翻 en-US）见 [[dt-insight-coding-standards]]；不要在 `locales/**` 手写新 key。

## 取数/检索踩坑

- `rg` 直接扫 `apps/dataAssets/src/pages` 会失败；先 `rg --files` 定位目录再读文件。
- 一次性 `cat` 三个大文件会被工具截断（本例 ~10k token，输出末尾被裁掉），要按行号 `sed -n` / `nl -ba | sed -n` 补读关键片段。
