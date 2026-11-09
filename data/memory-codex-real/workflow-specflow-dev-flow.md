---
name: workflow-specflow-dev-flow
description: How the SpecFlow SDD plugin runs (Lite/Full profile selection, progress.json rules, Lite chain init→shape→implement-lite→verify-lite, Full stage table, gates, checkpoint reporting, helper scripts). Read before starting or resuming a SpecFlow feature in shop-admin or any repo using .agents/spec-dev-flow.
metadata:
  source: codex sessions 01a19a26 and 01a19a28 (shop-admin, 2026-11-02; the 01a19a28/305f00 copy supplied the workflow_core probe output)
---

# SpecFlow dev flow (SDD orchestration)

## Where the plugin lives

- Plugin root is the repo's `.agents/` directory. Entry skills: `.agents/skills/specflow-start/SKILL.md` (session bootstrap) and `.agents/skills/spec-dev-flow/SKILL.md` (state-machine orchestrator).
- Manifests: `.agents/workflow/lite.yaml` (Lite) and `.agents/workflow/software-development.yaml` (Full) are the only truth for state order, transitions and reflow starts. Role contracts: codex `.agents/agents/<role>.toml` (`developer_instructions`); claude `.agents/agents/claude/<role>.md`.
- Scripts: `.agents/scripts/workflow_core.py` (manifest load/validate, `resolve_selection`, `route_decision`, `manifest_compatibility_error`), `.agents/scripts/progress.py`, `.agents/scripts/validate-consistency.py`.
- Path anchors: `workflow/` and `agents/` are relative to the plugin root (`.agents/`); `references/` is relative to the skill dir — e.g. `.agents/skills/spec-dev-flow/references/{gates,artifact-paths,setup-specify,progress-schema,checkpoint-example}.md`.
- Skills are referenced by bare names (`speckit-specify`, `specflow-shape`); Codex resolves them as `$xxx`, Claude Code as `/xxx`.

## Session start (specflow-start)

- If no `<session-context>` exists, run `python3 -X utf8 .agents/skills/specflow-start/scripts/get_context.py --mode state`, then `--mode phase`, then `--mode indexes`.
- `--mode state` prints `Current`, `Profile`, `State`, `Status`, `Active features`, `Spec features`, plus `<asset-paths>` with `root` / `features` / `knowledge` / `adr` / `constitution`.
- `State: STALE POINTER` or `CONFIG ERROR` → report and stop. Empty stdout → no feature yet.
- Next skill by state: init → spec-dev-flow; shape → specflow-shape; implement-lite → specflow-lite-delivery mode:implement then speckit-implement; verify-lite → specflow-lite-delivery mode:verify; Full states → their speckit skill (`compound` = `ce-compound mode:headless depth:lightweight`).

## Profile selection (before any new writes)

- Priority: explicit natural-language or call parameter > repo `spec.config.yaml` `workflow.profile` > ask the user (Lite / Full / stop, no recommendation or default). Only an explicit Lite/轻量 or Full/完整 statement counts as a choice; "简单处理"/"完整地做" count as unspecified. Same-level conflict → clarify first. Invalid config → error.
- Do NOT read requirements, code, tests or contracts to judge complexity or recommend a profile, and do not create the feature dir, `.specify/feature.json` pointer, progress or SDD artifacts before the profile is chosen.
- `workflow_core.py` helpers (verified 2026-11-02): `resolve_selection(natural_language=..., call_parameter=..., repository_config=...)` → `Selection(source, requested, conflict)`; `route_decision(requested, conflict)` → `{"action": "select"|"clarify"|"confirm", "selected", "options": ["use-lite","use-full","stop"], "reason"}`. Example: `resolve_selection(natural_language='lite')` → `Selection(source='natural-language', requested='lite', conflict=False)`; route → `action: select`, reason `explicit-selection`.
- Import path: the module is `.agents/scripts/workflow_core.py` — `.agents/skills/spec-dev-flow/scripts/` **does not exist** (an `rg` there exits 2 with `No such file or directory`), so add `.agents/scripts` to `sys.path` instead of looking under the skill dir.
- The helpers do **not** read `spec.config.yaml` themselves; the caller must pass `repository_config=` (e.g. from `read_repository_config(Path.cwd())["workflow"]["profile"]`). A no-arg probe therefore reports "unspecified", which is the quick way to prove the repo pins no profile (read-only, no writes):
  ```
  python3 -c 'import sys; sys.path.insert(0,".agents/scripts"); import workflow_core as w; s=w.resolve_selection(); print(s); print(w.route_decision(s.requested,s.conflict))'
  ```
  Observed in session 01a19a28 (`/tmp/shop-work/305f00/shop-admin`, 2026-11-02): `Selection(source='user-confirmation', requested=None, conflict=False)` then `{'action': 'confirm', 'selected': None, 'options': ['use-lite', 'use-full', 'stop'], 'reason': 'profile-required'}`.
