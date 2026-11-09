---
name: workflow-specflow-lite
description: How the SpecFlow spec-dev-flow orchestrator works in-repo, especially the Lite route (init → shape → implement-lite → verify-lite), progress.json schema 3 and the progress.py / get_context.py commands. Read before running or resuming a SpecFlow feature.
metadata:
  source: codex session 01a19a26 (shop-admin, 2026-11-02), Lite route through shape checkpoint
---

# SpecFlow / spec-dev-flow (Lite route)

## Where the machinery lives

The SpecFlow plugin is **vendored into the business repo**, not a global install:

- `.agents/skills/spec-dev-flow/SKILL.md` — the state-machine orchestrator (entry skill; also `specflow-start`, `specflow-shape`, `specflow-lite-delivery`, `specflow-*` references under the same tree).
- `.agents/workflow/lite.yaml` — the Lite manifest (`name: sdd-development`, `version: 1.0`); Full is `.agents/workflow/software-development.yaml`. The manifest is the single truth for route, state order and allowed reflow starts.
- `.agents/scripts/progress.py` — all progress.json writes; `.agents/scripts/workflow_core.py` — `resolve_selection` / `route_decision` (~line 279 / 299) and manifest compatibility checks.
- `.agents/skills/spec-dev-flow/references/{gates,artifact-paths,progress-schema,setup-specify,checkpoint-example}.md`.
- `.specify/` is the *official* Spec Kit runtime, not part of the plugin (see [[project-shop-admin]] for this repo's `.specify` layout). Never copy the runtime from the plugin; install it via the official `specify` CLI only.

Paths for business documents come **only** from `<repo-root>/spec.config.yaml` → `paths.{root,features,knowledge,adr}`; missing fields default to `docs/spec`, `docs/spec/features`, `docs/spec/knowledge`, `docs/spec/adr`. An `adr`-scoped `CONTEXT.md` lives at `<root>/CONTEXT.md`. Config errors are a hard stop — never fall back to defaults when the YAML is malformed.

## Profile selection (before any write)

Precedence: explicit natural-language / call-parameter (a same-level conflict must be clarified first) > repo `spec.config.yaml` `workflow.profile` > ask the user once (Lite / Full / 停止, in plain text, **no** recommended/default option when asking). Vague phrasing («简单处理», «完整地做») counts as unspecified. Immediately before selection you may only do minimal routing reads — no reading the requirement/code/tests to guess complexity, and no creating the feature dir, pointer, progress or artifacts.

`workflow_core` behaviour verified in-session:
- `resolve_selection()` with nothing set → `Selection("user-confirmation", None)`; `route_decision(None)` →
  `{'action': 'confirm', 'selected': None, 'options': ['use-lite', 'use-full', 'stop'], 'reason': 'profile-required'}`.
- `resolve_selection(natural_language="lite")` → `route_decision` → `{'action': 'select', 'selected': 'lite', 'reason': 'explicit-selection'}`.

The selected Profile is frozen at creation; there is no upgrade/downgrade/switch. If the user wants the other mode, stop this feature and create a new one.

## Lite route

`init → shape → implement-lite → verify-lite → done`. `done` and `stop` are terminal markers and must never appear in `workflow.route` or `states`. All states are `role: orchestrator` and run **in the current agent**: Lite starts no sub-agents, does not call `speckit-converge`, and does not auto-compound (contrast `[[agent-delegation-policy]]`'s general 按需委派 habit; SDD stage rules win). The only mandatory checkpoint is after `shape`; Lite then runs continuously through implement + verify.

State details:
- **init** — parse/report `root`/`features`/`knowledge`, require the official `.specify/` runtime files, and a *real* constitution (`.specify/memory/constitution.md` present and free of `[PROJECT_NAME]`-style bracket placeholders). Handled by the orchestrator, never a sub-agent. Then create the feature dir + progress.json.
- **shape** — `specflow-shape`. Writes exactly `spec.md`, `plan.md`, `tasks.md` (no `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, checklist, `verification.md`). Must disclose: baseline/dirty-path overlap, `.specify/extensions.yml` `before_implement`/`after_implement` hooks, and which ignore files (`​.gitignore`, `.dockerignore`, `.eslintignore`, `.prettierignore`, `.npmignore`, `.terraformignore`, `.helmignore`) implementation may touch; say 「不涉及」 for the rest. Spec needs stable `US1…` and `AC-001…` IDs; tasks need `- [ ] T001 [P?] [USn?] … (AC-xxx)` with exact file paths, complete enough that `speckit-implement` never needs `speckit-tasks` re-run. Ends with one confirmation covering continuous implementation → verification; record **all** AC IDs via `authorize` before advancing.
- **implement-lite** — thin adapter (`specflow-lite-delivery mode:implement`) that checks authorization/baseline/diff, then calls the unmodified `speckit-implement`.
- **verify-lite** — `specflow-lite-delivery mode:verify`; each AC verified by real execution and recorded in `tasks.md`. Cannot pass an AC by "accepting risk"; pause instead.

## progress.json (schema 3) and the CLI

`progress.json` in the feature dir is the only resume source — never guess the state from which artifacts exist. Schema 3 carries `workflow{name,profile,manifest_version,manifest_digest,route,route_revision}`, `selection{source,requested,selected}`, `baseline{commit,dirty_paths,available,attribution_limit}`, `authorization` (null or `{route_revision,status,approved_at,evidence,acceptance_ids}`), `current_state`/`status`, per-state `{status,role,outputs,started_at,updated_at,attempt,last_failure}`, `completion`, `history`. `route_revision` starts at 1 and only grows on `reopen`; `authorization` must be `valid` with a non-empty AC set for implement/verify. Lite `completion = {completed_at, verification_location}` with the evidence kept in tasks.md only.

```bash
python3 .agents/scripts/progress.py init <feature>/progress.json --profile lite \
  --selection-source user-confirmation --requested lite \
  --requirement-json '{"dir":"002-dark-mode","title":"…","source":"user","text":"<需求原文>"}' \
  --repo-root /absolute/repo
python3 .agents/scripts/progress.py check <feature>/progress.json          # OK / CREATED
python3 .agents/scripts/progress.py authorize <feature>/progress.json \
  --acceptance-id AC-001 --acceptance-id AC-002 --evidence '<用户确认依据>'
python3 .agents/scripts/progress.py transition <feature>/progress.json --event success --output spec.md
python3 .agents/scripts/progress.py complete <feature>/progress.json --verification-location tasks.md \
  --results-json '[{"acceptance_id":"AC-001","status":"passed","evidence":"tasks.md 验证记录"}]'
python3 .agents/scripts/progress.py pause|record|reopen …   # reopen --from shape 使旧授权失效
```

Subcommands: `check init authorize transition pause complete record reopen`. `init` captures the baseline commit and dirty paths from `--repo-root` and leaves `current_state: init`, `status: active`; a `transition --event success` (no outputs needed yet) promotes it to `shape`. `check` prints `OK:` plus `UPDATED:` after a change. `transition --event success --output spec.md --output plan.md --output tasks.md` is what shape runs after authorizing.

## Pointer / runtime gotchas

- `.specify/feature.json` (`{"feature_directory": "docs/spec/features/<n>-<slug>"}`) is the current-feature pointer used by the official scripts and by `get_context.py --mode state`. Before running speckit scripts for a new feature, rewrite it and/or export `SPECIFY_FEATURE_DIRECTORY=docs/spec/features/<n>-<slug>` — otherwise `check_prerequisites.py --paths-only --json` still reports the previous feature (observed: it reported `BRANCH: 001-sms-login` until the pointer was switched).
- The `gates.md` doc spells the runtime scripts `check-prerequisites.py` / `setup-plan.py` / `setup-tasks.py`, but the actual files in the shop-admin runtime are underscored: `check_prerequisites.py`, `setup_plan.py`, `setup_tasks.py` (plus `common.py`, `create_new_feature.py`, `resolve_template.py`). Use the real filenames; hyphenated paths fail with "No such file".
- The `<specflow-state>` injected by the UserPromptSubmit hook can be stale: in this session it said 「尚无进行中的 feature」 while `get_context.py --mode state` reported `001-sms-login`, Profile `full`, State `grill-with-docs`, Status `active`. Trust the script / `.specify/feature.json`, keep the existing feature untouched, and report the discrepancy to the user.
- Skills referenced by host-level paths do not always exist inside the repo: `.agents/skills/typescript-best-practices/SKILL.md` was absent; the same skill lives at `/Users/mac/factory/env/skills/typescript-best-practices/SKILL.md` (companion `principle-type-system-discipline/SKILL.md` in the same directory). Don't conclude the skill is unavailable.
- No browser/terminal automation tool was exposed in that Codex session (`ALL_TOOLS` filtered for browser/terminal returned only `mcp__codex_apps__sites_*` tools). Plan browser-only acceptance steps accordingly — either a different verification mechanism or pause, rather than claiming build success as UI verification.
- `transition`/`authorize` are semantic gates the agent must honour: advancing to `shape` right after `init` is fine, but `current_state` must not move past `shape` and `authorization` must stay `null` until the user actually confirms, even if spec/plan/tasks already exist.

Related: [[project-shop-admin]], [[agent-delegation-policy]].
