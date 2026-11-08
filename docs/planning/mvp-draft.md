# 本地记忆 MVP 草案

状态为提案，尚未定案。本文不授权写实现，也不授权安装依赖。

## 要解决的问题

本地 Agent 会留下多次会话。下一次开始时，如果只能重读原始记录，就分不清哪些内容已经整理过。Yume 准备在本机用 TypeScript 与 Mastra 保存长期记忆，同时保留原始 session。

## 三个角色

Lead 写出受约束的结构化计划，并把计划交给可信执行器。Lead 不运行模型写下的任意代码。

Analyzer 每次只处理一个 session，并独立输出候选。一次分析不改写另一次分析的输出。

Organizer 集中写入记忆。Analyzer 不直接写记忆库。

## 第一版要证明的事

用 3 个本地模拟 session 证明下面几件事。

- 这些 session 可以并行分析。
- 每条记忆都能追溯到来源。
- 重复内容可以合并。
- 互相冲突的内容都保留。这一版不自动裁决。
- 新一轮先读取已有记忆，再处理增量。

## 这一版不做

不做 Pi 同步，不做 Codex 同步，不做定时运行，不做界面，不做分布式部署。Wiki 的存放位置还没有确认，所以不建 wiki。

## 还没有结论的问题

下面几项仍待研究。它们还不是选定的设计。

- 动态计划如何生成，以及已经开始的计划能否修改。
- 失败之后如何恢复。
- 写入如何做到原子。
- 来源记到什么程度才够。
- 如何判断一条事实的质量。
- 增量更新如何验收。

## 上游只作独立参考

不继承 [claude-cookbooks](https://github.com/anthropics/claude-cookbooks) 的 Git 历史，也不复制其中的代码。

固定参考提交是 [`ce8b2629efe8b24048b127b4c79af1e9cbab93d4`](https://github.com/anthropics/claude-cookbooks/commit/ce8b2629efe8b24048b127b4c79af1e9cbab93d4)。GitHub API 显示该提交的说明是去掉一条重复的 agent security review 登记，时间是 2026-11-04。这里只把它当作仓库快照指针。

公开说明见 [Dreaming with a dynamic workflow](https://platform.claude.com/cookbook/managed-agents-cma-dreaming-with-a-dynamic-workflow)。那篇 cookbook 用动态工作流阅读已结束的 session，并把结果整理成后续会话可以读取的记忆。本草案选择本地 TypeScript 与 Mastra，不采用该 cookbook 的托管运行时、定时触发和 wiki 形态。

## Mastra 资料核查与未实测

2026-11-08 对照了 Mastra 公开文档，以及固定源码快照 [`e3cac09ebd2f3009373cf2d42fb7d45821224fe1`](https://github.com/mastra-ai/mastra/tree/e3cac09ebd2f3009373cf2d42fb7d45821224fe1)。该快照的 core 版本标记是 `1.83.0-alpha.1`。核查使用了这个源码位置。版本仍未选定，当时的 npm stable 也尚未核验。这次没有安装包，也没有跑试验。

JSON Dynamic Workflows 可以登记一张新的受约束执行图，供新的 run 使用。替换同一 id 的定义只影响新 run。已经开始的 run 继续使用原来的图。官方将该能力标为 beta。说明见 [Dynamic workflows](https://mastra.ai/docs/workflows/dynamic-workflows)。

进行中的图能否改写、退出后能恢复到哪一步、外部写入是否重复、事实质量如何判定、增量记忆如何验收，都还没有实测。这些事项仍列在上一节。
