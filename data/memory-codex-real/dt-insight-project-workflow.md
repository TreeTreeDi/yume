---
name: dt-insight-project-workflow
description: How the dt-insight console repo (apps/console, apps/publicService, packages/dt-common) is worked on — AGENTS.md/overlay rules, dtis commands, zentao CLI, branch + delivery gates. Read before starting any ticket in this repo.
metadata: source session 01a197b9 (bug 161496, 2026-11-01)
---

# dt-insight project workflow

Repo trees live under `/Users/mac/.factory/ws/<ticket-id>` (e.g. `161496-r4`); monorepo with `apps/console`, `apps/publicService`, `packages/dt-common`, `packages/ant-design-dtinsight-theme`. Worktrees are often named after the zentao bug id, and `git branch --show-current` at session start is the working branch (observed: `publicService/hotfix_6.3.x_161496`).

A second worktree root is used for delegated/handed-off runs:
`/Users/mac/workspace/firstmate/projects/dt-insight-studio.<branch-flavor>_<version>_<id>`, e.g.
`dt-insight-studio.console-hotfix_7.0.x_161477` (console 7.0 hotfix for ticket 161477, cwd of a
codex session created 2026-11-02). The directory name encodes the branch the same way the
`console/hotfix_7.0.x_<id>` branch rule does, so the cwd alone tells you the flavor and line.

## Agent instructions layer

- `AGENTS.md` in the worktree is a symlink and is **never committed**; local edits go to `AGENTS.override.md`, registered in `.git/info/exclude`. Governance doc: `docs/agents/harness-governance.md`; L0 style: `docs/agents/references/agents-md-style.md`.
- Delegation rule: UI design/visual acceptance stays with the main agent; code implementation/fix/refactor/tests go to native `worker`, code investigation to native `explorer`; no DeepSeek/Grok sub-agents. Main agent owns integration and acceptance.
- Read `docs/agents/coding-standards.md` before changing or reviewing code — see [[dt-insight-frontend-conventions]].

## Intake / routing

- Zentao Bug, task, PRD, 提测, 回灌/跨版本/合 release → load `.agents/skills/dt-insight-triage/SKILL.md` (classify → validate context → judge target → dispatch handoff). Pure discussion or rule maintenance skips intake.
- kind stays **Bug** (not 版本同步) for "需要修 / 低版本 / 在 62 有吗" questions. Bug to test → `fix`; Bug to release/线上 → `hotfix`; 同版本 test↔release conflict → 回灌 (release → test).
- Work happens **in the target tree by the current agent**; do not spawn a Herdr coding agent, and only hand off when the user says 「分发 / 找人」.

## dtis commands (self-check / delivery)

- `dtis ready` (ci-local: prettier / eslint / stylelint / types, plus new-comment check) must pass before handover; `dtis fmt [files]` for formatting (do not call node_modules prettier directly); `dtis dev-ready` instead of sleep-polling; `dtis --help` lists check / comments / branch-check / bug / mr / omp / pipeline / notify-run.
- Deploy: `dtis omp deploy --env-id N --branch B [--bg]`; MR pipelines: `dtis pipeline <iid> [--custom] [--bg]`. Do not call omp-skill deploy directly or hand-write polling.
- Test-environment login / real API data: `~/.config/dt-insight/bin/env-api <OMP id|namespace> POST /api/... '<json>'` (prints the body, `--list` shows envs) or `curl -b "$(~/.config/dt-insight/bin/env-cookie <env>)" <url>`; browser with login → `env-open`. On 未登录 / 登录页 / 验证码, use these instead of stopping.
- Delivery gate (2026-10-21 Shane SOP): `dtis ready` → evidence-based self-test → user acceptance (screenshot/local link) → `code-review` on the working-tree diff (incl. uncommitted) → comment checklist + slop pass from `.agents/skills/dt-insight-review-gate/SKILL.md` → Plannotator review page + code relation graph. **No Plannotator link before acceptance; no commit/push before the user (sdev) approves.**
- Card rules: if the card names an 验收环境 (domain + tenant), verify only there. Only `push: allowed` permits commit/push/MR. Delivery reports and evals must separate 「实际验证过」 (each with command output or screenshot) from 「推断」.
- Local verification skills: console 7.0 `.agents/skills/verify-console-70/SKILL.md`; otherwise `.agents/skills/dt-insight-local-dev/SKILL.md` (docs: `docs/agents/local-dev.md`). History: `docs/solutions/`; domain glossary `CONCEPTS.md`.

## Zentao CLI

Ticket lookup is `zentao bug <id> --json`; all CLI usage, dry-run/read-back rules, `taskRole=front`, batching and pitfalls are in [[zentao-cli]]. Copy the ticket fields (title, product, severity/pri, openedBuild, resolvedBuild, testtask) into the handoff rather than re-typing from the web page.

## Branch / version context

- `publicService` worktree at this time was on the 6.3.x line (release_6.3.x, test_6.3.x_v703 visible in `git log`), while the console product version is 7.0.x — pick `branch_flavor` (标品 `origin` vs 定制化 `custom`) and version from the card, not from the branch alone.
- Bug fixes to test branch use prefix `fix`, release/线上 `hotfix`; custom-branch fixes cherry-pick the standard hotfix sha.

Related: [[datasource-center-add-source-flow]], [[dt-insight-frontend-conventions]]
