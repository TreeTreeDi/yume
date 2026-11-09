---
name: project-shop-admin
description: The tiny shop-admin (小店后台) React/Vite repo used for SpecFlow runs — layout, constitution rules, package.json scripts, existing features and what is still missing before any UI feature can run. Read when a session's cwd is /tmp/shop-work/*/shop-admin.
metadata:
  source: codex session 01a19a26 (2026-11-02); repo state at commit cd33b14
---

# shop-admin (小店后台)

Disposable SpecFlow fixture repo; sessions run in a temp worktree such as `/tmp/shop-work/d59c67/shop-admin` (the same path appears as `/private/tmp/...` under macOS — `pwd` shows the `/private` form). Each session gets its **own** `/tmp/shop-work/<id>/shop-admin` copy, and exports even of the same session id have shown different ids (`d59c67`, `6553ac`, `31c103`, `6cb25b`, `d2ab34`, `e22743`), different repo state and different `.specify/feature.json` presence — so read the cwd and the file reads from the transcript at hand and never assume one shared path or a single feature list. See [[shop-admin-order-export]] and [[specflow-sdd-workflow]] for the other exports.

## Stack and scripts

`package.json`: name `shop-admin`, private, version `0.1.0`.

- `scripts`: `dev: vite`, `build: "tsc && vite build"`, `test: "vitest run"`.
- deps: `react ^18.3.0`, `react-dom ^18.3.0`.
- devDeps: `typescript ^5.5.0`, `vite ^5.4.0`, `vitest ^2.0.0`.

Source is a single placeholder: `src/App.tsx` renders `<div className="app">小店后台</div>`. `README.md` is one line (「一个简单的店铺管理后台。」). There is **no** index.html, no `src/main.tsx`, no `tsconfig.json`, no `src/styles.css`, no test file and no `.gitignore` — any real feature must first add the minimal Vite/React entry config, and `npm test`/`npm run build` cannot be meaningful until it does.

## Project constitution

`.specify/memory/constitution.md` — 「小店后台 项目宪章」, Version 1.0.0, ratified/last amended 2026-10-01:

1. 简单优先 — only build what the requirement asks, no premature abstraction.
2. 可测试 — every feature needs an executable acceptance path (unit test or manual steps).
3. 中文优先 — user-facing copy **and project documents** in Simplified Chinese.

Tech constraints: React 18 + TypeScript, Vite build; state via React's own hooks, **no extra state-management library**. Governance: charter changes must be justified in the PR. This counts as a "real" constitution for the SpecFlow init gate (no bracket placeholders), so init needs no `speckit-constitution` run.

## Spec Kit runtime and paths

- `spec.config.yaml` sets only `paths: root: docs/spec`; `features` / `knowledge` / `adr` therefore default to `docs/spec/features`, `docs/spec/knowledge`, `docs/spec/adr`. There is **no** `workflow.profile`, so every new requirement must ask Lite/Full (see [[workflow-specflow-lite]]).
- `.specify/init-options.json`: `ai: copilot`, `integration: copilot`, `ai_skills: true`, `feature_numbering: sequential`, `here: true`, `script: py`, `speckit_version: 0.16.2`.
- `.specify/scripts/python/`: `check_prerequisites.py`, `common.py`, `create_new_feature.py`, `resolve_template.py`, `setup_plan.py`, `setup_tasks.py`. Templates: `spec-`, `plan-`, `tasks-`, `checklist-`, `constitution-template.md`.
- `.specify/scripts/bash/`: the same helpers with hyphenated stems as shell scripts — `create-new-feature.sh`, `resolve-template.sh`, `check-prerequisites.sh`, `setup-plan.sh`, `setup-tasks.sh`, `common.sh`. These stems are what `gates.md` names, but it gives them a `.py` extension. Resolver usage: `bash .specify/scripts/bash/resolve-template.sh <template-name> [--json]`. The rest of `.specify/`: `integration.json`, `init-options.json`, `integrations/speckit.manifest.json`, `workflows/speckit/workflow.yml`, `workflows/workflow-registry.json`, `memory/constitution.md`.
- `.specify/extensions.yml` does **not** exist → no `before_implement` / `after_implement` hooks to disclose (state this explicitly in plan.md). Re-confirmed in the 53b9c5 checkout of session 01a19a28, which also shows no `before_specify` / `after_specify` hooks ([[shop-admin-order-export]]).
- `.specify/feature.json` holds the current-feature pointer; it pointed at `001-sms-login` until a session repointed it to `docs/spec/features/002-dark-mode`.

## Features present

