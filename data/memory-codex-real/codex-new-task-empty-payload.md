---
name: codex-new-task-empty-payload
description: How to recognise a Codex turn whose agent output is only an envelope (`NEW_TASK` with an empty payload, or a bare `MESSAGE` with blank payload) — when it truly produced nothing versus when real `TOOL CALL`/`TOOL RESULT` blocks sit between the envelopes — which sessions show it, and how to recover; also the plan-only prompt pattern (只回复修复方案 / 不要修改任何文件).
metadata:
  source: codex session 01a199f0 (2026-11-02)
---

# Codex turn with only a `NEW_TASK` envelope and empty payload

## Shape

Some Codex turns contain exactly this as the whole agent message, and nothing after it:

```
Message Type: NEW_TASK
Task name: /root/s3_plan_check
Sender: /root
Payload:
```

Reading it:

- It is a **delegation attempt**: the runtime names the target sub-agent `/root/<name>` and
  expects the task text in `Payload`. Here `Payload` is blank and the transcript ends, so
  nothing was analysed, no plan was written, no file was touched.
- It is **not evidence of delegated work**. Unless a separate sub-agent transcript exists,
  treat the turn as producing no deliverable — do not quote it as a conclusion, and do not
  assume the parent agent saw results from it.
- The `Task name` is a free-form slug chosen by the model (e.g. `s3_plan_check` hints at the
  topic) — usable as a topic hint only, never as a finding.

## Sessions that show it

- **01a199f0-9783-7761-b214-f35118b515f6** (2026-11-02, worktree
  `/Users/mac/.factory/ws/16537-r1`, zenTao story 16537 "s3 数据源整合"): user asked for a
  plan-only reply about the S3 数据源列表 connection info (hostname → endpoint + region,
  see [[dt-insight-data-source-center]]); the only agent message was
  `Task name: /root/s3_plan_check` with an empty payload. Zero usable plan was delivered.

- **01a19a26-4bc0-7bb1-a2aa-e9ae4c56f170** (2026-11-02, cwd `/tmp/shop-work/6553ac/shop-admin`,
  SpecFlow Full run on the 订单导出 PRD — [[project-shop-admin]]): one agent message is
  `Message Type: NEW_TASK` / `Task name: /root/specify` / `Sender: /root` / blank `Payload:`, followed
  by real work (reading `.agents/agents/specify.toml`, `speckit-specify/SKILL.md`, the spec template,
  `artifact-paths.md`, the constitution, then `resolve-template.sh spec-template --json`). Here the task
  name is literally the **SDD state** being dispatched (`specify`), see [[specflow-spec-dev-flow]], so
  a `/root/<state>` slug identifies which pipeline stage ran, not what was found.

- **01a19a28-2488-74a2-bbb0-ba86213f1706** (2026-11-02 02:48Z, cwd `/tmp/shop-work/abe94d/shop-admin`)
  is the **child side** of exactly that `/root/specify` dispatch: same blank `Payload:`, but the child
  session's own context already held the parent's user prompt (the `按需委派` AGENTS.md block + the
  订单导出 PRD + the spec-dev-flow skill text), so the blank payload did **not** cost it the requirement.
  It read `specify.toml`, `speckit-specify/SKILL.md`, `spec-template.md`, `artifact-paths.md`, the
  constitution, ran `resolve-template.sh spec-template --json`, and then **wrote
  `docs/spec/features/001-order-export/spec.md` + `checklists/requirements.md` + `.specify/feature.json`**
  and reported artifacts + 「未决缺口：无」. Two lessons: a blank `Payload` says nothing about what the
  child knows or produces (read the feature dir / the child export), and the parent→child reply shows up
  as `send_message {"target":"/root","message":"gAAAAA…"}` ciphertext, so only the child's own final
  prose (the compact 产物 / 摘要 / 未决缺口 block) is readable. See [[shop-admin-order-export]].

  The child thread of that dispatch **does have its own export**:
  `01a19a28-2478-7f90-8305-3816971562d2`, same cwd `/tmp/shop-work/6553ac/shop-admin`, created
  `2026-11-02T02:48:05Z`. Its first agent block is the same `Message Type: NEW_TASK` / `Task name: /root/specify`
  / blank `Payload:` envelope, followed by `Message Type: MESSAGE` blocks holding the real tool calls, and it
  ends with a compact Chinese completion report sent back via `send_message` (target `/root`, opaque `gAAAAA…`
  payload in the export). It produced `docs/spec/features/001-order-export/spec.md`,
  `checklists/requirements.md` and `.specify/feature.json`. Conclusion: when a `/root/<state>` slug is present,
  look for the same-cwd sibling export before calling the turn empty — the work is in the child, only the prose
  report is encrypted in the parent (see [[shop-admin-order-export]]).

