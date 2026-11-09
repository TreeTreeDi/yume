# backpass (kunchenguid/backpass) 机制调研与记忆梯度流参考

> **关联 Issue**: [#18](https://github.com/TreeTreeDi/yume/issues/18)  
> **调研主题**: 探索 Agent 记忆作为“权重模型”的迭代机制，剖析 `backpass` 的流水线架构与工程实现，为 Yume 沉淀长期反思与记忆演化方案。

---

## 1. 核心隐喻与抽象模型

在 AI Coding Agent 的开发范式中，维护全局指令文件（如 `AGENTS.md`、`CLAUDE.md`）通常面临两难困境：要么人工手动编写滞后且容易膨胀，要么任由上下文失控退化。

开源项目 `kunchenguid/backpass` 提出了颠覆性的核心命题：  
> **"You don't write `AGENTS.md`. You train it with gradient descent."**（你不需要手写 `AGENTS.md`，你应该用梯度下降训练它。）

`backpass` 将深度学习中标准的神经网络训练过程与 Agent 软件工程实践进行了深度同构映射：

| 深度学习概念 | 符号/数学意义 | `backpass` Agent 工程对应物 |
| :--- | :--- | :--- |
| **权重 (Weights)** | $W$ 模型参数矩阵 | 仓库中的记忆与规则表面：`AGENTS.md`、`CLAUDE.md` 及项目级 `skills/*/SKILL.md`。 |
| **前向传播 (Forward Pass)** | $\hat{y} = f(x; W)$ | Agent 在真实工程环境中执行用户任务、调用 Tool、修改文件与运行命令的多轮会话过程。 |
| **损失信号 (Loss Signal)** | $\mathcal{L}(y, \hat{y})$ | 会话中记录的摩擦与失败：命令报错、编译与测试挂掉、无效重试、Token 溢出及用户纠错指令。 |
| **梯度反传 (Gradients / Backpass)** | $\nabla_W \mathcal{L} = \frac{\partial \mathcal{L}}{\partial W}$ | 从会话日志中逆向提取出的缺失规则、过时描述或冗余文本，形成附带多会话证据引用的精准 Diff 建议。 |
| **权重更新 (Weight Update)** | $W \leftarrow W - \eta \nabla_W \mathcal{L}$ | 人工审阅批准后执行的 `backpass apply`：受硬性 Token 预算与学习率（每次最多修改数）约束的原子写入与技能抽离。 |

---

## 2. 完整执行流水线剖析

`backpass` 的核心执行管线包含四个清晰的阶段，遵循严格的单向数据流与单模块隔离设计：

```mermaid
flowchart TD
    subgraph S1 [Phase 1: Transcript Discovery]
        Scan[扫描本地 / 远程目录] --> Match[Git Cwd / Remote 匹配]
        Match --> Index[增量构建 Transcript 索引]
    end

    subgraph S2 [Phase 2: Loss Distillation]
        Raw[原始会话日志 (数十 MB)] --> Clean[剥离工具输出/二进制/敏感信息]
        Clean --> Compress[96%~99% 确定性无模型规则压缩]
        Compress --> Trace[仅保留 Prompt / Reasoning / Failure Shape]
    end

    subgraph S3 [Phase 3: Proposal Generation]
        Trace --> LLM[反思合成 LLM]
        LLM --> Gates{机械准入校验}
        Gates -->|Token 预算超限 / 孤立单会话| Reject[丢弃或降级]
        Gates -->|双会话交叉验证通过| Staging[.backpass/synthesis/ 暂存]
    end

    subgraph S4 [Phase 4: Human Review & Apply]
        Staging --> UI[lavish-axi Web UI / CLI 确认]
        UI -->|Hash 校验一致 & 批准| Apply[writer.js 原子写入磁盘]
        UI -->|拒绝| Blacklist[记录被拒 Proposal，避免重复生成]
    end

    S1 --> S2 --> S3 --> S4
```

### 2.1 会话发现（Transcript Discovery）
- **多平台自适应采集**：自动探测 Claude Code、Codex CLI、Hermes、OpenCode 等不同 Harness 的本地日志路径（如 `~/.claude/projects/`、`~/.codex/sessions/`），亦支持通过无交互 SSH 会话从远程机器采集。
- **项目边界关联判定**：无需在 Agent 执行期间注入侵入性 Hook，而是通过解析日志中的工作目录（`cwd`）、Git Remote URL、Commit Hash 与分支名称，自动将外部会话精准归属到目标仓库。
- **增量缓存索引**：针对已分析过的会话，以 `(会话内容 Hash + 记忆表面 Hash + 分析器版本)` 为复合 Key 建立缓存，避免重复分析产生不必要的算力与 Token 开销。

### 2.2 损失蒸馏（Loss Distillation）
- **确定性极高压缩比（96% ~ 99%）**：原始 Agent 会话通常包含海量的大文件读取输出、命令执行结果、编译日志及二进制 base64 数据，动辄达数十兆字节。`backpass` 在第一阶段**完全不调用 LLM**，而是使用纯规则进行清洗。
- **保留关键信息骨架**：
  - 用户意图表达（User Prompts）与纠偏反馈；
  - Agent 的思考摘要（Thinking / Reasoning summary）；
  - 工具调用的签名与参数形态（Tool Call Signature）；
  - 明确的异常与错误状态码（Exit codes, stderr stack traces）。
- **隐私脱敏与安全擦除**：在压缩流水线中自动识别并擦除常见的 API Key、Token、密码等敏感凭据。

### 2.3 提案生成与约束准入（Proposal Generation）
- **反思合成（Synthesis）**：分析引擎读取汇总的多会话 Loss 信号，寻找引发重复失败的系统性根因，并在 `.backpass/synthesis/` 生成受控修改提案。
- **严格的机械校验门禁（Mechanical Gates）**：
  1. **跨会话交叉凭据（Corroborating Evidence）**：新增规则必须具备至少 2 个独立会话的同类错误支持（`--min-gap-evidence 2`），坚决防范由单一偶发会话导致的“规则过拟合”。
  2. **逐字引用佐证（Verbatim Transcript Quotes）**：每一个 Diff 提案必须包含原汁原味的会话行号与错误原文引用，禁止无源幻觉。
  3. **硬性 Token 预算管理（Budget Ceiling）**：定义 `AGENTS.md` 的最大上下文容量上限（如 2000 tokens），新增内容若突破上限，必须配套提出等价的压缩、淘汰或技能外溢方案。
  4. **Skill 抽取判定（Skill Extraction）**：当发现某类任务流程复杂、步骤繁多且跨度较长时，提案生成器会判定将其沉淀为独立按需技能（`skills/<name>/SKILL.md`），而非硬塞进全局 `AGENTS.md`。

### 2.4 人工审阅与原子应用（Human Review & Apply）
- **只读默认与文件锁防护**：分析生成阶段对项目工作区保持只读，仅在 `.backpass/` 下生成暂存文件。
- **`lavish-axi` 交互式可视化 UI**：
  - 引入轻量级 Web/HTML 审查界面（或纯 CLI 差异确认模式），左右并排对比现有规则与拟议变更；
  - 实时悬停查看触发该变更的底层会话错误证据；
  - 支持逐条接受（Accept）、修改（Edit）或拒绝（Reject）。
- **抗漂移 Hash 校验（Freshness Hash）**：提案生成时记录目标文件的当前 SHA256。在 `backpass apply` 真正提交写入时，若检测到目标文件已在外部被人工修改，立即中止并告警，防止冲突覆盖。
- **拒绝记忆黑名单**：被用户拒绝的提案会被打上标记并沉淀，后续反思周期中相同模式的提案将被抑制，避免反复打扰用户。

---

## 3. 关键边界与鲁棒性机制

### 3.1 单一写入点与事务回滚（Transactional Apply）
- 全工程只有 `src/apply/writer.js` 具有修改目标仓库文件的权限，实现权限职责的物理隔离。
- 采用类似于数据库事务的机制：在写入更新前对目标文件进行临时备份，若在多文件同步修改（例如修改 `AGENTS.md` 并新增 `skills/foo/SKILL.md`）过程中出现任何异常，触发完整自动回滚，保持工作区绝对干净。

### 3.2 会话分类与清洗降噪
并非所有会话都具备同等的学习价值。`backpass` 区分两类会话形态：
1. **交互式开发会话（Interactive Sessions）**：包含人类用户的纠偏、赞许与明确指令，是调整记忆权重的最高质量来源。
2. **自动化/CI/子 Agent 协作会话（Non-interactive / Delegate Sessions）**：可能包含大量由于断网、环境缺失引发的假阳性错误，此类会话默认只作为代码规范遵从度分析，不直接赋予新增全局业务规则的权重。

### 3.3 故障处理哲学：Failure is loud and named
`backpass` 恪守明确的错误分级规范，严禁静默吞并异常：
- **单会话解析失败（Per-transcript failure）**：单个损坏的日志文件或超时会话记录在 `backpass status` 中，不打断批处理整体进程，并在下次执行时排队重试。
- **工作节点致命错误（Worker fatal failure）**：遇到不可恢复的基础设施级异常时，停止派发新会话，等待正在执行的分析平稳收尾并持久化已有缓存，随后显式抛出具体命名错误退出。

---

## 4. 记忆固化层级与结构化沉淀边界

在反思归纳与经验沉淀时，自然语言指令存在固有的**注意力衰减、语义漂移与幻觉风险**。  
根据 Issue #18 提出的深化架构思想，结合“把经验编码进工程结构”（**Encode Lessons in Structure**）原则，Agent 记忆应当严格划分为四层物理载体：

```
┌─────────────────────────────────────────────────────────────┐
│  L0 确定性规则 (ESLint / TypeScript / Git Hooks / Schema)    │ 机器硬约束，0 上下文开销
├─────────────────────────────────────────────────────────────┤
│  L1 自动化脚本与辅助 CLI (scripts/*, Makefile, build/check)   │ Build the Lever，命令级闭环
├─────────────────────────────────────────────────────────────┤
│  L2 独立任务技能 (skills/*/SKILL.md, playbooks)             │ 按需动态加载，不污染全局
├─────────────────────────────────────────────────────────────┤
│  L3 全局上下文元记忆 (AGENTS.md / CLAUDE.md)                 │ 稀缺元权重，严格 Token 预算管控
└─────────────────────────────────────────────────────────────┘
```

### 记忆分层仲裁对照表

| 层级 | 载体类型 | 适用对象与典型场景 | 运行机制 | 上下文 Token 成本 | 演进与沉淀准则 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **L0** | Lint 规则 / TS 严格类型 / Pre-commit 钩子 | 代码缩进、禁止特定危险 API、提交规范、分支保护、静态类型约束 | 工具级强校验，挂掉则直接阻断进程 | **0 Token**（不进入 Prompt） | **能写成 Lint 的绝对不写成文档**。凡是能用确定性 AST 或类型断言保证的规范，一律下沉至 L0。 |
| **L1** | 本地可执行脚本 (`scripts/*`, Makefile, CLI) | 多步初始化流程、环境健康检测、复杂重构脚本、一键修复命令 | Agent 只需获知一条简单指令（如 `npm run verify`）并运行 | **极低**（仅需简短描述） | **Build the Lever**。将复杂、多参数、长命令序列封装为一阶脚本，降低模型认知负荷与调用失误率。 |
| **L2** | 按需技能体系 (`skills/*/SKILL.md`) | 特定领域诊断路径、灰度发布标准工作流、性能 Profiling 手册 | 暴露元数据与触发词，仅在命中特定任务场景时由 Agent 按需读取加载 | **动态加载**（平时 0 消耗，按需 500~2k tokens） | 当一条规则涉及多步骤、专有上下文或低频出现时，必须抽离为独立 Skill，禁止常驻全局。 |
| **L3** | 全局元记忆 (`AGENTS.md` / `CLAUDE.md`) | 项目高层架构哲学、系统核心边界、不可触碰的红线约定 | 每次会话首轮强制注入 System Context | **持续且昂贵**（严格受限在 1,000 ~ 2,500 tokens） | 极度稀缺的注意力核心。必须受到严格的准入审查，只收纳跨越模块的根本性指导原则。 |

> **核心设计定律**：  
> `能沉淀为 L0 Lint/Type 则不写进 L1 CLI；能沉淀为 L1 脚本则不写进 L2 Skill；能拆分为 L2 按需 Skill 则坚决不堆进 L3 全局元记忆！`

---

## 5. 对 Yume 的架构融合与落地建议

Yume 具备本地化、以开发者为中心的生命周期管理特性（Dream 阶段、Retro 反思、多 Worktree 工厂流水线）。`backpass` 的思想可以直接与 Yume 的以下关键模块深度融合：

```mermaid
flowchart LR
    subgraph YumeWorktrees [多 Agent 活跃工作流]
        W1[Worktree 任务 A] --> Log1[会话 Log]
        W2[Worktree 任务 B] --> Log2[会话 Log]
    end

    subgraph YumeDream [Yume Dream / Retro 结算流]
        Log1 & Log2 --> Distill[Loss Distillation 压缩引擎]
        Distill --> Cluster[高频失败聚类分析]
        Cluster --> Arbiter{四层载体路由仲裁}
    end

    subgraph Outputs [分级沉淀结果]
        Arbiter -->|确定性 AST 约束| L0[自动增补 Lint / Hook]
        Arbiter -->|重复运维序列| L1[提炼 scripts/ 工具]
        Arbiter -->|特定领域工作流| L2[生成 skills/*/SKILL.md]
        Arbiter -->|核心架构原则| L3[更新 AGENTS.md (带 Hash 校验)]
    end
```

### 5.1 在 Yume Dream / Retro 中引入无模型 Loss 蒸馏
- 当前 Yume 在处理长会话历史时，若全量喂给 LLM 进行反思，成本与时间开销极大。
- **改进方案**：借鉴 `backpass` 的 98% 压缩率蒸馏算法，在每轮 Session 结束触发 Retro 时，先通过 AST/正则/状态机流水线剥离大文本工具输出与环境变量，仅将包含“Prompt - 决策思考 - 失败栈 - 用户修正”的轻量 Trace 提交给反思模型。

### 5.2 建立多会话交叉验证机制（Cross-Session Evidence Gating）
- 严禁任何一次单次会话中的偶发错误直接修改项目规则。
- 在 SQLite 存储层中对出现的 Failure Pattern 建立指纹特征库（Error Fingerprint）。只有同一个指纹跨越不同的任务、在至少 2 次独立 Worktree 会话中重现时，才触发“生成修改建议”的信号。

### 5.3 严格执行 Token 预算与 Skill 自动外溢（Budget & Spilling）
- 在 Yume 的配置体系中显式定义 `memory.max_agents_tokens: 2000`。
- 当反思流水线评估出新的高质量架构原则并准备更新 `AGENTS.md` 时，若容量超标，自动触发“淘汰或外溢算法”：
  1. 识别并删除长期未被激活或已被高阶规则覆盖的陈旧条目；
  2. 将具体实操细节外溢沉淀至 `skills/` 目录下；
  3. 通过 Pull Request 或工单留言形式请求开发者一键批准。

---

## 6. 结论

`kunchenguid/backpass` 展示了将机器学习中成熟的“前向推理 - 损失计算 - 梯度回传 - 权重优化”闭环在工程 Agent 领域落地的极佳范式。  
结合 Yume 的多 Harness（Codex, Cursor, Gemini）接入环境与多分支开发工作流，通过**严格的无模型前置压缩**、**双会话证据交叉背书**与**四层物理载体（L0~L3）精准分流**，能够彻底终结 Agent 规则文件“人工维护跟不上、自动维护易失控”的历史问题，使 Yume 拥有真正自适应进化的自我完善能力。
