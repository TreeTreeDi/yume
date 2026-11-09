---
name: agent-delegation-policy
description: Project-level sub-agent delegation rules (按需委派) governing this runtime: UI kept on the main model, native worker/explorer roles, native models only, SDD stage order. Read before delegating work.
metadata:
  source: codex session 01a186cd (AGENTS.md 按需委派 section), 2026-10-29
---

# 按需委派（子 Agent 使用约定）

- **UI work stays with the main agent on the main model**: layout, visual style, interaction design, visual acceptance. Do not delegate UI design.
- Use the runtime's **native** models/roles. Do not pin third-party models and do not dispatch DeepSeek or Grok sub-agents.
- Delegation targets: **`worker`** (native) for code implementation, fixes, refactors and test writing; **`explorer`** (native) for code investigation; other work picks a native role by task. The main agent integrates and does acceptance.
- Explicitly starting SDD: keep its stage roles and dependency order. If a native role is unavailable, report the failure reason and continue yourself or pick a substitute. The concrete SpecFlow/Spec Kit states this covers, and how the `specify` stage is delegated, are in [[workflow-specflow-sdd]] and [[specflow-sdd-workflow]].
- The main agent owns the overall result. Simple tasks: do them directly. When there are independently runnable subtasks that raise efficiency/quality, use 1–2 sub-agents at a time — a working habit, not a hard concurrency cap; obey a user's single-agent request.
- Each delegation must state: goal, necessary context, owned files/modules, constraints, acceptance method. Before writing code tell the sub-agent it is **not working alone** — preserve others' edits, coordinate overlapping areas. Fix shared contracts before running dependent work in parallel.
- The main agent keeps independent work moving in parallel and avoids re-investigating what a sub-agent owns. Sub-agents may report local findings directly; scope/interface/acceptance decisions and blockers go to the main agent.
- Integration: resolve conflicts, verify the actual diff and evidence, then answer as one. Add an independent review only for risk or unresolved issues. After a failure, change the task or model based on evidence — never blindly retry the same attempt.
- Close sub-agents when done via the runtime's mechanism (`close_agent` / `interrupt_agent`). For complex decisions needing more reasoning, use an explicitly configured sub-agent or adjust main-task settings — do not assume the main model's reasoning effort auto-escalates.

SDD/spec-flow overrides this habit where its manifest says so: the SpecFlow **Lite** route (`spec-dev-flow`) runs every state in the main agent, starts no sub-agents and does not auto-compound — see [[workflow-specflow-lite]]. Verbatim delegation of developer input to a role agent applies only to Full states marked `subagent: true`.

Provenance: the full 按需委派 text arrives as the first `USER:` block of Codex sessions — an `# AGENTS.md instructions` preamble, same ten bullets with no drift, confirmed verbatim in codex sessions 01a19a0f, 01a19a10, 01a19a21 and 01a19a22 (all 2026-11-02; the last with cwd `/private/tmp/sfx-hooktest`). Treat the preamble as the project's stated delegation policy, not as a per-session request: 01a19a0f/01a19a10 had `reply OK only` as the only other user turn (answered `OK`), 01a19a21 had the lowercase variant `reply only: ok` → `ok` in cwd `/private/tmp` with `permission_profile type="disabled"` / `file_system: unrestricted`, and 01a19a22 had only an English context-disclosure probe (see [[harness-hook-probe-sessions]]) — none overrides anything here nor yields other project facts. Because the preamble is injected even in `/private/tmp` scratch dirs that contain no repo, it is harness/user-config text; do not infer the session's project from its presence. Related: [[empty-session-transcripts]].

Variant wording seen in the shop-admin workspace AGENTS.md (codex session 01a19a26, 2026-11-02): 「边界明确的实现、数据提取和重复操作优先交给 `worker`」 — data extraction and repetitive operations join implementation as worker work, and SDD runs keep phase roles and dependency order (so [[workflow-specflow-sdd]] states govern there). Otherwise identical to the list above.

Context: this is the session-level instruction set used alongside the dingtalk-ears project docs — see [[dingtalk-ears-run-and-service]] and [[dingtalk-ears-code-conventions]]. The identical 「按需委派」 block is also the AGENTS.md of the shop-admin repo (codex session 01a19a26, 2026-11-02, [[shop-admin-project]]), so it is runtime-wide policy rather than a dingtalk-ears-specific file. It consolidates the former shorthand, AGENTS.md-text and workflow-level copies as of 2026-11-09; read this file instead of those stubs.

