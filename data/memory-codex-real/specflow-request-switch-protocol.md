---
name: specflow-request-switch-protocol
description: What a SpecFlow (spec-dev-flow) session must do when the user raises an unrelated new requirement while a feature is still active — the ask-once 「继续当前 / 暂停当前后新建 / 停止」 protocol, the `progress.py pause` command, the optional grill-with-docs stage it usually collides with, and the `<specflow-state>` hook fields. Read before starting, pausing or creating a feature.
metadata:
  source: codex sessions 01a19a26 (2026-11-02, cwd /tmp/shop-work/bd4f6e/shop-admin) and 01a19a28 (2026-11-02T02:48Z; copies seen at /tmp/shop-work/4e0bea, e22743, 305f00/shop-admin), same opening transaction; contract read verbatim from .agents/skills/spec-dev-flow/SKILL.md
---

# SpecFlow: new requirement while a feature is active

Mechanics of the plugin itself (layout, Lite/Full state machines, progress schema, artifact paths) are in [[specflow-sdd-workflow]] and [[specflow-spec-dev-flow]]; the app is [[project-shop-admin]] / [[shop-admin-project]]. This page is only the switching protocol.

## The rule

If `.specify/feature.json` points at a feature whose progress `status` is still `active` and the user raises a requirement **unrelated** to it, ask exactly once: 「继续当前 / 暂停当前后新建 / 停止」. Nothing may happen before the answer:

- no new feature directory, no `progress.json`, no spec/plan/tasks;
- no change to `.specify/feature.json`;
- the new request is **not** written into the current feature's artifacts (changing the current feature's scope is `spec-update`, not a new feature).

Outcomes:

- **暂停后新建** → `python3 .agents/scripts/progress.py pause <current feature>/progress.json --reason "切换到新需求：<一句话>"`, then run Profile selection for the new feature. Only the new feature rewrites the pointer.
- **继续当前** → stay in the state machine; if the current state is optional, ask enter-or-skip in the same breath.
- **停止** → stop, leave `progress.json` untouched.
- Resuming a paused feature later requires pointing `.specify/feature.json` back **and** an explicit user 「继续」.

Profile choice for the new feature follows the normal precedence — explicit Lite/轻量 vs Full/完整 wording > repo `workflow.profile` > ask once with neutral options. 「按 specflow 流程来」 names the process, not a profile: ask. Profiles freeze at creation, so a wrong guess means abandoning the feature.

## Worked example (session 01a19a26, 2026-11-02)

- State at the prompt: `001-sms-login`（手机号验证码登录）`profile: full`, `state: grill-with-docs`, `status: active`; next after confirmation `planning`, rollback `specify`.
- User: 「另外再开一个需求：设置页加一个深色模式开关，默认跟随系统，也能手动切换。按 specflow 流程来。」
- Correct transaction (what happened): one read of `.agents/skills/spec-dev-flow/SKILL.md` to confirm the switching rule, then a Chinese reply offering 暂停后新建 / 继续当前（并选进入或跳过设计追问）/ 停止 and stating that nothing would be created or written before the answer. Zero writes, one turn. A future agent resuming this request starts from the user's choice — not from creating a dark-mode feature blindly.

### Clean repeat (session 01a19a28, cwd `/tmp/shop-work/4e0bea/shop-admin`, created 2026-11-02T02:48Z)

The accurate full hook block (same fields as above) plus the same user text. The agent cat'ed `specflow-start/SKILL.md` + `spec-dev-flow/SKILL.md` in one `exec` (5319 tokens, `max_output_tokens: 12000`), then offered 暂停当前后新建 / 继续当前（含进入或跳过设计追问）/ 停止, stated 「因此确认前，我尚未创建新需求或修改当前工件」, and ended. Zero writes, one turn. So the ask-once shape is reproducible inside session 01a19a28 — the deviations recorded below are per-export, not per-session-id.

### Second export of the same scenario — protocol half-followed (01a19a28, cwd `/tmp/shop-work/e22743/shop-admin`)

