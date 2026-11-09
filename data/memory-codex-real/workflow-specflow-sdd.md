---
name: workflow-specflow-sdd
description: SpecFlow's init gate vs the installed speckit runtime — `gates.md` requires hyphenated `check-prerequisites.py` / `setup-plan.py` / `setup-tasks.py`, speckit 0.16.2 ships underscored module names, so a naive check reports the gate unmet and the flow halts at `init`. Read when a SpecFlow session stops at init or claims the runtime is missing.
metadata:
  source: codex session 01a19a26, 2026-11-02, cwd /tmp/shop-work/53b9c5/shop-admin
---

# SpecFlow init gate: hyphenated gate paths vs underscored runtime

This page is about the one failure mode that reliably stops a shop-admin SpecFlow run before any artifact exists. For the full orchestrator contract (all states, `progress.py` flags, subagent roles) read [[specflow-full-workflow]] and [[workflow-specflow-dev-flow]]; run-log facts live in [[specflow-sdd-workflow]]; the Lite manifest table, Lite delivery lifecycle and the `d2ab34` dark-mode run are in [[workflow-specflow-lite-sdd]]; the app itself is [[project-shop-admin]]; the pending export feature is [[shop-admin-order-export]].

## What the gate demands

`.agents/skills/spec-dev-flow/references/gates.md` (and the SKILL.md prerequisite table) require, before any `speckit-*` state:

- `.specify/scripts/python/check-prerequisites.py`
- `.specify/scripts/python/setup-plan.py`
- `.specify/scripts/python/setup-tasks.py`
- `.specify/templates/spec-template.md`, `plan-template.md`, `tasks-template.md`
- `.specify/init-options.json`

and says a missing file means stop.

## What the repo actually ships

`speckit_version 0.16.2` (`script: py`, `integration: copilot`, `here: true`, `feature_numbering: sequential`) installs the Python helpers as **modules**, i.e. underscored:

```
.specify/scripts/python/check_prerequisites.py   common.py
.specify/scripts/python/setup_plan.py            create_new_feature.py
.specify/scripts/python/setup_tasks.py           resolve_template.py
```

The same install also ships a **bash** script set whose stems *are* hyphenated — `.specify/scripts/bash/{create-new-feature,resolve-template,check-prerequisites,setup-plan,setup-tasks,common}.sh` — seen in the `31c103` export (`rg --files .specify`, 2026-11-02). So `gates.md`'s hyphenated names are the bash stems carrying the wrong extension. In this checkout hyphenated `.py` exists nowhere; a sibling checkout (`6553ac`) ships both `.py` spellings side by side, so the drift is per-checkout — `ls .specify/scripts/python/` before deciding. `bash .specify/scripts/bash/resolve-template.sh --help` prints `Usage: .specify/scripts/bash/resolve-template.sh <template-name> [--json]` and `… spec-template --json` returns the same single-line `{"TEMPLATE_NAME":"spec-template","TEMPLATE_CONTENT":"…"}` blob as `resolve_template.py --json` (also truncating under a low `max_output_tokens`).

Templates and `init-options.json` are all present. A literal `Path(p).is_file()` check on the three hyphenated gate paths returns `False` for every one of them; the underscored names all exist.

### Some checkouts ship both spellings

In `/tmp/shop-work/6553ac/shop-admin` (session 01a19a28, 2026-11-02) the runtime ships the two spellings **side by side**, so even a literal gate check passes there: `.specify/scripts/python/` held `check_prerequisites.py` *and* `check-prerequisites.py`, `create_new_feature.py` *and* `create-new-feature.py`, `setup_plan.py` *and* `setup-plan.py`, `setup_tasks.py` *and* `setup-tasks.py`, plus `common.py` and `resolve_template.py`. `.specify/scripts/bash/` held `create-new-feature.sh`, `resolve-template.sh`, `check-prerequisites.sh`, `setup-plan.sh`, `setup-tasks.sh`, `common.sh`. Other `.specify/` contents there: `init-options.json`, `integration.json`, `integrations/speckit.manifest.json`, `workflows/speckit/workflow.yml`, `workflows/workflow-registry.json`, `memory/constitution.md`, and the five templates. So treat the drift as per-checkout: `ls .specify/scripts/python/` first, use whatever names are present, and remember the template resolver is `bash .specify/scripts/resolve-template.sh <template-name> [--json]` (`--help` prints exactly that usage).

