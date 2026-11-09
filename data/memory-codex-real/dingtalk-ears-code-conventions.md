---
name: dingtalk-ears-code-conventions
description: Where prompts, AI output contracts and share whitelists live in dingtalk-ears, and which checks to run after changing code. Read before editing backend code or packaging a share.
metadata:
  verified: 2026-10-29 (from project AGENTS.md)
---

# dingtalk-ears: 修改代码的约定

Consolidates the former code-and-prompt and dev-checks notes (2026-11-09); read this file instead of those stubs.

- **Prompts:** all general/通用 prompt text is managed only in `backend/prompts.py`. Output contract (the JSON schema the model must return) lives in `backend/ai_contract.py`. A user's personal form of address is private context data — it must not be baked into general instructions.
- **Share packaging:** config, credentials, database, logs, summaries and screenshots must not ship in a share bundle. The allowlist that decides what is included is `backend/distribution.py`.
- **Checks after changing runtime logic:**

```sh
python scripts/check.py
python3 -m unittest discover -s tests -v
```

`check.py` is the unified project check; the unittest discovery command verifies runtime compatibility. Edits to documentation only need command/link checks.

Dev environment setup is described in README; field/OpenID/permission/migration notes live in `docs/安装配置与启动.md`.

Same topic, other write-ups merged here 2026-11-09: the former code-and-prompt and dev-checks notes (prompt/contract ownership, share whitelist, checks, plus delegation rules now in [[agent-delegation-policy]]).

Related: [[dingtalk-ears-run-and-service]], [[dingtalk-ears-message-triage]]
