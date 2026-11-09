---
name: dt-insight-harness-conventions
description: How the dt-insight / publicService repo is worked on — override file rules, dtis command set, push & delivery-report policy, test-env login helpers, intake routing, sub-agent delegation. Read before starting any task in that repo.
metadata:
  source: codex session 01a197d1 (worktree /Users/mac/.factory/ws/161496-r1, 2026-11-01)
  evidence: AGENTS.md instructions pasted into the session
---

# dt-insight harness / workflow conventions

Repo root seen in sessions: `/Users/mac/.factory/ws/<task-id>-r1` (one worktree per zentao card, e.g. `161496-r1`). App code lives under `apps/` (e.g. `apps/publicService`), shared packages under `packages/`.

## Override / L0 files
- Every task session opens with the `AGENTS.md` instructions injected; they are the L0 overlay, kept **short and pointer-only**.
- Edit `AGENTS.override.md`. **Never commit `AGENTS.md`**; in a worktree `T AGENTS.md` (type changed to symlink) must not be committed either.
- Local flow files (override, local skill output) are registered in `.git/info/exclude`, outside commits.
- Governance: `docs/agents/harness-governance.md`; L0 style / overlay sync: `docs/agents/references/agents-md-style.md`.

## Before / after changing code
1. Read `docs/agents/coding-standards.md` first (see [[dt-insight-coding-standards]]).
2. After the change: `dtis ready` must pass (prettier / eslint / stylelint / types, incl. the added-comment check) → run the skill-specific evidence self-test from the L0 table → hand to user for acceptance with screenshot / local link.
3. Only after acceptance: `code-review` over the working-tree diff (incl. uncommitted), beginning with the comment checklist and slop steps of `.agents/skills/dt-insight-review-gate/SKILL.md`; then open the Plannotator review page + code relation graph. **Do not send the Plannotator link before acceptance** (2026-10-21 Shane SOP).
4. No commit / push before sdev signs off. Wait for dev readiness with `dtis dev-ready`; do not `sleep`-poll.
5. `dtis` already trims its own output — do not wrap it in `rtk proxy`.

## Card fields & delivery report
- If the card states 验收环境 (domain + tenant), verify only in that environment — no swapping env or tenant.
- Only a card with `push: allowed` permits commit / push / MR. Missing or `push: no` → change nothing upstream, report the diff.
- In delivery reports and evals, keep "actually verified" separate from "inferred"; every "actually verified" needs the matching command output or screenshot, otherwise it belongs under "inferred".

## Test-env login / real API responses
- `~/.config/dt-insight/bin/env-api <OMP id|namespace> POST /api/... '<json>'` prints the response directly; `env-api --list` lists environments.
- `curl -b "$(~/.config/dt-insight/bin/env-cookie <env>)" <url>` for cookie-authenticated calls; both read `~/.config/dt-insight/uic.env` and pass captcha/login automatically.
- Browser login state: `env-open` (same dir); see `.agents/skills/verify-console-70/SKILL.md`.
- Hitting a login page / captcha / "未登录" is not a stopping condition — log in with these helpers first.

## Intake routing
- 禅道 Bug/任务, PRD/需求, 提测, 回灌/跨版本/合 release, or "该走哪条分支/流程": load `.agents/skills/dt-insight-triage/SKILL.md`, reuse existing context, complete the handoff, then run the downstream flow.
- Aligned follow-ups of the same task start from the named file; workspace choice: `docs/agents/references/task-workspace.md`.
- **This agent edits the target tree itself** — do not open a separate Herdr coding agent; hand over only when the user explicitly says 分发 / 找人.
- Pure discussion, rule maintenance and clearly local edits skip intake. "需要修 / 低版本" goes through installed `zentao-api` step 8; kind stays the original Bug.

## Skill / doc pointer table (theme → path)
| Theme | Path |
|---|---|
| Issue / PRD | `docs/agents/issue-tracker.md` |
| Intake / routing, labels | `.agents/skills/dt-insight-triage/SKILL.md`, `docs/agents/triage-labels.md` |
| Domain / data-source card icons | `docs/agents/domain.md` |
| Coding standards SSOT | `docs/agents/coding-standards.md` |
| i18n | `.agents/skills/dt-insight-locale-fix/SKILL.md` |
| Git / Draft MR / conflicts | `.agents/skills/dt-insight-git-workflow/SKILL.md` |
| common fan-out | `.agents/skills/dt-insight-common-fanout/SKILL.md` |
| OMP deploy | `.agents/skills/omp-skill/SKILL.md` |
| Fixed steps | `dtis --help`: `check` (ci-local), `dev-ready`, `ready`, `comments`, `branch-check`, `bug`, `mr`, `omp`, `pipeline`, `notify-run` |
| Self-check | console 7.0 `.agents/skills/verify-console-70/SKILL.md`; otherwise `.agents/skills/dt-insight-local-dev/SKILL.md` |
| Local dev | `docs/agents/local-dev.md`, `.agents/skills/dt-insight-local-dev/SKILL.md` |
| Grok workflows | `.grok/workflows/README.md` |
| Context governance | `docs/agents/harness-governance.md` |
| Past investigations | `docs/solutions/` (`module` / `tags` / `problem_type`); domain terms `CONCEPTS.md` |

Deploy commands: always `dtis omp deploy --env-id N --branch B [--bg]` and `dtis pipeline <iid> [--custom] [--bg]`. Both notify Grok Bot at start and end — never call `omp-skill deploy` directly or hand-write polling loops.

## Delegation (sub-agents)
- UI design work (layout, visual style, interaction, visual acceptance) is done by the main agent with the main model.
- Use the runtime's native models only: no pinned third-party models, no DeepSeek / Grok sub-agents.
- Code implementation, fixes, refactors, test writing → native `worker`; code investigation → native `explorer`; other work picks a native role per task. Main agent integrates and accepts.
- Typically run 1–2 sub-agents when work can progress independently; obey explicit single-agent requests.
- Every delegation states goal, required context, owned files/modules, constraints, acceptance. Tell the sub-agent it is not working alone: preserve others' edits, coordinate overlapping ranges, agree shared contracts before parallel dependent work.
- Close finished sub-agents with the runtime mechanism (`close_agent` / `interrupt_agent`). Explicit SDD runs keep their phase roles and dependency order.

## Related

- [[dt-insight-workflow]] — the same conventions with `dtis fmt` details, the triage handoff field list, and per-package commit scoping.
- [[dt-insight-data-source-version-flow]] and [[dt-insight-public-service-datasource]] — the module maps these rules are applied to.
- [[zentao-cli]] — reading the 禅道 card that starts a task; query with `zentao bug <id> --json`.
- [[dt-insight-coding-standards]] — the code rules `dtis ready` enforces.
