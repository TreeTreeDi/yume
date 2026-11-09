# 自动 Retro（Session 反思与记忆归纳）触发与执行机制调研报告

> 对应 Issue: #17  
> 调研目标：调研本地 Agent 长期记忆系统中自动 Retro（会话反思、记忆提炼与证据落库）的主流架构与工业界实践，分析何时触发、如何编排、如何保证幂等与故障恢复，并输出适合 Yume 本地单机环境的落地架构方案。

---

## 1. 调研背景与核心问题

在本地 Coding Agent 长期记忆系统（如 Yume）中，**Retro（Retrospective / 会话反思与归纳）** 是将非结构化、充满噪声的原始多轮对话记录（Transcript / Session Log）转化为高质量、可检索、结构化的长期记忆（Domain Fact / Architecture Decision / User Preference / Anti-pattern）的核心管线。

如果仅依赖 Agent 运行时的临时读取，原始记录会带来海量无用上下文、注意力分散和高昂的 Token 开销。因此，必须将“记忆的提炼与组织”从“前台任务执行”中解耦，在后台异步执行自动 Retro。

本调研聚焦于三大核心问题：
1. **触发机制（Triggering）**：系统在什么时机、通过何种信号启动反思？如何兼顾实时性与低开销？
2. **执行编排（Orchestration）**：如何将原始 Transcript 处理为规范记忆？业界成熟框架（Anthropic Dreaming、MemGPT/Letta、Reflexion 等）是如何分工的？
3. **状态、幂等与故障恢复（State, Idempotency & Fault Recovery）**：当进程异常退出、网络超时或并发触发时，如何避免重复抽取产生事实冗余？如何实现断点续跑与游标推进？

---

## 2. 业界主流自动 Retro 触发模式分析与对比

在本地单机与开发机环境下，自动 Retro 的触发源主要有以下四种模式：

### 2.1 生命周期 Hook 驱动（Lifecycle Exit / Shutdown Hook）
- **机制原理**：在 CLI 退出、进程捕获 `SIGINT` / `beforeExit`、或者 Harness 发送 `session_end` / `conversation_close` 事件时触发 Retro 钩子。
- **优点**：
  - 任务边界极其清晰：会话结束意味着本轮对话上下文已完整闭环，提取意图与最终结论最准确。
  - 零轮询开销：平时完全不消耗系统 CPU 与后台资源。
- **缺点与边界**：
  - **阻塞退出 vs 孤儿进程**：若在 `exit` hook 中同步运行耗时的 LLM 归纳，会导致终端假死；若转入 detach 后台守护进程，可能被 OS 在终端关闭时杀掉或导致无法回收。
  - **异常退出遗漏**：遭遇 `SIGKILL`、断电或终端强制关闭窗口时，Hook 不会被触发，导致未落盘会话滞留。

### 2.2 版本控制驱动（Git Hook 驱动）
- **机制原理**：利用本地代码仓库的 Git 钩子（如 `post-commit`、`pre-push`、`post-checkout` 等）作为触发点。
- **优点**：
  - 强关联工程活动：Git commit 代表一次明确的功能变更或修复交付，此时伴随的 Agent 决策、ADR 与踩坑经验最值得记录。
  - 自然的增量切片：可以结合 `git diff` 辅助校验记忆提炼的真实证据。
- **缺点与边界**：
  - **覆盖盲区**：纯方案调研、代码阅读、架构咨询或最终未提交代码的会话不会触发 Git commit，导致大量智力资产丢失。
  - **团队侵入性**：在共享仓库中部署全局 Git Hook 可能污染开发者原有的工作流。

### 2.3 守护进程与空闲驱动（Daemon / Idle / System Sleep-Wake）
- **机制原理**：类似 MemGPT / Letta 的 Sleep-and-Dream 守护线程，或基于 OS 空闲状态（用户无键鼠输入、CPU 负载低于阈值一定时长）在夜间或空闲期自动启动。
- **优点**：
  - 不打扰前台开发：利用开发者思考或离开机器的算力窗口执行重度 LLM 提炼。
  - 具备全局批处理能力：能同时拉取过去数小时的多个会话进行跨会话关联消解。
- **缺点与边界**：
  - **资源抢占与续航敏感**：在笔记本移动办公场景下，后台唤醒 LLM 容易导致风扇骤转、严重发热与耗电。
  - **实时性滞后**：提炼的记忆不能立刻反馈给几分钟后的下一个相连会话。

