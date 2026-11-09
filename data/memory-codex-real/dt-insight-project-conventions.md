---
name: dt-insight-project-conventions
description: dt-insight 前端 monorepo 的工作约定：改代码 / review / 交付闸门（dtis ready、截图验收、push 权限、commit 拆分）、i18n extract 流程、测试环境登录工具、子 Agent 委派规则、intake 路由；动手前读，避免踩 SOP 红线。
metadata: dt-insight; from AGENTS.md + docs/agents/coding-standards.md + .agents/skills/dt-insight-triage; session 2026-11-01
---

# dt-insight 项目约定

工作区示例：`/Users/mac/.factory/ws/<taskid>-r2`（本任务为 `161496-r2`；同族还有 `-r4` 等工作树），zsh、macOS、Node 18 通过 `fnm exec --using 18`。

本页是 AGENTS.md 的单页总览；细分内容见 [[system-dt-insight-studio-workspace]]（仓库布局、overlay、env 工具）、[[workflow-dt-insight-git-delivery-gates]]（push 权限与验收 / review 闸门）、[[workflow-dt-insight-triage-routing]]（intake）、[[convention-dt-insight-coding-standards]]（写码规范）、[[agent-delegation-policy]]（委派细则）、[[workflow-zentao-cli]]（禅道）。业务域例子见 [[dt-insight-datasource-center]] / [[bug-publicservice-datasource-version-161496]]，禅道速查见 [[zentao-cli]]。

## 交付闸门（顺序固定）

1. 改代码 / review 前先读 `docs/agents/coding-standards.md`（SSOT，清单级）；`AGENTS.md` / `AGENTS.override.md` 只放指针，禁止同义 bullet 并存。
2. 改完 → `dtis ready` 通过（含 ci-local 的 prettier / eslint / stylelint / types + 新增注释检查；eslint 带 `dt-correct` overlay）→ 按 skill 取证自测 → 交用户验收（截图 / 本地链接）。
3. 验收通过后才 `code-review` 看工作区 diff（含未提交）：先做 `.agents/skills/dt-insight-review-gate/SKILL.md` 的注释清单 + slop 两步，再开 Plannotator 审阅页 + 代码关系图给用户。**验收前不发 Plannotator 链接**（2026-10-21 Shane SOP）。
4. 用户 sdev 点头前不 commit / push。等 dev 就绪用 `dtis dev-ready`，**不要 sleep 轮询**。
5. 提交粒度：一个包一条 commit，scope 写实际改动的包名（同时改 `apps/console` 和 `packages/dt-common` 就拆两条）；只升依赖的 package.json 包不算。

## 卡片 / 交付报告

- 卡片写了「验收环境」（域名 + 租户）时只在该环境验收，不换环境、不换租户。
- 只有卡片写 `push: allowed` 才能 commit / push / 提 MR；没写或 `push: no` → 只改完回报 diff。
- 交付报告与 eval 里「实际验证过」和「推断」分开写：每条「实际验证过」必须附命令输出或截图，拿不出来就归到「推断」。

## 仓库 / 分支卫生

- 只改 `AGENTS.override.md`，**绝不 commit `AGENTS.md`**；worktree 里 `git status` 显示 `T AGENTS.md`（类型变软链）也不提交。
- 本地流程文件（override、本机 skill 产出）登记进 `.git/info/exclude`，不进 commit。
- 本项目**不写单测**；删除既有测试须用户明确要求。
- 分支命名按 kind：Bug 修到 test → `fix`；修 release / 线上 → `hotfix`，形如 `publicService/hotfix_6.3.x_161496`；需求 → 前缀 `feat`；提测 `test_*`（须带 suffix，如 `v701`）；定制 `custom/<product>/release_<ver>_<owner>`。同版本 test↔release 冲突一律**回灌**（release → test），不按话术字面方向 merge。

## i18n

源码里直接写中文 → 仓库根 `fnm exec --using 18 pnpm extract` → 只把 en-US 里本轮新增的中文改成英文 → `pnpm extract check` 通过。禁止手改 `locales/**` 新增 / 修改字段（评审见到即硬违规，`extract check` 通过不豁免）；引用用 `I18N.a.b.X` 全路径，不要把词条组赋给变量（extract:clear 会当死 key 删）。文案出问题也是改回中文重跑 extract。