- Same-level conflict needs *different* values: natural-language and call-parameter are compared as a set, so identical values (both `lite`) collapse to one source and do **not** conflict; differing values return `Selection("natural-language+call-parameter", None, True)`, and `route_decision(..., conflict=True)` returns `{"action": "clarify", "selected": None, "options": [], "reason": "same-level-conflict"}`.
- Profile freezes at creation. No Lite↔Full switch inside a feature; to change mode, stop the feature and create a new one with the target profile (no migration of authorization, completion state or run projection).
- Record selection in `progress.json` under `selection` (`source`, `requested`, `selected`); user-chosen source is `user-confirmation`.

## Resume rules

- Location comes only from `<feature>/progress.json` `current_state`, never from artifacts. Legacy progress resumes as Full without forced migration; unknown version → stop.
- Run `python3 .agents/scripts/progress.py check <feature>/progress.json` and verify frozen profile, route, version and digest; mismatch → stop and report, no hand-edited digest.
- `completed` → report only; `paused`/`failed`/`stopped` → wait for an explicit continue; anything else → resume `current_state`.

## progress.json rules

- Single progress source. Advance only after the state is fully executed AND the user confirms "next step"; then mark it `completed`/`skipped` and set `current_state`. Do not touch progress mid-state; one confirmation advances at most one state.
- CLI subcommands: `progress.py {check,init,authorize,transition,pause,complete,record,reopen}` (run from repo root).
- Lite authorization sequence: `progress.py authorize <feature>/progress.json --acceptance-id AC-001 --evidence '<user confirmation basis>'` (repeat `--acceptance-id` per AC), then `progress.py transition <feature>/progress.json --event success --output spec.md --output plan.md --output tasks.md`.
- Missing `progress.json` but artifacts exist → initialize at the state of the first missing artifact.
- Reflow: `reopen --from shape --reason ... --source ...` invalidates a Lite confirmation when goals, acceptance, external behavior, scope, key design or risk handling change materially. Task breakdown, in-scope tests, copy, formatting and completion marks do not trigger reopen.

## Lite route

- `lite.yaml` (`schema_version: "1.0"`, name `sdd-development`): `init → shape → implement-lite → verify-lite → done`. All states run in the current agent: no sub-agents, no auto-compound. `done` and `stop` are terminal markers, never states.
- `init` (orchestrator): runtime + constitution + path checks (see Gates).
- `shape` (`specflow-shape`): merge requirement, plan and tasks into the minimal three-piece set `spec.md` / `plan.md` / `tasks.md`; disclose security/compat/persistence/permission/cross-service/infra/architecture risks inside the Lite plan without switching profile. Also read the init baseline and disclose dirty files overlapping the plan, and disclose `.specify/extensions.yml` `before_implement` / `after_implement` mandatory+optional hooks and the ignore-file strategy `speckit-implement` may create.
- shape gets ONE confirmation covering continuous implementation through verification; tasks must be a strict checkbox checklist (phases, `[P]`, `[USn]`, file paths, AC refs) that `speckit-implement` can run without calling `speckit-tasks`; keep stable US/AC/task IDs.
- `implement-lite`: thin adapter (`specflow-lite-delivery mode:implement`) — check Lite authorization, baseline/diff, resume and scope, then invoke the unmodified `speckit-implement`; on failure pause or reopen to shape.
- `verify-lite`: `specflow-lite-delivery mode:verify`; verify every AC for real and record results in `tasks.md`.
- Normal path has exactly one mandatory checkpoint, after shape. Lite blockers (missing authorization, workspace conflict, unverifiable, beyond capability) → pause, never switch profile.

