---
name: specflow-sdd-workflow
description: General mechanics of the spec-dev-flow / spec-kit SDD plugin as it runs in shop-admin — `.agents/` plugin layout, Full vs Lite state order, progress.json as the only state source, checkpoint and verbatim sub-agent handoff rules, doc-path config, the ask-once switch protocol for a new requirement — plus run-level facts from workspace `16268b` (delegated `specify`, `resolve_template.py --json` truncation, 订单导出 PRD and its open questions) and workspace `fe7b56` (feature `001-sms-login` at `grill-with-docs`, pending dark-mode request). Read before resuming any SpecFlow feature in shop-admin or a `/tmp/shop-work/*` workspace.
metadata:
  source: codex session 01a19a26 export, cwd /tmp/shop-work/fe7b56/shop-admin (2026-11-02); merged with the concurrent distillations of the other 01a19a26 exports (16268b etc.)
---

# SpecFlow (spec-dev-flow) SDD mechanics — shop-admin

Project: 小店后台 ("shop admin"), a small-shop back office. Plugin lives **inside the business repo** under `.agents/` (not globally). Feature-specific pages: [[shop-admin-order-export]] (pending 订单导出 PRD), [[workflow-specflow-sdd]] (the init-gate hyphen/underscore false alarm), [[workflow-specflow-lite-sdd]] (Lite route, shape artifacts, `progress.py` CLI details). App background: [[project-shop-admin]].

## Workspaces are per-run

Cwd is scratch, not fixed: exports labelled session `01a19a26` appear with `shop-work/53b9c5`, `shop-work/d2ab34`, `shop-work/16268b`, `shop-work/fe7b56`, `shop-work/abe94d`, `shop-work/31c103` and `shop-work/6cb25b` (seven distinct runs). The `<hash>` differs per run, so **tell runs apart by hash (or by git/`docs/spec/features` state), never by session id**, and never carry one workspace's feature list into another — but the hash is reused too (`53b9c5` appears for both session `01a19a26`, which halted at init, and `01a19a28`, which wrote spec.md), so pair hash with the artifacts on disk. In the `16268b` run: zsh, branch `main`, current_date 2026-11-02, permission profile `managed`/restricted (write = workspace root + `/tmp`, read-only `.git`, `.agents`, `.codex`, `.aws`).

## Plugin layout (plugin root = `.agents/`)

| Path | Contents |
|---|---|
| `skills/spec-dev-flow/SKILL.md` | orchestrator state machine + checkpoint rules (the entry point) |
| `skills/spec-dev-flow/references/{gates,artifact-paths,progress-schema,setup-specify,checkpoint-example}.md` | gate checks, path resolution + doc language, progress contract, CLI install, briefing example |
| `workflow/software-development.yaml` | Full manifest (`sdd-development`, version 1.4) — the single source of truth for states, edges and `subagent:` flags |
| `workflow/lite.yaml` | Lite manifest |
| `agents/<role>.toml` | stage role contracts in `developer_instructions` (`specify.toml` seen) with `{{root}}` / `{{feature}}` / `{{knowledge}}` / `{{adr}}` placeholders the orchestrator must substitute |
| `scripts/workflow_core.py` | `resolve_selection` / `route_decision` / manifest digest helpers |
| `scripts/progress.py` | progress CLI |
| `skills/specflow-start/scripts/get_context.py` | `--mode state \| phase \| indexes` |
| `skills/speckit-*/SKILL.md` | vendored upstream speckit skills (specify, plan, tasks, analyze, implement, converge, constitution) |

Skill names are neutral bare names (`speckit-specify`); Codex resolves them as `$speckit-specify`.

## Routes

