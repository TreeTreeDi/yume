---
name: dt-insight-console-datasource-list
description: apps/console data source list page (views/dataSource) — the connection-info cell ExtTableCell, its showMapArr key/label table, DATA_SOURCE type ids 41/63/80 for S3 family, and story 16537 "S3 shows endpoint + region instead of hostname" with the one-line accepted plan. Read before changing how a data source's linkJson is displayed in the console list.
metadata:
  source: codex sessions 01a199f4 and 01a199f8-fb67-7860-ae6a-7a29c7daaa7d (2026-11-02), worktree /Users/mac/.factory/ws/16537-r1, branch console/feat_7.0.x_multimodal_16537_1019
  status: fix plan only, no files were modified and nothing was verified in the UI
---

# Console 数据源列表 connection-info cell (apps/console)

The add-source **wizard** lives in `apps/publicService` ([[dt-insight-data-source-center]],
[[dt-insight-public-service-datasource]]). The **list page** and its per-type connection-info
column live in `apps/console`, so both trees hold data-source code. Greps for data-source
list rendering must target `apps/console/src/views/dataSource`, not `apps/publicService`.
Repo-wide rules: [[dt-insight-studio-agent-rules]]; front-end code rules:
[[dt-insight-coding-standards]].

## Where it renders

- `apps/console/src/views/dataSource/list/constants.tsx` — list columns; the 连接信息 column
  (`I18N.views.dataSource.list.constants.H`, `dataIndex: 'linkJson'`, `width: 484`,
  `className: 'dt-table-multi-line'`) renders `<ExtTableCell sourceData={record} />`.
- `apps/console/src/views/dataSource/list/components/extTableCell.tsx` — the cell.
  `ExtTableCell` does `JSON.parse(sourceData.linkJson) || {}` inside a bare `try/catch`, then
  `useMemo` over `getLinkInfoMap({ type, dataType, meta: sourceData.isMeta, dataVersion,
  catalogType })` with deps `[sourceData.type, sourceData.dataType, sourceData.isMeta]`,
  and renders one `<p>` per mapping row as `label：value` where value is
  `data[key] || ''` inside `<span className="link-json" title={data[key] || ''}>`.
- `getLinkInfoMap` is a table keyed by `DATA_SOURCE.<TYPE>`; each value is an array of
  `[linkJsonKey, displayLabel]` pairs. Labels are either the raw key (`'jdbcUrl'`,
  `'endpoint'`) or an i18n entry `I18N.views.dataSource.list.components.extTableCell.A..P`.
  Some types branch inside the table (ICEBERG on `catalogType`, Hadoop/others on
  `dataType`/`dataVersion`), so a new row shape can live in the same map without touching
  the render function.

## Type ids (`apps/console/src/views/dataSource/constants/index.ts`)

`S3: 41`, `AWSS3: 63` (label `'AWS S3'`), `CSPS3: 80` (label `'CSP S3'`), `MINIO`, `OSS`.
Current mappings for the object-storage family:

| type | rows shown |
|------|-----------|
| `DATA_SOURCE.S3` | `[['hostname', 'hostname']]` (line ~174) |
| `DATA_SOURCE.AWSS3` | `[['accessKey', 'ACCESS KEY']]` |
| `DATA_SOURCE.CSPS3` | `[['accessKey', 'ACCESS KEY']]` |
| `DATA_SOURCE.MINIO` | `[['endpoint', 'endpoint']]` (~line 356) |
| `DATA_SOURCE.OSS` | `[['endpoint', 'endpoint']]` (~line 357) |
| `DATA_SOURCE.OBS` | `endpoint`, `bucket`, `working` |
| `DATA_SOURCE.RABBIT_MQ_CMQ` | `endpoint`, `SecretID` (endpoint precedent outside the S3 family) |

Only the `DATA_SOURCE.S3` key produces the `hostname` row, so a wrong enum value
(`AWSS3` / `CSPS3` / `OSS` / `MINIO`) would not show `hostname` at all; if a report says the
cell shows `hostname`, the record's `type` is 41.

A sibling write-up of the same column (meta-source `schemaName` append, DORIS/ICEBERG
branches, `useMemo` deps that ignore `dataVersion`/`catalogType`, and the console
`api/pub/dataSource.ts` layer that calls publicService) lives in
[[dt-insight-console-datasource-list-connection-info]].

## Story 16537 — S3 连接信息显示 endpoint + region

- 禅道 `http://zenpms.dtstack.cn/zentao/story-view-16537.html`; title
  「【公共组件】s3数据源整合」; product 207, plan 916 「10月第二批迭代」, project 1158
  「多模态10.19～10.30」, `dev_version` `,7.0`, PRD 版本 V5.2.2, planned git branch 5.2.2,
  openedBy `zhizhang` 2026-10-12, stage `developed`. Child task 21255
  「【前端】【公共组件】s3数据源整合」, assignedTo `huaiju`, status `done`, consumed 8h.
  Worktree branch at analysis time: `console/feat_7.0.x_multimodal_16537_1019`.
