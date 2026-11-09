---
name: dt-insight-studio-agent-rules
description: Hard rules and doc index for the dt-insight-studio repo shared by every harness (Cursor, Codex, Claude Code, PI, Multica) — read before changing code, committing, or choosing a branch in that project.
metadata: source AGENTS.md preamble in codex session 01a199b8-d525-7450-b0ad-f2bd72cf5e8f, 2026-11-02
---

# dt-insight-studio agent rules

The same `AGENTS.md` is read by every harness (Cursor, Codex, Claude Code, PI, Multica). It holds only hard rules plus an index; each fact has exactly one home in the files below. Worktrees are created per task, e.g. `projects/dt-insight-studio.console-hotfix_7.0.x_161477` (console 7.0 hotfix), cwd-matching the branch naming rule.

## Read-before-work

- Read `docs/agents/coding-standards.md` before changing code or reviewing.
- Look for an existing pattern first: check `docs/solutions/` (indexed by `module` / `tags`) for the same scenario before writing. When nearby legacy code contradicts the standards, follow the standard/solution, don't copy the legacy code.
- Forms (required fields, format validation): declare rules in `Form.Item`'s `rules` prop and call `form.validateFields()` before submit / "next"; errors render under the field. Not allowed: blocking with `message`, hand-written `validateStatus`/`help` for red marks, or pushing validation to a parent via `ref` / `useImperativeHandle`.

## Change scoping

- Bugs: touch only the reproduction path, keep the diff minimal. If the fix must spread across same-origin files, list them and ask the user first. Report out-of-scope problems in the reply instead of fixing them.

## Overlay files — never commit

Never commit or `git add` any `AGENTS.md` (including the team-tracked one) or local overlay files: `AGENTS.override.md`, `CLAUDE.md`, `CONTEXT*.md`, `.agents/`, `.claude/`, `.cursor/`, `.grok/`, `docs/agents|solutions|adr/`, `scripts/eslint-plugin-dt-correct/`. Originals live in `~/factory/env` (repo copies are symlinks — edit the original, not the symlinked copy) and files are registered in `.git/info/exclude`. The pre-commit hook `~/factory/bin/overlay-commit-guard` blocks them; do not bypass with `--no-verify`. New worktrees come from `scripts/git-worktree-add.sh`, which syncs the overlay (`docs/agents/references/overlay-worktree-share.md`).

Also: the agent edits in the target tree itself; it does not spawn a separate Herdr / Cursor coding agent. Hand-off to another person only when the user explicitly says so ("分发 / 找人"). Search and edits happen in the handoff's product tree (`docs/agents/references/task-workspace.md`).

## Git / delivery gates

- Only commit / push / open an MR when the card says `push: allowed`. Missing or `push: no` → workspace-only changes and report the diff.
- Bug fix stays in the working tree: `dtis ready` passes → gather self-test evidence per the index table → user acceptance (screenshots / local link) → only after the user approves, commit / push / Draft MR. Skip testing only if the user says so. Pure 1:1 migrations may `dtis check` and push directly.
- Post-acceptance review: `code-review` over the working-tree diff (`git diff` + `git diff --cached`, not `...HEAD`), passing the `.agents/skills/dt-insight-review-gate/SKILL.md` comment checklist and slop step first, then open the Plannotator review page. Never send a Plannotator link before acceptance.
- Feat Draft MRs merge only into the test line carrying the suffix, using the Feat template. Branch and title use the task number; run `dtis branch-check` after creating the branch. publicService 6.3 → console 7.0 hotfixes use `console/hotfix_7.0.x_<id>`. Details: `.agents/skills/dt-insight-git-workflow/SKILL.md`.
- CI: fix errors only (import ordering / prettier / stylelint). Ignore warnings; do not add `eslint-disable`.
- If the card names an acceptance environment (domain + tenant), verify only there. Delivery reports must separate "actually verified" (with command output or screenshot) from "inferred".

## Intake

