---
name: workflow-dt-insight-git-delivery-gates
description: Hard delivery rules for dt-insight-studio — when commit/push/MR is allowed, the Bug 验收闸门, review gate commands, branch naming and CI policy. Read before committing, pushing or claiming a fix is done.
---

# dt-insight Git 与交付闸门（硬规则）

## push 权限

- 卡片写了 `push: allowed` 才能 commit / push / 提 MR；没写或 `push: no` 一律**只改工作区**，回报 diff。
- Bug 修完留在工作区：`dtis ready` 通过 → 按下表取证自测 → 交用户验收（截图 / 本地链接）→ 用户点头后才 commit / push / Draft MR。用户说「直接推 / 不用测」才可跳过。1:1 迁移可 `dtis check` 后直接 push。
- 用户明确说「只回复修复方案 / 不要修改任何文件」时，全程只读：读代码、读禅道、读历史 commit，最后给方案。这不违反「先动手」习惯——按用户要求停手。

## 验收 / review 顺序

1. `dtis ready`（含 ci-local 的 prettier / eslint / stylelint / types）通过。
2. 自测取证：截图 / 命令输出 / 本地链接。
3. 用户点头后才 `code-review`：看**工作区 diff**（`git diff` + `git diff --cached`，不是 `...HEAD`），先过 `.agents/skills/dt-insight-review-gate/SKILL.md` 的注释清单和 slop 两步，再开 Plannotator 审阅页。验收前不发 Plannotator 链接。

## 分支 / MR

- Feat 的 Draft MR 只合带 suffix 的 test 线，用 Feat 模板。
- 分支名与标题用任务号；建分支后跑 `dtis branch-check`。
- publicService 6.3 → console 7.0 的热修走 `console/hotfix_7.0.x_<id>`。
- 例外：publicService shell / 生命周期类热修**不要**移植到 console 7.0（见 `docs/solutions/workflow-issues/do-not-port-publicservice-shell-lifecycle-hotfixes-to-console.md`）。细则 `.agents/skills/dt-insight-git-workflow/SKILL.md`。

## CI

只修 error（import 排序 / prettier / stylelint）；warning 不处理，也不加 `eslint-disable`（只有 stylelint 报错又改不了时才 `stylelint-disable-next-line`）。

## 汇报

卡片写了「验收环境」（域名 + 租户）就只在那里验收。交付报告把「实际验证过」（附命令输出或截图）和「推断」分开写；需求外的问题列在回复里，不顺手修。

相关：[[workflow-dt-insight-triage-routing]]、[[convention-dt-insight-coding-standards]]。
