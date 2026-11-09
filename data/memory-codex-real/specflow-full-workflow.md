---
name: specflow-full-workflow
description: How the SpecFlow / spec-dev-flow plugin drives SDD (Full and Lite profiles) inside a business repo — install layout under .agents/, state machine, progress.py CLI and progress.json schema 3, gates, artifact-path config, subagent roles, and the required developer inputs. Read before running or resuming a $spec-dev-flow feature.
metadata:
  source: codex session 01a19a26 (2026-11-02, cwd /tmp/shop-work/abe94d/shop-admin), .agents/skills/spec-dev-flow SKILL.md + references read in full
---

# SpecFlow / spec-dev-flow (SDD orchestrator)

Sibling write-ups of the same plugin (different sessions, same repo family): [[specflow-spec-dev-flow]] (Lite + Full tables, handoff rules, template resolution), [[workflow-specflow-sdd]] (plugin layout table + the hyphen/underscore gate-drift lesson), [[workflow-specflow-dev-flow]], [[workflow-specflow-lite]], [[workflow-specflow-lite-sdd]]. This file adds the **Full run mechanics as executed** (progress.py flags actually accepted, the observed `progress.json` schema-3 payload, and the planning-stage input blocker).

Note on the underscore-vs-hyphen runtime drift: in this run (`/tmp/shop-work/abe94d/shop-admin`, 2026-11-02) the agent listed `.specify/scripts/python/`, saw the underscored files, confirmed `command -v specify`/`uv` and treated init as satisfied — so `init` completed and `specify` was reached, unlike the run recorded in [[workflow-specflow-sdd]] where the hyphenated gate paths were read as a hard stop at init.

The plugin lives **inside the business repo**, not the plugin repo: every path below is relative to the repo root.

```
.agents/skills/spec-dev-flow/SKILL.md          # orchestrator
.agents/skills/spec-dev-flow/references/{gates,artifact-paths,progress-schema,setup-specify,checkpoint-example}.md
.agents/workflow/software-development.yaml     # Full manifest, name: sdd-development, version 1.4
.agents/workflow/lite.yaml                     # Lite manifest
.agents/scripts/progress.py                    # deterministic progress.json ops
.agents/scripts/workflow_core.py               # resolve_selection / route_decision / manifest checks
.agents/agents/<role>.toml                     # role contracts, developer_instructions with {{root}} {{feature}} {{knowledge}} {{adr}}
.agents/skills/{specflow-start,specflow-shape,specflow-lite-delivery,speckit-*,grill-with-docs,grilling,ce-compound,spec-update,domain-modeling}/SKILL.md
```

## Session entry

```bash
python3 .agents/skills/specflow-start/scripts/get_context.py --mode state    # current feature/state/gate; empty stdout = no feature yet
python3 .agents/skills/specflow-start/scripts/get_context.py --mode phase    # state machine + routing rules
python3 .agents/skills/specflow-start/scripts/get_context.py --mode indexes  # feature list, knowledge/adr indexes
```

`--mode state` printing nothing is the normal "no feature directory" answer, not an error.

## Profile selection (before any write)

Priority: explicit natural language / call parameter this turn → repo `spec.config.yaml` `workflow.profile` → ask the user once (`use-lite` / `use-full` / `stop`). Choosing must NOT inspect the requirement for complexity. Helpers:

```bash
python3 -c "import sys;sys.path.insert(0,'.agents/scripts');from workflow_core import resolve_selection,route_decision;s=resolve_selection(natural_language='full');print(s, route_decision(s.requested, s.conflict))"
```

A phrase like 「按 Full 流程」 is a natural-language selection → `Selection(source='natural-language', requested='full')` → `{'action':'select','selected':'full','reason':'explicit-selection'}`. Vague wording (「简单处理」「完整地做」) counts as unspecified. Profile is frozen once the feature exists — no upgrade/downgrade/switch; a mode change means stopping the feature and creating a new one.

## Full state machine (manifest is the only truth)

`init` → `specify` → [`grill-with-docs`?] → `planning` → `task-breakdown` → [`analyze`?] → `implement` → `quality-gate` → `compound` → done.

Roles and `subagent: true` flags in `software-development.yaml`: `init` orchestrator (skill spec-dev-flow); `specify`/`planning`/`task-breakdown`/`analyze`/`implement`/`quality-gate` are subagent states (skills speckit-specify / speckit-plan / speckit-tasks / speckit-analyze / speckit-implement / speckit-converge); `compound` calls `ce-compound` with arguments **`mode:headless depth:lightweight`**. `done` is a terminal marker, never a state. Optional states carry `prompt` + `on_skip`; `on_failure` edges (e.g. implement → analyze) are only the target for a user-chosen "go back one step" — a runtime error stops in place.

