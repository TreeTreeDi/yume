---
name: specflow-spec-dev-flow
description: The SpecFlow SDD plugin (`spec-dev-flow` + `specflow-start` skills): Lite vs Full state machines, the state→skill routing table, 必备条件 vs 内容质量, role contracts, progress.json/checkpoint rules, sub-agent handoff rules, artifact-path config, and the on-disk layout under `.agents/` + `.specify/`. Read before running or resuming a SpecFlow feature.
metadata:
  source: codex session 01a19a26 (2026-11-02), repo /tmp/shop-work/6553ac/shop-admin; both entry SKILL.md files re-read verbatim in session 01a19a28 (/tmp/shop-work/4e0bea/shop-admin)
---

# SpecFlow / spec-dev-flow (SDD orchestration skill)

`spec-dev-flow` is the state-machine orchestrator for Spec-Driven Development. A companion write-up of the
same plugin from another export is [[specflow-sdd-workflow]] (progress.py CLI, `specflow-start`
bootstrap, manifest versions, underscore-vs-hyphen script names); this file keeps the skill-contract
detail plus the `.specify/` runtime listings. Runtime-delegation interaction: [[agent-delegation-policy]]. In the observed
repo it is vendored at `<repo>/.agents/skills/spec-dev-flow/SKILL.md`, so the **plugin root** is
`<repo>/.agents`: workflows live in `<plugin-root>/workflow/*.yaml`, role contracts in
`<plugin-root>/agents/<role>.toml`, vendored `speckit-*` skills in `<plugin-root>/skills/speckit-*/`.
Reference docs (`gates.md`, `artifact-paths.md`, `setup-specify.md`, `progress-schema.md`,
`checkpoint-example.md`) sit in `<plugin-root>/skills/spec-dev-flow/references/`.

## Profiles

Pick a profile **before any write**: explicit user statement (Lite/轻量 vs Full/完整) > repo
`spec.config.yaml` `workflow.profile` > ask the user (no recommended/default item; vague wording like
"完整地做" counts as unspecified). Invalid config = hard error. The chosen profile is **frozen** in
`progress.json`; switching modes means stopping the feature and creating a new one, never migrating.
Old/unsupported progress versions must be restored with the matching plugin version; `progress.py check`
verifies profile/route/digest before resuming.

- **Lite**: `init → shape → implement-lite → verify-lite → done`. One agent, no sub-agents, one
  mandatory checkpoint after shape; `implement-lite` is a thin adapter over the unmodified
  `speckit-implement`; `verify-lite` checks each AC for real. Lite never calls `speckit-converge`.
- **Full** (manifest `workflow/software-development.yaml`):

| # | state | 中文阶段名 | role | skill |
|---|-------|-----------|------|-------|
| 0 | `init` | 环境准备 + 项目宪章 | orchestrator itself | — |
| 1 | `specify` | 写清需求 | specify | `speckit-specify` |
| 1.5 | `grill-with-docs` | 设计追问（可选） | docs | `grill-with-docs` |
| 2 | `planning` | 做实现方案 | plan | `speckit-plan` |
| 3 | `task-breakdown` | 拆成任务 | tasks | `speckit-tasks` |
| 3.5 | `analyze` | 一致性分析（可选） | analysis | `speckit-analyze` |
| 4 | `implement` | 按任务实现 | implement | `speckit-implement` |
| 5 | `quality-gate` | 质量门禁 | quality-gate | `speckit-converge` |
| 6 | `compound` | 沉淀经验 | compound | `ce-compound mode:headless depth:lightweight` |

## Per-state loop (Full)

1. Read `current_state` from `<feature>/progress.json` — never infer state from which artifacts exist.
2. Check preconditions against `references/gates.md`; missing → stop and say which stage supplies it.
3. Load the role contract: Codex reads `<plugin-root>/agents/<role>.toml` `developer_instructions`;
   Claude Code reads `<plugin-root>/agents/claude/<role>.md`. Substitute `{{root}}`, `{{feature}}`,
   `{{knowledge}}`, `{{adr}}` with resolved repo-relative paths. If the YAML state says
   `subagent: true`, dispatch that role as a sub-agent with the substituted contract as its
   instructions and pass `arguments` verbatim; otherwise do it yourself.
