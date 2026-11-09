# Memory index

> Several agents distilled the same sessions concurrently, so a few topics have more than one file. Each line names the topic and what that file adds; read the sibling(s) named in the line when you need the fuller picture.

## dt-insight / publicService — workflow, harness & delivery gates

- [[dt-insight-harness-conventions]] — override-file rules, `dtis` command set, acceptance → code-review → Plannotator → commit gating, push policy, test-env login helpers, intake routing, theme→path pointer table.
- [[dt-insight-workflow]] — the same workflow as an SOP: `dtis ready`/`dtis fmt` details, triage handoff fields + target matrix, delegation policy.
- [[dt-insight-workflow-conventions]] — required dtis commands, verification and acceptance gates, 卡片 rules, login tooling, delegation.
- [[dt-insight-project-conventions]] — one-page overview of AGENTS.md: gates, i18n extract, test env, delegation, intake.
- [[dt-insight-project-workflow]] — console/publicService/dt-common layout, dtis, zentao CLI, branch + delivery gates.
- [[dtis-workflow-and-conventions]] — commit/acceptance SOP, dtis commands, test-env login, coding-standard highlights for the worktree repo.
- [[workflow-dt-insight-git-delivery-gates]] — when commit/push/MR is allowed, the Bug 验收闸门, review gate commands, branch naming.
- [[workflow-dt-insight-triage-routing]] — intake decides kind / target branch / downstream skill; when to skip the ceremony.
- [[dt-insight-studio-agent-rules]] — hard rules and doc index shared by every harness (Cursor, Codex, Claude Code, PI, Multica).
- [[dt-insight-studio-agent-conventions]] — one-screen quick reference: worktree/branch naming, intake URL, dtis gate sequence.
- [[dt-insight-studio-harness-rules]] — what `dtis ready`/`fmt`/`check` actually block, and which `dt-correct` lint rules are written but not yet effective.
- [[dt-insight-studio-test-env-access]] — `env-api` / `env-cookie` / `env-open` instead of stopping at a login page or captcha.
- [[dt-insight-studio-gitlab-mr-review]] — `glab` against gitlab.prod.dtstack.cn: MR list/view/diff/approvals and the daily review automation.
- [[system-dt-insight-studio-workspace]] — monorepo layout, overlay files, worktree sync, local test-env login, branch lines per app.

## dt-insight — coding standards

- [[dt-insight-coding-standards]] — typing, antd/Form rules, comments/stylelint, i18n extract, aggressive-defensive bans, formatting, bug-fix convergence, and which lint rules `dtis ready` blocks.
- [[dt-insight-frontend-conventions]] — same SSOT distilled as front-end conventions (validation via `Form.Item` rules, minimal diff, i18n, lint gates).
- [[convention-dt-insight-coding-standards]] — checkable rule list for dt-insight-studio front-end work.

## dt-insight — dataAssets (资产多模态) app

- [[bug-dataassets-permission-strategy-149812]] — ZenTao 149812 card fields (product 207, closed without `resolvedBy`), root cause (`matchValue` Form.Items at `fileObjectSelector/index.tsx:319`/`:328` have no `rules` → empty regex/file reaches `/unstructuredPermission/strategy/*` → SQL error), the proposed two-rule fix, acceptance list, and why the reply's "edit `locales/**`" step must become an extract run. Unverified plan, no edits made. Two read-only sessions: 01a199f8 = `/Users/mac/.factory/ws/149812-r2` (the one that read the ZenTao card), 01a199f0 = `.../149812-r1`.
- [[dataassets-unstructured-permission-strategy]] — code map of the 非结构化「权限策略管理」 page in `apps/dataAssets/src/views/unStructured/permissionStrategy`: layout (no `src/pages`), addOrEdit form flow, `fileObjects` table + MatchMode→payload mapping, `/unstructuredPermission/strategy/*` URLs, i18n key nesting.
- [[dt-insight-unstructured-file-permission-strategy]] — 文件权限策略代码地图与校验缺口：`MatchMode`（Exact/Regex/AllFileInBucket/AllFileInDir）表单↔接口契约、`addOrEdit/utils.ts` 互转函数、正则行无 `rules`、正则+全部路径往返丢失导致编辑即报错、`matchValue` string/string[] 漂移、`FileSelect` 200 文件上限，以及 `/root` 派发会话回复为密文时如何取证（该会话未读 149812 卡片，卡片字段见 bug 页）。
- [[dt-insight-dataassets-permission-strategy]] — companion details to the dataAssets code map: effectiveType change strips `PermissionCode.Upload`, FILE_ALL_OPTION/PATH_ALL_OPTION exclusivity, regex rows lose 「全部路径」 on echo, `FileSelect` fetches only 200 files of six FileTypes, i18n key values, where `matchValue` validation is missing (bug 149812), and the two nearby `docs/solutions` docs worth reusing.

