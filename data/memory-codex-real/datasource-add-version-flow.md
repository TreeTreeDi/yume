---
name: datasource-add-version-flow
description: "数据源版本 dataVersion 如何贯穿「新增数据源」第 2/3 步：ProduceAuth 版本入口、InfoConfig 用 findTemplateByTypeVersion(handleSpace 拼 dataType) 决定表单模板、dsForm/* 按 `${dataType} ${dataVersion}` 分支、提交时的 dataVersion 归一；查版本影响表单字段集时读。"
metadata: apps/publicService/src/pages/dataSource; read-only against worktree /Users/mac/.factory/ws/161496-r1 on 2026-11-01, no files changed
---

# 数据源版本（dataVersion）如何决定信息配置表单

向导结构、sessionStorage 状态键、Bug 161496（版本不该默认选第一个 / 应为必填）的根因与修复方案已在 [[dt-insight-datasource-center]]、[[datasource-center-add-source-flow]]、[[publicservice-datasource-version-select-default]] 中记录。本文只补那几份没覆盖的部分：**版本值进入第 3 步「信息配置」后的用法**。

## 一句话链路

`ProduceAuth` 把版本写进 `sessionStorage.version` → `InfoConfig.getParams()` 读 `record?.dataVersion || saveStatus.version` → 拼成 `handleSpace(dataType, dataVersion) = "${dataType} ${dataVersion}"`（如 `Kafka 3.x`）写表单 `dataType` 字段 → 再用 `findTemplateByTypeVersion` 拉模板 → `dsForm/*` 按这个拼串分支渲染字段。

## InfoConfig（`components/infoConfig/index.tsx`）

- 关键导出：`handleSpace(dataType, dataVersion?)`（无版本时只返回 `dataType`，所以「无版本数据源」不会出现多余空格）；`IInfoConfig`（含 `[props: string]: any`）；`InfoConfigRef = { testForm, submitForm, syncInfoConfigForm }`，父页面 `addSource` 通过 `cRef` 调用。
- 挂载 effect：`getAllData()`（模板）+ `getParams()`（dataType/dataVersion/授权快照）并行启动；`otherParams` 变化后另一个 effect 执行 `setFieldValue('dataType', handleSpace(...))` 与 `setFieldsValue(tempFormValues)` 回显（`tempFormValues` 由父级在第 3 步「上一步」时用 `syncInfoConfigForm()` 暂存）。
- `templateForm()`：`API.findTemplateByTypeVersion({ dataType: record?.dataType || saveStatus.sqlType?.dataType, dataVersion: record?.dataVersion || saveStatus.version, dataInfoId })`，返回 `{ fromFieldVoList, dataType }`。**新增态完全依赖 sessionStorage 里的 version**；版本空/错会导致拿不到模板或拿到错模板的字段集。
- `getAllData()`：过滤 `item.invisible !== 1`；编辑态 `API.detail({ dataInfoId })` 后 `JSON.parse(utf8to16(Base64.decode(detailData.dataJson)))`，`hadoopConfig` 对象转字符串，`keyStoreFile`/`trustStoreFile`/`sslFile` 的 `uid` 置 `-1`（antd Upload 回显用），Trino 额外存 `SSLFileList`；新增态把数据预览开关默认设为 `true`；`isMeta` 为 1/2（元数据类）时除 `isOpenDataPreview` / `openLdap` / 某 label 外全部 `disabled`。
- `getParams()`：`appTypeList = record ? await getAuthProductList() : checks`（新增态直接用模块级 `checks`），`projectIdJson = checkedObjectToJson(checkProjects)` —— 即第 2 步勾的授权随 `otherParams` 带给提交/测连通。
- 提交：`handleParams.dataVersion = handleParams.dataVersion || fieldsValue.dataVersion || ''`（源码约 419 行），所以**第 3 步表单里另有一份 dataVersion**，改版本来源时要对齐。
- 测连通/提交都走同一个 `request(handleParams, name)` 包装：`AbortController` + `Number(window.APP_CONF.CONNECT_TIMEOUT)` 计时，超时 `abort()` 并 reject i18n 文案（`I18N.pages.dataSource.components.infoConfig.index.A`）。
- Kafka：模板里有 `address` / `brokerList` 时推导 `KafkaType.Address` / `BrokerList` 到 `allowKafkaTypes`，供 `dsKafkaReact` 切换批量/流式表单。

## dsForm/* 按版本分支（版本错了字段集就错）

组件都从 `otherParams` 取 `{ dataType, dataVersion }`，常见写法：

- `dsKafkaReact.tsx`：`dataVersion === '2.x'` 不支持 address（`isBatchNotSupportAddress`）；`KAFKA_ZOOKEEPER_DEPRECATED_VERSION.includes(dataVersion)` 决定是否显示 Zookeeper。
- `dsKafkaAuthReact.tsx`：用 `` `${dataType} ${dataVersion}` `` 直接比较 `'Kafka CKafka 1.x'` / `'Kafka CKafka 2.x'`，`CKAFKA_OPTION[`${dataType} ${dataVersion}`]` 决定认证选项；`isKafka3x = dataType === 'Kafka' && dataVersion === '3.x'`。
- `dsSSL.tsx`：`dataType === 'Elasticsearch' && dataVersion === '7.x'` 走不同 SSL 表单。
- `dsTransform.tsx`：`toLower(dataVersion).includes('huawei')` 切换 Hive 元数据提示；`dsKerberos.tsx`、`dsUploadFieldGroup.tsx` 同样读版本。
- 因此「版本必填」不只是交互问题：没选版本时这些分支全部落到默认形态，等于给用户错字段。

## 写这类改动时的约束

- 新增/改字段标签走 `I18N.pages.dataSource.components.infoConfig.*`，源码写中文后跑 `pnpm extract`，不手改 `locales/**`（见 [[dtis-workflow-and-conventions]]）。
- 版本信息在 `ProduceAuth.defaultSelect` state 与 `sessionStorage.version` 两处，且 `InfoConfig` 再读一次；任何「默认选第一项」的兜底都会让下游以为用户选过，是 161496 的根因（详见上文链接的三份笔记）。
