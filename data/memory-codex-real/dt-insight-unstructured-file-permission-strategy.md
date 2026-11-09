---
name: dt-insight-unstructured-file-permission-strategy
description: Delta notes for the dataAssets 非结构化文件权限策略 (unStructured/permissionStrategy) module — the regex/全部路径 round-trip defects, matchValue string-vs-array drift, FileSelect side effects, and how to read factory `/root`-dispatched transcripts whose replies were encrypted. Code map lives in [[dt-insight-dataassets-permission-strategy]].
metadata: dt-insight-studio; app=dataAssets; source=codex session 01a199f0 (2026-11-02, worktree ws/149812-r1, read-only 方案 request for bug 149812)
---

# 非结构化文件权限策略 · 补充/校验缺口

完整代码地图、接口 URL 表、i18n key 树、149812 卡片字段见 [[dt-insight-dataassets-permission-strategy]] 与 [[bug-dataassets-permission-strategy-149812]]；本页只放那两页没有的读码发现和过程经验，避免第三份重复地图。

## 案例背景（本会话边界）

用户给出禅道 `http://zenpms.dtstack.cn/zentao/bug-view-149812.html` 并说「这个修复好」，要求**只回修复方案（改哪些文件、怎么改、为什么），不要修改任何文件**。Agent 全程只跑 `cat` / `rg` / `nl -ba | sed -n`，未落 diff —— 与 [[dt-insight-project-conventions]] 的「明确局部修改 / 只给方案不走 intake」一致。该卡片**在本会话里没有读过**（本会话只凭「正则」关键词收窄到本模块），工作区 `/Users/mac/.factory/ws/149812-r1`（`<taskid>-r<N>` 命名）。

## 正则 / 全部路径往返缺陷（读码推断，未复现）

1. `utils.ts` 的 `fileObjectRowToTarget` 在 `MatchMode.Regex` 分支显式允许 `catalogId: path !== PATH_ALL_OPTION ? path : undefined`，即**整 bucket 正则**是合法 payload；但反向 `TARGET_TO_ROW_BUILDERS[MatchMode.Regex]` 只回填 `path: t.catalogId`，而 `fileObjectSelector` 的路径 `Form.Item` 带 `required: true` → 编辑这种策略时路径为空、直接标红「请选择路径」，保存被拦。这是「正则 + 全部路径」无法二次编辑的根因候选。
2. 正则分支的 `matchValue` `Form.Item` **完全没有 `rules`**（只套 `Input`，占位符 `…fileObjectSelector.index.K` = 「请输入正则表达式，例如abc*」），空正则与非法正则都能进 `onFinish` → `buildStrategyPayload` 原样下发 `fileRegex`；对照同表 `bucket` / `path` 都有 required（占位 `E` / `H`）。修复时按仓库规范写 `Form.Item rules` + `form.validateFields`，不要用 `message` 拦（[[dt-insight-frontend-conventions]]）。
3. 形状漂移：UI `FileObjectItem.matchValue` 是 `string[]`、`FileObjectRow.matchValue` 是 `string | string[]`、payload `fileRegex` 是字符串；`Exact` 分支回填 `targetIds.map(String)` 而提交时 `targetIds: matchValue` 直接下发 → 编辑一次就可能 string/number 不一致。
4. 次要：改 `bucket` 只重置 `path` + `matchValue`，**不动 `matchType`**；`FileSelect` 的 `useEffect` 依赖只有 `[catalogId, disabled]`（`onChange` 未列入，靠 `isFirstRender` ref 跳过首次清空），`disabled`（路径 = 全部）分支只清 `options`、不调用 `onChange(undefined)`，陈旧值靠调用方 `onChange` 兜底。
5. 文件列表固定 `getFileList({current: 1, size: 200, …})`，单目录超 200 个文件时后面的选不到；`fileType` 只含 `FileType` 的 Docs/Image/Video/Audio/Zip/Other —— 「选择器里找不到文件」可能只是这个查询限制。

以上全部来自读代码：没复现、没 `dtis ready`、没截图，按仓库规则只能算「推断」。要转成结论需：读 149812 卡片确认现象 → `verify-studio` 起 dev 在含正则策略的编辑页取证（[[dt-insight-studio-test-env-access]]）。

## 蒸馏这类会话的注意点

- factory（`/root` 派发）运行时的子 Agent 用 `send_message` 回话，正文是 Fernet 密文 blob（`gAAAAA…`），transcript 里只有 `Message Type: NEW_TASK / MESSAGE` 外壳 —— **方案正文不可恢复**，能从 transcript 取的事实只有它跑过的命令和 `TOOL RESULT`。判读时别指望 agent 的自然语言结论。
- 技能路径：AGENTS.md 指向 `/Users/mac/.agents/skills/**`，可读原件在 `/Users/mac/factory/env/skills/`（本会话 `cat /Users/mac/factory/env/skills/typescript-best-practices/SKILL.md` 与 `.../principle-type-system-discipline/SKILL.md` 均成功；后者要求「外部数据先 parse 成命名域类型、品牌化语义原始值、`as` 只在验证后用」，与 [[dt-insight-coding-standards]] 的禁用 `as` 一致）。
- `apps/dataAssets/src/pages` 不存在（`rg` 直接 ENOENT），页面全在 `src/views/**`；按 `pages` 搜会白跑一轮。
