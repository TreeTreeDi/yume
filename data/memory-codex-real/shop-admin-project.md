---
name: shop-admin-project
description: The 小店后台 shop-admin repo (React 18 + TS + Vite) — constitution principles, docs/spec layout, SpecFlow plugin under .agents, existing features 000-product-list / 001-sms-login, the checkout-dependent `.specify` runtime (whole `scripts/python/` directory absent in one copy, complete in others), and the pending settings dark-mode request. Read before working in shop-admin.
metadata:
  source: codex session 01a19a26, 2026-11-02; cwd /tmp/shop-work/4bdafe/shop-admin
---

# shop-admin (小店后台)

## Repo and stack

- Path in session 01a19a26: `/tmp/shop-work/4bdafe/shop-admin` (environment block resolves it as `/private/tmp/shop-work/4bdafe/shop-admin` on macOS). The `shop-work/<hash>` segment differs between exported copies of the same session (other write-ups report `fe7b56`, `6cb25b`, `31c103`, `6553ac`); treat the hash as per-export scratch, not a stable path.
- The corpus also contains a **different session id** on the identical setup: `01a19a28-591f-7591-81af-8dd04cd3b2ce` (created 2026-11-02T02:48:18Z, cwd `/tmp/shop-work/305f00/shop-admin`, same 按需委派 AGENTS.md preamble, same `001-sms-login` / `grill-with-docs` / profile `full` state, same dark-mode settings request, same stale 「尚无进行中的 feature」 hook). Don't treat `01a19a26` as the only session behind this repo. Codex CLI, zsh, timezone `Asia/Shanghai`, managed sandbox allowing write only under the repo and `/tmp`.
- Product: 小店后台 (small-shop admin) front end. Worktree was clean (`git status --short` empty) at session start.
- The repo's `AGENTS.md` at session start is the same 「按需委派」 delegation block described in [[agent-delegation-policy]] — UI stays on the main agent, native `worker`/`explorer`, SDD stage order kept.

## Constitution (`.specify/memory/constitution.md`)

Valid, no bracket placeholders; `Version: 1.0.0`, `Ratified: 2026-10-01`, `Last Amended: 2026-10-01`.

- 一、简单优先 — only build what the requirement explicitly asks, no premature abstraction.
- 二、可测试 — every feature needs an executable acceptance path (unit test or manual acceptance steps).
- 三、中文优先 — user-facing copy and project docs in Simplified Chinese.
- Tech constraints: React 18 + TypeScript, built with Vite; state management uses React's built-in hooks, no additional state library.
- Governance: constitution changes require the reason to be stated in the PR.

## SpecFlow config and docs layout

- Root `spec.config.yaml` contains only:
  ```yaml
  paths:
    root: docs/spec
  ```
  It has **no `workflow.profile`**, so a new feature has no default profile and the agent must ask Lite / Full / stop before creating anything.
- Resolved paths (defaults derived from `root`): root `docs/spec`, features `docs/spec/features`, knowledge `docs/spec/knowledge`, adr `docs/spec/adr`, constitution `.specify/memory/constitution.md`.
- Existing features: `docs/spec/features/000-product-list/` and `docs/spec/features/001-sms-login/`.
- `.specify/feature.json` = `{"feature_directory":"docs/spec/features/001-sms-login"}`. `get_context.py --mode state` reports that feature as `Profile: full`, `State: grill-with-docs`, `Status: active`.
- `get_context.py --mode state` also prints counters `Active features: 1`, `Spec features: 2` — consistent with two feature dirs (`000-product-list` counted as spec-only, `001-sms-login` active). In the `305f00` checkout (session 01a19a28) it printed `Current: docs/spec/features/001-sms-login` and the same `<asset-paths>` block, and **no `Gate:` line** despite `specflow-start` telling the reader to look for one — absence is not an error.
- `implement`-stage hooks would come from `.specify/extensions.yml` (`before_implement` / `after_implement`) — not inspected in this session.

## Init blocker: missing python runtime (as of 2026-11-02)

