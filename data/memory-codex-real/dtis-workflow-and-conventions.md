---
name: dtis-workflow-and-conventions
description: "DTInsight 仓库（worktree /Users/mac/.factory/ws/...）的提交/验收 SOP、dtis 命令、测试环境登录方式、写码规范要点；动手改代码或 review 前读这份。"
metadata: 来自 AGENTS.md overlay 与 docs/agents/coding-standards.md（2026-11-01 读取，规则可能随仓库更新）
---

# DTInsight 仓库工作流与写码规范（AGENTS.md + coding-standards）

仓库根：`/Users/mac/.factory/ws/<ticket>-r1`（例：`161496-r1`），cwd 即 AGENTS.md 作用域。改动本地 overlay，不提交 `AGENTS.md`。

## 流程 SOP

- 改代码 / review 前先读 `docs/agents/coding-standards.md`（规范 SSOT）；规则沉淀见 `.agents/skills/improve-me/SKILL.md`。
- 改完顺序：`dtis ready`（含新增注释检查 / ci-local 的 prettier、eslint、stylelint、types）→ 按对应 skill 取证自测 → 交用户验收（截图 / 本地链接）→ 验收通过后 `code-review` 看工作区 diff（含未提交），先做 `.agents/skills/dt-insight-review-gate/SKILL.md` 的注释清单与 slop 两步 → 再开 Plannotator 审阅页 + 代码关系图。**验收前不发 Plannotator 链接**（2026-10-21 Shane SOP）。
- 用户 sdev 点头前不 commit / push。等 dev 就绪用 `dtis dev-ready`，不要 sleep 轮询。`dtis` 输出已精简，不用套 `rtk proxy`。
- 卡片（禅道任务）写了 `push: allowed` 才能 commit / push / 提 MR；没写或 `push: no` 只回报 diff。卡片写了「验收环境」（域名+租户）时只在该环境验收。交付报告把「实际验证过」（附命令输出/截图）与「推断」分开写。
- 固定命令：`dtis --help` → check(ci-local) / dev-ready / ready / comments / branch-check / bug / mr / omp / pipeline / notify-run。格式化用 `dtis fmt [文件...]`（Node 18 + 本树 `ko prettier --write`），不要试 npx / pnpm exec / 直接调 node_modules 的 prettier。
- 部署：`dtis omp deploy --env-id N --branch B [--bg]`；等 MR 流水线 `dtis pipeline <iid> [--custom] [--bg]`；两者自动通知 Grok Bot，不直接调 omp-skill deploy、不手写轮询。
- Intake：禅道 Bug/任务、PRD、提测、回灌/跨版本/合 release 先载 `.agents/skills/dt-insight-triage/SKILL.md`；纯讨论、规则维护、明确局部修改不走 intake。本 Agent 在目标树改，不另开 Herdr coding agent。

## 测试环境登录 / 真实接口

```bash
~/.config/dt-insight/bin/env-api <OMP id|namespace> POST /api/... '<json>'   # 直接打印返回
~/.config/dt-insight/bin/env-api --list                                     # 看环境
curl -b "$(~/.config/dt-insight/bin/env-cookie <env>)" <url>
~/.config/dt-insight/bin/env-open                                           # 浏览器带登录态
```

它们读 `~/.config/dt-insight/uic.env` 自动过验证码登录。看到「未登录」/登录页/验证码不要停下，先用这些工具。对需求涉及「后端有没有返回某字段」时先真实调接口确认，不能只看前端类型定义。

## 写码规范要点（易踩）

