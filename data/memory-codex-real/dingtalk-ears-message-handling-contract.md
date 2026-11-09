---
name: dingtalk-ears-message-handling-contract
description: The input JSON the dingtalk-ears agent receives per batch of DingTalk group messages and the strict output JSON it must produce (summary/needs_reply/draft/todos). Read when changing or debugging summarization behavior.
metadata: observed in codex session 01a18709 (2026-10-29), UED group batch
---

# 消息处理输入/输出契约

每批消息的输入是一个 JSON 对象（钉钉群监听器投递），字段：

```json
{"new_messages": [{"key": "<conversation_id>:<message_id>",
                   "message_id": "...", "conversation_id": "cid...==",
                   "sender": "霜序💛", "sender_id": "Dt...",
                   "time": "2026-10-29 17:36:31", "text": "...",
                   "sources": ["ued"], "quoted_message": null}],
 "confirmed_sent_replies": [],
 "context": {"current_user": "Shane", "watched_group": "UED"}}
```

- `key` 形如 `cidckswOu36dnZIWuAZghchOg==:msg8JTkIfpS+vHgPvaI3LKLzw==`（`conversation_id` 冒号 `message_id`）。
- `sources` 是消息来源标签（例：`ued`）；`quoted_message` 为被引用消息或 `null`。
- `context.current_user` / `context.watched_group` 标识本人与监听的群。
- `confirmed_sent_replies` 回灌已确认发送的回复，用于去重/避免重复回复。

输出必须是一个 JSON 对象，四个字段：

```json
{"summary": "…", "needs_reply": false, "draft": "", "todos": []}
```

- `summary`：中文，说明谁在哪个群、何时、发了什么，点出关键链接与行动项，并明确标注未确认的部分（例："你是否为相关 owner 未确认"）。
- `needs_reply`：`@所有人` 的广播通知类消息判为 `false`，`draft` 留空。
- `todos`：通知里没有落到本人的明确任务时为空数组。
- `summary` 内可直接嵌入原文链接（yuque 文档、zentao 需求、issue 页）便于本人点击。

同主题文件：[[dingtalk-ears-reply-output-contract]]（含私聊与日历助手的对照样例）、实例见 [[antd-rc-7-upgrade-notice]]。
