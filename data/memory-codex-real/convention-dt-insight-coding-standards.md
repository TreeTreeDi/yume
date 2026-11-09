---
name: convention-dt-insight-coding-standards
description: Checkable coding rules for dt-insight-studio/repo front-end work — Form validation via Form.Item rules, i18n extract flow, defensive-programming bans, lint gates and formatting command. Read before editing .ts/.tsx or scss in that repo.
---

# dt-insight 写码规范（可检查摘要）

正文 SSOT：`docs/agents/coding-standards.md`（改代码或 review 前必读）。L0 `AGENTS.override.md` 只放索引 + 一行摘要。标「→ lint 候选」的能做成机器检查；标「lint 已覆盖」的以 `dtis ready` 报错为准。

## 表单校验（本仓最常被踩）

- 必填、格式校验写成 **`Form.Item` 的 `rules`**；提交 / 「下一步」前 `form.validateFields()`；错误显示在字段下方。
- **禁止**：用 `message.error` 弹提示再 `return`（lint `dt-correct/no-message-validation` 只报新增行，接口 `code`/`success` 判断不报）；手写 `validateStatus` / `help` 标红；用 `ref` / `useImperativeHandle` 把校验交给父组件。
- 页面原来没有 Form 的，就给这个字段包一层 Form。
- `Form.List` / 表格单元格里的动态 `Form.Item` 也要各自挂 `rules`：外层 `Form.Item` 只写 `required`（没有 `name`）只会画个星号，不会校验。反例 149812：`fileObjectSelector` 的 bucket、路径有必填，`matchValue`（正则输入 / 文件选择共用一个字段名，切换模式时还会被主动清空）没有规则，空值直接进保存接口。见 [[bug-dataassets-permission-strategy-149812]]。
- `required` 单独一条放行纯空白字符串：文本输入还要 `{ whitespace: true }`（149812 的方案就是正则框 `required` + `whitespace`）；多选类字段（如 `FileSelect` 的数组）用 `required` 覆盖「未选 / 清空」。
- 分步页 / 弹窗完整做法：`docs/solutions/conventions/form-validation-next-step.md`。
- 父组件需要参与校验时，做法是父组件 `const [form] = Form.useForm()`，把 `form` 作为 prop 传下去，父组件按钮里 `form.validateFields().then(() => next())`；而不是暴露子组件的 `validateXxx()`。

## i18n

- 开发阶段源码直接写中文；**不手改 `locales/**`**，不新增 zh-CN/en-US 字段，key 由 extract 生成。
- 流程：源码写中文 → `fnm exec --using 18 pnpm extract` → 只把 en-US 里本轮新增的中文翻成英文 → `pnpm extract check` 通过。
- 用 `I18N.a.b.X` 全路径引用，不要把词条组赋给变量再 `locale.X`（extract:clear 认不出别名会当死 key 删）。
- 允许删除已无引用的死 key；评审见到 `locales/**` 新增字段即硬违规，`pnpm extract check` 通过也不豁免。

## 不要过度防御

- 数据源已保证有值时不再叠 null/undefined 兜底；判空前先看值从哪来（上游已 `||` / `??` 归一过就直接真值判断）。
- 禁止为「以防万一」加兜底超时 / 保险定时器。
- 禁止猜后端字段名、禁止靠文案子串猜语义；需要分支就让后端给 `errorType`/`code`。
- 组件已有约束（如 Upload `maxCount={1}`）不再叠手写裁剪。
- 接口字段「有没有返回」先在目标环境真实调一次（`env-api`），不能只看前端类型。

## React / 状态

- 新 UI 只用函数组件；非必要不用 `useCallback`；少用 `useEffect`（能从 props/state 算、能在事件处理里做的都不写）。
- 换数据源要清空状态时用 `key` 重新挂载，不写 reset effect。
- 滚动到可见用 `scrollIntoView`；挂载即需的 scrollTop 放 `useLayoutEffect`。
- 拼 className 用 `classNames`；JSX 里同一个值不重复调用函数。
- 新建类组件 / `Record<string, unknown>` 拓宽 / `as` 断言都属于 review 会拦的坏味道。

## 样式

删除没人用的 class（加 class 前确认 scss 有样式）；色值用全局变量（`@import "@/styles/const.scss"`，`$black_title`、`$white`）；写 `.ant-*` 覆盖前先查 `packages/ant-design-dtinsight-theme/theme/dt-theme/const.scss`，同色/同尺寸不重写，只补间距；图标先用 `@dtinsight/react-icons`。

## 注释

非必要不加注释；禁止把「本次改动说明 / 修 bug 过程」写进注释（lint `dt-correct/no-process-comments`）；CSS/SCSS 一律不写注释；注释不写 Figma 节点号。

## Bug fix：收敛优先于完备

- 先问「已有逻辑为何没命中」（路径差异 / 主键不一致 / 状态尚未写入），再谈补逻辑；用能工作的相邻路径对照（多版本 vs 多实例、列表 vs 详情）。
- 未要求测试、未要求扩覆盖、未要求抽象时**不主动扩大 diff**。反例：161496（数据源版本不该默认选第一个）第一版改了 sessionStorage 里 `sqlType` 的结构、加 `haveVersion` 推导和 `ref`，Shane「为什么这么多，必选不就好了」；终版只是把版本做成必填字段。详见 [[bug-publicservice-datasource-version-161496]]。
- 最小闭环：在用户动作入口补一刀（测连通性、提交、删除）挡住症状即可，不默认「完善」整条比对 / 框架链路。

## 命令

- 格式化：`dtis fmt [文件...]`（Node 18 + 本树 `ko prettier --write`；不传文件就格式化相对上游 `@{u}` 有改动的文件和未跟踪新文件）。不要轮着试 npx / pnpm exec / 改 PATH，也不要直接调 `node_modules` 里的 prettier（会整份重排出几百行 diff）。
- 交付前 `dtis ready`；再小的改动也要先对改动文件跑带 dt-correct overlay 的 eslint。
- **本项目不写单测**；删除既有测试须用户明确要求。
- 一个包一条 commit，scope 跟改动走（同时改 `apps/console` 和 `packages/dt-common` 要拆两条）。

相关：[[workflow-dt-insight-git-delivery-gates]]、[[bug-publicservice-datasource-version-161496]]、[[system-dt-insight-studio-workspace]]、[[dt-insight-frontend-conventions]]、[[dt-insight-coding-standards]]、[[dt-insight-studio-harness-rules]]。
