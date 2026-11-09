---
name: dt-insight-workflow-conventions
description: How to work in the dt-insight monorepo (AGENTS.md / overlay): required dtis commands, verification + acceptance gates, push and 卡片 rules, test-env login tooling, delegation policy.
metadata: read from AGENTS.md + docs/agents/* in session 01a197b9 (2026-11-01)
---

# dt-insight 工作流约定

Repository: dtstack dt-insight front-end monorepo. Sessions run in a per-task factory worktree, e.g. `/Users/mac/.factory/ws/161496-r3` (workspace dir named after the ZenTao id). Packages: `apps/console`, `apps/publicService`, `packages/dt-common`, `packages/ant-design-dtinsight-theme`. Branch example: `publicService/hotfix_6.3.x_161496` (`<app>/<fix|hotfix|feat|test>_<version>_<taskId>`).

## Required sequence for a code change

1. Read `docs/agents/coding-standards.md` **before** editing or reviewing (see [[dt-insight-coding-standards]]).
2. After editing: `dtis ready` must pass (ci-local: prettier / eslint / stylelint / types + 新增注释检查).
3. Collect self-test evidence per skill: console 7.0 → `.agents/skills/verify-console-70/SKILL.md`; otherwise `.agents/skills/dt-insight-local-dev/SKILL.md`.
4. Hand to the user for acceptance with screenshot / local link. Only **after** acceptance run `code-review` over the working-tree diff (including uncommitted), doing the comment checklist + slop pass from `.agents/skills/dt-insight-review-gate/SKILL.md`, then produce the Plannotator review page + code relationship graph. Do **not** send a Plannotator link before acceptance (2026-10-21 Shane SOP).
5. No commit / push until the user (sdev) approves. Wait for dev readiness with `dtis dev-ready` — never `sleep` polling.

## Push / ticket rules

- A ZenTao ticket only allows commit / push / MR when it says `push: allowed`; missing or `push: no` → change nothing beyond the workspace, report the diff.
- When a ticket states 验收环境 (domain + tenant), verify only in that environment / tenant.
- Delivery reports and evals must split 「实际验证过」 from 「推断」: every "verified" item needs the matching command output or screenshot, otherwise it goes under 推断.

## dtis commands (output is already trimmed — do not wrap in `rtk proxy`)

`dtis --help` covers: check (ci-local) / dev-ready / ready / comments / branch-check / bug / mr / omp / pipeline / notify-run.

- `dtis fmt [files...]` — runs `ko prettier --write` under Node 18; with no args formats files changed vs upstream plus untracked files (`--base <ref>` to override). Do not hunt for npx / pnpm exec / PATH workarounds.
- `dtis omp deploy --env-id N --branch B [--bg]` — the only supported OMP deploy path.
- `dtis pipeline <iid> [--custom] [--bg]` — wait on an MR pipeline. Both notify the Grok Bot at start and end; do not call `omp-skill deploy` directly or hand-write polling loops.

## Test-env / real API access

- `~/.config/dt-insight/bin/env-api <OMP id|namespace> POST /api/... '<json>'` prints the response; `env-api --list` lists environments.
- `curl -b "$(~/.config/dt-insight/bin/env-cookie <env>)" <url>` for cookie-authenticated reads.
- `env-open` (same dir) opens a logged-in browser; see `.agents/skills/verify-console-70/SKILL.md`.
- All three read `~/.config/dt-insight/uic.env` and get past the captcha login automatically. A「未登录」/login-page/captcha result is not a blocker — log in with these first.

## Intake and routing

- ZenTao Bug/任务, PRD/需求, 提测, 回灌/跨版本/合 release, or "which branch/process" questions → load `.agents/skills/dt-insight-triage/SKILL.md` (classify → validate → judge → dispatch), reuse existing context, then run the downstream skill.
- "需要修 / 低版本" is the 需要修 gate on the **original Bug** (kind stays Bug), handled via `docs/agents/issue-tracker.md` (zentao-api step 8).
- The intake agent continues in the target tree itself; do not spawn a Herdr coding agent. Hand off only when the user explicitly says 分发 / 找人.
- Pure discussion, rule maintenance and clearly local edits skip intake.
- Skill map by topic: i18n → `.agents/skills/dt-insight-locale-fix/SKILL.md`; git/Draft MR/conflicts → `.agents/skills/dt-insight-git-workflow/SKILL.md`; local dev → `docs/agents/local-dev.md` + `.agents/skills/dt-insight-local-dev/SKILL.md`; domain/data-source icons → `docs/agents/domain.md`; triage labels → `docs/agents/triage-labels.md`; context governance → `docs/agents/harness-governance.md`; past postmortems → `docs/solutions/` (`module`/`tags`/`problem_type`), domain vocabulary in `CONCEPTS.md`.

## Delegation policy

- UI design (layout, visual style, interaction, visual acceptance) is done by the main agent with the main model — never delegated.
- Use only the runtime's native models/roles: implementation, fixes, refactors, test writing → native `worker`; code investigation → native `explorer`. Do not dispatch DeepSeek or Grok sub-agents.
- Typically 1–2 sub-agents in parallel for independent subtasks; short simple tasks are done directly. Respect an explicit single-agent request.
- Each delegation must state goal, context, owned files/modules, constraints and acceptance; tell the sub-agent it is not alone and must keep others' changes and coordinate overlapping scope. Agree shared contracts before parallel dependent work.
- Main agent integrates, resolves conflicts, checks the actual diff + verification evidence, and answers; repeat failures only after adjusting the task/model based on evidence. Close sub-agents with the runtime's end mechanism (`close_agent` / `interrupt_agent`).

## Repo / overlay hygiene

- Edit `AGENTS.override.md`; never commit `AGENTS.md` (in worktrees `T AGENTS.md` means it is a symlink and also must not be committed).
- Local process files (override, machine-local skill output) go into `.git/info/exclude`, not a commit.
- Every delivered placeholder / TODO / fake implementation needs a tracking ticket under `.scratch/<feature>/issues/` (see [[dt-insight-coding-standards]]).

Related: [[dt-insight-coding-standards]], [[dt-insight-datasource-add-source]], [[zentao-cli]]. The same repo workflow is also written up in [[dt-insight-project-workflow]] (adds the `dt-insight-studio.*` delegated worktree roots and branch/version selection detail) — read it too before starting a ticket.
