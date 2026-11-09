---
name: dt-insight-studio-test-env-access
description: How to get real API responses and logged-in browser sessions for dt-insight-studio test environments (env-api, env-cookie, env-open) instead of stopping at a login page or captcha.
metadata: from dt-insight-studio AGENTS.md, observed 2026-11-02
---

# dt-insight-studio test environment access

Helpers live in `~/.config/dt-insight/bin/`.

- Real API responses: `~/.config/dt-insight/bin/env-api <OMP id|namespace> POST /api/... '<json>'` — takes an OMP id or namespace as the environment selector. `env-api --list` shows the available environments.
- Plain curl with the session cookie: `curl -b "$(~/.config/dt-insight/bin/env-cookie <env>)" <url>`.
- Browser login state: `env-open` in the same directory.

Rule of thumb from AGENTS.md: when a page shows "未登录" / a login page / a captcha, use these helpers first — do not stop and report blocked.

Related: [[dt-insight-studio-agent-rules]] (delivery gates and the evidence/acceptance flow these calls feed).