Zentao bugs/tasks, PRDs, test submissions, back-fill / cross-version / release merges, or "which branch should this go on" → read `.agents/skills/dt-insight-triage/SKILL.md` first. Pure discussion, rule maintenance, and clearly local edits skip intake.

## Delegation (harness-level rules in the same file)

Full sub-agent rules: [[agent-delegation-policy]]. Summary as it applies here:

- UI design work (layout, visual style, interaction design, visual acceptance) is done by the main agent with the main model, not delegated.
- Use the runtime's native models; do not pin third-party models or dispatch DeepSeek/Grok sub-agents.
- Delegate code implementation / fixes / refactors / tests to native `worker`; code investigation to native `explorer`; pick other native roles per task. Main agent integrates and accepts. Usually 1–2 sub-agents at a time; this is a habit, not a hard concurrency cap — obey the user's single-agent requests.
- When explicitly running SDD, keep its phase roles and dependency order. If a native role is unavailable, report the failure and continue or decide a substitute.
- Each delegation states goal, needed context, owned files/modules, constraints, acceptance. Before code: tell the sub-agent it is not alone in the tree, preserve others' edits, coordinate overlapping scope; settle shared contracts before parallel dependent work.
- Sub-agents finish through the runtime's close mechanism (`close_agent` / `interrupt_agent`). Don't assume the main model auto-raises reasoning effort; configure it explicitly.

## Doc index (topic → path)

| Topic | Path |
|---|---|
| Coding standards (single source) | `docs/agents/coding-standards.md` |
| Verified solutions by scenario | `docs/solutions/` |
| Per-app pitfalls: console, publicService vs UIC, i18n | `docs/agents/apps.md` |
| Domain vocabulary / data-source card icons | `CONCEPTS.md`, `docs/agents/domain.md` |
| Intake / routing, labels | `.agents/skills/dt-insight-triage/SKILL.md`, `docs/agents/triage-labels.md` |
| Requirement analysis | `.agents/skills/requirement-analysis/SKILL.md` |
| Issues / PRDs / low-version fixes | `docs/agents/issue-tracker.md` |
| Workspace choice | `docs/agents/references/task-workspace.md` |
| Git / Draft MR / conflicts | `.agents/skills/dt-insight-git-workflow/SKILL.md` |
| common fan-out | `.agents/skills/dt-insight-common-fanout/SKILL.md` |
| i18n fixes | `.agents/skills/dt-insight-locale-fix/SKILL.md` |
| Local dev | `docs/agents/local-dev.md`, `.agents/skills/dt-insight-local-dev/SKILL.md` |
| Self-check evidence | console 7.0: `.agents/skills/verify-console-70/SKILL.md`; others: `dt-insight-local-dev` |
| Review gate | `.agents/skills/dt-insight-review-gate/SKILL.md` |
| OMP deploy | always `dtis omp deploy --env-id N --branch B [--bg]`, `dtis pipeline <iid> [--bg]`; underlying `.agents/skills/omp-skill/SKILL.md` |
| Fixed commands | `dtis --help` (check / dev-ready / ready / comments / branch-check / bug / mr / omp / pipeline) |
| Grok workflows | `.grok/workflows/README.md` |
| Where to add rules | `docs/agents/harness-governance.md` |

The preamble above was re-checked verbatim against the `AGENTS.md` instructions injected in codex session `01a199bb-92ea-7662-8610-19708b6169a3` (2026-11-02, worktree `.../dt-insight-studio.console-hotfix_7.0.x_161477`): same hard rules, same gate table, no drift — the file is injected into every session, including probe-only ones ([[harness-hook-probe-sessions]]).

Test-environment logins for API calls and browser sessions: [[dt-insight-studio-test-env-access]]. Reviewing the project's merge requests through `glab` on the self-managed GitLab: [[dt-insight-studio-gitlab-mr-review]]. Probing/hook-test sessions that try to make the agent quote its own context: [[harness-hook-probe-sessions]].