- **Full**: `init`(环境准备 + 宪章) → `specify`(写清需求) → [`grill-with-docs` 设计追问, optional] → `planning`(做实现方案) → `task-breakdown`(拆成任务) → [`analyze` 一致性分析, optional] → `implement` → `quality-gate` → `compound` → `done`. `subagent: true` on specify/planning/task-breakdown/analyze/implement/quality-gate; `init` and the optional docs stage run in the main agent. `quality-gate` has no `on_success`: `on_changed` → implement when converge adds tasks, `on_unchanged` → compound. `compound` always gets `arguments: "mode:headless depth:lightweight"` (one pass, no inner sub-agents). Optional stages skipping uses `on_skip`; `on_failure` edges are taken only when the *user* picks 返回上一步 — a runtime error stops in place.
- **Lite**: `init → shape → implement-lite → verify-lite → done`; shape calls `specflow-shape` and produces exactly `spec.md`/`plan.md`/`tasks.md`; the last two go through `specflow-lite-delivery mode:implement|verify`, a thin adapter around the unmodified `speckit-implement`. One agent, no sub-agents, no `speckit-converge`, no auto `compound`, and exactly one required checkpoint (after shape). Details: [[workflow-specflow-lite-sdd]].
- Profile precedence: this request's explicit wording/call arg > repo `spec.config.yaml` `workflow.profile` > ask once (Lite / Full / stop, neutral, no recommendation). Vague wording ("简单处理") counts as unspecified. Selection is frozen after creation — no mid-feature Lite↔Full switch. Nothing may be read (requirement, code, tests) to *choose* the profile, and no feature dir/pointer/progress may be created before the choice.

## progress.json is the only state source

`<feature>/progress.json` (schema 3 for new features; 1/2 are legacy Full, read as-is, never migrated; unknown version → stop). Read `current_state`; never infer the stage from which artifacts happen to exist. One user confirmation advances at most one state, and mark `completed`/`skipped` + move `current_state` only *after* confirmation — no early writes, no pre-creating the next state's artifacts. Resume runs `progress.py check` and verifies frozen profile/manifest digest before continuing. Two edge cases worth knowing: a missing `progress.json` in a dir that already has artifacts initialises at the first missing artifact's state; and `spec-update` reflow reopens from an already-confirmed state, keeping everything before `restart_from`.

## Checkpoint protocol