4. Write a Chinese checkpoint brief (what was done / artifact path / precondition / quality /
   next step), list 2–3 options with `(Recommended)` on "next step", and wait. Only **after**
   confirmation mark the state `completed`/`skipped` and advance `current_state`; one confirmation
   advances at most one state.

`on_failure` in the YAML is only the target of the user's "返回上一步" choice — runtime errors do
**not** auto-roll back. Implement failure = stop in place, report done vs. not-done tasks, leave
`progress.json` untouched. quality-gate is special: no `on_success`; new tasks → `on_changed` back to
`implement`, none → `on_unchanged` to `compound`. Optional stages (grill, analyze) are asked once per
run; if analyze reports fixable findings the checkpoint may offer "fix findings then implement" done by
the orchestrator editing `plan.md`/`tasks.md` (analyze itself is strictly read-only).

## Sub-agent handoff rules

- **Verbatim handoff**: for `specify` pass the PRD text plus all prior Q&A word-for-word; for
  `planning` pass the developer's technical-plan text; other states get artifact paths. Never
  summarize the developer input — summarization is the main source of requirement drift.
- Sub-agents cannot ask the user anything; unresolved gaps come back through the orchestrator's
  checkpoint and the state is re-run after the user supplies input.
- Sub-agent reports stay compact: artifact path + one-sentence summary + open gaps; no full-text
  echo of the artifact.
- Skill names are written as neutral bare names (`speckit-specify`); Codex invokes `$speckit-specify`,
  Claude Code `/speckit-specify`.

## Artifact paths

Single config entry point is `<repo-root>/spec.config.yaml` (repo root from
`git rev-parse --show-toplevel`, never from the plugin repo or `.specify/`):

```yaml
workflow:
  profile: lite | full
paths:
  root: docs/spec
  features: <default: <root>/features>
  knowledge: <default: <root>/knowledge>
  adr: <default: <root>/adr>
```

Field defaults are `root=docs/spec` and the three subdirs under `root`; explicit `features`,
`knowledge`, `adr` are independent of `root`. Every value must be a non-empty repo-relative directory
— absolute paths, the repo root itself, or `.git/` (or anything escaping the repo after symlink
resolution) are a **hard stop**, with the field name reported; never fall back to old dirs or defaults.
Create parent dirs only when actually writing. Feature dir is `<features>/<NNN>-<short-name>/`
(numbering from `.specify/init-options.json`: `feature_numbering: timestamp` → `YYYYMMDD-HHMMSS`,
`sequential`/absent → next 3-digit number; `branch_numbering` is the deprecated name and should warn).
`speckit-specify` must write the repo-relative feature dir into `.specify/feature.json`
(`{"feature_directory": "docs/spec/features/003-user-auth"}`) so later `speckit-*` commands find it.

`init` requires the official runtime (`.specify/` via `uv` → `specify-cli` → in-place init, then
uninstall) **and** a real constitution: `.specify/memory/constitution.md` must exist and contain no
`[PROJECT_NAME]`-style bracketed placeholders. Placeholder-only constitution → call
`speckit-constitution`. init is done by the orchestrator, never a sub-agent.

## `specflow-start` bootstrap and state→skill routing

`specflow-start` is the session entry (`<plugin-root>/skills/specflow-start/SKILL.md`); it loads state, then the flow, then asset indexes, in three `get_context.py` calls (`--mode state|phase|indexes`, all run as `python3 -X utf8 …` from the business repo). Step 1 reads `<current-state>` (`Current`, `State`, `Status`, `Gate`) plus `<asset-paths>` and stops on `State: STALE POINTER` or `CONFIG ERROR`; empty stdout means no feature. Step 2 reads the Phase Index / Request Triage / Routing / Detail from the manifest — state is taken from there, never from leftover files.

