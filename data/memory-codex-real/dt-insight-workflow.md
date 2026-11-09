---
name: dt-insight-workflow
description: dt-insight delivery conventions — intake/triage routing, dtis command set, ready/code-review/Plannotator/commit gating, test-env login helpers (env-api/env-cookie/env-open), delegation policy, OMP deploy + pipeline. Read before starting any Bug/需求/提测/版本同步 task in this repo.
metadata: from AGENTS.md override + docs/agents/* as of 2026-10-21..2026-11-01 (Shane SOP)
---

# dt-insight 工作流 (AGENTS.md / docs/agents)

Companion file with the full theme→path pointer table: [[dt-insight-harness-conventions]].

Repo worktrees live under `/Users/mac/.factory/ws/<task-id>-r3` (e.g. `161496-r3`); `dtis` commands are run from the worktree root. Governance: `docs/agents/harness-governance.md`; L0 style overlay: `docs/agents/references/agents-md-style.md`.

## Local-file rules

- Edit **`AGENTS.override.md`**, never `AGENTS.md`; a worktree where `T AGENTS.md` (turned into a symlink) is also not committed. Local flow files (override, machine-local skill output) go into `.git/info/exclude`, not commits.
- Read `docs/agents/coding-standards.md` before changing or reviewing code → [[dt-insight-coding-standards]].
- Branch/worktree choice: `docs/agents/references/task-workspace.md`; this agent works **in the target tree**, do not spawn a separate Herdr coding agent. Only hand off when the user explicitly says 分发 / 找人.

## Command set (`dtis --help`)

- `dtis ready` — pre-delivery gate: ci-local prettier / eslint (with `dt-correct` overlay) / stylelint / types **plus the new-comment check**. Run even for tiny diffs, before saying 改好了 or sending a Plannotator link.
- `dtis fmt [files...]` — project-configured prettier (`ko prettier --write` on Node 18). No args = files changed vs upstream (`@{u}`, override with `--base <ref>`). Don't hunt for npx/pnpm alternatives.
- `dtis omp deploy --env-id N --branch B [--bg]`; wait for MR pipelines with `dtis pipeline <iid> [--custom] [--bg]`. Both auto-notify Grok Bot at start/finish — never call `omp-skill deploy` directly or hand-roll polling.
- Also: `check` (ci-local), `dev-ready` (wait for dev env readiness — do not `sleep`-poll), `comments`, `branch-check`, `bug`, `mr`, `notify-run`. `dtis` output is already condensed; don't wrap it in `rtk proxy`.

## Delivery SOP (改完代码)

1. `dtis ready` passes (incl. new-comment check).
2. Self-verify per the skill table: console 7.0 → `.agents/skills/verify-console-70/SKILL.md`; otherwise `.agents/skills/dt-insight-local-dev/SKILL.md`. UI changes require real page screenshots / DOM measurements (`docs/agents/references/ui-visual-verify.md`) — typecheck + unit tests are not enough.
3. Report to the user with screenshots / local links. **Do not send the Plannotator link before acceptance** (2026-10-21 Shane SOP); after acceptance run `code-review` on the worktree diff (including uncommitted), first the two comment-checklist + slop steps of `.agents/skills/dt-insight-review-gate/SKILL.md`, then open the Plannotator review page + code relationship graph.
4. No commit/push before the user (`sdev`) approves. A card must literally contain `push: allowed` to allow commit/push/MR; otherwise report the diff only.
5. Delivery reports / evals must separate 「实际验证过」 from 「推断」; every verified item needs its command output or screenshot, otherwise it belongs under 推断.

## Test environment / real API responses

Login is handled by helpers that read `~/.config/dt-insight/uic.env` and pass the captcha automatically:

- `~/.config/dt-insight/bin/env-api <OMP id|namespace> POST /api/... '<json>'` — prints the response; `env-api --list` lists environments.
- `curl -b "$(~/.config/dt-insight/bin/env-cookie <env>)" <url>` — cookie for a browser session.
- `~/.config/dt-insight/bin/env-open` — browser with the login state applied.

Never stop at a 未登录 page / login form / captcha — use these first. A card naming 「验收环境」 (domain + tenant) must be verified only there; don't switch environment or tenant.

## Intake / routing

For 禅道 Bug/任务, PRD/需求, 提测, 回灌/跨版本/合 release, or "该走哪条分支/流程": load `.agents/skills/dt-insight-triage/SKILL.md` → classify (`需求|Bug|提测|版本同步`) → validate context (`product` from the screenshot hash first segment, `version`, `branch_flavor` origin/custom, `owner`, `suffix`) → judge target (`fix` for test, `hotfix` for release/线上, low-version backport to that `release_*`) → dispatch a handoff with `task_id/kind/product/version/flavor/owner/suffix/target_base/branch_prefix/scenario/git_workflow_branch/why/next_skill`. Same-version test↔release conflicts are always 回灌 (release → test), regardless of the wording's direction. 纯讨论, rule maintenance and clearly local edits skip intake. Triage labels: `docs/agents/triage-labels.md`; issue tracker: `docs/agents/issue-tracker.md`.

Bug branch detail: Branch 4 `fix` for test, Branch 3 `hotfix` for release/线上; a custom branch for a standard product hotfix is `custom/<product>/release_<ver>_<owner>` with cherry-picked sha. If the ZenTao title is understandable, don't reproduce first (2026-10-28); ask the user whether to reproduce when info is thin.

## Delegation policy (按需委派)

- UI design work (layout, visual style, interaction, visual acceptance) stays with the main agent on the main model.
- Use the current runtime's native roles only — `worker` for implementation/fixes/refactors/test writing, `explorer` for code investigation; no DeepSeek/Grok sub-agents.
- Usually 1–2 sub-agents in parallel for independent subtasks; the main agent keeps working the independent parts, integrates, resolves conflicts, and verifies the actual diff.
- Every delegation states goal, context, files/modules, constraints, acceptance; tell the sub-agent it is not alone in the tree and must preserve others' edits. Decide shared contracts before parallel dependent work.
- When a sub-agent finishes, call the runtime's close mechanism (`close_agent` / `interrupt_agent`). Don't assume the main model auto-upgrades reasoning effort.

## Related

- [[dt-insight-coding-standards]] — code rules the `dtis ready` gates enforce.
- [[zentao-cli]] — reading the Bug/任务 these routes start from.
- [[dt-insight-public-service-datasource]] — worked example (161496, `publicService/hotfix_6.3.x_161496`).
