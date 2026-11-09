---
name: workflow-dt-insight-triage-routing
description: How dt-insight intake decides kind / target branch / which downstream skill to load (Bug vs 需求 vs 提测 vs 版本同步), and when to skip the ceremony. Read when a 禅道 bug / PRD / 提测 / 回灌 request arrives.
---

# dt-insight triage：kind → 分支 → 下游 skill

入口 `.agents/skills/dt-insight-triage/SKILL.md`，四步：**classify → validate → judge → dispatch**。它是 intake 层，不展开切分支 / Draft MR / 禅道三句。

## 1. Classify（定唯一 kind）

| kind | 信号 |
|------|------|
| 需求 | 禅道任务/需求、PRD、蓝湖、新功能 |
| Bug | 禅道 Bug、崩溃/不对/回归、截图报障 |
| 提测 | 建 test 分支、开提测轮次、`test_*` |
| 版本同步 | 回灌、跨版本、test 合 release、合 release 冲突 |

「在 62 有吗 / 需要修吗 / 低版本」是原 Bug 的「需要修」闸门，kind 仍是 Bug，不是版本同步。

## 2. Validate（handoff 字段）

`product`（有截图时用图片 hash 第一段）、`version`（如 `7.0.x` / `6.2.x`）、`branch_flavor`（标品 `origin` / 定制化 `custom`）、`owner`（仅定制化）、`suffix`（仅提测 / 上 test 的 feat·fix，如 `v701`）。并与 `git branch --show-current` 对照；矛盾要说明，不静默改基线。

## 3. Judge（会改变路由的分叉）

| kind | 分叉 | 目标 |
|------|------|------|
| 需求 | 带 suffix 的 test | 前缀 `feat` |
| Bug | 修到 test vs 线上/release | test → `fix`；release/线上 → `hotfix` |
| Bug | 标品已有 hotfix + 要定制分支 | `custom/<product>/release_<ver>_<owner>` → `hotfix` |
| Bug | 对应版本已验证 + 低版本要修 | 该低版本 `release_*` → `hotfix` |
| 提测 | — | 建 `test_*`（须有 suffix） |
| 版本同步 | 同版本 test↔release vs 跨版本 | 同版本 → **回灌**；跨版本 → **跨版本** |

「A 到 B 冲突」按语义判：同版本 test↔release 一律回灌（release → test），不按话术字面方向 merge。

## 4. Dispatch

handoff 字段：`task_id / kind / product / version / flavor / owner / suffix / target_base / branch_prefix(feat|fix|hotfix|test|conflict) / scenario(回灌|跨版本|—) / git_workflow_branch(1–5|—) / why / open_questions / next_skill`。

对应 git-workflow 分支：需求 = Branch 2 feat；提测 = Branch 1 test；Bug → test = Branch 4 fix；Bug → release/线上 = Branch 3 hotfix；版本同步 = Branch 5（回灌 / 跨版本）。

## 执行约定

- 用户说「分发 / 找人」才转交其他 Agent；handoff 后仍是**本 Agent** 在目标树继续（`docs/agents/references/task-workspace.md`），不要 `herdr agent start`。
- 只有「只判断 / 先别动手」才停在 handoff。
- Bug 标题能看懂就不复现；信息不够先问用户要不要复现（2026-10-28 约定）。难复现才用已安装的 `diagnosing-bugs`。
- 已有分支修过同一 bug：先比对那条分支和当前代码，判断能否直接用，再决定复现。
- 上下文已齐（用户已点明 hotfix / product / version / flavor）可跳过 Classify 仪式，直接补 handoff 并 Dispatch。
- 分支名实例：dataAssets 的 Bug → test 落地为 `dataAssets/fix_7.0.x_<bugId>`（149812，2026-11-02）；`git branch --show-current` 与卡片对照是 validate 步的常规动作。
- 只要方案、不要动文件的请求（「只回复修复方案，不要修改任何文件」）停在诊断 + 方案，不切分支、不写代码；结果按「已提出、未落地」记录（见 [[bug-dataassets-permission-strategy-149812]]）。
- 附属流程：i18n 红 → `dt-insight-locale-fix`；本地验证 → `dt-insight-local-dev`；冲突 → `resolving-merge-conflicts`。
- `needs-triage` / `ready-for-agent` 这类 issue label 状态机在 `/triage` + `docs/agents/triage-labels.md`，与本 skill 并存、不互相取代。

相关：[[workflow-dt-insight-git-delivery-gates]]、[[system-dt-insight-studio-workspace]]、[[workflow-zentao-cli]]、[[dt-insight-workflow]]、[[dt-insight-harness-conventions]]。
