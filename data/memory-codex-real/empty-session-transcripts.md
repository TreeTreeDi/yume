---
name: empty-session-transcripts
description: How to recognize low-value Codex session exports in the transcript corpus — header-only files with zero events, and single-trivial-turn sessions ("reply OK only") — and why they yield no memory facts.
metadata: observed in batch-02, session 01a199d9 (codex), 2026-11-02; plus trivial-turn sessions 01a19a0f, 01a19a10, 01a19a21 (all /private/tmp, 2026-11-02 02:20–02:41Z)
---

# Header-only (event-less) session transcripts

Some exported Codex session files contain only the export header and the primary-thread header, with **no `USER:`, `AGENT:`, `TOOL CALL` or `TOOL RESULT` blocks at all**. Shape:

```
SESSION <id>: <cwd>
source: codex; created <ISO timestamp>

=== primary thread <id>: codex ===
```

Example: session `01a199d9-f66f-72f2-bea6-3c5cd5fe1980`, cwd `/Users/mac/workspace/firstmate-factory`, created `2026-11-02T01:22:40.922Z` — the file ends immediately after the thread header. The session was opened (or the rollout recorded) but no turn, tool call or model output was ever written.

Handling when distilling such a file:

- Nothing to record: no user messages, no commands run, no files read, no verification evidence. Do not invent project facts from the cwd name alone — `/Users/mac/workspace/firstmate-factory` appearing in a session header is not evidence about any project's conventions.
- Do not treat it as a [[harness-hook-probe-sessions]] probe: probes contain a visible user turn with a context-disclosure request; an empty transcript has no text to classify.
- Existing memory claims are neither supported nor contradicted by it — leave them as they are (a different transcript may support them).
- One read of the file is enough to establish this; the whole file is a handful of lines, so check the tail/end once and move on instead of re-paginating.

## Single-trivial-turn ("ping") sessions

The next lowest-value shape still has events: the injected `# AGENTS.md instructions` block + `<environment_context>` (see [[agent-delegation-policy]]), then exactly one user turn asking for a minimal acknowledgement and one agent reply. No tool calls, no files touched, no project context.

Examples, all cwd `/private/tmp`, 2026-11-02, minutes apart:

- `01a19a0f-1916-7e01-86dc-1e1952961c7e`, created `2026-11-02T02:20:45.296Z`: `USER: reply OK only` → `AGENT: OK`.
- `01a19a10-7dcd-7ce2-94a1-4e24cc2f1a0d`, created `2026-11-02T02:22:14Z`: `USER: reply OK only` → `AGENT: OK`.
- `01a19a21-f140-7cf3-8fe8-10ef005884a1`, created `2026-11-02T02:41:19.519Z`: the AGENTS.md 按需委派 block followed by the lowercase variant `reply only: ok` → agent `ok`.

The near-identical prompt recurs within the same batch, which is the signature of an automated endpoint/smoke-test run rather than a person asking for help.

What such a session does and does not yield:

- It confirms the runtime plumbing works (instructions and environment block get injected, the model answers) and it re-verifies the injected text: each matched [[agent-delegation-policy]]'s recorded 按需委派 bullets word for word, and each showed `permission_profile type="disabled"` with `file_system: unrestricted`, with the workspace root `/private/tmp` recorded only as metadata.
- It yields **no** project facts: no files read, no commands, no evidence about any repo. Do not infer anything from the cwd beyond the environment block's own fields — `/private/tmp` is not a workspace, and the AGENTS.md block is runtime-wide rather than repo-specific.
- It is not a [[harness-hook-probe-sessions]] probe — that pattern asks the agent to quote or disclose its injected context; "reply OK only" / "reply only: ok" asks for no content at all. Endpoint/app smoke tests in this corpus look like this, so expect several per batch and spend no second pass on them.
- The only durable by-products are cross-checks on existing files — here, that the delegation policy is injected even outside any repo, and the permission-profile variant above. Apply those to the relevant file, leave everything else alone.
- One pass through the file is enough; it is under a few kilobytes.

The header fields themselves (`SESSION` id, `source:` line, thread header) are export metadata, not session facts, per the transcript format.