- Request: the backend moved S3 connection info to `endpoint` + `region`; the console list
  still displays `hostname`.
- Accepted plan (one file, one mapping row — `extTableCell.tsx` only; no i18n keys, no
  render-function change, no other data source touched):

```tsx
[DATA_SOURCE.S3]: [
    ['endpoint', 'endpoint'],
    ['region', 'region'],
],
```

- Precedent in the same file and in `components/infoConfig/icebergLinkageRules.ts`, where
  `S3_FIELDS = ['endpoint', 'region', ...]` for `ICEBERG_STORAGE_TYPE.S3` — both show that
  `endpoint` and `region` are the agreed S3 keys, so the plan follows an existing pattern
  rather than inventing field names.
- Unverified: no code was written and no page was opened, so the claim "S3 列表显示
  endpoint + region" is a plan, not a tested result. After implementing, confirm a real S3
  record's `linkJson` carries both keys (the cell prints blank for a missing key) and
  regression-check the other rows of the 连接信息 column.

## Sessions on this card

Session `01a199f8-fb67-7860-ae6a-7a29c7daaa7d` (2026-11-02, cwd `/Users/mac/.factory/ws/16537-r1`,
same plan-only prompt) is the transcript that carries the plan **verbatim**: its reply is
「只需修改 `apps/console/src/views/dataSource/list/components/extTableCell.tsx:174`」, the
endpoint+region table entry, and the rationale 「当前列表解析 `sourceData.linkJson` 后，按映射中的字段取值展示；
S3 仍读取旧字段 `hostname`…改为读取 `endpoint`、`region` 即可复用现有逐行展示和悬浮提示逻辑」, closing with the
post-fix checks (verify both values and the hover title in the real list, then `dtis ready`)
and 「本次未修改任何文件」. So the endpoint+region plan is attested as the agent's own answer,
not reconstructed from tool calls. Files it read to get there: `.agents/skills/dt-insight-triage/SKILL.md`,
`docs/agents/coding-standards.md`, `~/factory/env/skills/zentao-task/SKILL.md`,
`~/factory/env/skills/typescript-best-practices/SKILL.md`, `principle-type-system-discipline`,
`zentao story 16537` (no `--json`: title/project 1158/task 21255 `[done]`/assignee `huaiju`/描述
quoted above), `git branch --show-current` → `console/feat_7.0.x_multimodal_16537_1019`,
`rg -n -i 's3|endpoint|hostname' apps/console/src --glob '*source*'`,
`rg -n -i 's3|endpoint' docs/solutions` (no hits — no prior solution entry to copy),
`rg -n 'hostname' apps/console packages/dt-common`, then the full `extTableCell.tsx`.

Session `01a199f4` ran in worktree `/Users/mac/.factory/ws/16537-r1` and is the transcript
behind the card fields and the plan above. It is plan-only ("只回复你的修复方案…不要修改任何
文件"): it read `AGENTS.md` + `AGENTS.override.md`, the poteto-mode skill and feature
playbook, `dt-insight-triage`, coding-standards, `zentao story 16537 --json`, grepped for
`hostname`, read `extTableCell.tsx` and the list column, and stopped at the plan.

Two further sessions used the same `01a199f0` prefix but are different transcripts — keep
them apart:

- `01a199f0-9783-…` (worktree `/Users/mac/.factory/ws/16537-r1`, task
  `/root/s3_plan_check`): replied with a `NEW_TASK` delegation envelope and an empty payload
  ([[codex-new-task-empty-payload]]), so do not take facts from it.
- `01a199f0-9782-7961-9629-2227f1a3c2ac` (worktree `/Users/mac/.factory/ws/16537-r2`, task
  `/root/s3_display_trace`): same plan-only prompt, and it **did** run the analysis —
  `rg -n 'S3|hostname|endpoint|region|extTableCell' apps/console/src/views/dataSource/list`
  plus `nl -ba …/extTableCell.tsx | sed -n '160,185p;360,440p'` and
  `nl -ba …/list/constants.tsx | sed -n '1,120p'` — confirming the `hostname` row at line 174
  and the `getLinkInfoMap` shape independently. Its prose reply never reached the transcript
  (only empty `Message Type: MESSAGE` envelopes), so it corroborates the code reading but adds
  no new plan; details in [[dt-insight-console-datasource-list-link-info]].

`zentao story 16537 --json` alone answers "is the front-end task done" — it inlines `tasks`
with `assignedTo` / `status` / `consumed`, so no separate `zentao list 1158` call is needed.

## Finding the spot fast

`rg -n 'hostname' apps packages --glob '*.{ts,tsx,js,jsx}'` returns the S3 mapping directly
(`extTableCell.tsx:174`) plus unrelated `window.location.hostname` uses in
`apps/console/src/public/config/config.js` and `packages/dt-utils/docs/sw.js`.
