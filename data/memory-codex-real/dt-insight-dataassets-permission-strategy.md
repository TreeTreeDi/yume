---
name: dt-insight-dataassets-permission-strategy
description: Companion detail file for apps/dataAssets 非结构化「权限策略」 beyond the main code map — FILE_ALL_OPTION/PATH_ALL_OPTION exclusivity, Upload permission stripping on effectiveType change, regex rows that lose 「全部路径」 on echo, FileSelect 200-file limit, i18n key groups, and where matchValue validation is missing (bug 149812). Read with dataassets-unstructured-permission-strategy.
metadata: session 01a199f4 (codex, 2026-11-02, worktree /Users/mac/.factory/ws/149812-r1); read-only investigation — user asked for a plan only, nothing was edited
---

# dataAssets 权限策略：表单联动与契约边界（补充）

主代码地图：[[dataassets-unstructured-permission-strategy]]（目录、表单流、MatchMode→payload 表、URL、i18n key 树都在那里）。本文件只放那张地图没写、改代码时容易踩的细节。Bug 卡片与建议修法：[[bug-dataassets-permission-strategy-149812]]。

## 表单联动（改动这些极易回归）

- 切换 `effectiveType`（`addOrEdit/index.tsx` 的 `handleEffectiveTypeChange`）会做三件事：`form.resetFields(['effectiveObject'])`；若新类型不在 `UPLOAD_SUPPORTED_TYPES` 里，把 `PermissionCode.Upload` 从 `permissionRange` 中过滤掉（`form.setFieldValue('permissionRange', cur.filter(c => c !== PermissionCode.Upload))`）；再 `mutate()` 对应选项 hook（`useGetAllCatalog` / `useGetAllLabelWithDetail` / `useGetAllDataset` / `useGetAllCatalogTree`）。`FileObjectSelector` 只在 `EffectiveType.File` 下渲染。
- bucket 变更时的清理是**就地改行对象再整体回写**：`const fileObjects = form.getFieldValue('fileObjects'); fileObjects[field.name].path = undefined; fileObjects[field.name].matchValue = undefined; form.setFieldsValue({ fileObjects })`。同文件 path/matchType 的 onChange 也是这个写法——想改成不可变更新要整片一起改，别只改一处。
- `FILE_ALL_OPTION`（「全部」文件）互斥逻辑写在 `FileSelect.handleChange`：只选「全部」→ 保留；已含「全部」又选了具体文件 → 过滤掉「全部」；只选「全部」而原值不含它 → 收成 `[FILE_ALL_OPTION]`；其它按原样回写。
- `FileSelect` 的取数边界：`getFileList({catalogId: Number(catalogId), current: 1, size: 200, fileType: permissionStrategyFileTypes})`，只取**第一页 200 条**，`fileType` 固定为 `[FileType.Docs, Image, Video, Audio, Zip, Other]`。所以「下拉里找不到某文件」通常是这个查询的限制（超 200 条 / 其它 FileType），不是表单 bug；`catalogId` 变化时清空已选值（`isFirstRender` ref 跳过首次），`disabled`（路径=全部）时不请求、只给「全部」一项。
- 正则分支允许「路径=全部」（此时 `catalogId` 提交为 `undefined`，即整个 bucket 用正则）。但回显 `mapDetailToForm` → `TARGET_TO_ROW_BUILDERS[MatchMode.Regex]` 只还原 `path: catalogId`，**整 bucket 的正则保存后编辑页路径会变空**，要一并考虑。
- 两个分支共用 `name={[field.name,'matchValue']}`，切换 `matchType` 会换子树；给 `Form.Item` 加 `rules` 时不要用 `noStyle`，否则错误信息没有落点。
- `bucket` / `path` 的 `Form.Item` 都有 `required` 规则；`matchValue` 的两个 `Form.Item` 都**没有 `rules`**，`onClick={() => form.submit()}` 会直接把空正则 / 未选文件提交到 `/unstructuredPermission/strategy/create|update`（[[bug-dataassets-permission-strategy-149812]]）。`strategyName` 的重名校验是接口校验（`checkStrategyName` → `form.setFields([{name:'strategyName', errors:[…]}])`），属于「字段下报错」的正确写法，不要改成 `message.error`。

## i18n key 组（zh-CN，值可直接复用）

- `views.unStructured.permissionStrategy.addOrEdit.constants`：A 文件、B 编目、C 标签、D 数据集、E 存储路径、F 上传、G 预览、H 下载、I 删除、J 选择文件、K 正则匹配。
- `…addOrEdit.components.fileObjectSelector.index`：A/B「全部」、C 请选择、D 全部、E 请选择 bucket、F 请选择、G 路径、H 请选择路径、I 请选择、J 类型、K「请输入正则表达式，例如abc*」（正则输入框 placeholder）、L 操作、M 删除、N 新增。
- `…addOrEdit.components.permissionScopeSection.index`：A 生效对象、B/C 权限范围 + 提示、D/E 生效对象 + 提示、F/G 存储路径 placeholder、H/I 权限范围 + 提示。
- 新增文案一律走 `fnm exec --using 18 pnpm extract` → 只翻 en-US → `pnpm extract check`，不手改 `locales/**`（见 [[dt-insight-coding-standards]]）。定位 key 时先 `rg -n 'fileObjectSelector:' src/locales/zh-CN/index.ts` 再 `nl | sed -n` 打印附近几十行，该文件 7000+ 行、整份打印没意义。

## 检索事实

- `apps/dataAssets/src/views/` 下没有 `pages` 目录；`rg apps/dataAssets/src/pages` 直接报 `No such file or directory`。
- zsh 对无匹配的 glob 会整条命令失败（`no matches found: apps/dataAssets/src/pages/security*`），用 `rg --files ... | rg -i 'permission|strategy'` 代替。
- `docs/solutions/` 里搜 `权限策略|正则|文件类型|dataAssets` 只命中 `ui-bugs/publicservice-password-policy-stale-on-reset.md` 与 `ui-bugs/portal-missing-product-card-defaultapps-whitelist.md`，**没有**权限策略校验类既有解法可抄。2026-11-02 的 `rg --files docs/solutions` 全量（16 个文件）里最接近可复用的两篇是 `conventions/form-validation-next-step.md`（Steps/弹窗必填统一交给 `Form.Item rules` + `validateFields()`；149812 会话已全文读过）和 `ui-bugs/antd-form-explain-min-height-blocks-help-leave.md`（antd 表单错误文案区的展示问题，往字段下加必填提示前值得先看）。
- 权限策略 URL 有两套，别混：非结构化 `/unstructuredPermission/strategy/*`（`reqUrls.ts` ~759-767，`create/update/detail/batchDelete/pageQuery/checkName` + `checkFilePermission`、`queryPermissionCodes`）与旧结构化 `/dataAuth/*`、`/dataPermission/*`。`createStrategy` 在 `apps/dataAssets/src/api/fileManage.ts:151`。
- 派发类会话（`Message Type: NEW_TASK / MESSAGE`、`Sender: /root`）里 agent 的最终方案是通过 `send_message` 的密文 payload 回给 `/root` 的，明文导出看不到方案原文——只能从它读过的文件和工具结果推结论，别假设导出里一定有最终答复。