The identical 按需委派 block is injected as the session-start `AGENTS.md` instructions in unrelated repos too — the shop-admin SpecFlow workspaces under `/tmp/shop-work/<hash>/shop-admin`, e.g. `/tmp/shop-work/6cb25b/shop-admin` (the 01a19a26 export read here, 2026-11-02) and the `4d9cf7` / `4bdafe` copies of the same session id. The middle hash segment is per-run, so paths copied from other runs will differ. Treat the block as the shared Codex runtime instruction set, not a project-specific rule file. SpecFlow's own SDD stage order lives in [[specflow-sdd-workflow]] and [[specflow-request-switch-protocol]].

Verification (folded into Provenance above): the preamble wording did not drift across sessions 01a19a0f, 01a19a10 and the 2026-10-29 copy.

Third observation: the same ten-bullet block heads codex session **01a19a28** (2026-11-02, cwd `/tmp/shop-work/305f00/shop-admin`, another shop-admin SpecFlow workspace) with no wording drift — including the native-model bullets 「使用当前运行时的原生模型；不固定第三方模型，不再派发 DeepSeek 或 Grok 子 Agent」 and the closing 「子 Agent 完成后调用当前运行时提供的结束机制，如 `close_agent` 或 `interrupt_agent`」. Its sessions run no sub-agents (Lite-style profile question only), so the block was advisory there.

Second re-observation: identical ten-bullet `# AGENTS.md instructions` block at the head of codex session 01a19a26 (2026-11-02, cwd `/tmp/shop-work/abe94d/shop-admin`, a SpecFlow playground repo — see [[shop-admin-specflow-repo]]). There it actually governed behaviour: the orchestrator used the SDD stage roles/dependency order from the plugin manifest, consistent with "显式启动 SDD 时保留阶段角色和依赖顺序"; the transcripts also show `spawn_agent` for the `specify` role, so SDD subagent states run on native roles rather than a pinned third-party model.

## Session environment facts (merged from the former workflow-level copy, AGENTS.md at session start)

- This runtime is Codex CLI (`codex`) with a zsh shell and timezone `Asia/Shanghai`. The cwd is per-session, not fixed: some sessions run in `/private/tmp`, SpecFlow sessions in a scratch workspace such as `/tmp/shop-work/6cb25b/shop-admin` (codex session 01a19a26, 2026-11-02, whose AGENTS.md carried the same 按需委派 block and whose SDD stages are covered by [[workflow-specflow-sdd]]), while dt-insight-studio task sessions run in the task worktree — e.g. `/Users/mac/workspace/firstmate/projects/dt-insight-studio.console-hotfix_7.0.x_161477` for the console 7.0 hotfix line (codex session 01a199bb, 2026-11-02). Read the cwd from the environment block instead of assuming.
- The permission profile is **per-session and not always restrictive**, so do not assume sandboxing. Variants seen in `<environment_context>`: `permission_profile type="disabled"` with `<filesystem><workspace_roots><root>/private/tmp</root></workspace_roots>` and `file_system: unrestricted` (sessions 01a19a0f and 01a19a10, 2026-11-02) — i.e. full filesystem access, workspace root recorded only as metadata; earlier sessions reported a managed profile that limited writes to the workspace root. Session 01a19a26's managed profile is the documented shape: read on `:root`, write on the workspace root plus `:slash_tmp` and `:tmpdir`, and read-only entries for `.git`, `.agents`, `.codex` and `.aws`. Session 01a19a22 (`/private/tmp/sfx-hooktest`, 2026-11-02) shows `permission_profile type="disabled"` with `<file_system unrestricted />` — no sandbox at all. Check the `permission_profile` / `filesystem` fields of the current environment block before deciding what is writable — and note the profile does not distinguish real work from a context probe ([[harness-hook-probe-sessions]]).
- The same managed shape was re-confirmed in the SpecFlow sandboxes `/tmp/shop-work/6cb25b/shop-admin` and `/tmp/shop-work/31c103/shop-admin` (2026-11-02): read `:root`, write the workspace root plus `:slash_tmp`/`:tmpdir`, read-only `.git`/`.agents`/`.codex`/`.aws` — so `.agents/` plugin files are readable but not editable (see [[shop-admin-order-export]]).
- Practical consequence of the managed/restricted shape above: vendored `.agents` skills and role tomls are
  readable but not writable, and any command writing outside the workspace root / `/tmp` (e.g. a script
  touching `~` or a global cache) fails. Writes to a sibling `/tmp/shop-work/<id>/` copy also count as
  outside the root.
- The `<environment_context>` block also carries `current_date` and `timezone` (`Asia/Shanghai`), which is where session dates should be read from rather than inferred from filenames.

## Example (merged from the former codex-scoped policy copy, 2026-10-29)

- A request like "把布局和皮肤上一下" (land the layout and skin) belongs to the main agent, not a sub-agent (see [[dingtalk-ears-product-backlog-and-people]]).