One checkpoint per state, at state end — inside a state (e.g. implement's per-task loop) keep going and report one line per task. Briefing is Chinese, template: 已完成 {中文阶段名} / 做了什么 / 产物 / 必备条件 / 内容质量 / 下一步, then 2–3 options with 进入下一步 marked `(Recommended)`, and wait for the reply. Users can also waive the pauses up front ("每个确认点都按默认继续") — then walk 进入下一步 until the requested stage and report.

## Doc paths and language

`spec.config.yaml` at the **business repo root** is the only config entry point: `paths.root` default `docs/spec`, then `features`/`knowledge`/`adr` default under it. In shop-admin it contains only `paths: root: docs/spec` — so `docs/spec/features/<NNN>-<short-name>`, and because `workflow.profile` is absent the route must come from the user's words. Illegal values hard-stop; never fall back to defaults. Feature dirs use the 3-digit sequential prefix unless `.specify/init-options.json` sets `feature_numbering: timestamp`, and the resolved repo-relative path goes into `.specify/feature.json` as `feature_directory` (plus `SPECIFY_FEATURE_DIRECTORY` for downstream speckit).

SDD artifacts are written in Simplified Chinese while IDs and markers stay verbatim: `FR-001`, `SC-001`, `US1`, `AC-001`, `T001`, `[P]`, `[USn]`, `## Phase N:`, `- [ ]`, `[NEEDS CLARIFICATION]`. The repo's constitution (v1.0.0, 2026-10-01: 简单优先 / 可测试 / 中文优先; React 18 + TS + Vite; React hooks only, no extra state library; constitution changes need a PR) is real and placeholder-free, so init's charter gate passes and `speckit-constitution` is not needed.

Claim downgraded by the 6553ac `spec.md` (session 01a19a28): the "English headings are always rewritten" reading is wrong in practice. That file kept the template's English headings and boilerplate labels (`## User Scenarios & Testing *(mandatory)*`, `### Edge Cases`, `## Requirements`, `**Why this priority**`, `**Independent Test**`, `**Acceptance Scenarios**`, `## Success Criteria`, `## Assumptions`) and wrote every sentence beneath them in Chinese; only the checklist's item text was translated. So judge language compliance on the prose, not on headings — don't rewrite headings to satisfy a rule, and don't flag English headings as a spec defect.

## Delegating a stage — what it looks like

The orchestrator emits `Message Type: NEW_TASK` / `Task name: /root/<slug>` / `Sender: /root` with a **blank `Payload:`**, then runs the stage; real `TOOL CALL exec` blocks follow in the same thread (here `Task name: /root/specify_order_export`). On this route the blank payload is normal routing shape, **not** the dead-delegation failure in [[codex-new-task-empty-payload]] — judge the turn by its tool calls.

Handoff rules that make the delegation safe: developer input goes over **verbatim** (raw PRD for specify, raw tech-plan notes for planning — summarising is a named source of requirement drift); the sub-agent cannot ask the user, so gaps come back as up to three `[NEEDS CLARIFICATION]` items (priority scope > security/privacy > UX > technical) and the orchestrator relays them at the checkpoint; the report is path + one-line summary + gaps, never the artifact body. `specify` must leave `<feature>/spec.md` (copied from the resolved template), `checklists/requirements.md` and the `.specify/feature.json` pointer — exactly one feature per invocation.

## Reading the template — pitfall

```bash
python3 .specify/scripts/python/resolve_template.py --json spec-template   # lossy
cat .specify/templates/spec-template.md                                    # complete
```

The bash twin `.specify/scripts/bash/resolve-template.sh spec-template --json` behaves identically (same `{"TEMPLATE_NAME":…,"TEMPLATE_CONTENT":…}` single line, same `Warning: truncated output` at `max_output_tokens: 1000` — the 31c103 export shows the middle elided as `…194 tokens truncated…`); `--help` confirms the two-arg form. `--json` returns one single-line blob `{"TEMPLATE_NAME":…,"TEMPLATE_CONTENT":…}` with `\n`-escaped markdown; it blew the 1000-token `max_output_tokens` and came back `Warning: truncated output`, losing the template's middle. Use it only to confirm which template preset resolution picks.

Efficient opening for a new feature (two calls, writes nothing):

```bash
cat .agents/skills/speckit-specify/SKILL.md .agents/agents/specify.toml .specify/templates/spec-template.md
cat .agents/skills/spec-dev-flow/references/artifact-paths.md .specify/memory/constitution.md spec.config.yaml; rg --files .specify | head -35; git branch --show-current
```

## State of the 16268b run

Full route requested, stop after `task-breakdown`, every checkpoint auto-continued, optional stages skipped. The orchestrator cleared `init` (runtime present, constitution real, `docs/spec` resolved) and entered the delegated `specify` stage — evidence that `.specify/scripts/python/`'s underscored `check_prerequisites.py` / `setup_plan.py` / `setup_tasks.py` are usable as installed, i.e. the hyphenated `gates.md` paths are doc drift ([[workflow-specflow-sdd]]). The transcript ends mid-`specify`: no `spec.md`, `checklists/`, `progress.json` or feature directory was written, so the feature number for this workspace is unconfirmed. (A sibling export of the same delegated stage — session `01a19a28`, worktree `a29bb6` — shows it finishing: one `apply_patch` writes `spec.md`, `checklists/requirements.md` and the `.specify/feature.json` pointer, verified by `rg -n 'FR-|SC-|NEEDS|feature_directory'`; details in [[shop-admin-order-export]].)

Hash alone does not identify a run either: later session **01a19a28** also ran in `/tmp/shop-work/16268b/shop-admin` but entered planning with `docs/spec/features/001-order-export/{spec.md, progress.json, checklists/requirements.md}` already present, then wrote plan/research/data-model/contracts/quickstart. Match on session id **and** hash **and** the feature dir's contents.

Requirement under work — 订单导出, PRD in [[shop-admin-order-export]]: 「导出」 button on the order list exporting the current filter as `.xlsx` (订单号、下单时间、买家昵称、商品、数量、实付金额、订单状态), 5000-row cap with 「请缩小筛选范围」, loading state then auto-download `订单导出_YYYYMMDD.xlsx`; acceptance = filter 已完成 exports only completed orders, >5000 exports nothing and prompts. Unstated and therefore to land in Assumptions or `[NEEDS CLARIFICATION]`: timezone/format of 下单时间, whether line items collapse to one row per order, 实付金额 units/rounding, whether the cap counts rows or orders, who may export, 订单状态 as label vs code. The specs actually written for this PRD resolved every one of them in **Assumptions** instead of asking: filename date = browser-local date, 下单时间 inherits the list's display timezone, one row per order with no line-item split, 数量/实付金额 keep the list's semantics, cap counts orders (5000 allowed / 5001 blocked), no new permissions (reuse existing visibility), 订单状态 rendered as its readable Chinese name, and 0 matches → header-only file.

`planning` input is the one developer-supplied gap that matters: `agents/plan.toml` forbids the plan agent from choosing the tech plan, so the request must state how the export runs (frontend-only vs an API endpoint), which Excel library, and where the order data comes from. Sibling exports show both outcomes: the a29bb6 / `01a19a28` copies got the answer inside the request (SheetJS `xlsx` client-side + `GET /api/orders` with the same filter params), while the `01a19a26` run at 31c103 asked the user via `request_user_input_async`. The session-`01a19a28` export whose cwd is `/tmp/shop-work/31c103/shop-admin` (task label `/root/order_spec`, empty `NEW_TASK` payload) is of the first kind: its prompt carries the 技术方案 paragraph, the stage reads `specify.toml` + `speckit-specify/SKILL.md` + the spec template, resolves the template with `.specify/scripts/bash/resolve-template.sh spec-template --json`, and writes `spec.md` (FR-001…FR-010, SC-001…SC-005) plus `checklists/requirements.md` (16 `[x]` items) in one `apply_patch`, then reports 「可进入 planning」 and 「未修改 progress、代码或其他阶段产物」. Read the prompt in hand before assuming a blocker, and key on session id **and** hash. The `specify` stage in those copies answered the PRD's silent points as assumptions rather than clarification markers — filename date = click-time browser-local date, one row per order (multi-product orders collapsed, quantity summed into that row), 下单时间/状态/金额口径 inherited from the list, cap counted in orders (5000 allowed, 5001+ blocked, never truncate), no new permissions, export covering the whole filtered set rather than the visible page — so `planning` can start from those defaults instead of re-asking.

How `specify` closed those gaps in the a29bb6 copy (useful as a default set for `planning`): browser-local date for the filename (`订单导出_YYYYMMDD.xlsx`), one row per order with multi-product orders kept in that row, 下单时间/状态/金额 semantics inherited from the order list, cap counted in **orders** (5000 allowed, 5001 blocked), no permission changes (reuse existing visibility), and the export covering the whole filtered set rather than the visible page — all recorded as assumptions, no `[NEEDS CLARIFICATION]` left.

## New requirement while a feature is active — ask once

When `.specify/feature.json` points at a feature whose progress is still `active` and the user raises an unrelated
requirement, ask exactly once: 1) 继续当前 (for an optional stage also offer 进入该阶段 vs 跳过), 2) 暂停当前后新建,
3) 停止. Pause is
`progress.py pause <当前 progress.json> --reason "切换到新需求：<一句话>"`; profile selection and feature creation
follow the pause. Until the user answers: create no feature, do not edit `.specify/feature.json`, and do not put the
new requirement into the current feature's artifacts. The **new** feature's creation is what rewrites the pointer,
and resuming a paused feature needs the pointer moved back **and** an explicit continue. Scope changes inside the
current feature are not this path — they go through `spec-update`. Expanded wording:
[[specflow-request-switch-protocol]].