### 2.4 阈值驱动（Threshold / Watermark-based Batching）
- **机制原理**：设定多维物理阈值，当满足以下任一条件时激活调度：
  1. 未处理 Transcript 累积行数 / 字符大小达到阈值（如 > 50KB）。
  2. 积压未反思 Session 数量达到阈值（如 >= 3 个）。
  3. 距离上次 Retro 超过时间窗口（如 6 小时）。
- **优点**：
  - 批处理经济性高：避免每个微小短会话都单独调用 LLM 造成高昂基础 Prompt 浪费。
  - 兼具平滑性：防止任务高频期产生密集的并发归纳风暴。
- **缺点与边界**：
  - 仍需常驻监听或下游主动唤醒才能检测阈值是否达标。

---

## 3. 《业界主流自动 Retro 触发模式对比表》

| 触发模式 | 典型代表 / 载体 | 触发时机与响应速度 | 资源开销模式 | 遗漏与边界风险 | 适合单机场景程度 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **生命周期 Hook** | CLI `exit` / `session_close` 钩子 | 实时（会话结束立刻唤起） | 突发性开销（每次退出时调用） | 终端强杀 (`SIGKILL`) 丢失；同步阻塞影响体验 | **高**（配合异步 Detach） |
| **Git 钩子** | Git `post-commit` / `post-merge` | 准实时（代码提交后） | 伴随提交偶发触发 | 调研类/未提交会话完全丢失 | **中**（仅作为补充信号） |
| **守护进程/空闲** | Letta (Sleep loop), Cron 任务 | 滞后（分钟级/小时级/夜间） | 平缓、利用空闲时间 | 笔记本电池消耗；新会话无法即时获得上轮反思 | **中** |
| **阈值驱动** | 累积 Session / Token 计数器 | 批量动态（满足定量条件触发） | 最优经济性（摊薄调用开销） | 单个短任务记忆无法立刻生效 | **高**（适合与 Hook 组合） |

---

## 4. 执行编排模式对比与深度拆解

业界在执行会话反思和记忆整合时，主要演化出以下几种经典范式：

```
+-------------------------------------------------------------------------+
|                  业界典型编排范式演进                                    |
|                                                                         |
| 1. Reflexion (单 Agent 同步循环):                                       |
|    Action -> Env -> Evaluator -> Self-Reflection -> Next Action         |
|                                                                         |
| 2. MemGPT / Letta (分层主动修剪):                                       |
|    In-context Memory <---> [LLM Core Function Calling] <---> Archival   |
|                                                                         |
| 3. Anthropic Dreaming (Lead-Analyzer-Organizer 两级消解):               |
|    Transcript 1, 2, 3 ...                                               |
|         │                                                               |
|         ▼ (并行)                                                        |
|    [Analyzer 1] [Analyzer 2] [Analyzer 3]   (抽取候选事实/局部结构化)     |
|         │             │            │                                    |
|         └─────────────┼────────────┘                                    |
|                       ▼ (串行汇聚)                                      |
|              [Organizer 集中消解]           (去重、去伪、冲突仲裁)       |
|                       │                                                 |
|                       ▼                                                 |
|               Atomic Memory Store                                       |
+-------------------------------------------------------------------------+
```

### 4.1 典型模式对比

#### 模式一：Reflexion 模式（即时反思）
- **机制**：由 Evaluator 评估前一步动作的成功/失败，Agent 立即输出一段 Natural Language Reflection 放入短期记忆，并在下一次迭代中参考。
- **评价**：适合单一复杂任务内部的试错迭代，但**不适合跨会话的系统性长期知识沉淀**（格式非结构化，容易迅速填满窗口）。

#### 模式二：MemGPT / Letta（操作系统式分层与睡眠修剪）
- **机制**：将记忆分为 Working Context（Core Memory）和 Archival Memory。Agent 在睡眠循环或空闲时调用内部函数（如 `archival_memory_insert`、`core_memory_replace`）对记忆进行搬移和淘汰。
- **评价**：自主性强，但在单机 Coding Agent 中，模型自主决策修改全局规则的不确定性高，且需要专门的向量数据库和检索管道维护。