- **字段必填/格式校验写 `Form.Item` 的 `rules` + `validateFields()`**，不要 `message.error` 弹提示再 return；页面原来没 Form 就给该字段包一层 Form（161496 教训）。
- **收敛优先于完备 / 最小闭环**：不为理论优化或未来复用扩 diff；在用户动作入口补一刀即可。反例 161496 第一版改了 sessionStorage `sqlType` 结构 + `haveVersion` 推导 + ref，被 Shane 打回。
- **先问「已有逻辑为何没命中」**：同类能力（未保存拦截、权限、校验）往往已存在，漏在路径差异、主键不一致、状态未写入；用能工作的相邻路径做对照（多版本 vs 多实例）。
- 类型：禁 `as` / `as const` 糊字面量与外部 JSON，字面量写目标类型；禁无必要拓宽成 `Record<string, unknown>` / `any` 字典；库类型用 `import type`。
- API 契约：禁猜字段名、禁靠 `message.includes(...)` 猜业务语义；错误分类归后端（`errorType` / `code`）；已约定字段直接用，不叠兜底。
- 防御：不叠 null/undefined 三连，不加「以防万一」的兜底超时/定时器；组件已有约束不再手写裁剪。
- React：新 UI 函数组件；少用 useEffect（能事件处理/直接算的不用）；换数据源清状态用 `key` 重新挂载；滚动用 `scrollIntoView`（挂载即滚用 `useLayoutEffect`）；`classNames` 拼 className；eslint 只 warn 的不处理也不加 disable。
- 注释：非必要不加；禁写改动说明/「修 bug 过程」注释；不写 Figma 节点号；CSS/SCSS 一律不写注释（`dt-correct/no-process-comments`、stylelint `comment-pattern` 在 `dtis ready` 拦）。
- 样式：色值用 `@/styles/const.scss` 变量（`$black_title` 等）；antd 主题已有的色/边框/圆角不要复写，只补间距；图标先查 `@dtinsight/react-icons`，不加本地 svg/png。
- i18n：源码直接写中文 → 根目录 `fnm exec --using 18 pnpm extract` → 只把 en-US 中本轮新增的中文翻成英文 → `pnpm extract check` 通过。禁手改 `locales/**` 新增 key；引用用 `I18N.a.b.X` 全路径（别把词条组赋给变量）。
- 本项目**不写单测**；删既有测试须用户明确要求。
- commit 一个包一条，scope 跟实际改动的包名（如 `apps/console` 与 `packages/dt-common` 分开）。

## Lint / 钩子现状（「已写好」≠「当前会拦」）

`dtis ready` 目前会拦：eslint `dt-correct/no-process-comments`（改动说明/修 bug 过程注释、Figma 节点号）、`dt-correct/no-scrolltop-misuse`、`dt-correct/no-concat-classname`、`dt-correct/no-warn-disable`（warn 清单从 ko-lint-config 自动读）、`dt-correct/no-local-asset-import`、`dt-correct/no-hardcoded-compare`（放过 `typeof` 和 `event.key`）、stylelint `comment-pattern`（lynton + AIAgent 范围）。

已写好但尚未真正生效，别当作会被拦：
- `dt-correct/no-message-validation`（worktree `chore/correct_20261030`，全仓只报新增行；`code`/`success` 这类接口判断不报，表格勾选提示需在该行 disable 并写原因）。
- `dt-correct/use-theme-var`（worktree `chore/correct_20261023`，从主题 `const.scss` 读色值表、只报新增行、`#FFF`/`#000` 不报；修复在 dtis_helper 补丁里待「推」，dtis 目前只收 `comment-pattern`）。
- `commit-scope.js`（一个包一条 commit 的 scope 校验）已写好，但 commit-msg 钩子还没挂，目前不拦。

## 过程观察

- 本仓库工作区里 `rg` 的输出被 rtk 截断（例：`313 matches in 40 files`，每组只留前 25 行），完整结果要 `tail -n +N "$HOME/Library/Application Support/rtk/tee/<id>_grep_*.log"`，或把 `rg` 限定到更窄的目录/文件再查。
- 用户说「只回复修复方案（改哪些文件、怎么改、为什么），不要修改任何文件」时，正确做法是只读调查 + 汇报方案，不动文件、不跑 `dtis ready`；这类请求也不走 intake。
- 交付报告里「实际验证过」必须能附命令输出或截图；只读方案阶段的一切结论都属于「推断」，要标明未经页面验证。

## 同项目笔记（本文件只是摘要，细节看这些）

- [[dt-insight-project-conventions]] — 交付闸门 / 卡片 push 规则 / 分支命名 / i18n / 子 Agent 委派 / intake 路由（最全）。
- [[dt-insight-project-workflow]] — zentao CLI 用法与坑、分支与版本上下文、dtis 命令细节。
- [[dt-insight-frontend-conventions]] — Form.Item 校验、diff 纪律、类型/防御/注释/样式红线摘要。
- [[datasource-add-version-flow]]、[[dt-insight-datasource-center]] — 数据源中心业务代码。

## 目录/技能指针

`docs/agents/`：issue-tracker、triage-labels、domain、coding-standards、local-dev、harness-governance。`.agents/skills/`：dt-insight-triage、dt-insight-locale-fix、dt-insight-git-workflow、dt-insight-common-fanout、omp-skill、verify-console-70（console 7.0 自查）、dt-insight-local-dev、dt-insight-review-gate、improve-me。历史排查沉淀 `docs/solutions/`（`module`/`tags`/`problem_type`），领域词 `CONCEPTS.md`。

相关：[[datasource-add-version-flow]]
