---
name: dingtalk-ears-reply-output-contract
description: Shape of the DingTalk inbound-message payload the agent receives and the JSON digest/draft it must return (summary, needs_reply, draft, todos). Read when handling or debugging message digests.
metadata:
  source: codex session 01a186cd, 2026-10-29 (input payload + actual agent output)
---

# dingtalk-ears: 消息输入与回复输出的数据形状

Consolidates the former reply-contract calibration batch (2026-11-09); read this file instead of that stub.

The backend feeds the agent a single JSON blob and expects a single JSON object back (no prose). Contract code: `backend/ai_contract.py`, prompts in `backend/prompts.py` (see [[dingtalk-ears-code-conventions]]).

## Input payload (verified 2026-10-29)

```json
{"new_messages": [{"key": "...", "message_id": "...", "conversation_id": "...",
  "sender": "琉易", "sender_id": "Dld...", "time": "2026-10-29 16:35:47",
  "text": "来吃东西", "sources": ["direct"], "quoted_message": null}],
 "confirmed_sent_replies": [], "context": {"current_user": "Shane", "watched_group": "UED"}}
```

- `new_messages[]` fields: `key`, `message_id`, `conversation_id`, `sender`, `sender_id`, `time` (local `YYYY-MM-DD HH:MM:SS`, Asia/Shanghai), `text`, `sources`, `quoted_message` (null when not a quote-reply).
- `sources` carries the channel: `["direct"]` = private/direct chat; a group message would list the group as source. Direct messages are processed too, not only `watched_group` traffic.
- `confirmed_sent_replies` lists replies the user has actually approved/sent — only these count as sent.
- `context.current_user` is the account owner (here `Shane`); `context.watched_group` the group name (here `UED`).

Group-message payload (verified 2026-10-29, session 01a18709, UED 群公告):

```json
{"new_messages": [{"key": "cidckswOu36dnZIWuAZghchOg==:msg8JTkIfpS+vHgPvaI3LKLzw==",
  "message_id": "msg8JTkIfpS+vHgPvaI3LKLzw==", "conversation_id": "cidckswOu36dnZIWuAZghchOg==",
  "sender": "霜序💛", "sender_id": "DtJAvgfklHnU1JCYiSRoM8V3dhmxU2cbh3",
  "time": "2026-10-29 17:36:31", "text": "@所有人 …", "sources": ["ued"], "quoted_message": null}],
 "confirmed_sent_replies": [], "context": {"current_user": "Shane", "watched_group": "UED"}}
```

- `key` = `<conversation_id>:<message_id>`; group contacts have `sender_id` starting `Dt…`, direct contacts `Dl…`.
- `sources` for group traffic is the group tag (`["ued"]`), not the group display name.

## Output object (verified 2026-10-29)

Keys observed in a real reply: `summary`, `needs_reply`, `draft`, `todos`.

```json
{"summary":"琉易于 2026-10-29 16:35:47 私聊邀你吃东西，建议简短回应。","needs_reply":true,"draft":"在哪儿呀？","todos":[]}
```

- `summary`: one Chinese sentence naming sender, time, channel (私聊 vs 群) and the gist, plus a suggestion.
- `needs_reply`: boolean.
- `draft`: suggested reply text in Chinese, short and conversational; **empty string `""`** when no reply is needed (verified on a group broadcast, below).
- `todos`: array of extracted action items, `[]` when none. A broadcast that assigns work to "各子产品的 owner" without naming the owner yields `[]`.

Broadcast (`@所有人`) case, verified 2026-10-29 session 01a18709 for the [[antd-rc-7-upgrade-notice]]: output was `{"summary": "...", "needs_reply": false, "draft": "", "todos": []}`. The summary named sender, group, exact timestamp, the notice's key facts, embedded the three source links verbatim, and explicitly flagged the unconfirmed part ("你是否为相关 owner 未确认").

Drafts are proposals only — nothing is sent without the owner's confirmation (see [[dingtalk-ears-run-and-service]]).

## Calendar-bot calibration (merged from the former reply-contract file, 2026-10-29 日历助手 event in UED)

Input is the same JSON envelope. A 日历助手 notification of the form "「<schedule name>」新增参与人提醒 / <person> 将 <person> 添加到日程" plus a `dingtalk://dingtalkclient/page/calendar_detail?uniqueId=...` deep link carries no schedule time, so it is summarized (who added whom to which schedule, message timestamp, explicit statement that no time was given) with `needs_reply: false`, empty `draft`, empty `todos`, and a markdown link to the deep link. The summary names the consequence ("no reply needed") rather than just restating the text.

## Direct (private) chats are triaged too

`sources: ["direct"]` means the batch came from a **1:1 private conversation**, not a group; those still get summarized and can need a reply. Calibration seen 2026-10-29: `琉易` (private, 16:35:47) sent only `来吃东西`; the agent answered with `needs_reply: true`, draft `在哪儿呀？`, and empty `todos` — i.e. a casual social invite gets one short conversational Chinese draft, and the summary names the channel (私聊) and adds advice ("建议简短回应") instead of restating the text.

Triage calibration for this case: a private chat, casual invite ("来吃东西") ⇒ `needs_reply: true` with a short conversational Chinese draft, `todos: []`, and a summary that names channel + sender + time and adds a suggestion. More calibration examples and the group case: [[dingtalk-ears-message-digest-contract]], [[dingtalk-ears-message-handling-contract]]. The `todos[]` element fields (`title`, `evidence`, `message_key`) are documented in [[dingtalk-ears-message-digest-contract]]; this transcript's batch had none.