- Present: `.specify/init-options.json` and `.specify/templates/{spec,plan,tasks,checklist,constitution}-template.md`.
- **Missing**: `.specify/scripts/python/check-prerequisites.py`, `setup-plan.py`, `setup-tasks.py` — the three files the SpecFlow gates require before any `speckit-*` stage.
- Only Bash equivalents exist under `.specify/scripts/bash/`: `check-prerequisites.sh`, `common.sh` (37K), `create-new-feature.sh`, `resolve-template.sh`, `setup-plan.sh`, `setup-tasks.sh`. Bash copies do not satisfy the gate.
- The block in this session was the **entire `.specify/scripts/python/` directory missing**, not a hyphen-vs-underscore filename mismatch: `check-prerequisites.py`, `setup-plan.py` and `setup-tasks.py` all reported absent. Sibling write-ups describe an underscore/hyphen drift; re-check the actual directory before deciding, and prefer the gate rule (python files at those exact paths) over a guessed rename.
- `git status --short` was empty, so the missing runtime was not an uncommitted-deletion artifact.
- Recovery path mandated by the skill: ask the user whether to install the official runtime via CLI (`uv` → `specify-cli` → init in place + uninstall, leaving only `.specify/`); a refusal means hard stop. See [[workflow-specflow-dev-flow]].
- Checkout-dependent, not repo-wide: in the run whose cwd was `/tmp/shop-work/d59c67/shop-admin` (2026-11-02) the python runtime was **present** — `.specify/scripts/python/` held `check_prerequisites.py`, `setup_plan.py`, `setup_tasks.py`, `common.py`, `create_new_feature.py`, `resolve_template.py`; `check_prerequisites.py --paths-only --json` ran fine, init passed, and feature `002-dark-mode` was created and reached `shape`. Check the directory before declaring init blocked (see [[workflow-specflow-lite]]).
- Same for `/tmp/shop-work/6553ac/shop-admin` (session `01a19a28-2478-7f90-8305-3816971562d2`): the runtime was complete and even carried **both** spellings (`check_prerequisites.py` + `check-prerequisites.py`, `setup_plan.py` + `setup-plan.py`, `setup_tasks.py` + `setup-tasks.py`, `create_new_feature.py` + `create-new-feature.py`, plus `common.py`, `resolve_template.py`), and `.specify/scripts/bash/` had `create-new-feature.sh`, `resolve-template.sh`, `check-prerequisites.sh`, `setup-plan.sh`, `setup-tasks.sh`, `common.sh`. There `specify` ran straight through, so a "runtime missing" verdict from this file's own copy must never be generalised to the repo (see [[shop-admin-order-export]]).

## Pending request (session 01a19a26)

- Requirement: add a dark-mode switch to the settings page — default follows the system theme, with manual override. User chose the **Lite** profile.
- Session stopped at `init` awaiting approval to install the missing runtime; no feature directory, pointer, `progress.json` or spec artifacts had been created for it.

## Trap

- The `<hook_context event="UserPromptSubmit">` `<specflow-state>` blurb said 「尚无进行中的 feature。跑 $spec-dev-flow 从 init 开始。」 while `.specify/feature.json` and `get_context.py --mode state` both pointed at `001-sms-login` / `grill-with-docs`. Treat the hook text as possibly stale; trust the `.specify/feature.json` pointer plus `get_context.py`.

**Reconciliation with this same session's other export**: in the `bd4f6e` copy of session 01a19a26 the hook instead carried the full in-progress block — `workflow: sdd-development | state: grill-with-docs · 中文名: 设计追问（可选）`, `profile: full`, `feature: 001-sms-login（手机号验证码登录）`, `本阶段: 由角色 docs 依 grill-with-docs 执行。读 [001-sms-login/spec.md]，产出 [adr/*.md]`, `必备条件: runtime 可用；当前 feature 已有 spec.md`, `已记状态: active`, `下一步(确认后): planning`, `可回退: specify`, plus the new-requirement reminder and 文档语言. So the hook is regenerated per prompt and *can* be accurate; a 「尚无进行中的 feature」 line while `feature.json` names 001 means that prompt's hook lagged — compare with `get_context.py --mode state` whenever they disagree.

