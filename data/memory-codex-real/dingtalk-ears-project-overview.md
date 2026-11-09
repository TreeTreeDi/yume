---
name: dingtalk-ears-project-overview
description: Layout, key files, docs and coding conventions of the dingtalk-ears DingTalk message-watcher project (backend/, prompts.py, ai_contract.py, distribution.py, config.local.json)
metadata: source session 01a186e9 (2026-10-29), from project-doc in AGENTS.md
---

# dingtalk-ears — project layout and conventions

A local Python service that watches DingTalk (钉钉) messages, summarizes them with an AI model and proposes replies/todos. Agent workspaces run under `data/agent/` (e.g. `/Users/mac/workspace/dingtalk-ears/data/agent`), while the AGENTS.md project-doc there describes the project root: backend code in `backend/`, web assets in `backend/static/`, and **all commands are run from the project root**.

## File map (grep targets)

- `config.local.json` — per-instance config: port, paths. Contains private config; do not echo the whole file.
- `backend/prompts.py` — the only place general prompts are managed. Person-specific addressing ("称呼") is private context data and must NOT be written into general instructions.
- `backend/ai_contract.py` — the model output contract (see [[dingtalk-ears-message-digest-contract]]).
- `backend/distribution.py` — whitelist that controls what goes into a share/export package. Config, credentials, databases, logs, summaries and screenshots must never enter the share package.
- `paths.state_dir` — database, logs, sessions. `paths.output_dir` — run status and summaries, including `运行状态.json`. Startup must preserve these.
- Docs: `README.md` (install steps), `docs/安装配置与启动.md` (fields, OpenID, permissions, migration).

## Checks

- After changing runtime logic: `python scripts/check.py`.
- Runtime compatibility: `python3 -m unittest discover -s tests -v`.
- Documentation-only changes: just verify commands and links.

See [[dingtalk-ears-run-and-service]] for start/stop/verify, and [[agent-delegation-policy]] for how work is delegated.
