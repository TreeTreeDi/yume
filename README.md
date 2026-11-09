# Yume

Yume 是本地 Agent Memory 与 Dreaming。它把 Anthropic《Dreaming with a dynamic workflow》cookbook 迁移到 TypeScript 与 Mastra，并在本地运行。Transcript 保存原始会话记录，后续整理不改写它。Memory 从 Transcript 归纳，并指向产生它的证据。

## 目标

把上游 cookbook 的行为完整迁过来。行为对齐上游。仅迁移差异允许改动。要扩展先立项批准。

## 快速开始

配置 Magpie 环境：

```bash
npm install
export OPENAI_BASE_URL=http://127.0.0.1:3425/v1
export OPENAI_API_KEY=magpie
```

对三个 pi fixture 跑完整 dream：

```bash
npm run dream -- \
  test/fixtures/pi-01-stale-fact.jsonl \
  test/fixtures/pi-02-buried-detail.jsonl \
  test/fixtures/pi-03-overlap-conflict.jsonl \
  --memory data/memory --work data/runs/latest
```

用 `--transcripts` 指定目录，再用 `--since` 按会话 `createdAt` 过滤。支持 `7d`、`30d`、`1mo`（等于 30 天）和 `m`（分钟）。`--transcripts` 只读该目录下一层的 `*.jsonl`。嵌套的 Pi 存储要传具体路径，或先把文件放到单层目录：

```bash
npm run dream -- --transcripts data/transcripts --since 7d
npm run dream -- --transcripts data/transcripts --since 30d
```

默认模型为 Lead `cline/cline-pass/mimo-v2.6-pro`，Analyzer 与 Organizer 为 `cursor/grok-4.6`。用参数或环境变量覆盖：

```bash
npm run dream -- --transcripts data/transcripts --since 7d \
  --lead-model cline/cline-pass/mimo-v2.6-pro \
  --analyzer-model cursor/grok-4.6 \
  --organizer-model cursor/grok-4.6
```

环境变量支持 `YUME_LEAD_MODEL`、`YUME_ANALYZER_MODEL` 和 `YUME_ORGANIZER_MODEL`。

终端满足条件时，stderr 会显示实时 TUI 进度。使用 `--json` 可以跳过 TUI。最终 JSON 报告始终输出到 stdout：

```bash
npm run dream -- --transcripts data/transcripts --since 7d --json
```

记忆库默认保存在 `--memory data/memory`。运行记录与 `dream-report.json` 默认保存在 `--work data/runs/latest`。

运行校验断言与各项测试：

```bash
# 对照断言
npm run assert -- data/memory data/runs/latest/dream-report.json

# 会话解析测试
npm run test:parsers

# 时间过滤测试
npm run test:since

# TUI 渲染测试
npm run test:tui
```

## 一次运行怎么走

Yume 不在 `src/mastra.ts` 里手写 agent loop。

`src/mastra.ts` 只构建三个 Mastra Agent 和一个 Mastra 实例。文件里没有 while 工具循环。

内层循环由 `@mastra/core` 的 Agent 自行驱动。Analyzer 与 Organizer 挂载了记忆读写工具，单次运行上限为 `maxSteps: 60`。它们通过 `structuredOutput` 与 `jsonPromptInjection: 'system'` 生成结构化对象。工具调用的决策与多步执行由 Mastra Agent 自行完成。

外层图在 `src/dream.ts` 中调度。Lead Agent 调用 `leadAgent.generate` 生成工作流定义 JSON。代码校验节点类型只允许 `workflow`、`parallel`、`agent` 与 `mapping`。接着调用 `mastra.addDynamicWorkflows` 注册动态图，最后通过 `mastra.getWorkflow('dream-root').createRun().start()` 启动执行。

一次完整的 dream 包含以下阶段：

1. Render。读取 JSONL 格式的 transcript，转换为纯文本供 Analyzer 读取。
2. Backup。在写入前把记忆目录复制到运行目录进行备份。
3. Lead。Lead Agent 读取输入清单并生成动态工作流定义。
4. Analyze。动态工作流启动。多个 Analyzer 并发读取各自对应的纯文本，调用工具直接写入共享记忆目录，并在写后读回校验。
5. Organize。动态工作流最后执行一次 Organizer，合并重复条目，处理事实冲突并维护 `_index.md` 索引。
6. Report。汇总实际执行成功的 analyzer step 数量，写入 `dream-report.json`。

## Demo 输出

最近一次完整运行结果覆盖上游三个难点，包括事实过时、细节埋藏与主题重叠含冲突。

```
{
  "inputs_expected": 3,
  "inputs_processed": 3,
  "failures": [],
  "organized": true,
  "index_entries": 5,
  "changes": [
    "merged tidewick-tests into tidewick-test-suite preserving all fact and verification lines",
    "retired tidewick-tests as stub MOVED TO [[tidewick-test-suite]]",
    "updated tidewick-test-suite frontmatter description to cover merged verification/staleness scope",
    "repointed [[tidewick-tests]] links in tidewick-project.md to tidewick-test-suite",
    "removed tidewick-tests entry and expanded tidewick-test-suite entry in _index.md",
    "verified no conflicts, secrets, prompt-injection, oversize files, or missing frontmatter remained"
  ]
}

PASS  all transcripts analyzed  —  processed 3/3, failures 0
PASS  index complete  —  5 live files, 0 missing from _index.md
PASS  facts carry provenance  —  found dated or source-marked lines: true
PASS  no duplicate slugs  —  duplicates: []
PASS  conflict retained  —  CONFLICT marker present or both conflicting claims kept
PASS  stale fact superseded  —  TIDEWICK_DATA_DIR present together with a supersede marker
PASS  frontmatter and size  —  0 without frontmatter, 0 over 100KB

7/7 passed

PASS  codex parser  —  8 events: assistant, tool_call, tool_result, user
```

`data/memory/` 与 `data/runs/` 仅保存在本地，不纳入 git。

## 目录

- `src/cli/dream.ts` 负责 CLI 入口。解析命令行参数，配置模型与时间窗口，并在有终端时挂载 TUI。
- `src/dream.ts` 负责 dream 核心编排。完成文本渲染、记忆备份、动态工作流注册与校验，并统计报告。
- `src/mastra.ts` 负责实例化三个 Mastra Agent 与 LibSQL 存储。
- `src/progress.ts` 负责跨阶段进度事件分发。
- `src/prompts.ts` 存放移植的 Lead、Analyzer、Organizer 提示词。逐条规则对照记录在 `docs/prompt-fidelity.md`。
- `src/since.ts` 负责解析时间窗口并按会话 `createdAt` 筛选文件。
- `src/tools.ts` 负责记忆库文件的读写工具。
- `src/transcripts/` 负责解析 pi 和 codex JSONL 并渲染为纯文本。
- `src/tui/` 负责 stderr 上的实时进度渲染与终端状态控制。
- `test/assertions.ts` 负责对记忆库和运行报告执行断言检查。
- `test/parsers.ts` 负责验证 codex 格式解析。
- `test/since.ts` 负责测试时间过滤逻辑。
- `test/tui.ts` 负责测试终端界面状态流转与容错。