Routing table (verbatim mapping, Full states then Lite):

| Active state | Next step | Skill |
|---|---|---|
| `init` | 环境准备与项目宪章 | `spec-dev-flow` |
| `specify` | 写清需求 | `speckit-specify` |
| `grill-with-docs` | 设计追问（可选） | `grill-with-docs` |
| `planning` | 制定实现方案 | `speckit-plan` |
| `task-breakdown` | 拆分任务 | `speckit-tasks` |
| `analyze` | 一致性分析（可选） | `speckit-analyze` |
| `implement` | 按任务实现 | `speckit-implement` |
| `quality-gate` | 质量门禁 | `speckit-converge` |
| `compound` | 沉淀经验 | `ce-compound mode:headless depth:lightweight` |
| `shape` | 合并需求、方案、任务并取得实施授权 | `specflow-shape` |
| `implement-lite` | Lite 前后置检查并委托原版实现 | `specflow-lite-delivery mode:implement` → `speckit-implement` |
| `verify-lite` | 逐项验收、范围内修复及完成记录 | `specflow-lite-delivery mode:verify` |

An existing feature loads the skill matching its **frozen** Profile and `current_state` — never re-recommend a profile for it. `Current: none` hands over to `spec-dev-flow`'s Profile selection (explicit > repo config > ask once, before any artifact). A valid Lite implementation authorization is never re-asked (`不得重复询问已有有效实施确认`); `completed` is reported only, while `paused`/`failed`/`stopped` wait for an explicit user 「继续」.

## 必备条件 vs 内容质量

Two judgement classes that are handled differently:

- **必备条件** (preconditions) — objective checks: is the file there, does the script run, are the contract fields complete. Unmet ⇒ stop and say which stage supplies it.
- **内容质量** (content quality) — subjective: checklist completeness, scope fit. Never a stop condition; write it into the state's Chinese brief so the user decides at the checkpoint.

`checkpoint` itself is defined as the state-ending pause: Chinese brief (做了什么 / 产物 / 必备条件 / 内容质量 / 下一步) plus 2–3 text options (进入下一步 `(Recommended)` / 返回上一步 / 停止), then wait. Mid-state work (e.g. tasks inside `implement`) runs on continuously with one-line progress notes, not extra checkpoints.

## Vendored runtime / commands seen in the repo

`.specify/` contained: `templates/{spec,plan,tasks,checklist,constitution}-template.md`,
`scripts/bash/{create-new-feature,resolve-template,check-prerequisites,setup-tasks,setup-plan,common}.sh`,
`scripts/python/` equivalents, `init-options.json`, `integration.json`,
`integrations/speckit.manifest.json`, `workflows/speckit/workflow.yml`,
`workflows/workflow-registry.json`, `memory/constitution.md`. `extensions.yml` and `feature.json`
did not exist (so no `before_specify`/`after_specify` hooks to run).

- Template resolution: `bash .specify/scripts/bash/resolve-template.sh spec-template --json` →
  `{"TEMPLATE_NAME":...,"TEMPLATE_CONTENT":...}` (usage: `resolve-template.sh <template-name> [--json]`).
  It honors the preset/template stack, so prefer it over `cat .specify/templates/spec-template.md`;
  the long JSON string is easily truncated by tool output limits, so read it in pieces if needed.
- `speckit-specify` itself: short-name (2–4 words) → feature dir → copy resolved `spec-template` to
  `spec.md` → fill User Stories (P1/P2/P3, independently testable), Functional Requirements (`FR-00N`),
  Success Criteria (`SC-00N`), Assumptions; max **3** `[NEEDS CLARIFICATION]` markers; then write
  `checklists/requirements.md` (Content Quality / Requirement Completeness / Feature Readiness) and
  iterate at most 3 times.

Secrets/permissions note: the skill forbids touching `.ai/` and `AGENTS.md` unless the user asks.