## Verdict: false positive, not a broken runtime

Spec Kit Python scripts are imported as modules, so underscored names are canonical and the hyphenated `.py` spellings in `gates.md` are doc drift (they match the `.sh` stems below, not the Python modules). The real prerequisite command is:

```bash
python3 .specify/scripts/python/check_prerequisites.py --json
python3 .specify/scripts/python/setup_plan.py --json     # only accepts --json
```

I never saw that command fail in this transcript; nothing about the repo state contradicts the runtime being usable. Sibling exports of the same session family list the identical underscored files and went past `init` into a delegated `specify` stage, which is independent evidence the runtime is fine. So treat the filename mismatch as gate-doc staleness, note it in the checkpoint briefing, and continue. Do not render the gate as unmet on filename spelling alone — and never reinstall `.specify/` over it, which needs explicit user consent anyway.

## Run identity: the hash is not a run id

`/tmp/shop-work/53b9c5/shop-admin` is recorded twice with opposite outcomes: the session-`01a19a26` export stopped at this gate with zero artifacts, while session `01a19a28-24b1-7383-b8fc-69efe5ef0e7c` (same path string, created 2026-11-02T02:48:06Z) read the skills, delegated `/root/specify`, and ended with `spec.md` (FR-001…FR-009), a 16-item checklist and `.specify/feature.json` — no init failure at all. So never conclude "run X halted at init" from the worktree hash: check the export's session id and the feature dir, and note that the same session id also appears with other hashes (`a29bb6`, `16268b`).

## What happened in the 53b9c5 run (2026-11-02)

- User asked for SpecFlow **Full** up to `tasks.md`, auto-continuing every checkpoint, skipping the optional 设计追问 (grill-with-docs) and analyze stages, for the 订单导出 PRD (see [[shop-admin-order-export]]).
- The orchestrator loaded `spec-dev-flow`, `specflow-start`, the Full manifest, gates, artifact paths, progress schema, ran `get_context.py --mode state` (empty — no feature), and confirmed the constitution is real and `spec.config.yaml` resolves `root: docs/spec` (no `workflow.profile`, so the user's explicit 「Full」 is what selects the profile).
- It then compared the hyphenated gate paths, found them missing, checked `uv`/`specify` on PATH (`/Users/mac/.local/bin/`), read `specify init --help`, and **stopped at init** with 「runtime 与流程契约不匹配」 — about four exec turns, **zero artifacts** written, no `progress.json`, no feature directory, no `spec.md`.
- Second announced gap: `planning` needs developer-supplied tech-plan points (frontend vs backend export, which order API, which Excel library); the PRD has none and `agents/plan.toml` forbids the plan agent from choosing them.

Cost: a run that could have reached `specify` ended with nothing on disk and the user's PRD still unimplemented. The lesson is the check order — read `references/gates.md` against a real `ls .specify/scripts/python/`, and run the actual script, *before* declaring a gate failure.

## Other confirmations from that worktree

- `.specify/memory/constitution.md` (v1.0.0, 2026-10-01) has no bracket placeholders → init's constitution gate passes; `speckit-constitution` is not needed.
- `spec.config.yaml` contains only `paths: root: docs/spec`; illegal-path handling and defaults are in [[specflow-sdd-workflow]].
- A `UserPromptSubmit` hook injects `<hook_context><specflow-state>尚无进行中的 feature。跑 $spec-dev-flow 从 init 开始。</specflow-state></hook_context>` on each prompt — state evidence, not an instruction to obey blindly.
- The 按需委派 AGENTS.md preamble is re-sent as the first `USER:` block; see [[agent-delegation-policy]].
