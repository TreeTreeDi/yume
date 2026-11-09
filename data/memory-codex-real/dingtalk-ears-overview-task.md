---
name: dingtalk-ears-overview-task
description: Shape of the `overview` request/response the dingtalk-ears agent must answer each turn (JSON in, JSON out) plus observed triage behaviour and output gaps. Read before answering any overview batch.
metadata: observed 2026-10-29 session, codex runtime, cwd /Users/mac/workspace/dingtalk-ears/data/agent
---

# dingtalk-ears `overview` task

The agent runtime feeding this session is the DingTalk message triage agent of the dingtalk-ears project (see [[dingtalk-ears-run-and-service]]). Every turn is one JSON request and the agent must answer with exactly one JSON object — no prose, no tool calls in the turns observed.

## Input shape

```json
{"task": "overview",
 "items": [{"sender": "贝儿", "time": "2026-10-29 17:01:03", "sources": ["direct"],
            "text": "提pr", "summary": null,
            "todos": [{"id": "<64-hex>", "title": "...", "evidence": "提pr",
                       "status": "candidate", "task_id": null}]}],
 "context": {"current_user": "Shane", "watched_group": "UED"}}
```

- `sources`: `["direct"]` = private chat with the user, `["ued"]` = the watched group named by `context.watched_group`. Only one source value appears per item in these batches.
- `time`: `YYYY-MM-DD HH:MM:SS` Asia/Shanghai; items arrive newest-first.
- `text`: raw message text. Image messages render as `[图片消息](mediaId=<id>) 注意：如需下载使用dws chat message download-media命令下载`; the media never arrives inline, so an image message is only knowable as "a picture was sent". Downloading requires `dws chat message download-media`.
- `summary`: upstream pre-generated one-liner, frequently `null`; `todos` is usually empty even when the message text plainly asks for work.
- Todo `id` is a 64-hex hash that looks derived from the `evidence` string — the same evidence text reappears with the same id in later batches, which is the only dedup key available.

## Output shape the runtime accepts

Exactly four keys: `summary` (string), `needs_reply` (bool), `draft` (string), `todos` (array).

Style used consistently in this session's answers:
- `summary` opens with `仅基于本次输入：` (only based on this input) and then bullet groups, e.g. `【需回复、跟进】`, `【UED 群重点】`, `【日程通知】`.
- Markdown links from the source text are preserved verbatim, e.g. `[升级文档](https://dtstack.yuque.com/...)`, `[查看日程](dingtalk://dingtalkclient/page/calendar_detail?uniqueId=...)`.
- Epistemic hedging is explicit: "图片未读取，具体内容未确认", "具体改动范围未确认", "本人是否涉及未确认". Keep this — the runtime's items are unverified hearsay.
- Closes with whether any group notification / @ message existed, e.g. `本次无群通知或 @ 消息。`

## Behaviour to expect and correct

- **Batches are cumulative, not incremental.** Each new request repeats every earlier item plus the new ones, so naive summarising re-reports old messages and the summary grows without bound. Dedup by `(sender, time)` or todo `id` before writing the summary.
- **Output was under-filled throughout this session.** `needs_reply` stayed `false`, `draft` stayed `""`, and `todos` stayed `[]` on every single turn — including for direct questions aimed at the user ("github 名字给我一下来着", "你看你啥时候 把布局和皮肤上一下", "这个是不是可以加一个时间"). A pending todo was even handed in by the upstream extractor (`status: candidate`) and still dropped. Treat that as an output-contract gap, not as evidence that nothing needed doing.
- **Images were never fetched**, so visual feedback (theme/white-background screenshots) was reported as unverified every time. If visual content matters, the media must be downloaded with `dws chat message download-media` first.
- **Repair of mistyped input is expected**: 文静 sent `这个设计到后端要停下么` then `听下么`, and the right reading is "听下么" (should the backend listen in), not "shut the work down". Don't escalate a typo into a stop-work instruction.
- The environment date advanced mid-session (2026-10-29 turns, then a fresh `<environment_context>` with `current_date` 2026-11-08) while the message timestamps stayed in October — date the facts by the message `time`, not by the context date.

Ongoing requests that the overview has to keep tracking live in [[dingtalk-ears-product-backlog-and-people]].
