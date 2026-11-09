---
name: dingtalk-ears-message-triage
description: The JSON request/response contract of the dingtalk-ears message-triage agent (new_messages in, summary/needs_reply/draft/todos out) plus how it should handle ambiguous or typo'd Chinese messages. Read when inspecting or changing triage behavior.
metadata:
  verified: 2026-10-29 (observed request/response pairs)
---

# dingtalk-ears 消息分诊 Agent 的输入输出契约

The backend feeds the agent a JSON object; the agent answers with a JSON object. See [[dingtalk-ears-code-conventions]] for where prompts and the contract code live.

## Input shape (one turn = one batch)

```json
{
  "new_messages": [
    {
      "key": "<conversation_id>:<message_id>",
      "message_id": "msg...==",
      "conversation_id": "cid...=",
      "sender": "文静",
      "sender_id": "D1T8...",
      "time": "2026-10-29 17:41:35",
      "text": "这个时间拉上知章一起 问下她时间哈",
      "sources": ["direct"],
      "quoted_message": null
    }
  ],
  "confirmed_sent_replies": [],
  "context": { "current_user": "Shane", "watched_group": "UED" }
}
```

- `key` is the per-message identifier (`<conversation_id>:<message_id>`); todos quote that exact string, not the bare `message_id`.
- `sources: ["direct"]` = direct message; `confirmed_sent_replies` lists replies the user has already confirmed sending, so drafts must not re-propose them.
- `context.current_user` is the account owner (e.g. `Shane`); `context.watched_group` is the monitored DingTalk group (e.g. `UED`).
- Multiple messages may arrive in one batch (e.g. two messages with 17:42:56 and 17:43:06) — treat them as one conversational context.
- `quoted_message` is null here but is the field that would carry a replied-to message.

## Output shape

```json
{
  "summary": "<one-paragraph Chinese recap with sender and time>",
  "needs_reply": true,
  "draft": "<Chinese reply in a natural, deferential tone>",
  "todos": [
    { "title": "...", "evidence": "<verbatim message text>", "message_key": "<key value>" }
  ]
}
```

- `summary` names the sender and the timestamp and states explicitly what is still unconfirmed (e.g. "具体时间及活动未确认").
- `evidence` in a todo must be the original message text, verbatim.
- `todos` may be an empty array when the message needs clarification rather than an action.
- Drafts are Chinese, short, and ask for the missing detail instead of inventing it; nothing is sent automatically (see [[dingtalk-ears-run-and-service]] — replies go through the owner).

## Handling ambiguity / ASR-style typos

Chinese chat text in this pipeline can contain homophone or typo noise; treat the literal reading as suspect and reconcile with surrounding messages.

Observed case: "这个设计到后端要停下么" ("do we stop when the design reaches backend") followed 4 s later by "听下么" and then "OK". The agent judged 停下 as a likely typo of 听下 ("do we let backend listen in too"), kept the earlier interpretation in the summary while flagging it as unconfirmed, and drafted a yes/no clarifying question rather than committing to an action. A trailing "OK" whose referent is unclear should be recorded as ambiguous, not as approval of a specific action.

Overlapping notes from other sessions: [[dingtalk-ears-reply-output-contract]], [[dingtalk-ears-message-handling-contract]], [[dingtalk-ears-message-digest-contract]] (same contract, different observed batches; extra facts here are the todo `evidence`/`message_key` fields and the typo-ambiguity case).

Related: [[dingtalk-ears-code-conventions]], [[dingtalk-ears-run-and-service]]