#### 模式三：Anthropic Dreaming Dynamic Workflow（分级抽取与集中消解）
- **机制**：
  1. **Lead（编排器）**：扫描所有已结束但未反思的 Session，生成受控结构化计划。Lead 自身不运行代码，只调度子任务。
  2. **Analyzer（分析器，可高度并发）**：每个 Analyzer 只独立读取 1 个 Session，产出候选事实与洞察。Analyzer **绝对禁止修改共享记忆库**，保证无副作用。
  3. **Organizer（组织器，单点集中执行）**：收集所有 Analyzer 产出的候选集，对照既有长期记忆库进行合并、去重、冲突识别，执行原子写入。
- **评价**：**并发性强、角色职责清晰、具备天然的幂等性和可追溯性**，极其契合软件工程中的批处理与断点管理。

---

## 5. 《执行编排模式横向对比表》

| 编排范式 | 架构拓扑 | 并发能力 | 冲突处理机制 | 写入安全性 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Reflexion** | 单线性 / 递归环 | 极低（严格串行） | 最新反思覆盖上一轮 | 仅保存在上下文内，无落盘安全保证 | 任务内即时纠错 |
| **Letta / MemGPT** | 核心 Agent 自我内省 | 低（单一认知主体） | 由 Agent 自主调用工具改写 | 依赖 LLM 自觉，存在误删/幻觉改写风险 | 拟人伴随式长效助手 |
| **Anthropic Dreaming (分级消解)** | **Fan-out 并行分析 -> Fan-in 单点组织** | **极高**（Analyzer 分布式并行） | **由 Organizer 统一仲裁**，或标记冲突保留证据 | **极高**（Analyzer 纯只读，Organizer 单写入点） | **本地/企业级代码工程 Agent** |

---

## 6. 状态、幂等性与增量管理机制

在本地单机环境中，网络波动、进程强退、并发触发是常态。保证 Retro 稳健运行的三个支柱是：

```
           +-------------------------------------------------------------+
           |               Session 处理生命周期状态机                    |
           +-------------------------------------------------------------+
                                        │
                                        ▼
                                 [ 0. UNPROCESSED ]
                                        │
                              (Lead 认领并锁定批次)
                                        │
                                        ▼
                                  [ 1. STAGED ]
                                        │
                              (Analyzer 并行提取)
                                        │
                                        ▼
                                 [ 2. ANALYZED ]
                             (候选事实暂存至 Staging 表)
                                        │
                              (Organizer 集中消解)
                                        │
                                        ▼
                                [ 3. CONSOLIDATED ]
                                        │
                               (事务提交至主记忆库)
                                        │
                                        ▼
                                 [ 4. COMMITTED ]
```

### 6.1 会话处理游标（Watermark / Cursor）设计
- **全局清单（Manifest）**：维护本地 SQLite 数据库或 JSON 文件（如 `.yume/state/sessions_manifest.sqlite`）。
- **字段规范**：
  - `session_id`: 原始会话唯一标识。
  - `transcript_path`: 原始 transcript 路径。
  - `transcript_mtime`: 文件修改时间戳。
  - `content_hash`: Transcript 内容 SHA-256 哈希值（用于判断文件是否被追加修改）。
  - `retro_status`: `UNPROCESSED` | `STAGED` | `ANALYZED` | `COMMITTED` | `FAILED`。
  - `last_processed_at`: 处理时间。
  - `retry_count`: 失败重试次数（防止坏文件死循环）。

### 6.2 幂等性保障与事实指纹（Fact Fingerprinting）
为避免多次重复执行导致知识库膨胀与事实冗余，需要两级幂等设计：

1. **会话级幂等**：
   - 在 Analyzer 启动前检查该 `(session_id, content_hash)` 是否已经在 `retro_status = COMMITTED` 状态。若已提交且 hash 无变化，直接跳过。
2. **事实级指纹（Fact Fingerprinting）**：
   - 每条抽取出的候选事实必须计算结构化指纹：
     $$\text{FactFingerprint} = \text{SHA256}(\text{Scope} + \text{DomainEntity} + \text{NormalizedClaim})$$
   - **证据溯源（Provenance）追踪**：
     每个事实附带关联证据字段：
     ```json
     {
       "id": "fact_7f8a9b",
       "fingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
       "scope": "architecture/database",
       "claim": "本地状态存储采用 SQLite WAL 模式，避免锁库",
       "provenance": {
         "session_id": "ses_20261109_001",
         "transcript_offset": 142,
         "extracted_at": "2026-11-09T16:15:00Z"
       },
       "confidence": 0.95
     }
     ```
   - 在 Organizer 阶段，如果数据库中已存在相同指纹的事实，则执行 **Upsert**（更新置信度、追加溯源 Session ID），而非新增重复记录。

