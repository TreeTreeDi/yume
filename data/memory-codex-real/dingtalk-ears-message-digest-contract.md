---
name: dingtalk-ears-message-digest-contract
description: The digest JSON round-trip (new_messages in → summary/needs_reply/draft/todos out) with emphasis on image messages — `[图片消息](mediaId=...)` text, downloading via `dws chat message download-media`, and why the agent cannot see a picture without it
metadata: observed 2026-10-29 (codex session 01a186e9, direct chat with 长路)
---

# dingtalk-ears — digest contract and image handling

Each turn the backend hands the agent one JSON batch and expects one JSON object back, no prose. Schema code: `backend/ai_contract.py`; prompts: `backend/prompts.py` ([[dingtalk-ears-code-conventions]]). Full field-by-field notes live in [[dingtalk-ears-message-triage]], [[dingtalk-ears-message-handling-contract]] and [[dingtalk-ears-reply-output-contract]]; this file covers the shape and the image path specifically.

## Round trip

Input: `{"new_messages":[…], "confirmed_sent_replies":[…], "context":{"current_user","watched_group"}}`, each message carrying `key`, `message_id`, `conversation_id`, `sender`, `sender_id`, `time`, `text`, `sources`, `quoted_message`.

Output: `{"summary","needs_reply","draft","todos":[{"title","evidence","message_key"}]}`.

- `key` is `<conversation_id>:<message_id>` (both base64-ish, ending in `=`); copy it verbatim into `todos[].message_key`.
- `time` is local `YYYY-MM-DD HH:MM:SS` (Asia/Shanghai) even though the session header is UTC ISO.
- `sources: ["direct"]` means a private/direct chat, not the watched group; direct traffic is processed too. The observed owner is `Shane` and the watched group is `UED`.

## Image messages (the part worth grepping for)

A picture arrives as plain text, not a file the model can see:

```
[图片消息](mediaId=$iwEcAqNwbmcDAQTR…AXFhcnE) 注意：如需下载使用dws chat message download-media命令下载
```

The `mediaId` is useless until downloaded. The transcript's own hint names the tool:

```sh
dws chat message download-media
```

Until that runs, the honest summary says the image was not read ("图片未读取，内容…尚未确认") and `needs_reply` stays false if the picture is all that arrived.

Process observation (2026-10-29, 长路 direct chat): an image at 17:06:22 followed 6 s later by "这个是不是可以加一个时间" and 5 s later "年月日时分". The agent never downloaded the media, inferred nothing, set `needs_reply: true` and drafted "你是指截图里的哪个位置加时间？…" plus a clarifying todo. Downloading the media first usually answers "which spot in the screenshot", making that round trip unnecessary — and the follow-up pair shows the real requirement is a **timestamp display formatted 年月日时分** (date + hour + minute) somewhere in a UI, which is a feature request, not a message needing a reply.

Related: [[dingtalk-ears-project-overview]], [[dingtalk-ears-run-and-service]].
