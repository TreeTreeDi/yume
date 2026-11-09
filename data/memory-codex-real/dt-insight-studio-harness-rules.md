---
name: dt-insight-studio-harness-rules
description: dt-insight-studio 的门禁层：dtis ready/fmt/check 等命令的行为，以及 dt-correct eslint / stylelint 各条规则的覆盖范围和「已写好但未生效」状态。判断某写法会不会被拦、或查 dtis 怎么用时读；AGENTS.md 正文见 dt-insight-studio-agent-rules。
metadata: from docs/agents/coding-standards.md (session 2026-11-02, worktree 161496-r3); lint status as of 2026-11-02
---

# dt-insight-studio：dtis 门禁与 lint 规则

`AGENTS.md` 的硬规则、overlay、交付闸门正文见 [[dt-insight-studio-agent-rules]] 和 [[dt-insight-project-workflow]]；写码细则见 [[dt-insight-frontend-conventions]]。本文件只记**哪条规则由什么拦、拦到什么程度**，因为这决定「改完能不能过」和「哪些约束目前只靠自觉」。

## dtis 命令

- `dtis ready`：ci-local 的 prettier + eslint + stylelint + types；同时运行新注释检查（`dt-correct/no-process-comments`）。交付前必跑——被指出「加 eslint-disable 没被拦」的复盘结论是「跳过了这一步」，lint 本身能拦住。
- `dtis fmt [文件...]`：Node 18 + 本树 `ko prettier --write`。不传文件就格式化相对上游 `@{u}` 有改动的文件和未跟踪新文件，可 `--base <ref>`。不要轮着试 npx / pnpm exec / 改 PATH 找 ko；也不要直接调 `node_modules` 里的 prettier（实测 2.7.1 默认配置把两个文件整份重排，七百多行 diff）。
- `dtis check`：1:1 迁移可直接 check 后 push；`dtis branch-check`：建分支后跑。
- `dtis --help` 固定子命令：check / dev-ready / ready / comments / branch-check / bug / mr / omp / pipeline。
- 部署一律 `dtis omp deploy --env-id N --branch B [--bg]`、`dtis pipeline <iid> [--bg]`，不直接调 omp-skill、不手写轮询。

## dt-correct eslint（`scripts/eslint-plugin-dt-correct/`）

| 规则 | 拦什么 | 范围 / 状态 |
|---|---|---|
| `no-process-comments` | 代码注释里的「本次改动说明 / 修 bug 过程」、Figma 节点号 | `dtis ready` 已拦，范围 lynton + AIAgent |
| `no-message-validation` | 用 `message`/`notification` 拦表单必填（应由 `Form.Item rules` 承担） | 已写好待「推」（worktree `chore/correct_20261023`），只报新增行；接口返回判断（`code`/`success`）不报，表格勾选这类非字段提示在该行 disable 并写原因 |
| `no-scrolltop-misuse` | `scrollTop +=`、带算式的 `scrollTop` 赋值、`useEffect` 里的 `scrollTop` 赋值 | `dtis ready` 已拦 |
| `no-concat-classname` | 手写三元/字符串拼 className（应用 `classNames`） | `dtis ready` 已拦 |
| `no-warn-disable` | 对 eslint warn 级规则加 `eslint-disable`（warn 清单从 ko-lint-config 自动读） | `dtis ready` 已拦 |
| `no-local-asset-import` | import 本地 svg/png（图标先查 `@dtinsight/react-icons`） | `dtis ready` 已拦；CSS `url()` 不管 |
| `no-hardcoded-compare` | 判断用字符串字面量（应用枚举/常量） | `dtis ready` 已拦；放过 `typeof` 和 `event.key` |
| `use-theme-var` | `.ant-*` 等选择器里重写主题已有的色值 | 已写好但 dtis **还没真拦**，修复在 dtis_helper 补丁里，待「推」；色值表从主题 `const.scss` 读，只报新增行，`#FFF`/`#000` 不报 |

stylelint：`comment-pattern` 已拦（CSS/SCSS 一律不写注释，范围 lynton + AIAgent）；确实要绕过只写 `stylelint-disable-next-line`。

commit 规范：`commit-scope.js` 已写好，但 commit-msg 钩子还没挂 → 「一个包一条 commit」目前不拦（待「推」）。

## 由此得出的写法结论

- 图标先查最新版 `@dtinsight/react-icons`（`AigcOutlined`、`AiAvatarSimpleColored`、`TaskProgressColored` 等已有），不要新增 svg/png。
- 自动滚到底写在 `useLayoutEffect`；滚动定位用 `scrollIntoView({ block: 'nearest' })`。
- 颜色用 `@/styles/const.scss` 的 `$black_title` / `$white` 等；只想补间距就别重写 antd 的色/边框/圆角。
- eslint 只报 warning 的不处理（如 ko 配置里 `react-hooks/exhaustive-deps` 是 warn），也不要加 disable；`useEffect` 无需 cleanup 时写裸 `return;`，不写 `return undefined;`。

## 规则治理

新增规则选层、剪枝看 `docs/agents/harness-governance.md`：L0（`AGENTS.override.md`）只放索引和一行硬规则摘要（评测见 `~/factory/evals/PLAYBOOK.md`，模型常跳过链接），正文留在 `docs/agents/coding-standards.md`；能机器检查的条目标「→ lint 候选」，周五 /correct 优先落地。