## Full route

- States: `init` (环境准备 + 项目宪章) → `specify` (写清需求) → `grill-with-docs` (optional) → `planning` (做实现方案) → `task-breakdown` (拆成任务) → `analyze` (optional) → `implement` (按任务实现) → `quality-gate` (质量门禁) → `compound` (沉淀经验).
- Per state: locate state from progress → check gates → load the role contract with `{{root}}/{{feature}}/{{knowledge}}/{{adr}}` substituted → execute (sub-agent when the manifest says `subagent: true`) → post a Chinese checkpoint brief: 做了什么 / 产物 / 必备条件 / 内容质量 / 下一步, with options 进入下一步 (Recommended) / 返回上一步 / 停止.
- `on_failure` is only the edge for a user choosing "返回上一步"; runtime errors stop in place, keep finished tasks, leave `progress.json` unchanged.
- `quality-gate` has no `on_success`: new tasks → `on_changed` back to `implement`; none → `on_unchanged` to `compound`.
- Sub-agent handoff: pass developer input verbatim (specify = requirement text + all Q&A; planning = tech-plan text), never a summary; sub-agents cannot ask the user — bring their open gaps to the next checkpoint; they reply with artifact paths + one-line summary + gaps only.
- `specify` and `planning` require developer input; if the call did not carry it, ask in plain text before generating.
- Optional stages (grill / analyze) are offered once per run; analyze is read-only and its checkpoint may offer "fix findings then implement" by editing `plan.md`/`tasks.md`.

## Gates (objective checks)

- Runtime before any `speckit-*`: `.specify/scripts/python/check-prerequisites.py`, `setup-plan.py`, `setup-tasks.py`, plus `.specify/templates/{spec,plan,tasks}-template.md` and `.specify/init-options.json`. Missing → ask whether to install the official CLI (`uv` → `specify-cli` → init in place + uninstall, leaving only `.specify/`); refusal → hard stop. Do not copy runtime from the plugin.
- Constitution: `.specify/memory/constitution.md` must exist and contain no bracket placeholders (`[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`); otherwise init runs `speckit-constitution` first.
- Document paths come from repo-root `spec.config.yaml` (`paths.root|features|knowledge|adr`); defaults are `docs/spec`, `docs/spec/features`, `docs/spec/knowledge`, `docs/spec/adr`. Missing config → defaults; malformed YAML, wrong types, absolute/outside-repo paths → stop at init. Report resolved paths, never placeholders.
- Artifact layout: feature dir `<features>/<NNN>-<short-name>/` containing `progress.json`; `CONCEPTS.md` at repo root; `CONTEXT.md` at `<root>/CONTEXT.md`; ADRs under `adr`; compound knowledge under `knowledge/<category>/`.
- Useful commands from repo root: `python3 .specify/scripts/python/check-prerequisites.py --json [--require-tasks --include-tasks]`, `setup-plan.py --json`, `setup-tasks.py --json`.

Repo-specific instance: [[shop-admin-project]]. Delegation rules that govern who runs these stages: [[agent-delegation-policy]].

Sibling write-ups of the same SpecFlow material (created concurrently from other exports of this session family): [[workflow-specflow-sdd]], [[workflow-specflow-lite]], [[workflow-specflow-lite-sdd]], [[specflow-spec-dev-flow]], [[project-shop-admin]]. This file adds the verified `workflow_core.resolve_selection` / `route_decision` signatures and the Full-route checkpoint/on_failure semantics.