- `docs/spec/features/000-product-list/` — spec.md + progress.json.
- `docs/spec/features/001-sms-login/` — spec.md + progress.json; at the 2026-11-02 session it was Profile `full`, `current_state: grill-with-docs`, status active. Left untouched by later work.
- `docs/spec/features/002-dark-mode/` — created 2026-11-02 by that session: Lite profile, `init` completed, `shape` active with spec/plan/tasks written but **no user authorization yet**. product requirement: settings page dark-mode switch, default follow-system, manual override, remembered. Plan: `'system' | 'light' | 'dark'` preference persisted under localStorage key **`shop-admin.theme`**, applied via `data-theme` + `color-scheme` on `document.documentElement`, semantic colour variables in `src/styles.css`, three native radios with a `legend`, `matchMedia` subscription with listener cleanup, `src/theme.ts` for the storage/parse boundary, tests in `src/theme.test.ts` / `src/App.test.tsx`. Other copies of the same session family never got this far: in `/tmp/shop-work/e22743/shop-admin` (export 01a19a28) the session ended before the Lite/Full answer, so there is no `002-*` directory and `get_context.py --mode state` still listed `Active features: 1`, `Spec features: 2` (`000-product-list`, `001-sms-login`).

Baseline commit at that session: `cd33b14a69441292b1f1efad7c5027ced9865e68`, worktree clean (`git status --short` empty).

## 订单导出 (order export) — the Full-flow requirement used in the 6553ac copy

PRD: add an 「导出」 button to the order list page that exports **the current filter's** orders as Excel
`.xlsx`, columns 订单号、下单时间、买家昵称、商品、数量、实付金额、订单状态; max **5000** rows (above that,
no export + 「请缩小筛选范围」); the button shows a loading state and the browser downloads
`订单导出_YYYYMMDD.xlsx` on completion. Acceptance: 「已完成」 filter → only completed orders in the file;
>5000 → prompt, no file. Motivation: the owner hands monthly orders to an accountant and currently
screenshots page by page.

How it was asked for: "用 specflow 走 Full 流程 … 做到任务拆解（tasks.md）为止", every checkpoint
auto-continued with the default option, optional stages (设计追问 `grill-with-docs`, `analyze`) skipped —
so no user turn between `init` and `task-breakdown` is expected in such a run.

State in that run (cwd `/tmp/shop-work/6553ac/shop-admin`, branch `main`): the specify stage read
`specify.toml`, `speckit-specify/SKILL.md`, `spec-template.md`, `artifact-paths.md`, the constitution,
confirmed `.specify/feature.json` **absent**, listed `.specify/`, then ran
`resolve-template.sh spec-template --json` — and the orchestrator export ends there. The dispatched
sub-agent thread is its own export (session `01a19a28`, same cwd) and **finished the stage**: it created
`docs/spec/features/001-order-export/` with `spec.md` (FR-001…009, SC-001…004, 3 user stories),
`checklists/requirements.md` (16/16 `[x]`) and wrote `.specify/feature.json` =
`{"feature_directory":"docs/spec/features/001-order-export"}`. So the feature number **is 001** in this
copy, and this run sits at the planning entry — not blocked on tech-plan input, because the user supplied
it up front: React 18 + TS + Vite per the charter, frontend SheetJS (`xlsx`) generation, order data from
the existing `GET /api/orders` with the same filter params. Details and the spec's chosen defaults:
[[shop-admin-order-export]]. The same six-call opening appears again as its **own export** at `/tmp/shop-work/31c103/shop-admin`
(session `01a19a26-4bbd-7d43-921f-b3c8b60a5f5e`, created 2026-11-02T02:46:03.627Z, thread
`primary thread … codex`): `NEW_TASK /root/specify` with a blank payload, then the same `cat`s,
`rg --files .specify | head -35`, `bash .specify/scripts/bash/resolve-template.sh --help` →
`Usage: .specify/scripts/bash/resolve-template.sh <template-name> [--json]`, and
`… spec-template --json` (its 1194-token result came back `Warning: truncated output` at
`max_output_tokens: 1000`). It ends on that result with `.specify/feature.json` still missing, no
`docs/spec/`, no `spec.md` — so ending at the resolver call is the **normal capture point** of these
exports, not a stage failure. One worktree hash can host several exports/threads (parent orchestrator
and specify sub-agent), so match on session id + cwd + last tool result, never hash alone.
The delegation appeared as a `/root/specify` `NEW_TASK` envelope with an
empty payload ([[codex-new-task-empty-payload]]), and the skill skipped the `specflow-start`
`get_context.py` bootstrap, relying on the hook `<specflow-state>` line instead.

Related: [[workflow-specflow-lite]], [[specflow-spec-dev-flow]].
