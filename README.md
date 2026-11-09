# Yume

[English](README.md) | [中文](README.zh-CN.md)

<p align="center">
  <img src="docs/yume-icon.png" width="160" alt="Yume">
</p>

Yume is local agent memory and dreaming. It ports Anthropic's *Dreaming with a dynamic workflow* cookbook to TypeScript and Mastra, and it runs on your machine. A transcript keeps the raw session record. Later passes do not rewrite it. Memory is distilled from the transcript and points back at that evidence.

## Goal

Port the upstream cookbook's behavior in full. Match that behavior. Change only what the port requires. New scope needs an approved issue first.

## Quick start

Set Magpie:

```bash
npm install
export OPENAI_BASE_URL=http://127.0.0.1:3425/v1
export OPENAI_API_KEY=magpie
```

Run a full dream on the three pi fixtures:

```bash
npm run dream -- \
  test/fixtures/pi-01-stale-fact.jsonl \
  test/fixtures/pi-02-buried-detail.jsonl \
  test/fixtures/pi-03-overlap-conflict.jsonl \
  --memory data/memory --work data/runs/latest
```

Pass `--transcripts` for a directory and `--since` to filter by session `createdAt`. `7d`, `30d`, `1mo` (30 days), and `m` (minutes) work. `--transcripts` reads only `*.jsonl` in that directory, one level. Nested Pi stores need explicit paths, or flatten the files first:

```bash
npm run dream -- --transcripts data/transcripts --since 7d
npm run dream -- --transcripts data/transcripts --since 30d
```

Default models are Lead `cline/cline-pass/mimo-v2.6-pro` and Analyzer and Organizer `cursor/grok-4.6`. Override with flags or env:

```bash
npm run dream -- --transcripts data/transcripts --since 7d \
  --lead-model cline/cline-pass/mimo-v2.6-pro \
  --analyzer-model cursor/grok-4.6 \
  --organizer-model cursor/grok-4.6
```

Env vars are `YUME_LEAD_MODEL`, `YUME_ANALYZER_MODEL`, and `YUME_ORGANIZER_MODEL`.

When the terminal is eligible, stderr shows a live TUI. `--json` skips the TUI. The JSON report always prints on stdout:

```bash
npm run dream -- --transcripts data/transcripts --since 7d --json
```

Memory defaults to `--memory data/memory`. Run records and `dream-report.json` default to `--work data/runs/latest`.

Assertions and unit scripts:

```bash
# fixture assertions
npm run assert -- data/memory data/runs/latest/dream-report.json

# session parse check
npm run test:parsers

# --since filter
npm run test:since

# TUI state
npm run test:tui
```

## How a run works

Yume does not hand-roll an agent loop in `src/mastra.ts`.

`src/mastra.ts` only builds three Mastra Agent objects and one Mastra instance. There is no while-tool loop in that file.

The inner loop is `@mastra/core` Agent. Analyzer and Organizer mount memory tools, with `maxSteps: 60`. They emit structured objects through `structuredOutput` and `jsonPromptInjection: 'system'`. Tool choice and multi-step execution stay inside Mastra Agent.

The outer graph is scheduled in `src/dream.ts`. The lead calls `leadAgent.generate` and returns workflow JSON. Code allows only `workflow`, `parallel`, `agent`, and `mapping` nodes. Then `mastra.addDynamicWorkflows` registers the graph, and `mastra.getWorkflow('dream-root').createRun().start()` runs it.

A full dream has these stages:

1. Render. Load JSONL transcripts and write plain text for the analyzers.
2. Backup. Copy the memory directory into the run directory before writes.
3. Lead. The lead reads the input list and emits the dynamic workflow.
4. Analyze. The workflow starts. Analyzers run in parallel, read their text, write the shared memory directory, and read back to check the write.
5. Organize. The workflow runs Organizer once. It merges duplicates, keeps conflicts, and maintains `_index.md`.
6. Report. Count analyzer steps that actually succeeded. Write `dream-report.json`.

## Demo output

The last full fixture run covers three upstream cases: a stale fact, a buried detail, and overlapping topics with a conflict.

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

`data/memory/` and `data/runs/` stay on disk. They are not in git.

## Layout

- `src/cli/dream.ts` is the CLI. It parses flags, models, and `--since`, and it mounts the TUI when the terminal allows it.
- `src/dream.ts` runs the dream. It renders text, backs up memory, registers the dynamic workflow, and writes the report.
- `src/mastra.ts` constructs the three Mastra agents and LibSQL storage.
- `src/progress.ts` fans out progress events across phases.
- `src/prompts.ts` holds the ported Lead, Analyzer, and Organizer prompts. Rule-by-rule notes live in `docs/prompt-fidelity.md`.
- `src/since.ts` parses the time window and filters files by session `createdAt`.
- `src/tools.ts` is the memory file tools.
- `src/transcripts/` parses pi and codex JSONL and renders plain text.
- `src/tui/` paints live progress on stderr and restores the terminal.
- `test/assertions.ts` asserts on the memory store and the run report.
- `test/parsers.ts` checks Codex parse output.
- `test/since.ts` checks the time filter.
- `test/tui.ts` checks TUI state and fail-soft paint.

## License

MIT. See [LICENSE](LICENSE).
