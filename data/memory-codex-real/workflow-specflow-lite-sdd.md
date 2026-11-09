---
name: workflow-specflow-lite-sdd
description: SpecFlow Lite-profile companion — lite.yaml state table, shape authorization and implement-lite→verify-lite lifecycle, plus the unstarted shop-admin dark-mode-switch requirement and its `d2ab34` repo snapshot (2026-11-02). Read with workflow-specflow-sdd for the init-gate blocker.
metadata:
  source: codex session 01a19a26, 2026-11-02, cwd /tmp/shop-work/d2ab34/shop-admin
---

# SpecFlow Lite delivery + shop-admin snapshot

Siblings covering the same material from other exports of this session family: [[specflow-full-workflow]] and [[workflow-specflow-dev-flow]] (Full mechanics, `progress.py` flags, `resolve_selection`/`route_decision`), [[workflow-specflow-sdd]] (the hyphenated-gate vs underscored-runtime blocker that stopped `init`), [[specflow-spec-dev-flow]] and [[workflow-specflow-lite]] (orchestrator tables), [[project-shop-admin]] / [[shop-admin-project]] (repo facts). This page adds the Lite manifest details and the `/tmp/shop-work/d2ab34/shop-admin` run.

## Lite manifest (`.agents/workflow/lite.yaml`)

`schema_version: "1.0"`, `name: sdd-development`, `version: 1.0`, `initial: init`, `final: done`, `inputs: [requirement]`. `done`/`stop` are terminal markers, never in `progress.states` or `workflow.route`.

| state | role | skill | args / outputs | on_success | on_failure |
|---|---|---|---|---|---|
| `init` | orchestrator | `spec-dev-flow` | — | shape | stop |
| `shape` | orchestrator | `specflow-shape` | outputs spec.md, plan.md, tasks.md | implement-lite | stop |
| `implement-lite` | orchestrator | `specflow-lite-delivery` | `mode:implement`, output source-code | verify-lite | stop |
| `verify-lite` | orchestrator | `specflow-lite-delivery` | `mode:verify`, output gate-result | done | stop |

## Selection helpers (`workflow_core.py`)

- `resolve_selection(natural_language=…, call_parameter=…, repository_config=…)`: each supplied value must be in `PROFILES` or it raises `WorkflowError("<name> profile 非法: …")`; two explicit values → `Selection("natural-language+call-parameter", None, True)`; otherwise the first non-None of natural-language → call-parameter → repository-config, else `Selection("user-confirmation", None)`.
- `route_decision(requested, conflict)`: `conflict` → `{action: clarify, reason: same-level-conflict}`; invalid `requested` → error; valid `requested` → `{action: select, reason: explicit-selection}`; `None` → `{action: confirm, options: [use-lite, use-full, stop], reason: profile-required}`. The `confirm` result is the signal to ask Lite/Full/stop once, neutrally and with no recommended default, before any feature/progress artifact is created.
- Direct check without the CLI: `python3 -c 'import sys; sys.path.insert(0,".agents/scripts"); from workflow_core import resolve_selection,route_decision; s=resolve_selection(natural_language="lite"); print(route_decision(s.requested,s.conflict))'` → `{'action': 'select', 'selected': 'lite', 'reason': 'explicit-selection'}`.

## Shape and Lite delivery contract

