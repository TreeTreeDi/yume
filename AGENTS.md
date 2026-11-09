## Agent skills

### Issue tracker

决策地图与任务使用本仓库 GitHub Issues。见 `docs/agents/issue-tracker.md`。

### Domain docs

采用单上下文。术语放在 `GLOSSARY.md`，架构决策放在 `docs/adr/`。见 `docs/agents/domain.md`。

### Changelog

每次会进仓库的改动，同一轮工作必须更新 `CHANGELOG.md`。该文件是已落地行为的唯一时间线。用户能察觉的行为、CLI 参数、默认模型、prompt 规则、记忆写入规则，都写进 Unreleased。做完的标准是新行为在 `CHANGELOG.md` 里有一条可 grep 的记录，日期用当天。发布时把 Unreleased 收成带版本号的一节。

### Model routing

开发派发使用的模型与参数见 `docs/agents/model-routing.md`。这些模型不负责 Yume 运行时推理。
