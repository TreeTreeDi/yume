---
name: zentao-cli
description: The `zentao` command-line tool for the company ZenTao (zenpms.dtstack.cn 12.3.3) — read bugs/tasks/stories, batch edit/start/finish, record hours, resolve bugs; includes the dry-run-first safety rule, batch semantics, session cache, field tables and known pitfalls. Read when a session needs ZenTao bug/task context or must post a change back to ZenTao.
metadata: source = installed skill `~/.agents/skills/zentao-task/SKILL.md`, loaded in codex session 01a197d1 (2026-11-01)
---

# ZenTao CLI (`zentao`)

Overlapping reference from another session: [[workflow-zentao-cli]] (field tables below are
already merged there; keep both linked until the organizer dedupes).

Internal site `zenpms.dtstack.cn` (12.3.3 open-source edition); needs the company network or
VPN. Binary `zentao` is on PATH (`~/.local/bin/zentao` → `scripts/zentao.sh`); helper
modules `scripts/zt_form.py` (form engine), `zt_fmt.py` (output), `zt_check.py` (pre-write
judgement + read-back compare).

Account defaults to `huaiju`; the password is read only from the macOS keychain item
`zentao-zenpms / huaiju` and is never printed (don't use `set -x`). The keychain value must
be stripped of its trailing newline (`tr -d '\n'`) or login fails and counts toward the
lockout.

## Read (safe)

```bash
zentao bug 161496 [--json]              # full bug object
zentao view 21256 [--json]              # task detail
zentao story 16537                      # requirement + its tasks
zentao user huaiju [--tasks|--bugs] [--assigned|--finished|--opened] [--status done] [--json]
zentao my | my-bugs [--all] [--json]
zentao projects 灵瞳                     # find project/iteration ids by keyword
zentao info 1160 | team 1160 | list 1160 [--mine] [--status wait] | stories 1160
zentao logout
```

- Only your own user can be queried (`user-task`/`user-bug` deny other accounts;
  `list <projectId>` is the workaround).
- The project id is embedded in task URLs (`task-create-1158-0-0.html` → project 1158).
- `--json` output is raw fields; single queries take ~0.2–0.4 s.

Useful bug fields in the JSON (seen on 161496): `product`, `title`, `type` (`产品BUG`),
`severity`, `pri`, `status` (`active`/`resolved`/`closed`), `openedBy`, `openedDate`,
`openedBuild`, `assignedTo`, `resolvedBy`, `resolution`, `resolvedBuild`, `testtask`,
`steps` (HTML; screenshots only as `/zentao/file-read-<n>.png`), `files`.

## Write (team-visible — always dry-run first)

```bash
zentao create 1160 --name "【前端】xxx" --estimate 8 [--story ID] [--module ID] --dry-run
zentao edit 21256 --pri 2 --stage debug --dry-run
zentao start 21256 [--left 8] --dry-run
zentao finish 21256 --consumed 6 --dry-run
zentao log 21256 --consumed 2 --work "联调" [--left 6] --dry-run
zentao team-add 1160 qunshan [--role 研发] --dry-run
zentao resolve 160866 --resolution Fixed --build trunk --dry-run
```

Rules: every write is visible to the whole team. Run `--dry-run`, paste the summary to
Shane verbatim, and only remove `--dry-run` for the exact operation he approved, one at a
time. If a submit fails or the result is unclear, read back with `view`/`list` instead of
retrying blindly.

## Batch (edit / start / finish)

- Accepts comma lists, space lists, `--ids`, `--from-file ids.txt` (numbers, `#21256`,
  URLs; `//` or `#` comment lines), or `--stdin`. `log` (hours) is single-record only.
- One login per batch, **sequential by default** (1–5 s per item). `--jobs N` is capped at
  3 with a warning; 10 concurrent logins once silently lost 12 writes — keep the default.
- Per item: snapshot → skip if already at target (`ALREADY`) → read form preview → submit
  → read back and diff. Outcomes: `OK`, `ALREADY`, `DRYRUN`, `NOT_LANDED` (one automatic
  re-read/retry), `MISMATCH`, `UNEXPECTED` (aborts the rest of the batch), `REJECTED`,
  `ERROR`; exit code 1 if anything is not OK/ALREADY/DRYRUN.
- Snapshots/logs under `~/.cache/zentao/batch/<time>-<op>[-dry]-<pid>/`
  (`<id>.before.json`, `.after.json`, `.diff.txt`, `.log`, `summary.tsv`) — rollback from
  `before`.
- Diff ignores `lastEditedBy/lastEditedDate/assignedDate`; `desc`/`comment` are not compared.

## Session and timeouts

Session cached 10 min (sliding) under `$TMPDIR/zentao-cli-<uid>/` (0700, cookie +
sessionID only). Kicked back to login → cache invalidated, one re-login.
`ZENTAO_NO_CACHE=1` disables caching; `zentao logout` clears it. Timeouts: connect 8 s,
read 45 s, write 90 s; read requests retry once, **writes never auto-retry** (report
"结果不明" and read back). Override with `ZENTAO_TIMEOUT`, `ZENTAO_WRITE_TIMEOUT`,
`ZENTAO_SESSION_TTL`.

## Field tables

- `type`: design 设计 | devel 开发 | request 需求 | test 测试 | study 研究 | discuss 讨论 |
  ui 界面 | affair 事务 | misc 其他
- `taskRole` (custom field, mandatory in the UI): pd | backEnd | **front 前端开发** |
  engine | ui | test | op | schedule. Hard rule: always `front`; other values error out
  (`ZENTAO_ALLOW_NON_FRONT=1` bypasses — don't use it).
- `taskStage`: plan 方案编写 | review 评审 | **develop 研发** | test 测试 | debug 联调 |
  release 发布
- Bug `resolution`: Fixed 已解决 | bydesign 设计如此 | duplicate 重复 (`--duplicate ID`) |
  external 外部原因 | notrepro 无法重现 | postponed 延期处理 | willnotfix 不予解决

## Pitfalls

- `task-create` needs multipart `assignedTo[]`; passing `assignedTo` returns success but
  creates nothing.
- `api.php` (v1 REST) does not work on 12.3.3; it's the old session JSON API
  (`api-getSessionID.json` → `user-login.json` → `zentaosid` cookie).
- Unselected dropdowns in the edit form: keep the detail value if the form doesn't offer it
  (e.g. parent task), else submit empty when the first option is blank, else omit (so a
  null `taskRole` is not silently turned into `pd`).
- Completed/closed/cancelled tasks are still editable; edits refresh
  last-edited-by/date and leave a history entry.
- The server is sometimes slow (>30 s per request) — prefer sequential batches.
- macOS bash 3.2: write `${var}` when Chinese text follows a variable.
- Links in descriptions are auto-linkified; `#anchor` ends up outside the link.

The installed skill text lives at `~/.agents/skills/zentao-task/SKILL.md` (also mirrored under
`~/factory/env/skills/zentao-task/SKILL.md`). Project-side routing of a bug card (intake,
branch prefix, delivery gate) is in [[dt-insight-project-workflow]] and
[[dt-insight-studio-agent-rules]].