- **01a19a26-4bba-7800-910f-26bac68a1468** (2026-11-02, cwd `/tmp/shop-work/a29bb6/shop-admin`, the same 订单导出
  Full run as [[shop-admin-order-export]]): identical shape — `Message Type: NEW_TASK` / `Task name: /root/specify` /
  blank `Payload:`, then `MESSAGE` envelopes interleaved with real `exec` calls (`cat .agents/agents/specify.toml
  .agents/skills/speckit-specify/SKILL.md .specify/templates/spec-template.md`, `cat …/artifact-paths.md
  spec.config.yaml .specify/memory/constitution.md .specify/feature.json`, `resolve-template.sh spec-template --json`).
  Two tells for these SDD runs: the task name is the manifest state name, and the envelopes carry no readable prompt
  because the handoff travels as the encrypted `spawn_agent` message.

- **01a19a26-4bc5-7b81-acd0-ea9a3f08b959** (2026-11-02, cwd `/tmp/shop-work/abe94d/shop-admin`, the same
  订单导出 Full run, branch `main`): the sole envelope is `Message Type: NEW_TASK` / `Task name: /root/specify` /
  blank `Payload:`, followed by two real `exec` calls — `cat .agents/skills/speckit-specify/SKILL.md;
  cat .specify/templates/spec-template.md; cat .specify/feature.json` (the missing pointer makes the whole
  `;`-chain report `exit_code 1` even though the earlier `cat`s printed), then `artifact-paths.md` +
  `spec.config.yaml` + `.specify/memory/constitution.md` + `ls .specify` + `git branch --show-current`.
  Same `/root/<state>` slug convention; the usable evidence is entirely in the tool calls
  ([[shop-admin-specflow-repo]]).

- **01a19a26-4bbd-7d43-921f-b3c8b60a5f5e** (2026-11-02, cwd `/tmp/shop-work/31c103/shop-admin`,
  same 订单导出 Full run): `Task name: /root/specify`, blank `Payload:`, then the identical six-call
  opening (`cat speckit-specify/SKILL.md + agents/specify.toml + spec-template.md`, then
  `artifact-paths.md + spec.config.yaml + constitution.md + feature.json` with `ls extensions.yml presets`
  and `git branch --show-current`, `rg --files .specify`, `resolve-template.sh --help`,
  `resolve-template.sh spec-template --json`) and the export ends there. Same shape recurs across several
  exports of this one run, so treat a `/root/specify` envelope as the normal image of the SDD `specify`
  state, not as a dead delegation. Note the PRD arrived in that session as an inherited `USER:` block even
  though the payload was blank — a spawned Codex session forks the parent conversation.

### Variant: envelope-only replies, but real tool calls

Near-identical sessions exist that are **not** empty. Session
`01a199f0-9782-7961-9629-2227f1a3c2ac` (same day, same story 16537, worktree
`/Users/mac/.factory/ws/16537-r2`, `Task name: /root/s3_display_trace`) shows the same envelope
oddity — every agent message is only `Message Type: MESSAGE` / `Sender: /root` / blank
`Payload:` — yet between them sit real `TOOL CALL exec` blocks with real `TOOL RESULT`s
(`cat …/typescript-best-practices/SKILL.md`, `rg -n 'S3|hostname|endpoint|region|extTableCell'
apps/console/src/views/dataSource/list`, `nl -ba … | sed -n '160,185p;360,440p'`). So:

- Judge a turn by its **tool calls and results**, not by the emptiness of the agent's prose
  envelope. The natural-language plan is lost (the runtime ships it as a separate/encrypted
  reply), but the analysis commands and their output survive and are usable evidence.
- Task-name slugs differ per session (`s3_plan_check` vs `s3_display_trace`) even for the same
  request, so don't use the slug to match a session to a memory file — use the session id and
  worktree (here `/Users/mac/.factory/ws/16537-r2` vs `ws/16537-r1`). See
  [[dt-insight-console-datasource-list-link-info]] for what that r2 session actually read.

## Recovery when you meet one

- Re-issue the request and state plainly: answer inline in this turn, no delegation, no file
  edits. A plan-only turn must not run `dtis`, `git`, or the dev server either — the
  deliverable is text.
- If a sub-agent turn did run, read its transcript/preview output directly rather than the
  parent's `NEW_TASK` stub.
- Related harness oddities: [[harness-hook-probe-sessions]] (prompts that only try to make the
  agent quote its injected context) and [[agent-hook-probe-sessions]].

## Plan-only prompt pattern (dt-insight workflow)

`只回复你的修复方案（改哪些文件、怎么改、为什么），不要修改任何文件` is a common card-review
request: the expected answer is a file-by-file fix plan with rationale, no edits, no commit,
no MR. Verification evidence available in such a turn is source reading only, so label any
behaviour claim as 推断 rather than 实际验证过 (see [[dt-insight-workflow-conventions]]).
