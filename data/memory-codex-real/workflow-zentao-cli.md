---
name: workflow-zentao-cli
description: Using the company 禅道 (zenpms.dtstack.cn 12.3.3) via the `zentao` CLI — read commands, write-command safety rules, batch semantics, session cache and known traps. Read when pulling bug/task detail or when a fix needs a 禅道 update.
---

# 禅道 CLI：`zentao`（zenpms.dtstack.cn，12.3.3 开源版）

`zentao` 在 PATH 上（`~/.local/bin/zentao` → `scripts/zentao.sh`）。内网，需要公司网络 / VPN。默认账号 `huaiju`，密码只从 macOS 钥匙串 `zentao-zenpms / huaiju` 读。`zentao help` 看完整用法。

## 读（只读，随便用；都支持 `--json`）

```bash
zentao bug 161496                 # Bug 详情
zentao view 21256                 # 任务详情
zentao story 16537                # 需求详情和下属任务
zentao my-bugs [--all]            # = user huaiju --bugs --status active
zentao my [--all|--status ..]     # = user huaiju --status wait,doing,pause
zentao user huaiju [--tasks|--bugs] [--assigned|--finished|--opened] [--status done] --json
zentao projects 灵瞳              # 按关键字找项目/迭代 ID
zentao info 1160 / team 1160 / list 1160 [--mine] / stories 1160
```

`--json` 输出原始字段（view/bug/story 是对象；list/user/my/projects 是数组）。只能查自己（huaiju）的任务/Bug，别人的 `user-task`/`user-bug` 接口无权限（user-deny），改用 `list <项目ID>`。URL 里的 `task-create-1158-0-0.html` 的 1158 是项目（迭代）ID。

Bug JSON 里有用的字段：`title`、`status`（`active` / `resolved`）、`resolution`（Fixed / bydesign / duplicate / external / notrepro / postponed / willnotfix）、`resolvedBy` / `resolvedDate` / `resolvedBuild`、`openedBy` / `openedDate` / `openedBuild`、`assignedTo`、`product`、`pri`、`severity`、`steps`（HTML，截图是 `/zentao/file-read-<id>.png`）、`testtask`、`issueApp`。`steps` 里的图片要按 hash 第一段判断 product。

## 写（团队可见）

```bash
zentao create 1160 --name "【前端】xxx" --estimate 8 [--story ID] --desc .. --dry-run
zentao edit 21256 --pri 2 --stage debug --dry-run
zentao start 21256 [--left 8] --dry-run
zentao finish 21256 --consumed 6 --dry-run
zentao log 21256 --consumed 2 --work "联调" [--left 6] --dry-run
zentao team-add 1160 qunshan [--role 研发] --dry-run
zentao resolve 160866 --resolution Fixed --build trunk --dry-run
```

- **所有写操作团队可见**：先 `--dry-run`，把摘要原样给 Shane 看，他说 OK 后才去掉 `--dry-run`，且每次只执行他确认过的那一条。
- 提交失败或结果不明不盲目重试：先 `view` / `list` 回读确认成没成。
- `taskRole` 硬规则：一定是「前端开发」= `front`；create 默认就是 front，传别的值直接报错（`ZENTAO_ALLOW_NON_FRONT=1` 可绕过，别用）。
- create 默认：`type=devel`、`taskStage=develop`、指派 `huaiju`、`pri=3`、不填日期/抄送。不要替 Shane 编工时，他没给就先问。
- 字段值：type `devel`/`request`/`test`/`design`/`ui`…；taskStage `plan`/`review`/`develop`/`test`/`debug`/`release`。
- 完整字段表（`zentao help` 同源）：type `design` 设计 | `devel` 开发 | `request` 需求 | `test` 测试 | `study` 研究 | `discuss` 讨论 | `ui` 界面 | `affair` 事务 | `misc` 其他。taskRole（二开必填字段）`pd` 产品 | `backEnd` 后端 | `front` 前端开发 | `engine` 引擎 | `ui` | `test` | `op` 运维 | `schedule` 调度开发。taskStage `plan` 方案编写 | `review` 评审 | `develop` 研发 | `test` 测试 | `debug` 联调 | `release` 发布。Bug resolution `Fixed` 已解决 | `bydesign` 设计如此 | `duplicate` 重复（配 `--duplicate ID`）| `external` 外部原因 | `notrepro` 无法重现 | `postponed` 延期处理 | `willnotfix` 不予解决。
- `zentao logout` 立即登出并清掉会话缓存（共享机器 / 换账号时用）。

## 批量（edit / start / finish）

逗号列表、空格分隔、贴 `task-view-<id>.html` 链接、`--ids a,b`、`--from-file ids.txt`、`cat ids.txt | zentao edit --stdin` 都行；文件里 `// ` 或 `# ` 开头是注释。整批共用一次登录，**默认顺序执行**（每条 1–5 秒）。`--jobs N` 上限 3，并发时每条车道各登一次；今天 10 并发有 12 条静默没落地，所以批量就用默认顺序。`log` 只支持单条。

结果标记：`OK` 一致 | `ALREADY` 已是目标值（不提交）| `DRYRUN` | `NOT_LANDED`（回读无变化会自动重读表单重试 1 次）| `MISMATCH` | `UNEXPECTED`（目标字段对但别的字段也变了，**立即停止后续**）| `REJECTED` | `ERROR`。任何一条不是 OK/ALREADY/DRYRUN 时退出码 1。

快照与日志：`~/.cache/zentao/batch/<时间>-<op>[-dry]-<pid>/`（`<id>.before.json`、`.after.json`、`.diff.txt`、`.log`、`summary.tsv`），回滚按 before 改回去。

## 会话与超时

登录后会话缓存 10 分钟（每次使用顺延），在 `$TMPDIR/zentao-cli-<uid>/`（0700，只存 cookie/sessionID，无密码）；连续命令不再重登（单条查询约 0.4s，否则 1–2s）。被踢回登录页会自动作废缓存重登 1 次；`ZENTAO_NO_CACHE=1` 免缓存，`zentao logout` 立即登出。超时：连接 8s、读 45s、写 90s；读超时自动重试 1 次，写请求绝不自动重试（只提示「结果不明」并回读判断）。可用 `ZENTAO_TIMEOUT` / `ZENTAO_WRITE_TIMEOUT` / `ZENTAO_SESSION_TTL` 覆盖。

## 坑

- 建任务传 `assignedTo` 会返回 success 但实际没建出来，必须用 `assignedTo[]`（multipart）。
- 钥匙串取出的密码要先 `tr -d '\n'`，否则登录失败还计入锁定次数。
- `api.php`（v1 REST）在 12.3.3 里不能用；用旧 session JSON API（`api-getSessionID.json` → `user-login.json` → 带 `zentaosid`）。
- 编辑表单里没选中值的下拉框：详情有原值的按原值回填；否则首项为空就提交空值；否则不提交、保留原值（如 taskRole 为 null 不会被改成 pd）。
- 已完成 / 已关闭 / 已取消的任务也能编辑；编辑会刷新最后编辑人/时间并留历史记录。
- 服务器偶尔很慢，单请求可能 >30 秒。
- macOS 自带 bash 3.2：中文紧跟变量时必须写 `${var}`。
- 描述里的链接会被自动转成超链接，`#锚点` 会落到链接外面。

相关：[[workflow-dt-insight-triage-routing]]、[[bug-publicservice-datasource-version-161496]]。