Same repo, same user text (「另外再开一个需求：设置页加一个深色模式开关，默认跟随系统，也能手动切换。按 specflow 流程来。」), same pre-existing `001-sms-login` at `grill-with-docs`. Different behaviour worth knowing:

- The hook banner in this export was the bare line 「尚无进行中的 feature。跑 $spec-dev-flow 从 init 开始」 with **no** `workflow/state/profile/feature` fields; `python3 -B -X utf8 .agents/skills/specflow-start/scripts/get_context.py --mode state` corrected it: `Current: docs/spec/features/001-sms-login`, `Profile: full`, `State: grill-with-docs`, `Status: active`, `Active features: 1`, `Spec features: 2` (numbered dirs `000-product-list` + `001-sms-login` are the whole set).
- The agent never asked 继续当前 / 暂停当前后新建 / 停止. It announced 「本次将作为独立需求处理」 and moved straight to Profile selection (「仓库未配置 Profile，请选择 Lite / Full / 停止」), so `.specify/feature.json` still pointed at `001-sms-login` and nothing marked it paused. Session ended awaiting that answer — zero writes, but the pointer/active-state conflict is left open. A resuming agent must resolve the pointer (`progress.py pause 001-sms-login`, then repoint) as well as the Profile; the Level-1 profile question alone is not the whole switch.
- Profile selection in that export was verified programmatically, not by guessing: `python3 -B -c '…from workflow_core import read_repository_config, resolve_selection, route_decision; c=read_repository_config(Path.cwd()); s=resolve_selection(repository_config=c["workflow"]["profile"]); print(route_decision(s.requested, s.conflict))'` → `{'action': 'confirm', 'selected': None, 'options': ['use-lite', 'use-full', 'stop'], 'reason': 'profile-required'}`. `spec.config.yaml` there contains only `paths:\n  root: docs/spec`, i.e. `workflow.profile` missing.
- Cleanest single-turn export of this transaction: cwd `/tmp/shop-work/4d9cf7/shop-admin` (same session id, 2026-11-02). It contains the whole log — `AGENTS.md` preamble, the accurate `<specflow-state>` hook, the user request, one `exec` call `cat .agents/skills/spec-dev-flow/SKILL.md` with `max_output_tokens: 6000` (4293-token output), and one Chinese reply — then ends. No user answer, no second prompt, no file write; the Lite-profile choice recorded in [[workflow-specflow-lite-sdd]] and [[shop-admin-project]] is therefore not visible in that copy.
- The reply shape that worked: three numbered options, and option 1 bundles the still-owed 「是否进入设计追问」 question so the optional stage is asked exactly once; the message ends by asking for the choice, not by taking one.

### Third export, same deviation (`/tmp/shop-work/305f00/shop-admin`, same session 01a19a28, created 2026-11-02T02:48:18Z)

Same stale hook, same outcome, and the clearest statement of the mistake: after `pwd && cat .agents/skills/specflow-start/SKILL.md spec.config.yaml` and `get_context.py --mode state` (→ `Current: docs/spec/features/001-sms-login`, `Profile: full`, `State: grill-with-docs`, `Status: active`, `Active features: 1`, `Spec features: 2`), the reply asked only Lite / Full / 停止 and added 「另，实际状态显示短信登录需求仍在"设计追问"阶段；本次会另建需求，保留其进度。」

- So the existing feature is acknowledged in prose but neither continued nor paused, and `.specify/feature.json` still points at `001-sms-login`. Acknowledging the conflict in the reply is not the same as resolving it.
- The reply's options were unranked (no `(Recommended)`) — consistent with the neutral-asking rule above.
- Profile evidence there came from a bare `resolve_selection()` call (no `repository_config=`), which returns `Selection(source='user-confirmation', requested=None, conflict=False)` → `confirm`: it proves only that nothing was passed, not that the file lacks `workflow.profile`. Read `spec.config.yaml` (or pass `repository_config=`) to make that claim.
- Path gotcha: `.agents/skills/spec-dev-flow/scripts` does not exist (`rg` exits 2), the module is `.agents/scripts/workflow_core.py` — see [[workflow-specflow-dev-flow]].