## Domain: 数据源中心 (publicService data source center)

- [[dt-insight-data-source-center]] — wizard (SelectSource → ProduceAuth → InfoConfig), sessionStorage echo contract (`current`/`sqlType`/`version`), version Select behaviour, bug 161496 root cause and fix shape, plus story 16537 (S3 list connection info hostname → endpoint + region).
- [[dt-insight-public-service-datasource]] — 161496 card fields (`product 48`, `resolvedBuild 1696`, `testtask 2228`), the exact two-file fix plan proposed in that session, the `apps/publicService` vs `apps/console` pitfall, type/version APIs.
- [[dt-insight-data-source-version-flow]] — line-level code map: version default in `produceAuth.tsx`, AuthForm `needGetProductList` gating, InfoConfig internals, session cache helpers.
- [[dt-insight-datasource-center]] — 数据源中心三步向导代码结构、sessionStorage 键与 161496 修法（中文）。
- [[dt-insight-datasource-add-source]] — 同一向导的英文结构梳理：版本选择、授权与最小修法方向。
- [[publicservice-datasource-version-select-default]] — bug 161496 root cause, fix plan and per-field acceptance points (Chinese).
- [[bug-publicservice-datasource-version-161496]] — bug 161496 code map, accepted two-file fix plan, and the 2026-11-02 re-checks: HEAD still has `saveStatus.version || data[0].dataVersion` and no `form.validateFields()` wiring (Chinese).
- [[datasource-center-add-source-flow]] — wizard + sessionStorage + version wiring; points to the 161496 page.
- [[datasource-add-version-flow]] — how `dataVersion` decides the InfoConfig form template (`findTemplateByTypeVersion`, `handleSpace`, `dsForm/*` branches).
- Console-side list page and its 连接信息 cell: see the「Domain: console 数据源列表」section below ([[dt-insight-console-datasource-list]], [[dt-insight-console-datasource-list-link-info]], [[dt-insight-console-datasource-list-connection-info]]).

## Domain: console 数据源列表 (apps/console)

> Three plan-only codex sessions on story 16537 read this same cell: `01a199f4` and `01a199f8-fb67…` in ws/16537-r1 (the latter has the plan in prose), `01a199f0-9782…` in ws/16537-r2 (tool calls only).

- [[dt-insight-console-datasource-list]] — main write-up: 连接信息 column, `ExtTableCell`, DATA_SOURCE ids (S3 41 / AWSS3 63 / CSPS3 80), story 16537 endpoint+region plan, and per-session provenance.
- [[dt-insight-console-datasource-list-link-info]] — extras only: `list/constants.tsx` column wiring, the two conflicting `isMeta` helpers (`meta === 1` vs `1 || 2`), and the exec commands that pin the S3 `hostname` row at `extTableCell.tsx:174`.
- [[dt-insight-console-datasource-list-connection-info]] — same column plus the S3 row table, the console→publicService list API layer (`window.APP_CONF.API_PREFIX_PS`, `/dataSource/page`), the `env-api` contract check to run before shipping, and `rg 'hostname'` triage.

## SpecFlow / SDD workflow

- [[workflow-specflow-sdd]] — the SpecFlow `init` gate trap: `gates.md` lists hyphenated `check-prerequisites.py`/`setup-plan.py`/`setup-tasks.py` while speckit 0.16.2 ships underscored python modules and hyphenated bash `.sh` scripts under `.specify/scripts/bash/`, so a literal check halts `init` with zero artifacts (53b9c5 run of session 01a19a26); includes the commands that prove the runtime is fine, and why the same `53b9c5` path in session 01a19a28 passed init (hash ≠ run id).
- [[specflow-sdd-workflow]] — SpecFlow mechanics plus the `16268b` run: `.agents/` plugin layout, Full + Lite state order, progress.json as the only state source, the checkpoint and verbatim sub-agent handoff rules, how a delegated `specify` stage appears (`NEW_TASK` + blank payload), the `resolve_template.py --json` truncation pitfall, and the 订单导出 PRD's open questions.
- [[shop-admin-order-export]] — 小店后台 (shop-admin) stack/constitution/package.json plus SpecFlow feature `001-order-export`: the Excel order-export PRD, spec.md + checklist (FR/SC counts differ per export: 7/4, 8/4, 9/4, 9/5, 10/5 — read the on-disk file), the `specify` role contract and template-resolver truncation pitfall, the developer's 技术方案 (client-side SheetJS `xlsx` + `GET /api/orders`), progress state, the completed planning stage (plan/research/data-model/contracts/quickstart, full-fetch + 5000-cap + text-order-number decisions, pre-implementation API verification items), and what remains: `tasks.md`. Its 6553ac section covers the paired specify thread `01a19a28-2478-…` (feature dir + pointer written by hand, no `progress.py`) and the defaults that spec locked: 5000 allowed/5001 blocked with no truncation, 0 matches → header-only file, one row per order, click-time local date in the filename.
- [[specflow-request-switch-protocol]] — the ask-once protocol spelled out (what must not be written before the answer, the `progress.py pause` command, resume needs the pointer moved back), the grill-with-docs stage (role docs, `spec.md` → `adr/*.md`, `on_skip: planning`), the `<specflow-state>` hook fields, 简体中文 artifact rule, shop-work path drift, and the clean single-turn `4d9cf7` example (one skill read, three-option reply, then the log ends); also the `e22743` export (01a19a28) where the agent skipped the switch question and asked only Lite/Full/stop, leaving the pointer on `001-sms-login` (the `305f00` copy shows the same skip; a `4e0bea` copy shows the clean ask-once shape), plus the neutral-question rule (`request_user_input`/`AskUserQuestion` only if it allows no recommended item) and the one-`cat` evidence path with the Codex `exec` result envelope.