- shape writes **only** spec.md / plan.md / tasks.md — never `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, requirements checklist or `verification.md`; it also compares the init baseline's dirty paths against planned overlap, discloses `.specify/extensions.yml` `before_implement`/`after_implement` hooks (missing file = none) and any ignore files the stack implies, then `progress.py authorize --acceptance-id AC-001 … --evidence …` and `transition --event success --output spec.md --output plan.md --output tasks.md`.
- ID grammar: `US1`/`US2` capability groups, `AC-001`+ each tied to a US, tasks as `- [ ] T001 [P?] [USn?] <action + exact path> (AC-xxx)` under `## Phase N`, plus a verification section per AC with command, cwd, result and evidence — traceable US → AC → task → result.
- `specflow-lite-delivery` is a thin adapter, not a second planner: `mode:implement` re-checks authorization, baseline/diff and scope, then hands execution to the unchanged `speckit-implement` in the current agent; `mode:verify` walks every AC and records real results in `tasks.md`. Lite never calls `speckit-converge` and never auto-runs `compound`, and it starts no sub-agents.
- One required pause: the shape authorization. It covers implement-lite through verify-lite (`authorization.route_revision` starts at 1, increments only on reopen). Security/compat/migration/architecture/infra/permission risks are disclosed inside the Lite plan, not used to switch profile; blockers (no authorization, workspace conflict, unverifiable AC, out of capability) mean `progress.py pause`.
- Scope is not hash-checked — the agent judges substance. Goals, acceptance, external behavior, boundaries, risk handling or key design changing → `reopen --from shape`; task granularity, in-scope tests, copy, formatting do not.
- `completion` is `{completed_at, verification_location}` only; `progress.py complete` needs `--verification-location tasks.md` and a results array covering every authorized AC exactly once, all `passed` with evidence. Accepting risk is not a pass.

## Pending requirement: dark-mode switch (Lite, not started)

- Requirement, 2026-11-02: the settings page gets a dark-mode toggle that defaults to following the system and can be overridden manually. User chose **Lite** when asked (no repo `workflow.profile` existed).
- Per-checkout: in the `d2ab34` copy the user answered Lite; in the `e22743` copy (export 01a19a28) the session ended still waiting for the Lite / Full / 停止 answer, and that copy has no `002-*` feature at all. Don't carry the Lite choice across copies without checking `docs/spec/features/`.
- Nothing was created — no feature directory, `progress.json`, `spec.md`. Sequential numbering puts it after `000-product-list` and `001-sms-login`, i.e. `002-…`. In `e22743`, `get_context.py --mode state` reported `Active features: 1`, `Spec features: 2` while `001-sms-login` was still `full` / `grill-with-docs` / `active`.
- Next session should expect the `init` gate stop described in [[workflow-specflow-sdd]]: `references/gates.md` lists hyphenated scripts while `.specify/scripts/python/` ships `check_prerequisites.py`, `setup_plan.py`, `setup_tasks.py`. Verify by running the underscored script rather than reinstalling `.specify/` (which needs explicit consent).
- Verification path for the ACs: `package.json` only offers `test: vitest run` and there were no test files, so either add `src/**/*.test.tsx` or record manual steps in `tasks.md` (the constitution's 可测试 principle allows manual acceptance).

## shop-admin repo snapshot (`/tmp/shop-work/d2ab34/shop-admin`, 2026-11-02)

- Same directory as `/private/tmp/shop-work/d2ab34/shop-admin` (env blocks use the `/private/tmp` spelling, tool output `/tmp`).
- Managed sandbox: read `:root`; write only the workspace root, `:slash_tmp` and the tmpdir; `.git`, `.agents`, `.codex`, `.aws` read-only — the `.agents/` plugin can be read, not edited.
- `spec.config.yaml` has only `paths.root: docs/spec` (defaults → `docs/spec/features`, `docs/spec/knowledge`, `docs/spec/adr`) and **no** `workflow.profile`.
- Constitution 小店后台 v1.0.0 (2026-10-01): 简单优先 / 可测试 / 中文优先; React 18 + TypeScript + Vite; React-hooks-only state.
- `package.json`: `shop-admin@0.1.0`, `dev: vite`, `build: tsc && vite build`, `test: vitest run`; react/react-dom ^18.3.0, typescript ^5.5.0, vite ^5.4.0, vitest ^2.0.0.
- Source: only `src/App.tsx`; no settings page, router, theme module or tests; `git status --short` clean.
- Existing features: `001-sms-login` (Profile `full`, state `grill-with-docs`, active — park it, don't resume) and `000-product-list`. `get_context.py --mode state` is authoritative when the `UserPromptSubmit` banner says there is no active feature.
- `.specify/extensions.yml` absent → no implement hooks (a `cat` on it exits 1).
