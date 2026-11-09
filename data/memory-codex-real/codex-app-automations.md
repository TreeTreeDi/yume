---
name: codex-app-automations
description: How to create/manage recurring Codex app automations (automation_update tool shape, heartbeat vs cron, RRULE, on-disk automation.toml) and how that differs from ChatGPT scheduled tasks; read before setting up any recurring task, reminder or monitor.
metadata: verified 2026-09-29 → 2026-11-03 in Codex CLI session 01a0eb05
---

# Codex app automations

## Pick the right mechanism

- **ChatGPT scheduled tasks** (the `Scheduled` page) run in ChatGPT, one-time or recurring, plus event-triggered (webhook) tasks that run in ChatGPT Work and react to Gmail / Slack / GitHub activity. They help with reminders, daily updates, monitoring. Limits at the time of reading (help.openai.com article 10291617, fetched 2026-09-29, may be stale): active tasks 3 Free/Go, 5 Plus, 10 Business/Edu, 15 Pro/Enterprise; Free can schedule at most once per day with flexible windows (morning/afternoon/night); paid plans allow hourly and exact times; event-triggered tasks up to 30/hour and 720/day, not on Free/Go or FedRAMP.
- **Codex automations** run in Codex (local execution) and are a separate feature — use them whenever the job needs local tools, local CLI credentials, or a local filesystem (e.g. `glab` with an on-disk GitLab token). Codex history is separate from ChatGPT history; Codex does not appear on web.
- Rule of thumb: "needs my machine / my CLI login" → Codex automation; "notify me from cloud connectors" → ChatGPT scheduled task.

## automation_update tool

Tool: `mcp__codex_app__automation_update`, from plugin `codex-app-tools` (find it with `ALL_TOOLS.filter(x => x.name.includes("automation_update"))`). Modes: `create`, `update`, `view`, `delete` (plus `suggested_create`). Kinds: `cron`, `heartbeat`.

- **heartbeat** = proactive follow-up attached to the current local thread; it is the documented default for recurring requests. `create` fails with `automation_update received invalid arguments: targetThreadId: Missing targetThreadId or destination=thread.` unless you pass `destination: "thread"` (or `targetThreadId`). Passing `destination: "thread"` and no `targetThreadId` works.
- **cron** = standalone local job against one project; needs `executionEnvironment: "local"`, `model`, `reasoningEffort`, `projectId` (from `list_projects`) or `null`, plus `rrule` and `status`. The tool description says not to create a cron automation as a workaround for a thread heartbeat.
- Both need `name`, `prompt`, `rrule`, `status: "ACTIVE" | "PAUSED"`. For updates pass the resolved `id` and the full set of fields (preserve existing fields unless the change is requested). `view` renders the automation card in the app and returns no data.
- Other tool rules from its description: never hand-write raw automation directives or show RRULE strings to the user; inspect `$CODEX_HOME/automations/*/automation.toml` to find an existing automation id by name/prompt and prefer updating over creating a duplicate; the prompt is user-visible and is replayed verbatim by the scheduler, so write clear prose; notification preferences stay out of the prompt — "mute" = `notificationPolicy: "failed_runs_only"`, "unmute" = `notificationPolicy: null`.

## On-disk layout

`$CODEX_HOME/automations/<id>/automation.toml` (here `/Users/mac/.codex/automations/`), with an optional sibling `memory.md`. Fields seen: `version`, `id`, `kind`, `name`, `prompt`, `status`, `rrule`, `model`, `reasoning_effort`, `execution_environment`, `target = { type = "projectless" }`, `cwds`, `created_at`/`updated_at` (epoch ms). Two pre-existing, both PAUSED and projectless with `cwds = ["~"]`: `automation` (每日简报, `RRULE:FREQ=WEEKLY;BYHOUR=8;BYMINUTE=0;BYDAY=MO,TU,WE,TH,FR`, model `gpt-5.6-sol`, effort medium) and `automation-2` (每周回顾, Friday 16:00, `gemini-3.8-flash-high`, effort high).

## How a heartbeat run arrives

The scheduler sends a normal user turn: `<heartbeat><automation_id>…</automation_id><current_time_iso>…</current_time_iso><instructions>…prompt verbatim…</instructions></heartbeat>` followed by the environment context. The agent runs the task, then answers with a heartbeat block of its own:
`<heartbeat><automation_id>…</automation_id><decision>DONT_NOTIFY</decision><message>…</message></heartbeat>` when there is nothing to report. A `BYHOUR=17` schedule does not mean one heartbeat per day at 17:00: the usual run arrives at ~09:0xZ (17:0x Beijing), but extra heartbeats also arrive at other times (e.g. 2026-10-14 at 02:37Z and 10:02Z = 10:37 and 18:02 Beijing; 2026-10-26 at 03:33Z and 09:04Z), so do not treat `current_time_iso` as proof of the scheduled slot, and be ready to run twice in a day.

## Known trap when creating one

A first `create` attempt omitted `destination`; the failure text names only `targetThreadId` and no other field, so add `destination: "thread"` rather than hunting for a thread id. Verified creation returned `{"automationId":"gitlab-mr-review","mode":"create","status":"ACTIVE"}`.

Related: [[dt-insight-studio-gitlab-mr-review]] (the concrete daily MR automation built this way), [[agent-delegation-policy]].