Lite (fixed chain `init → shape → implement-lite → verify-lite → done`) is executed by the current agent via `specflow-shape` + `specflow-lite-delivery`, no converge, one required authorization checkpoint at shape.

## progress.py CLI

```bash
python3 .agents/scripts/progress.py check <feature>/progress.json
python3 .agents/scripts/progress.py init <feature>/progress.json --profile full \
  --selection-source natural-language --requested full \
  --requirement-json '{"dir":"001-order-export","title":"订单导出","source":"用户 PRD"}' \
  --repo-root /abs/repo/root
python3 .agents/scripts/progress.py transition <feature>/progress.json --event success --output spec.md
python3 .agents/scripts/progress.py pause <feature>/progress.json --reason '...'
python3 .agents/scripts/progress.py authorize ... --acceptance-id AC-001 --evidence '...'
python3 .agents/scripts/progress.py complete ... --verification-location tasks.md --results-json '[{"acceptance_id":"AC-001","status":"passed","evidence":"..."}]'
python3 .agents/scripts/progress.py record|reopen ...
```

- `--event` values: `success|failure|skip|changed|unchanged`. `init` requires all five flags shown; it also snapshots `baseline.commit`, `dirty_paths`, `available`.
- New files use `schema_version: 3` with `workflow{name,manifest_version,profile,route,route_revision,manifest_digest}`, `selection{source,requested,selected}`, `authorization`, `baseline`, `requirement`, `current_state`, `status`, `states{status,role,outputs,started_at,updated_at,attempt,last_failure}`, `completion`, `history`. Only states in the route appear (no `done`).
- Rules: mark a state `completed`/`skipped` and move `current_state` only **after** the user confirms; one confirmation advances at most one state; never pre-create later artifacts; resume from `current_state` only, never from leftover files.

## Gates (references/gates.md)

- Runtime: `.specify/` must hold the scripts/templates it lists. **Naming pitfall:** the docs say `check-prerequisites.py` / `setup-plan.py` / `setup-tasks.py`, but the installed Spec Kit 0.16.2 runtime has underscore names — `check_prerequisites.py`, `setup_plan.py`, `setup_tasks.py`, plus `common.py`, `create_new_feature.py`, `resolve_template.py`. The hyphenated paths do not exist in the abe94d/a29bb6 checkouts; use the underscore files. The listing is **checkout-dependent**: in the `31c103` checkout `rg --files .specify` returned *both* variants under `.specify/scripts/python/` — `check-prerequisites.py` + `check_prerequisites.py`, `setup-plan.py` + `setup_plan.py`, `setup-tasks.py` + `setup_tasks.py`, `create-new-feature.py` + `create_new_feature.py` — so list the directory before declaring a gate blocked ([[shop-admin-order-export]]).
- Commands run from repo root: `python3 .specify/scripts/python/check_prerequisites.py --json` (needs `plan.md`), `... --json --require-tasks --include-tasks` (needs `plan.md` + `tasks.md`), `setup_plan.py --json`, `setup_tasks.py --json`. Non-zero exit or `ERROR` output blocks the stage.
- Constitution: `.specify/memory/constitution.md` exists **and** has no `[PROJECT_NAME]`-style placeholders. `specify init` only seeds the template, so it usually still needs `speckit-constitution`.
- Artifact paths: repo-root `spec.config.yaml` is the sole config (`workflow.profile`, `paths.root/features/knowledge/adr`); resolve the repo root with `git rev-parse --show-toplevel`. Missing keys default to `docs/spec`, `docs/spec/features`, `docs/spec/knowledge`, `docs/spec/adr`; illegal/out-of-repo values hard-stop at init — never fall back to defaults or old dirs. Report resolved absolute paths downstream, and keep `.specify/feature.json`'s `feature_directory` in sync (`SPECIFY_FEATURE_DIRECTORY` semantics).
- Missing runtime ⇒ ask before installing, then only the official CLI (see [[shop-admin-specflow-repo]]): `uv tool install specify-cli`, `specify init . --here --integration copilot --ignore-agent-tools --script py --force`, `specify integration uninstall copilot --force`; keep only `.specify/`.

## Required developer inputs (do not invent)

