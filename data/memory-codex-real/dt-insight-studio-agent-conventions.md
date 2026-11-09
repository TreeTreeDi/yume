---
name: dt-insight-studio-agent-conventions
description: One-screen quick reference for dt-insight-studio work — worktree/branch naming, Zentao bug intake URL, the dtis gate sequence and which file holds each rule set; full detail lives in dt-insight-studio-agent-rules.
metadata: distilled from AGENTS.md dump in codex session 01a199b8, 2026-11-02
---

# dt-insight-studio quick reference

Canonical, full detail: [[dt-insight-studio-agent-rules]] (hard rules, form validation,
change scoping, overlay files, delivery gates, delegation, doc index table). Test-environment
logins: [[dt-insight-studio-test-env-access]].

Grep-friendly essentials:

- Worktrees are per task and encode the branch: `projects/dt-insight-studio.console-hotfix_7.0.x_161477`
  → console 7.0 hotfix #161477; hotfix branch `console/hotfix_7.0.x_<id>` for the
  publicService 6.3 → console 7.0 flow. Create via `scripts/git-worktree-add.sh` (syncs overlay).
- Zentao bugs arrive as `http://zenpms.dtstack.cn/zentao/bug-view-<id>.html`; route them through
  `.agents/skills/dt-insight-triage/SKILL.md`, not straight to code.
- Delivery gate order for a bug: workspace-only edit → `dtis ready` → evidence
  (console 7.0: `.agents/skills/verify-console-70/SKILL.md`) → user acceptance → commit/push/
  Draft MR, and only when the card says `push: allowed`. Branch created → `dtis branch-check`.
- `dtis` subcommands: `check`, `dev-ready`, `ready`, `comments`, `branch-check`, `bug`, `mr`,
  `omp deploy --env-id N --branch B [--bg]`, `pipeline <iid> [--bg]`.
- Rule maintenance: `docs/agents/harness-governance.md` is where new rules get assigned to a layer;
  the repo keeps one home per fact, so update the referenced file rather than AGENTS.md.