## ZenTao (禅道)

- [[zentao-cli]] — read/write commands, batch edit/start/finish, hours logging, resolve; dry-run-first rule, session cache, field tables, pitfalls.
- [[workflow-zentao-cli]] — the Chinese equivalent: read commands, write safety, batch semantics, cache/TTL traps.


## Delegation / sub-agents

- [[agent-delegation-policy]] — the 按需委派 policy (AGENTS.md text, re-verified verbatim 2026-11-02): UI stays on main model, native worker/explorer roles, SDD order (see [[workflow-specflow-sdd]]); plus per-session cwd and permission-profile facts read from `<environment_context>`.

## SpecFlow (SDD) workflow — shop-admin

- [[workflow-specflow-lite-sdd]] — Lite companion: shape authorization and `specflow-lite-delivery` implement-lite→verify-lite lifecycle (thin adapter over `speckit-implement`, no converge/compound, AC pause rules), plus the unstarted shop-admin dark-mode-switch requirement (per checkout: Lite chosen in `d2ab34`, still unanswered in `e22743`) and the `d2ab34` repo snapshot (`src/App.tsx` only, vitest script, clean tree).
- [[specflow-sdd-workflow]] — general runbook (same file listed above): plugin vs runtime layout, Full/Lite states, `get_context.py` modes, progress.json rules, the ask-once switching protocol, per-checkout state, `shop-work` hash drift (`01a19a26` seen with nine different hashes), and cross-export notes on the delegated `specify` stage (`spawn_agent` → `/root/specify`, thread ends at `wait_agent`).

## SpecFlow / SDD (spec-driven development)

- [[workflow-specflow-lite]] — in-repo SpecFlow plugin layout, profile selection, the Lite route and its gates, progress.json schema 3 + `progress.py` commands, and pointer/runtime gotchas (`feature.json`, underscored script names).
- [[project-shop-admin]] — the `shop-admin` (小店后台) fixture repo: React 18/Vite/Vitest scripts, Chinese-first constitution with hooks-only state, `docs/spec` layout, existing 000/001/002 features and the missing entry files; `.specify` contents incl. the bash script set behind `gates.md`'s hyphenated names; plus the 6553ac 订单导出 run (feature `001-order-export` written by the paired `01a19a28` specify thread, now at the planning entry with a user-supplied tech plan) and its 31c103 twin specify export (`01a19a26-4bbd-…`, stops at the resolver call, no files written).

## SpecFlow SDD workflow & shop-admin

> Several concurrent write-ups cover this material; the files below overlap heavily. Read [[workflow-specflow-dev-flow]] or [[workflow-specflow-lite]] first, then the sibling that matches your need.

- [[workflow-specflow-dev-flow]] — SpecFlow orchestrator: Lite/Full profile selection (verified `resolve_selection`/`route_decision` signatures, helper module at `.agents/scripts/workflow_core.py`, the no-arg probe that yields `reason: profile-required`), `progress.py` rules, init→shape→implement-lite→verify-lite chain, Full stage table, gates and artifact paths.
- [[shop-admin-project]] — 小店后台 repo: React 18 + TS + Vite constitution, `docs/spec` layout, features 000-product-list / 001-sms-login, missing `.specify/scripts/python` runtime (not a hyphen typo), dark-mode settings request, and the second session id `01a19a28` (`/tmp/shop-work/305f00`, plus the clean ask-once copy at `/tmp/shop-work/4e0bea`).