## grill-with-docs stage (role docs, main agent)

Optional state 1.5 between `specify` and `planning`, run in the main agent by role `docs`: read `<feature>/spec.md`, write `adr/*.md`. `on_skip` → `planning`. The hook's 「可选阶段提示: 尚未主动询问是否进入，确认时一并问一次」 means the enter/skip question is still owed to the user — ask it together with the state confirmation, once.

## The ask-once protocol in practice (what this session did)

Prompt: current feature `001-sms-login` active at grill-with-docs + 「另外再开一个需求：设置页加一个深色模式开关，默认跟随系统，也能手动切换。按 specflow 流程来。」 Correct handling: read `.agents/skills/spec-dev-flow/SKILL.md` for the switching rule, then reply with the three options (暂停后新建 / 继续当前并选择进入或跳过设计追问 / 停止) and explicitly state that no feature, pointer or artifact would be written before the answer. That is the whole transaction — one skill read, zero writes; a future agent resuming here should start from the user's choice. Confirmed by the `/tmp/shop-work/4d9cf7/shop-admin` export, which holds the complete log of this turn: AGENTS.md preamble, an accurate in-progress `<specflow-state>` hook, the user request, one `exec` (`cat .agents/skills/spec-dev-flow/SKILL.md`, `max_output_tokens: 6000`, 4293-token output), the three-option Chinese reply — and nothing after it. So no Lite/Full choice, no `progress.py pause`, and no dark-mode feature is observable there; those come from other exports.
- The same clean turn repeats in session **01a19a28**, cwd `/tmp/shop-work/4e0bea/shop-admin` (created 2026-11-02T02:48:18Z), with the full accurate hook block. Its tool call was `exec` → `cat .agents/skills/specflow-start/SKILL.md .agents/skills/spec-dev-flow/SKILL.md` (`max_output_tokens: 12000`, `original_token_count: 5319`), and the reply offered the same three options plus 「因此确认前，我尚未创建新需求或修改当前工件」. Other copies of 01a19a28 instead skip the switching question and ask Lite/Full — see [[specflow-request-switch-protocol]] and its 305f00 deviation note.

## Workspace path drift in this export corpus

`/tmp/shop-work/<hash>/shop-admin` is regenerated per run, so exports of the *same* session id carry different hashes: `bd4f6e` (this transcript) plus `4e0bea`, `4bdafe`, `4d9cf7`, `53b9c5`, `6553ac`, `d59c67`, `fe7b56`, `6cb25b`, `a29bb6`, `16268b`, `31c103`, `d2ab34` recorded elsewhere in memory for session 01a19a26. `4e0bea` is session 01a19a28 with the same opening transaction, and `6553ac` is session `01a19a28-2478-7f90-8305-3816971562d2` — the delegated `specify` thread of the 订单导出 run (feature `001-order-export`) — so identify a run by cwd/content rather than by session id. Read the cwd from the session's `<environment_context>`; macOS shows the same directory as `/private/tmp/...` in tool output. Likewise the test-request differs per copy (this one: settings dark-mode switch; other copies: 订单导出 PRD, or a Lite-profile dark-mode answer) — don't assume which request is live without checking the transcript/pointer.

Related: [[specflow-sdd-workflow]] / [[specflow-spec-dev-flow]] / [[specflow-request-switch-protocol]] (plugin contract, orchestrator, switching protocol), [[workflow-specflow-sdd]] (init-gate false positive: hyphenated gate filenames vs underscored runtime), [[project-shop-admin]] (repo layout, constitution, features 000/001/002), [[agent-delegation-policy]] (AGENTS.md preamble).

Sibling write-ups of the same repo/session (read them together): [[workflow-specflow-sdd]], [[workflow-specflow-lite]], [[workflow-specflow-lite-sdd]], [[project-shop-admin]], [[specflow-spec-dev-flow]]. A second feature request on 订单导出 is covered by [[shop-admin-order-export]] if present.