- `specify` needs the requirement text (from the call, or ask).
- `planning` needs **the developer's technical-plan points** (stack, architecture, constraints) as `speckit-plan` input. The orchestrator must not decide these itself; without them the run legitimately stops at the planning entry with `progress.json` left at the last completed state. What a sufficient answer looks like (from the 订单导出 run, session 01a19a28): 「按宪章用 React 18 + TypeScript + Vite，导出在前端用 SheetJS（xlsx 包）生成，订单数据走现有 GET /api/orders 接口（支持同样的筛选参数）」 — stack, generation side, library and data source in one sentence. Check the prompt for such a 「技术方案：」 paragraph before declaring the planning blocker; the same PRD reached `plan.md` in checkouts that carried it and stopped in those that did not ([[shop-admin-order-export]]). Watch for 「现有」 claims that the repo contradicts: that checkout had no backend, no `/api/orders` and no `xlsx` in `package.json`. Those points can arrive inside the PRD prompt itself — as in the `/tmp/shop-work/abe94d/shop-admin` export of session `01a19a28-2488-74a2-bbb0-ba86213f1706`, where the specify stage then completed — so check the prompt for a 技术方案 line before reporting the blocker.
- The `specify` child's deliverable set (observed in that run) is `<feature>/spec.md` + `<feature>/checklists/requirements.md` + the `.specify/feature.json` pointer `{"feature_directory": "<repo-relative feature dir>"}`, and it may create the feature dir by hand (no git branch, `spec.md` states 「未创建专用分支」) instead of using `create_new_feature.sh`.
- When the user does put them in the request (as in the a29bb6 订单导出 copy: 「React 18 + TypeScript + Vite，导出在前端用 SheetJS（xlsx 包）生成，订单数据走现有 GET /api/orders 接口（支持同样的筛选参数）」) the gate is satisfied and the text must be relayed verbatim to the plan sub-agent, and planning then completes — sessions 01a19a28 / `16268b` show the tech plan written as one line after 「技术方案：」 and the plan stage returning five artifacts. See [[shop-admin-order-export]].
- The plan stage is launched by `python3 .specify/scripts/python/setup-plan.py --json` from the repo root; it prints `{FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH}` and **copies** `.specify/templates/plan-template.md` over `plan.md`. That template is English with `[FEATURE]`, `[DATE]`, three `Structure Option` trees marked `[REMOVE IF UNUSED]` and a `NEEDS CLARIFICATION` convention — the Whole artifact must be rewritten in Chinese and dereferenced, and `rg -n 'NEEDS CLARIFICATION|\[FEATURE\]|\[DATE\]|REMOVE IF UNUSED' <feature>/plan.md` returning nothing is the (manual) completeness check; no script validates it.
- `.specify/extensions.yml` absent ⇒ the skill's `before_plan` / `after_plan` hook sections are skipped silently; emitting `EXECUTE_COMMAND:` is only needed when the file exists.
- Subagents cannot talk to the user, so a prior "keep going, skip confirmations" authorization covers checkpoints only — not a missing mandatory input. Hand each subagent the developer input **verbatim** (no summarizing), and expect a compact return: artifact path + one-line summary + open gaps.
- The observed shape of that technical-plan input (订单导出, 2026-11-02): 「按宪章用 React 18 + TypeScript + Vite，导出在前端用 SheetJS（xlsx 包）生成，订单数据走现有 GET /api/orders 接口（支持同样的筛选参数）」 — stack from the charter, export mechanism (client-side SheetJS `xlsx`) and data source/endpoint. When the prompt carries a paragraph like this, `planning` is unblocked and must not re-ask; when it is absent (e.g. one 31c103 copy) the run legitimately stops or asks. See [[shop-admin-order-export]].

## Checkpoint / reporting shape

Per state: one Chinese briefing (`✅ 已完成：<stage>`, what was done, artifact path, gates satisfied, content quality, next stage + skill), then 2–3 text options with `(Recommended)` on "proceed". `grill-with-docs` and `analyze` are asked at most once per run; skipping them goes through `on_skip`. An analyze report with fixable findings additionally offers "fix the findings in plan.md/tasks.md then implement" (analysis itself stays read-only).

## Process observations

- Subagent states are launched with `spawn_agent {task_name, agent_type}`; in Codex exports the `message` payload is ciphertext (`gAAAAA...`) — read the artifacts on disk instead. `wait_agent {timeout_ms:10000}` times out while the subagent is still running; that is a normal poll, not a failure, so wait again (and inspect the feature dir) rather than respawning.
- The agent learned `progress.py` flags with `progress.py --help` / `transition --help` / `init --help` — cheaper than reading the whole script; `references/progress-schema.md` documents the rest.
- Bundling several `cat`/`rg` reads into one `exec` call (skills + references + manifest + agent toml + package.json) kept the flow to a handful of turns.
- Skill references go by neutral bare names (`speckit-plan`); the host resolves them (`$xxx` in Codex, `/xxx` in Claude Code).
- Related: [[agent-delegation-policy]] (the `按需委派` AGENTS.md preamble every Codex session carries, including "explicitly starting SDD keeps its stage roles and dependency order").
