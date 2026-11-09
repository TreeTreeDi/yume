---
name: dingtalk-ears
description: dingtalk-ears 项目（钉钉群消息监听 + AI 摘要/草稿回复服务）的运行、停止、配置路径、验证方式与代码约定；接手该项目时先读这里。
metadata:
  verified: 2026-10-29 (AGENTS.md 指令内容与一次真实消息处理会话)
---

# dingtalk-ears

本机项目路径 `/Users/mac/workspace/dingtalk-ears`；Agent 工作目录为该项目的 `data/agent`。项目自述（AGENTS.md 中的 project-doc）：所在目录是项目根目录，后端在 `backend/`，网页资源在 `backend/static/`，**所有命令从项目根目录执行**。私有配置为 `config.local.json`（端口与路径），不要整份输出。

## 运行 / 停止

用户要求启动时按顺序做，任一步失败先看进程、状态和日志再决定，避免重复启动：

1. 确认是否已在运行：
   ```sh
   launchctl print "gui/$(id -u)/com.codex.dingtalk-ears"
   curl --fail --silent --show-error --output /dev/null http://127.0.0.1:8766/
   ```
   `8766` 是默认端口示例，实际端口读 `config.local.json`。已正常运行则复用并给出面板链接；已有实例占端口不需要重启处理。
2. 依赖检查：`python3`、`dws`、`codex` 可执行；nvm 环境确认 PATH 有 Node。优先沿用启动项里已安装的 Python 与环境。缺配置才执行 `python3 -m backend init --output config.local.json`（`init` 只生成模板，不会自动读取 DWS 身份）；账号、本人 OpenID、群 ID 要从真实 CLI 返回值核对。登录问题按 README 由本人完成 CLI 授权，不复制他人认证目录。
3. `python3 -m backend --config config.local.json doctor`（无运行实例时才跑），处理阻断错误、说明 warning。
4. 启动：前台 `python3 -m backend --config config.local.json run`；要求后台常驻时在前台实例退出后 `python3 -m backend --config config.local.json service --install`。已安装未加载：`launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.codex.dingtalk-ears.plist"`。新生成 `.plist` 默认不覆盖已有文件，需重生成时用 `--output` 指定新路径。Linux 用前台运行或明确的用户服务。
5. 停止：前台 Ctrl+C；macOS 后台 `launchctl bootout "gui/$(id -u)/com.codex.dingtalk-ears"`。只操作本项目实例，不要广泛 kill Python/Node/Codex 进程。

## 数据与验证

- `paths.state_dir`：数据库、日志、会话；`paths.output_dir`：`运行状态.json` 与摘要。启动时保留这些数据。
- 报告"已启动"前必须验证：进程存活、配置端口 HTTP 可访问、`运行状态.json` 持续更新，并核对监听与 App Server 状态。
- `ready` 只表示订阅就绪，**不能**据此说真实群消息已投递；`degraded` 等异常要如实说明。
- `run --adopt-state` 仅用于已备份且核对为同一账号、同一群的旧数据库；身份不匹配时用独立目录，不删除身份标记绕过检查。
- 启动验证只做读取检查：不自动发钉钉消息、不创建待办；回复与待办都需本人确认，不接 OA 审批。

## 代码约定

- 通用提示词只在 `backend/prompts.py`；输出契约在 `backend/ai_contract.py`；个人称呼只作为私有上下文数据，不写进通用指令。
- 配置、凭据、数据库、日志、摘要、截图不进分享包，分享由 `backend/distribution.py` 白名单控制。
- 改运行逻辑后跑 `python scripts/check.py` 和 `python3 -m unittest discover -s tests -v`；只改文档时检查命令与链接即可。

## 消息处理契约（实际输出形态）

每条推送给 Agent 的输入是 JSON：`new_messages[]`（`key`、`message_id`、`conversation_id`、`sender`、`sender_id`、`time`、`text`、`sources`、`quoted_message`）、`confirmed_sent_replies[]`、`context`（`current_user`、`watched_group`）。输出 JSON 字段为 `summary`、`needs_reply`（布尔）、`draft`（未确认不发送的草稿）、`todos[]`（`title`、`evidence`、`message_key`）。图片消息只带 `mediaId`，未用 `dws chat message download-media` 下载前看不到图，需在 summary 里注明"附图未读取"。

## 委派约定（AGENTS.md）

- UI 设计（布局、视觉风格、交互、视觉验收）由主 Agent 用主模型亲自做，不交给子 Agent。
- 用当前运行时原生角色：代码实现/修复/重构/测试写作用 `worker`，代码调查用 `explorer`；不再派发 DeepSeek 或 Grok 子 Agent。原生角色不可用时同步失败原因。
- 通常同时用 1–2 个子 Agent，遵从用户的单 Agent 要求；委派要交代目标、上下文、负责文件/模块、限制与验收方式，并提示"并非独自工作，保留他人修改"。
- 子 Agent 完成后调 `close_agent` / `interrupt_agent` 之类的运行时结束机制；失败后换方案，不原样重试。

## 分工阅读

- 启动/诊断/后台常驻/验证/停止细节：[[dingtalk-ears-run-and-service]]
- 文件地图与编码约定：[[dingtalk-ears-project-overview]]、[[dingtalk-ears-code-conventions]]（其余同主题整理已合并至此两处）
- 输入/输出 JSON 契约与图片处理：[[dingtalk-ears-message-digest-contract]]、[[dingtalk-ears-reply-output-contract]]
- UI 主题/换肤需求与 UED 评审人反馈：[[dingtalk-ears-ui-theme]]
- 委派规则：[[agent-delegation-policy]]
