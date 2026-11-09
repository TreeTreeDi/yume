---
name: dt-insight-console-datasource-list-connection-info
description: How the apps/console 数据源列表 renders the「连接信息」column — the `extTableCell.tsx` `showMapArr` per-type `[key, label]` table over `linkJson`, the `getLinkInfoMap` post-processing (meta schema, DORIS http, ICEBERG catalogType), and the S3 story 16537 change from `hostname` to `endpoint` + `region`. Read before editing console data-source list display or S3 整合 work.
metadata:
  source: codex sessions 01a199f4 and 01a199f8-fb67-7860-ae6a-7a29c7daaa7d, both in ws/16537-r1 (2026-11-02), branch console/feat_7.0.x_multimodal_16537_1019; read-only 方案 turns (no files changed)
---

# console 数据源列表「连接信息」列 (apps/console)

Concurrent write-ups of the same column: [[dt-insight-console-datasource-list]] (adds the
DATA_SOURCE numeric ids S3 41 / AWSS3 63 / CSPS3 80 and the card fields) and
[[dt-insight-console-datasource-list-link-info]] (adds the `constants.tsx` vs
`extTableCell.tsx` `isMeta` difference). This page keeps the S3 row table and the check to
run before shipping.

The publicService add-source wizard is a different tree and is covered by
[[dt-insight-data-source-center]], [[dt-insight-public-service-datasource]] and
[[datasource-add-version-flow]]. Repo rules: [[dt-insight-studio-agent-rules]],
[[dt-insight-coding-standards]].

**Path pitfall:** console's data-source pages live under
`apps/console/src/views/dataSource/` (`list/`, `components/infoConfig/`,
`components/infoConfig/dsForm/*`, `components/infoConfig/icebergLinkageRules.ts`).
The publicService wizard lives under `apps/publicService/src/pages/dataSource/`.
So "console has no dataSource page" only holds for `src/pages/dataSource*`.

## Column wiring

`apps/console/src/views/dataSource/list/constants.tsx` (~line 130) defines the list
column: title `I18N.views.dataSource.list.constants.H`, `dataIndex: 'linkJson'`,
`width: 484`, `className: 'dt-table-multi-line'`, `render: (_, record) =>
<ExtTableCell sourceData={record} />`. The rendered cell is therefore a per-row
JSON-derived list, not a single string field. The column's own styling lives in
`apps/console/src/views/dataSource/list/style.scss:176` (the `//连接信息` block).

## `apps/console/src/views/dataSource/list/components/extTableCell.tsx`

- `showMapArr: any` — a registry keyed by `DATA_SOURCE.*` (numeric enum imported from
  `../../constants/index`). Each value is an array of `[dataKey, displayedLabel]` pairs,
  rendered one `<p>` per pair with the label as `{label}：` and the value from the parsed
  JSON. Adding/changing a displayed field is a one-line edit in this table; the layout,
  ellipsis and hover `title` come free.
- Labels are either i18n keys (`I18N.views.dataSource.list.components.extTableCell.A`–`P`;
  `A` = 用户名, `B` = 集群地址, `C` = Broker 地址, `D` = Zookeeper 地址) or raw English
  literals (`'jdbcUrl'`, `'endpoint'`, `'ACCESS KEY'`, `'SecretID'`). New labels must go
  through `pnpm extract`, never hand-edited `locales/**`.
- Data source: `let data = {}; try { data = JSON.parse(sourceData.linkJson) || {} } catch {}`
  — a malformed `linkJson` degrades to `{}` and every row renders an empty value, with no
  error surfaced. Values render as `data[key] || ''` with `title={data[key] || ''}`.
- `getLinkInfoMap({ type, dataType, meta, dataVersion, catalogType })` post-processes the
  table entry before render:
  - `isMeta(meta)` (`meta === 1 || meta === 2`, i.e. a trino source synced from the
    console) appends `['schemaName', 'schema']`, except for Oracle (`dataType === 'Oracle'`)
    and MinIO (`type === DATA_SOURCE.MINIO`).
  - `DATA_SOURCE.DORIS` with `dataVersion.includes('http')` overrides to
    `[['url','Fe Nodes'], ['username', …]]`.
  - `DATA_SOURCE.ICEBERG` branches on `data.catalogType`: `'rest'` →
    `catalogType` / `uri` (rest uri) / `warehouse`; otherwise
    `catalogType` / `hiveMetastoreUris` (metastore uri) / `warehouse`.
- Known rough edge: the `useMemo` dep list is only
  `[sourceData.type, sourceData.dataType, sourceData.isMeta]`, so a record whose
  `dataVersion` or `linkJson.catalogType` changes in place keeps the stale mapping.
  Not touched by the S3 work; mention it rather than fixing it unasked.

## List data layer (`apps/console/src/api/pub/dataSource.ts`)

- Base: `const api = window.APP_CONF.API_PREFIX_PS || PUBLIC_SERVICE_PC_BASE_URL;` from
  `@/consts/reqUrls` — the console list is backed by the **publicService** service even though
  the UI is console.
