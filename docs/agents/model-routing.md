# 模型路由

本文只记录开发派发。Yume 运行时调用的模型是另一套配置。

模型 id 与 options 分开写。不要把 options 接到模型 id 后面，组成一个 slug。Pi 的模型 id 自带 `cursor/` 前缀，该前缀属于 id。

## 预算

预算名 `medium` 使用选项值 `high`。这个对应关系不更换模型。

## 角色

| 工作 | 提供方 | 模型 id | options |
| --- | --- | --- | --- |
| 资料提取、重复操作 | Pi | `cursor/deepseek-v41-flash-1017` | `thinking`: `high` |
| 代码调查、实现、修复、测试 | Cursor | `grok-4.7` | `reasoning_effort`: `high`，`fastMode`: `true` |
| 审查、补充验证 | Cursor | `grok-4.6` | `effort`: `high`，`fastMode`: `true` |
| 架构判断、冲突判断、复杂根因 | Codex | `gpt-6.1-sol` | `reasoningEffort`: `high` |
| 文案、文档初稿、Issue、PR、汇报 | Pi | `magpie/cline/cline-pass/muse-spark-1.3-contributor` | `thinking`: `high` |

## 派发规则

普通任务使用上表里该工作对应的模型。不要自动升级模型。

模型不可用时，报告该模型不可用。不要自行替换。

后台 T3 `delegate_task` 由事件唤醒。不要轮询。

不要为这次派发自动新建顶层对话。

主 Agent 验收派发结果。

开发派发没有月度计费硬限额。
