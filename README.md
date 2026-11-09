# Yume

Yume 是本地 Agent Memory 与 Dreaming。它把 Anthropic《Dreaming with a dynamic workflow》cookbook 的行为迁移到 TypeScript 加 Mastra，本地运行。

Transcript 是证据。它保存会话留下的原始记录。后续整理不改写 Transcript。

Memory 是整理后的知识。它从 Transcript 归纳而来，并指向产生它的证据。

## 目标

把上游 cookbook 的行为完整迁移过来。行为对齐上游。仅迁移差异允许改动。要扩展先立项批准。

## 工作方式

一次 dream 有三个角色。Lead 读输入清单，产出 Mastra 动态工作流定义。每个 transcript 分配一个 Analyzer。Analyzer 并发直写共享记忆目录，写后读回校验。Organizer 最后跑一次，合并重复、处理冲突、维护索引。

Transcript 支持两种格式。pi 会话 JSONL。codex rollout JSONL。

## 快速开始

```bash
npm install
export OPENAI_BASE_URL=http://127.0.0.1:3425/v1
export OPENAI_API_KEY=magpie

# 实践轨：对三个 pi fixture 跑完整 dream
npm run dream -- \
  test/fixtures/pi-01-stale-fact.jsonl \
  test/fixtures/pi-02-buried-detail.jsonl \
  test/fixtures/pi-03-overlap-conflict.jsonl \
  --memory data/memory --work data/runs/latest

# 只 dream 最近 7 天或 30 天（按 session createdAt）
npm run dream -- --transcripts data/transcripts --since 7d
npm run dream -- --transcripts data/transcripts --since 30d

# 换 magpie 模型（也可设 YUME_LEAD_MODEL / YUME_ANALYZER_MODEL / YUME_ORGANIZER_MODEL）
npm run dream -- --transcripts data/transcripts --since 7d \
  --lead-model cline/cline-pass/mimo-v2.6-pro \
  --analyzer-model cursor/grok-4.6 \
  --organizer-model cursor/grok-4.6

# 测试轨：对照断言
npm run assert -- data/memory data/runs/latest/dream-report.json

# codex 解析检查（codex fixture 不进 dream，单测解析）
npm run test:parsers
```

## Demo 输出

最近一次完整运行（三个模拟 session，覆盖上游三个难点：事实过时、细节埋藏、主题重叠含冲突）：

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

记忆库示例见 `data/memory/`（不入库）。运行记录与 dream 报告在 `data/runs/`（不入库）。

## 目录

- `src/transcripts/`：pi 与 codex JSONL 解析，渲染为上游风格纯文本 transcript。
- `src/prompts.ts`：上游 Lead、Analyzer、Organizer prompt 移植。逐条规则对照见 `docs/prompt-fidelity.md`。
- `src/tools.ts`：记忆文件工具。写与编辑只进记忆目录。
- `src/mastra.ts`：Mastra 装配。三个 agent 与 LibSQL 存储。
- `src/dream.ts`：dream 执行器。渲染、备份、计划校验、注册运行，dream-report 按 run 的 analyzer step 结果计数。
- `test/assertions.ts`：对照断言。测试轨与实践轨分轨，结果互为对照。
- `test/parsers.ts`：codex 解析检查。codex fixture 经 `src/transcripts/load.ts` 产出 user/assistant/tool 事件。