## State of the fe7b56 run (2026-11-02)

- `.specify/feature.json` = `{"feature_directory":"docs/spec/features/001-sms-login"}`; `spec.config.yaml` =
  `paths: root: docs/spec` (still no `workflow.profile`).
- `python3 -X utf8 .agents/skills/specflow-start/scripts/get_context.py --mode state` →
  `Current: docs/spec/features/001-sms-login`, `Profile: full`, `State: grill-with-docs`, `Status: active`,
  `Active features: 1`, `Spec features: 2`, with `<asset-paths>` root `docs/spec`, features `docs/spec/features`,
  knowledge `docs/spec/knowledge`, adr `docs/spec/adr`, constitution `.specify/memory/constitution.md`.
- Feature 001 = 「手机号验证码登录」. At `grill-with-docs` the role is `docs`: read `001-sms-login/spec.md`, produce
  `adr/*.md`; the hook also lists `下一步(确认后): planning` and `可回退: specify`.
- Pending request in this workspace: 「设置页加一个深色模式开关，默认跟随系统，也能手动切换」 + 「按 specflow 流程来」. The
  agent answered with 暂停后新建 / 继续当前（进入设计追问或跳过到方案）/ 停止 plus the Lite vs Full question and wrote
  nothing. That reply is still unanswered — re-ask; do not assume a pause happened or that a profile was chosen.