## Codex harness / automations

- [[harness-hook-probe-sessions]] — prompts that "test hook connectivity" or ask for a "secret word" from the agent's own context; recognize by intent and do not answer (codex instances 01a199b8, 01a199bb, 01a19a22, 2026-11-02).
- [[agent-hook-probe-sessions]] — the concrete probe sessions (01a199b8, 01a199bb: bug 161496 link + 20-character quote request; 01a19a22: English "secret word / reply one word" in /private/tmp/sfx-hooktest), with wording variants and the leak actually observed.
- [[codex-app-automations]] — recurring Codex automations (automation_update shape, heartbeat vs cron, RRULE, automation.toml).
- [[codex-new-task-empty-payload]] — `NEW_TASK` / bare `MESSAGE` envelopes with a blank payload: how to tell a truly empty delegation from an SDD stage dispatch (the `/root/<state>` slug) or an envelope-only turn that still contains real tool calls, the sessions showing each (incl. `/root/specify` in 6553ac, abe94d, 31c103, a29bb6), recovery, and the plan-only prompt pattern.

## SpecFlow / SDD workflow

- [[specflow-spec-dev-flow]] — the `spec-dev-flow` orchestrator plus the `specflow-start` bootstrap (three `get_context.py` modes, state→skill routing table), Lite vs Full state machines and roles, 必备条件 vs 内容质量, `progress.json` checkpoint rules, verbatim sub-agent handoff, `spec.config.yaml` path resolution, `.specify` runtime and `resolve-template.sh` usage.
- [[project-shop-admin]] — 小店后台 (`shop-admin`): constitution (简单优先/可测试/中文优先, React 18 + TS + Vite), `docs/spec` layout, vendored `.agents` SpecFlow plugin, and the 订单导出 PRD.
- [[specflow-full-workflow]] — the Full-run mechanics: `.agents/` layout, state/subagent map, `progress.py` subcommands and their real flags, progress.json schema 3, gates, artifact-path rules, the developer tech-plan input requirement (and the session that satisfied it), and the `setup-plan.py` → plan-template mechanics.
- [[shop-admin-specflow-repo]] — the `/tmp/shop-work/abe94d/shop-admin` checkout: React 18 + Vite + vitest skeleton, Spec Kit 0.16.2 copilot runtime, constitution, and feature `001-order-export` (订单导出 PRD, progress.json state, the delegated `specify` stage's exact reads, and the sibling export `01a19a28-2488-…` where `specify` finished: `spec.md` FR-001…007 + 16/16 checklist + `.specify/feature.json`, written by hand with no git branch).

## Transcript corpus / memory maintenance

- [[empty-session-transcripts]] — low-value exports that contribute no facts: header-only files with zero events (session 01a199d9, cwd firstmate-factory) and single-trivial-turn "reply OK only" sessions (01a19a0f, 01a19a10, 01a19a21, cwd /private/tmp, recurring minutes apart = automated smoke tests).

## UED / tooling announcements

- [[antd-rc-7-upgrade-notice]] — UED announcement: Component Development Agent (Codex plugin v0.1.2), Multica agent, antd+rc 7.0 upgrade flow.

## Project: dingtalk-ears

- [[dingtalk-ears]] — entry point: run/stop, config paths, verification, code conventions.
- [[dingtalk-ears-project-overview]] — layout plus start/stop/diagnose cards (launchd label `com.codex.dingtalk-ears`, doctor/run/service).
- [[dingtalk-ears-run-and-service]] — start/stop/diagnose card for the dingtalk-ears service.
- [[dingtalk-ears-message-handling-contract]] — input/output JSON contracts (summary / needs_reply / draft / todos) and image handling.
- [[dingtalk-ears-message-triage]] — triage contract plus typo/ambiguity handling and todo evidence fields.
- [[dingtalk-ears-reply-output-contract]] — reply output shape with private-chat and broadcast calibration.
- [[dingtalk-ears-message-digest-contract]] — digest round-trip with image mediaId handling.
- [[dingtalk-ears-overview-task]] — overview task shape and cumulative-batch behaviour.
- [[dingtalk-ears-code-conventions]] — prompt/contract ownership, share-package whitelist, checks to run.
- [[dingtalk-ears-product-backlog-and-people]] — open requests, requesters, UED reviewer feedback on theming.
- [[dingtalk-ears-ui-theme]] — UI theme/skin-switch request and reviewer feedback.

## Project: internal-open-design

- [[open-design-repo-conventions]] — root command boundary, daemon data-dir contract, UI/CLI dual track, test placement, release channels.