- POSTs the list/详情 flow uses: `/dataSource/page` (list paging), `/dataSource/detail`,
  `/dataSource/type/list`, `/dataSource/product/list`, `/dataSource/delete`,
  `/addDs/queryDsClassifyList`, `/addDs/queryDsTypeByClassify`, `/addDs/queryDsVersionByType`,
  `/dsForm/findFormByTypeVersion`, `/addDs/addOrUpdateSource`, `/addDs/testCon`,
  `/dataSource/auth/product/*`, `/dataSource/dataPreview/select|switch`.
- `linkJson` is produced by `/dataSource/page`; its key set is backend-owned, which is why the
  S3 `endpoint` / `region` change has to be confirmed against a real response rather than the
  frontend mapping alone.

## S3 整合 (ZenTao story 16537)

Story: `【公共组件】s3数据源整合`, product 207, plan 916 「10月第二批迭代」, project 1158
「多模态10.19～10.30」, openedBy `zhizhang` 2026-10-12 10:17:56, pri 3, stage `developed`,
`dev_version` 7.0, PRD `V5.2.2`, `planDevVersion` git 分支 5.2.2, spec 「目前数据源中心 s3
数据源版本较多，后续多模态主要依赖 s3 协议对象存储」. Its only child task is 21255
`【前端】【公共组件】s3数据源整合`, assignedTo `huaiju`, status `done`, consumed 8h /
left 0 (`zentao story 16537 --json`).

Reported defect: the console 数据源列表 shows S3 connection info as `hostname`, while the
backend now returns `endpoint` and `region`. Cause is the table entry at
`extTableCell.tsx:174`:

```tsx
[DATA_SOURCE.S3]: [['hostname', 'hostname']],
```

Object-storage siblings in the same table already read `endpoint` and are the precedent
to copy: `OBS` → `endpoint` / `bucket` / `working`; `MINIO` → `endpoint`; `OSS` →
`endpoint`; `RABBIT_MQ_CMQ` → `endpoint` / `SecretID`. `AWSS3` and `CSPS3` show only
`['accessKey', 'ACCESS KEY']`, so an S3-ish type number reaching `DATA_SOURCE.S3` is what
produces the `hostname` cell — confirm which enum value the backend sends (`S3` vs
`AWSS3` / `CSPS3` / `OSS` / `MINIO`) before editing, because only the matching key changes.

Accepted 方案 (plan only in that session, no files modified): replace the entry with

```tsx
[DATA_SOURCE.S3]: [
    ['endpoint', 'endpoint'],
    ['region', 'region'],
],
```

One file, one table entry; no `hostname` fallback, no extra defensive layer
(Laziness Protocol / 收敛优先于完备). Before shipping, call the real list API against a
test env (`env-api` / `env-cookie`, see [[dt-insight-studio-test-env-access]]) and read an
actual `linkJson` to confirm the backend field names are exactly `endpoint` and `region`;
that check was **not** done in this session, so the contract is still second-hand from the
requester. Verify the rendered cell in the running list page (both values present, long
endpoint string ellipsis/hover title fine) before claiming done.

## Process notes

- Cheapest triage for "which field does the list show for type X": `rg -n -i 's3|endpoint|hostname'
  apps/console/src --glob '*source*'` returns the single `extTableCell.tsx:174` mapping line
  (session 01a199f8), i.e. the display key lives only in that table — no per-type component to
  hunt down. `rg -n -i 's3|endpoint' docs/solutions` returned nothing relevant, so there is no
  recorded prior solution for S3 显示字段; don't spend turns re-searching it.
- Session 01a199f8 (`ws/16537-r1`) is the one whose **prose reply survived** and states the plan
  in the agent's own words: 只需修改 `extTableCell.tsx:174`, replace `[['hostname','hostname']]`
  with `[['endpoint','endpoint'],['region','region']]`, because the cell `JSON.parse`s
  `sourceData.linkJson` and reads each mapped key, so the existing row render + `title` hover
  come free; it ends with 「实施后在真实列表确认两个字段的值和悬浮提示正确，并运行 `dtis ready`」
  and 「本次未修改任何文件」. Use that as the acceptance checklist for the implementation turn.
- `zentao story <id> --json` is the fast check for 「前端任务做完了吗」: it returns the
  story fields plus `tasks` with `assignedTo` / `status` / `consumed`, so no separate
  `zentao list 1158` call is needed.
- `rg -n 'hostname' apps/console packages/dt-common` found exactly one hit
  (`extTableCell.tsx:174`); the other two hits were `window.location.hostname` in
  `apps/console/src/public/config/config.js`. That grep is a cheap way to locate the
  display field for any data source.
- The session was deliberately read-only ("只回复你的修复方案…不要修改任何文件"), so the
  poteto-mode feature playbook's delegate/verify/commit steps did not apply; stop at the
  plan instead of spawning a worker.