## Cheapest way to confirm the rule (one tool call)

The switching paragraph is under 「流程进行中来了新需求」 in `.agents/skills/spec-dev-flow/SKILL.md`. One exec call covers both entry skills: `cat .agents/skills/specflow-start/SKILL.md .agents/skills/spec-dev-flow/SKILL.md` — in the `/tmp/shop-work/4e0bea` copy the pair came back at `original_token_count: 5319`, so `max_output_tokens: 12000` does not truncate. Codex wraps the result as `{"chunk_id", "wall_time_seconds", "exit_code", "original_token_count", "output"}` with `output` a JSON-escaped string (escapes are the export format, not file content). No `get_context.py` run and no `gates.md`/`artifact-paths.md` read is needed: the `<specflow-state>` hook block already states the feature, profile and state, and the turn ends on the user's choice anyway.

## Asking neutrally (interactive-selection tools)

`spec-dev-flow` allows the host's interactive-selection tool when it offers neutral options — Codex `request_user_input`, Claude Code `AskUserQuestion` — and says to fall back to a plain-text question when the tool forces a recommended/default item ("不得为了使用工具而制造默认模式或推荐结论"). So the 继续 / 暂停 / 停止 question carries **no** `(Recommended)` marker; that marker belongs only to a state checkpoint's 「进入下一步」 option. Keep the three options unranked — in the `/tmp/shop-work/4e0bea` copy of session 01a19a28 the reply listed 「暂停当前后新建」 first with no recommendation and cited `spec-dev-flow/SKILL.md` as the authority, which is the neutral shape to copy.

## The optional stage it usually collides with: grill-with-docs

State 1.5 between `specify` and `planning`, role **docs**, run by the main agent (not a sub-agent): read `<feature>/spec.md`, write `adr/*.md`. Prerequisites: runtime usable and the feature already has `spec.md`. `on_skip` goes straight to `planning`. The hook adds 「可选阶段提示: 尚未主动询问是否进入，确认时一并问一次」 until the question has been asked — so the pending action in a session parked here is to offer 「进入 / 跳过设计追问」 together with the state confirmation, once per run only.

## Reading `<specflow-state>` from the hook

A `UserPromptSubmit` hook injects `<hook_context event="UserPromptSubmit"><specflow-state>…</specflow-state></hook_context>` and it is regenerated per prompt. Fields observed in this session: `workflow: sdd-development`, `state: grill-with-docs · 中文名: 设计追问（可选）`, `profile: full`, `feature: 001-sms-login（手机号验证码登录）`, `本阶段` (role + artifacts), `必备条件`, `已记状态: active`, `下一步(确认后): planning`, `可回退: specify`, 新需求 reminder, `文档语言` (artifacts entirely in 简体中文, IDs/markers/paths/code literal), and 可选阶段提示. Use it to orient, but when it says 「尚无进行中的 feature」 while `.specify/feature.json` names a feature, the hook lagged — reconcile with `get_context.py --mode state` and the pointer, and say which source you trust.

## Artifact language

Artifacts are written entirely in Simplified Chinese — template headings/descriptions rewritten, no mixed English prose; identifiers, markers, paths, code and commands stay literal (`references/artifact-paths.md` §文档语言). Pass the same instruction to every delegated sub-agent. shop-admin's constitution states it as 中文优先.

## Path drift across exports

`/tmp/shop-work/<hash>/shop-admin` is recreated per run, so exports show different hashes (`bd4f6e`, `4e0bea`, `4bdafe`, `4d9cf7`, `53b9c5`, `6553ac`, `d59c67`, `e22743`, `305f00`, `fe7b56`, `6cb25b`), the same opening transaction appears under different session ids (01a19a26, 01a19a28), and the test request differs per copy (dark-mode switch here; 订单导出 PRD and a Lite dark-mode answer in others — see [[shop-admin-order-export]]). Take the cwd from `<environment_context>`, identify a run by its cwd and content rather than its session id, and don't infer the live request from another copy's memory.