- Cost of getting there: four tool calls (`spec-dev-flow/SKILL.md`, `specflow-start/SKILL.md` + `.specify/feature.json`
  + `spec.config.yaml`, then `get_context.py --mode state`), zero artifact writes.

## Environment notes

- `<specflow-state>` hook at prompt submit printed 「尚无进行中的 feature。跑 $spec-dev-flow 从 init 开始。」 — it tracks `.specify/feature.json` only; a sibling run saw it disagree with `get_context.py --mode state`, so trust the script.
- `.specify/extensions.yml` does not exist in shop-admin → no `before_specify`/`after_specify` (or `before_implement`) hooks; the skill's hook sections are skipped silently.
- The injected `AGENTS.md instructions` block is the 按需委派 policy, including 「显式启动 SDD 时保留阶段角色和依赖顺序」 — see [[agent-delegation-policy]].

## Cross-export notes (provenance: sibling exports of session 01a19a26, not this transcript)

- Hash drift is wider than the three seen here: the same session id's exports have used `shop-work/{53b9c5, d2ab34, 16268b, 31c103, 6cb25b, abe94d, a29bb6, d59c67, 6553ac}`. Different hashes can hold different repo state and different `.specify/feature.json` presence (one export's runtime had no `.specify/scripts/python` at all), so re-derive paths and feature lists from the transcript at hand.
- In other exports the delegation shows as `spawn_agent` for the `specify` role → `Task name: /root/specify`, and the thread ends on `wait_agent` — i.e. the stage ran on a native role agent, matching 「显式启动 SDD 时保留阶段角色和依赖顺序」. Where my transcript ends mid-`specify`, those show the delegated stage still in flight.
- `specflow-start` bootstrap is `python3 .agents/skills/specflow-start/scripts/get_context.py --mode state|phase|indexes`; the state mode is authoritative over the `<specflow-state>` hook banner.
- Starting an unrelated requirement while a feature is `active` requires asking once (继续当前 / 暂停当前后新建 / 停止) and, on "pause then create", `progress.py pause <feature>/progress.json --reason "切换到新需求：<一句话>"` before the new feature may rewrite the pointer — see [[specflow-request-switch-protocol]].
- A third checkout of the 订单导出 task (`/tmp/shop-work/53b9c5/shop-admin`, session `01a19a28-24b1-7383-b8fc-69efe5ef0e7c`, created 2026-11-02T02:48:06Z) shows the **specify stage completing**: `spec.md` with `FR-001`…`FR-009` / `SC-001`…`SC-005`, `checklists/requirements.md` with 16 checked items, and `.specify/feature.json` = `{"feature_directory": "docs/spec/features/001-order-export"}`, written by the delegated sub-agent in one heredoc. That thread contains **no `progress.py` and no `get_context.py` call** — no `progress.json` was created — so a checkout with `spec.md` but no progress file is possible; repair progress before resuming. Its spec content is a *variant* of the a29bb6 one (see [[shop-admin-order-export]]), so read the on-disk `spec.md` rather than quoting memory. Template resolution via `bash .specify/scripts/bash/resolve-template.sh spec-template --json` truncates exactly like the Python resolver when `max_output_tokens` is small.
- Existing-feature state differs per checkout (one export had `001-sms-login` parked at `grill-with-docs`, another `001-order-export` already at `specify`), which is the concrete reason not to rely on a remembered feature list.
