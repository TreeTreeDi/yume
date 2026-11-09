---
name: shop-admin-specflow-repo
description: Facts about the 小店后台 / shop-admin repo used as the SpecFlow (spec-dev-flow) playground — React 18 + Vite + vitest skeleton, spec.config.yaml paths, .specify runtime (Spec Kit 0.16.2, copilot integration), constitution contents, and the 001-order-export feature (订单导出) with its PRD, run state, and exactly what the delegated `specify` stage read in the abe94d checkout. Read when resuming work in /tmp/shop-work/*/shop-admin.
metadata:
  source: codex sessions 01a19a26 and 01a19a28-2488-74a2-bbb0-ba86213f1706, 2026-11-02, cwd /tmp/shop-work/abe94d/shop-admin
---

# 小店后台 (shop-admin) — SpecFlow test repo

Sibling files on the same fixture repo from other checkouts: [[project-shop-admin]] (`/tmp/shop-work/d59c67` checkout, baseline `cd33b14`, features 000-product-list / 001-sms-login / 002-dark-mode) and [[shop-admin-project]]. Each run gets a fresh temp copy, so commit hashes and `docs/spec/features/*` contents differ per session — check `git log` and `ls docs/spec/features` instead of trusting the hashes here. Plugin mechanics: [[specflow-full-workflow]].

Throwaway/low-content workspace used to exercise the SpecFlow plugins; the checkout path is per-run (`/tmp/shop-work/<hash>/shop-admin`, resolved by `pwd` to `/private/tmp/shop-work/abe94d/shop-admin` on macOS).

## Codebase

- `package.json`: `shop-admin` 0.1.0, private. Scripts `dev: vite`, `build: tsc && vite build`, `test: vitest run`. Deps `react`/`react-dom` ^18.3.0; dev deps `typescript` ^5.5.0, `vite` ^5.4.0, `vitest` ^2.0.0.
- Tracked files outside `.agents/` / `.specify/`: `src/App.tsx`, `package.json`, `README.md` (`# 小店后台` — 一个简单的店铺管理后台), `spec.config.yaml`. There is no order-list page or data layer yet — the PRD below has no existing code to hook into.
- Baseline commit at feature creation: `7f86c74596e09adaecf4d61515101415371f53ea`, working tree clean.

## SpecFlow config

- `spec.config.yaml` sets only `paths: root: docs/spec`; `features`/`knowledge`/`adr` fall back to `docs/spec/features`, `docs/spec/knowledge`, `docs/spec/adr`. No `workflow.profile` key, so a profile must come from the user or a one-time question.
- Installed plugin copy: `.agents/` (skills, `workflow/software-development.yaml`, `agents/*.toml`, `scripts/progress.py`) — see [[specflow-full-workflow]].
- `.specify/` runtime present and usable: `init-options.json` = `{"ai":"copilot","ai_skills":true,"feature_numbering":"sequential","here":true,"integration":"copilot","script":"py","speckit_version":"0.16.2"}`; scripts under `.specify/scripts/python/` use underscore names (`check_prerequisites.py`, `setup_plan.py`, `setup_tasks.py`, `common.py`, `create_new_feature.py`, `resolve_template.py`); templates `spec/plan/tasks/checklist/constitution-template.md`. `specify` and `uv` are both on PATH at `/Users/mac/.local/bin`.
- Feature numbering is **sequential** ⇒ first feature dir is `docs/spec/features/001-order-export`.
- `.specify/memory/constitution.md` is a real charter (no `[PROJECT_NAME]` placeholders), so the init gate passes without running `speckit-constitution`:
  - 一、简单优先 — only build what the requirement asks, no premature abstraction.
  - 二、可测试 — every feature needs an executable acceptance path (unit test or manual steps).
  - 三、中文优先 — user-facing copy and project docs in Simplified Chinese.
  - 技术约束: React 18 + TypeScript, Vite; state via built-in hooks, no extra state library.
  - Governance: charter changes need a reason in the PR. Version 1.0.0, ratified 2026-10-01.
- Sessions carry the `按需委派` AGENTS.md preamble (UI on the main model, native `worker`/`explorer`, SDD keeps its stage order) — see [[agent-delegation-policy]]. Environment block: `permission_profile type="managed"` with writes limited to the workspace root plus `/tmp`/tmpdir, reads of `.git`, `.agents`, `.codex`, `.aws`; shell zsh, timezone Asia/Shanghai.

## Feature 001-order-export (订单导出)

User request: run specflow **Full** through `tasks.md`, auto-accept every checkpoint, skip the optional stages (设计追问 grill-with-docs, analyze).

PRD requirements:
1. Add an 「导出」 button to the order list page; export honours the current filter.
2. Format Excel (`.xlsx`); columns 订单号、下单时间、买家昵称、商品、数量、实付金额、订单状态.
3. Hard cap 5000 rows per export; over that show 「请缩小筛选范围」 and export nothing.
4. Button shows a loading state during export; the browser downloads automatically as `订单导出_YYYYMMDD.xlsx`.
   Acceptance: filtering 已完成 then exporting yields a file with only completed orders; >5000 rows ⇒ no file, prompt shown.

Run state (2026-11-02): `docs/spec/features/001-order-export/progress.json` created with `schema_version 3`, profile `full`, `selection{source: natural-language, requested: full, selected: full}`, `route_revision 1`, manifest `sdd-development` v1.4 (`manifest_digest 65001d03…`), `requirement{dir: 001-order-export, title: 订单导出, source: 用户 PRD}`. In the parent export (session `01a19a26`, this checkout) `init` completed and `specify` was set active and dispatched (`agent_type: specify`); that export begins at the delegated `specify` dispatch, so the `progress.py` / `resolve_selection` calls behind the snapshot are not themselves visible in it, and it ends before any artifact appears. In the sibling export of this same checkout — session **`01a19a28-2488-74a2-bbb0-ba86213f1706`**, created 2026-11-02T02:48:06Z — the delegated `specify` stage **did** finish and wrote `spec.md` + `checklists/requirements.md` + `.specify/feature.json` (features in the contrast bullet below; full outline in [[shop-admin-order-export]]). Neither export contains `plan.md` or `tasks.md`.

### What the delegated `specify` stage actually did (this checkout)

The state went to a native role agent as `Message Type: NEW_TASK` / `Task name: /root/specify` / `Sender: /root` with a **blank `Payload:`**, and real `exec` calls follow in the same thread — judge the turn by its tool calls, not by the empty envelope ([[codex-new-task-empty-payload]]). Two calls, in this order:

```bash
cat .agents/skills/speckit-specify/SKILL.md; cat .specify/templates/spec-template.md; cat .specify/feature.json
# skill + template body printed, then: cat: .specify/feature.json: No such file or directory (os error 2); exit_code 1
cat .agents/skills/spec-dev-flow/references/artifact-paths.md; cat spec.config.yaml; \
  cat .specify/memory/constitution.md; ls .specify; git branch --show-current
# artifact paths, `paths: root: docs/spec`, the charter, the .specify listing, `main`; exit_code 0
```

- The `;`-chained first call exits **1** only because `.specify/feature.json` does not exist yet (normal for a first feature); the earlier `cat`s still printed. Exit 1 there does not mean the skill or template failed to load.
- `ls .specify` at that moment: `integrations/ memory/ scripts/ templates/ workflows/` plus `init-options.json` (173B) and `integration.json` (280B). No `extensions.yml`, so the `before_specify` / `after_specify` hook sections are skipped silently.
- The template was read with plain `cat .specify/templates/spec-template.md`, not `resolve_template.py --json` (which truncates) — see [[specflow-sdd-workflow]].
- The `specflow-start` bootstrap (`get_context.py --mode state`) was **not** run; the run relied on the injected `<specflow-state>` hook line 「尚无进行中的 feature。跑 $spec-dev-flow 从 init 开始。」.
- The export stops after those two calls (its last event is a blank-payload `MESSAGE` envelope): no `docs/spec/features/` directory, no `spec.md`, no `checklists/requirements.md` and no `.specify/feature.json` pointer becomes visible. This export is the **delegated specify thread only** — no `progress.py`, `workflow_core.resolve_selection` or `init` step appears in it, so the orchestrator-side state (and any `progress.json`) has to be verified on disk rather than inferred from this file.
- Contrast with the sibling export of session `01a19a28-2488-74a2-bbb0-ba86213f1706` (cwd `/tmp/shop-work/abe94d/shop-admin` in that file; other write-ups file the same content under `a29bb6` — the hash drifts per export): there `specify` went on to write, in four calls — (1) `cat .agents/agents/specify.toml .agents/skills/speckit-specify/SKILL.md .specify/templates/spec-template.md`; (2) `cat artifact-paths.md spec.config.yaml .specify/memory/constitution.md .specify/feature.json; rg --files .specify | rg 'extensions|preset|template'` — the `rg` returned the five templates plus `.specify/scripts/bash/resolve-template.sh` and `.specify/scripts/python/resolve_template.py`, and the `cat` again ended with `feature.json: No such file or directory`; (3) `bash .specify/scripts/bash/resolve-template.sh spec-template --json` (after `--help`; its JSON comes back **truncated**, so the template body was taken from the earlier `cat`); (4) wrote all three artifacts in **one `python3` heredoc** (`mkdir -p docs/spec/features/001-order-export`, `Path.write_text` for `spec.md`, `checklists/requirements.md` and `.specify/feature.json`) and verified with a python `assert` block (required sections, `5000` and `5001`, no `[NEEDS CLARIFICATION`, `feature.json` value, `extensions.yml` absent) → 「规格结构、边界、路径指针检查通过；无扩展 hooks。」. It did **not** use `create_new_feature.sh`, so the directory was hand-made and **no git branch** exists (`spec.md`: 「未创建专用分支」). Same stage, same repo family, different run length — the deciding factor is whether the agent goes on to write after reading, so verify on disk.

Blocker that ended the run in this checkout: the PRD copy here carries **no technical-plan points**, and `planning` requires developer-supplied stack/architecture/constraints as `speckit-plan` input — the orchestrator refused to invent them and said progress would be held at the planning entry. (A parallel checkout, `/tmp/shop-work/31c103/shop-admin`, hit the same blocker **in that session** and asked via `request_user_input_async` whether the export runs frontend or backend, which order-data API it may call, and which Excel library is allowed — see [[shop-admin-order-export]]; no spreadsheet library is in `package.json`.) Careful: the session-`01a19a28` export whose cwd is also `/tmp/shop-work/31c103/shop-admin` does **not** have that gap — its prompt carries the 技术方案 paragraph (SheetJS `xlsx` client-side over `GET /api/orders`), so `specify` wrote `spec.md` (FR-001…FR-010, SC-001…SC-005) + `checklists/requirements.md` (16 `[x]`) and reported ready-for-planning. Identify runs by session id **and** hash **and** feature-dir contents. To continue, supply those points (stack is already fixed by the charter: React 18 + TS + Vite, hooks only; what's missing is the export mechanism, e.g. an in-browser xlsx writer vs. a backend job, and where the order data comes from).

Not every copy has that gap: the `01a19a28` export carries the technical plan inside the request — 「技术方案：按宪章用 React 18 + TypeScript + Vite，导出在前端用 SheetJS（xlsx 包）生成，订单数据走现有 GET /api/orders 接口（支持同样的筛选参数）」 — and its `specify` finished, writing `docs/spec/features/001-order-export/spec.md` (US1 P1 filter-scoped export + US2 P2 5000-cap, edge cases, **FR-001…FR-007**（本导出恰好 7 条；其他 checkout 的同一 PRD 到 FR-008/009/010，引用时以磁盘上的 spec.md 为准）, Key Entities 订单/筛选条件/导出文件, **SC-001…SC-004**, `## Assumptions`; no `[NEEDS CLARIFICATION]`, every ambiguity parked as an assumption — multi-product orders collapse to one row with the summed quantity, an empty result exports a header-only file, the filename date uses the browser timezone, the filter set is snapshotted at click time), `checklists/requirements.md` (all items `[x]`, one validation pass) and `.specify/feature.json` = `{"feature_directory": "docs/spec/features/001-order-export"}`. What remains there is a repo mismatch to record in the plan: this skeleton has no order page, no `/api/orders` and no `xlsx` dependency, so the endpoint is an assumed/external contract and SheetJS is a dep to add. Details and the full spec outline: [[shop-admin-order-export]].