## 常用命令

- `dtis --help`：`check`(ci-local) / `dev-ready` / `ready` / `comments` / `branch-check` / `bug` / `mr` / `omp` / `pipeline` / `notify-run`。`dtis` 输出已精简，**不用套 `rtk proxy`**。
- 格式化用 `dtis fmt [文件...]`（Node 18 + 本树 `ko prettier --write`），不传文件就格式化相对 `@{u}` 有改动的文件；不要直接调 `node_modules` 里的 prettier，不要轮着试 npx / pnpm exec。
- OMP 部署一律 `dtis omp deploy --env-id N --branch B [--bg]`；等 MR 流水线 `dtis pipeline <iid> [--custom] [--bg]`（起止自动通知 Grok Bot），不要直接调 omp-skill deploy、不要手写轮询。

## 测试环境登录 / 真实接口

- `~/.config/dt-insight/bin/env-api <OMP id|namespace> POST /api/... '<json>'`——直接打印返回；`env-api --list` 看环境。
- `curl -b "$(~/.config/dt-insight/bin/env-cookie <env>)" <url>`。
- 两者读 `~/.config/dt-insight/uic.env`，自动过验证码登录；浏览器要登录态用同目录 `env-open`。
- 看到「未登录」/ 登录页 / 验证码**不要停**，先用上面这些工具登录。
- 涉及「后端有没有返回某字段」的结论必须先真实调接口确认，不能只看前端类型定义。

## 子 Agent 委派（AGENTS.md「按需委派」）

- UI 设计（布局、视觉风格、交互设计、视觉验收）由主 Agent 用主模型亲自做。
- 只用运行时原生角色：代码实现 / 修复 / 重构 / 写测试用 `worker`，代码调查用 `explorer`；**不派发 DeepSeek 或 Grok 子 Agent**。显式启动 SDD 时保留其阶段角色与依赖顺序。
- 目标 1–2 个并行子 Agent，是工作习惯不是硬限制；用户要求单 Agent 时从命。
- 每次委派要交代目标 / 上下文 / 负责文件模块 / 限制 / 验收方式，并告知「你不是独自工作，保留他人修改、协调重叠范围」；先定共享契约再并行实现。
- 子 Agent 完成后调运行时结束机制（`close_agent` / `interrupt_agent`）；主 Agent 负责整合、解冲突、核对实际改动与验证证据。

## Intake 路由

禅道 Bug / 任务、PRD、提测、回灌 / 跨版本 / 合 release、或用户问「该走哪条分支」→ 读 `.agents/skills/dt-insight-triage/SKILL.md`，产出 handoff（task_id / kind / product / version / flavor / owner / suffix / target_base / branch_prefix / scenario / next_skill）后进下游。**纯讨论、规则维护、明确局部修改不走 intake**（本次「只给修复方案、不要改文件」即属此类）。「需要修 / 低版本」仍是原 Bug 的 kind。

- 已对齐的 follow-up 从点名文件开始；**本 Agent 在目标树改，不要 Herdr 另开 coding agent**；用户明确说「分发 / 找人」才转交。
- Bug 标题能看懂就不强行复现；信息不够再问用户是否要复现；难复现才用 `diagnosing-bugs`。

## 其他写码红线（coding-standards 摘要）

- 不用 `as` / `as const` 糊字面量或外部 JSON；外部输入先收窄；不徒增 `Record<string, unknown>`。
- 不猜后端字段名、不靠文案子串判业务语义；错误分类归后端（`errorType` / `code`），前端只做 type→动作映射；契约缺口提后端，不硬扛。
- 禁止硬编码比较字符串（`dt-correct/no-hardcoded-compare` 会拦）；色值用 `@/styles/const.scss` 变量；图标先查 `@dtinsight/react-icons`，不自加 svg/png（`dt-correct/no-local-asset-import` 会拦）。
- 故意留的 TODO / 占位必须有跟踪票（`.scratch/<feature>/issues/`），不能只写注释。
- 未要求测试 / 不要求扩覆盖 / 不要求抽象时**不主动扩大 diff**（161496 的教训见 [[dt-insight-datasource-center]]）。
