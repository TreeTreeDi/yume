---
name: dt-insight-console-datasource-list-link-info
description: Extras for the console 数据源列表「连接信息」cell beyond the two main write-ups — the `list/constants.tsx` column wiring (column keys, widths, the two conflicting `isMeta` helpers, the Meta tag), the exact exec commands that located the S3 `hostname` row, and the caveat that the session's plan text never reached the transcript. Read together with [[dt-insight-console-datasource-list]] and [[dt-insight-console-datasource-list-connection-info]].
metadata:
  source: codex session 01a199f0-9782-7961-9629-2227f1a3c2ac (2026-11-02), worktree /Users/mac/.factory/ws/16537-r2, zentao story 16537, plan-only turn
---

# 连接信息 cell — extras (apps/console data source list)

The column itself, `getLinkInfoMap`'s meta/DORIS/ICEBERG branches and the accepted story-16537
plan are in [[dt-insight-console-datasource-list-connection-info]] (the more detailed sibling);
the type-id table and story card fields are in [[dt-insight-console-datasource-list]]. This file
records only what those two don't: the surrounding `constants.tsx` column wiring and the
provenance of the findings.

## `apps/console/src/views/dataSource/list/constants.tsx` column wiring

- Imports that set the context: `EllipsisText, StatusTag` from `dt-react-component`, antd
  `Button, Divider, message, Popconfirm, Tag, Tooltip`, `lodash`'s `isArray`,
  `DATA_SOURCE_AUTH` from `@/consts/authCode/pubPermissionCode`, `I18N` from `@/utils/i18n`,
  `checkAuthCode` from `@/utils/unit`, `handleSpace` from `../components/infoConfig/index`,
  `MAIN_COLOR` from `../constants/theme`, `ExtTableCell` from `./components/extTableCell`
  (line 12), `APPLY_BTN_STATUS` from `./type`, plus `./style.scss`.
- `const columns = (props: any) => [...]` closes over `toEdit, toAuth, toApply, toDelete, left,
  right, filters, handleDetailVisible, applyBtnStatus`. Header cells use
  `I18N.views.dataSource.list.constants.A…` so the 连接信息 column is letter **H**.
- Column 1: `key: 'dataName'`, width 220, `fixed: left`, `ellipsis: true`, `EllipsisText`
  (maxWidth 160 normal / 135 plus a `<Tag className="show-meta">Meta</Tag>` when the row is a
  meta source), `onClick: handleDetailVisible(record)`, color `MAIN_COLOR`.
- Column 2: `dataIndex: 'dataType'`, width 200, renders
  `handleSpace(record.dataType, record.dataVersion)` in an `EllipsisText` (maxWidth 160) —
  i.e. the type cell joins type + version into one string.
- Column 3: `dataIndex: 'appNames'`, width 200, `className: 'dt-table-multi-line'`, plain
  `record.appNames || '--'`. Column 4: `dataIndex: 'appProjectMap'`, width 300, renders
  `module：projects.join('，')` lines inside a `Tooltip` (`placement="topLeft"`,
  `overlayClassName="maxW400"`), falling back to `--` when either field is missing.
- **Two different `isMeta` helpers in the same feature**: `constants.tsx` has
  `const isMeta = (meta) => meta === 1;` and separately tests `record.isMeta !== 2` for the Meta
  tag; `extTableCell.tsx` has `const isMeta = (meta: number): boolean => meta === 1 || meta === 2;`
  (2 = trino source synced from the console). Anything that reasons about "meta" rows must say
  which helper it means.

## How the S3 row was located (verifiable trail)

Two `exec` calls in session 01a199f0-9782-7961-9629-2227f1a3c2ac (worktree
`/Users/mac/.factory/ws/16537-r2`) are enough to reproduce the finding:

```zsh
cat /Users/mac/factory/env/skills/typescript-best-practices/SKILL.md
rg -n 'S3|hostname|endpoint|region|extTableCell' apps/console/src/views/dataSource/list
nl -ba apps/console/src/views/dataSource/list/components/extTableCell.tsx | sed -n '160,185p;360,440p'
nl -ba apps/console/src/views/dataSource/list/constants.tsx | sed -n '1,120p'
```

The `rg` returns the single mapping line
`apps/console/src/views/dataSource/list/components/extTableCell.tsx:174: [DATA_SOURCE.S3]: [['hostname', 'hostname']],`
plus every neighbouring object-storage type (`AWSS3`/`CSPS3` → `accessKey`; `MINIO`/`OSS` →
`endpoint`) and the i18n label constants `A`–`P` at the top of the file. The `nl | sed` range
`360,440` lands exactly on `getLinkInfoMap` and `ExtTableCell`, so that range plus `160,185` is
the fastest read of the whole cell.

## Caveats

- The exported transcript of this session ends during the investigation: the agent's replies
  appear only as empty `Message Type: MESSAGE` envelopes (`Task name: /root/s3_display_trace`),
  so the plan text is not in the record. Treat the row values above as verified source reading,
  and the `endpoint` + `region` replacement as a plan (see the siblings above), not a test result.
- The lost-prose caveat is specific to the `ws/16537-r2` session. A sibling session,
  `01a199f8-fb67-7860-ae6a-7a29c7daaa7d` (worktree `/Users/mac/.factory/ws/16537-r1`, same
  plan-only prompt, 2026-11-02), **does** contain the final plan text: change only
  `extTableCell.tsx:174` to `[['endpoint','endpoint'],['region','region']]`, then verify both
  values plus the hover `title` in the real list and run `dtis ready`. So the `endpoint`/`region`
  replacement is an attested agent answer, not merely inferred from the code read
  ([[dt-insight-console-datasource-list-connection-info]]).
- The plan-only framing came from the user: 「只回复你的修复方案（改哪些文件、怎么改、为什么），
  不要修改任何文件」 — no edits, no `dtis`, no dev server.
- TS guidance loaded from `~/factory/env/skills/typescript-best-practices/SKILL.md` (not
  `~/.agents/skills/`); its "no `as`, `unknown` at the boundary" rules are what the `any`-typed
  `showMapArr` / `Record<string, any>` code here violates. Related harness quirk:
  [[codex-new-task-empty-payload]].
