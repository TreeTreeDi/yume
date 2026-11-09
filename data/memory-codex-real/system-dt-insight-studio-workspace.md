---
name: system-dt-insight-studio-workspace
description: Layout, overlay files, worktree sync and local test-env login for the dt-insight-studio monorepo (apps/console, apps/publicService, apps/dataAssets, dtis CLI, dt-common). Read before running commands or locating files in that repo.
---

# dt-insight-studio 仓库与本地环境

工作树示例：`/Users/mac/.factory/ws/<task-id>-r4`（一个任务一个 worktree，例：`/Users/mac/.factory/ws/161496-r4`；也有人用 `-r2`，例：`/Users/mac/.factory/ws/149812-r2`）。应用在 `apps/` 下，常见 `apps/console`、`apps/publicService`、`apps/dataAssets`（资产 / 结构化+非结构化文件、权限策略）；共享包 `packages/dt-common`、`packages/ant-design-dtinsight-theme`。

目录约定按 app 不同：`apps/publicService` / `apps/console` 的页面多在 `src/pages/`，而 `apps/dataAssets` **没有 `src/pages`**，页面在 `src/views/<feature>/...`（例：`src/views/unStructured/permissionStrategy/addOrEdit/`）；对它 grep `src/pages` 会直接报 `IO error ... No such file or directory`。dataAssets 的接口 URL 集中在 `src/consts/reqUrls.ts`（`NEW_DATA_URL` 前缀），页面经 `@/api/fileManage` 调用。分支线同样是按 app 前缀：`dataAssets/fix_<version>_<bug id>`（例：`dataAssets/fix_7.0.x_149812`，见 [[bug-dataassets-permission-strategy-149812]]）。

## 单一 Agent 指引（AGENTS.md）

所有 harness（Cursor、Codex、Claude Code、PI、Multica）都读同一份 `AGENTS.md`；它只放硬规则 + 索引表，细节按「每条事实只有一个家」分散到下游文件。索引里的关键路径：

| 主题 | 路径 |
|------|------|
| 写码规范（唯一正文） | `docs/agents/coding-standards.md` |
| 已验证的 bug / 需求解法 | `docs/solutions/`（按 `module` / `tags` 找） |
| 各 app 的坑（console、publicService vs UIC、i18n） | `docs/agents/apps.md` |
| 领域词、数据源卡图标 | `CONCEPTS.md`、`docs/agents/domain.md` |
| Intake / 路由 | `.agents/skills/dt-insight-triage/SKILL.md`、labels 在 `docs/agents/triage-labels.md` |
| 需求分析 | `.agents/skills/requirement-analysis/SKILL.md` |
| Issue / PRD / 低版本 | `docs/agents/issue-tracker.md` |
| 工作区选择 | `docs/agents/references/task-workspace.md` |
| Git / Draft MR / 冲突 | `.agents/skills/dt-insight-git-workflow/SKILL.md` |
| common fan-out | `.agents/skills/dt-insight-common-fanout/SKILL.md` |
| i18n 修复 | `.agents/skills/dt-insight-locale-fix/SKILL.md` |
| 本地联调 | `docs/agents/local-dev.md`、`.agents/skills/dt-insight-local-dev/SKILL.md` |
| 自查取证 | console 7.0 用 `.agents/skills/verify-console-70/SKILL.md`；其它用 `dt-insight-local-dev` |
| review 闸门 | `.agents/skills/dt-insight-review-gate/SKILL.md` |
| OMP 部署 | `dtis omp deploy --env-id N --branch B [--bg]`、`dtis pipeline <iid> [--bg]`；底层 `.agents/skills/omp-skill/SKILL.md` |
| Grok workflows | `.grok/workflows/README.md` |
| 规则怎么加 / 放哪层 | `docs/agents/harness-governance.md` |

固定命令入口是 `dtis --help`（`check` / `dev-ready` / `ready` / `comments` / `branch-check` / `bug` / `mr` / `omp` / `pipeline`）；格式化用 `dtis fmt [文件...]`。

## 本机 overlay（不进仓库）

只在本机存在、登记在 `.git/info/exclude`、永不 commit：`AGENTS.md`、`AGENTS.override.md`、`CLAUDE.md`、`.agents/`、`.claude/`、`.cursor/rules`、`docs/agents/`、`docs/solutions/`、`CONCEPTS.md`。原件在 `~/factory/env/dt-insight-studio/`，仓库里是软链——**改原件，不改软链出来的拷贝**。新 worktree 用 `scripts/git-worktree-add.sh` 建（自动同步 overlay），细节 `docs/agents/references/overlay-worktree-share.md`。

推论：在 worktree 里 grep 这些路径命中的是软链；跨任务复用同一份技能与规范文本。

## 测试环境登录 / 取真实接口返回

- `~/.config/dt-insight/bin/env-api <OMP id|namespace> POST /api/... '<json>'` 直接调接口；`env-api --list` 列环境。
- `curl -b "$(~/.config/dt-insight/bin/env-cookie <env>)" <url>` 复用浏览器登录态；`env-open` 开浏览器。
- 页面出现「未登录」、登录页或验证码时先用上面三个工具，不要停在登录页。

## 已验证的历史（用于判断版本）

`git log` 里出现过 `chore(release): 6.3.48-publicService`、`publicService/release_6.3.x`、`publicService/test_6.3.x_v703` 等分支，说明 publicService 有 6.3.x 主线 + 带 suffix 的 test 线。相关：[[workflow-dt-insight-triage-routing]]、[[workflow-dt-insight-git-delivery-gates]]、[[workflow-zentao-cli]]、[[dt-insight-harness-conventions]]、[[dt-insight-project-workflow]]、[[dt-insight-studio-test-env-access]]、[[zentao-cli]]。