### 6.3 中途崩溃与断点续跑（Checkpoint & Staging）
- **Staging 暂存表隔离**：
  - Analyzer 的分析结果先写入 `retro_staging_facts`（临时暂存区），而非直接写入正式记忆库。
- **故障恢复路径**：
  - **Analyzer 阶段崩溃**：只需重新对 `STAGED` 且未完成的 Session 启动 Analyzer，已完成 `ANALYZED` 的 Session 无需重复调用 LLM。
  - **Organizer 阶段崩溃**：主记忆库处于未修改状态。重新启动时直接读取 `retro_staging_facts` 中处于 `ANALYZED` 状态的数据重新执行消解，完成后在单一事务中写入主库并更新 Session 状态为 `COMMITTED`。

---

## 7. 适合 Yume 本地单机环境的自动 Retro 架构方案建议

结合 Yume“本地单机、轻量低侵入、TypeScript + Mastra 架构”的工程定位，提出以下落地设计方案：

### 7.1 混合触发模型（Hybrid Triggering）
不要采用常驻高频轮询，建议采用“**Exit Hook 异步投递 + 启动前水位线兜底检查**”的混合模式：

1. **退出触发（主通路）**：
   - 当 CLI 会话结束时，Hook 将未处理的 `session_id` 记录追加到本地队列文件 `.yume/state/pending_retro.jsonl` 中，并尝试派生一个低优先级 detached 后台任务触发 `yume retro --batch`。
2. **冷启动兜底（补偿通路）**：
   - 每次 Agent CLI 启动或空闲等待任务时，检查 `pending_retro.jsonl` 中未完成的任务。若发现上次异常崩溃遗留的 Session，在后台轻量启动补偿流程。

### 7.2 Lead-Analyzer-Organizer 分级编排落地（基于 Mastra Workflow）
遵循 `mvp-draft.md` 中确定的三角色拓扑，利用 Mastra Workflow 实现流水线编排：

```typescript
// 伪代码参考：Mastra Dynamic Workflow 编排
const retroWorkflow = new Workflow({ name: 'yume-auto-retro' });

// 步骤 1：Lead 扫描与分批计划
retroWorkflow.step('lead_plan', async () => {
  const pendingSessions = await manifest.getUnprocessedSessions({ limit: 5 });
  return { sessions: pendingSessions };
});

// 步骤 2：Analyzer 并行抽取（fan-out）
retroWorkflow.step('analyzer_extract', {
  parallel: true,
  execute: async ({ context }) => {
    // 对每个 session 启动独立 analyzer，将候选写入 staging
    await Promise.all(context.sessions.map(s => runAnalyzer(s)));
  }
});

// 步骤 3：Organizer 统一消解与原子落库（fan-in）
retroWorkflow.step('organizer_consolidate', {
  execute: async () => {
    await runOrganizerWithTransaction();
  }
});
```

### 7.3 冲突处理与降级原则
1. **冲突只记录不擅自丢弃**：
   - 若本轮会话反思的事实与既有记忆库存在直接矛盾（例如：“技术栈从 Postgres 切换为 SQLite”与已有“默认使用 Postgres”冲突），Organizer 不擅自仲裁删除旧记忆，而是将新旧事实均打上 `conflict_detected` 标签并记录双向引用，待开发者在后续交互或 ADR 评审中裁决。
2. **故障与限流降级**：
   - 若遇到 LLM API 配额耗尽或网络不可用，Retro 任务立即挂起，Session 维持在 `STAGED` 或 `FAILED` 状态，不影响前台开发者的正常 Coding 流程。

---

## 8. 调研结论与后续行动项

1. **触发源落地**：首选 CLI 会话退出 Hook（非阻塞异步派生）配合冷启动 Manifest 水位线兜底检查，彻底避免单机资源狂转和异常强杀遗漏。
2. **编排架构选型**：采纳 Anthropic Dreaming 的 **Lead-Analyzer-Organizer** 拓扑，实现“只读分析并发化、状态写入单点化”。
3. **状态存储标准**：基于 SQLite WAL 模式，分离 `sessions_manifest`、`retro_staging_facts` 与正式 `memories` 库，建立基于指纹的幂等写入与全链路证据溯源机制。
