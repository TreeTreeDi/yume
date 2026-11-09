---
name: dingtalk-ears-run-and-service
description: Condensed start/stop/verify card for the dingtalk-ears service — launchctl label, init/doctor/run/service commands, ready vs degraded, data dirs. Read before starting or debugging the running instance.
metadata: from project AGENTS.md, verified 2026-10-29 (session cwd /Users/mac/workspace/dingtalk-ears/data/agent); consolidated from four overlapping walkthroughs 2026-11-09
---

# dingtalk-ears — run / service card

Project root `/Users/mac/workspace/dingtalk-ears`; agent workspace is its `data/agent`. All commands run from the project root. This card consolidates the former operations/startup walkthroughs (2026-11-09); project layout in [[dingtalk-ears-project-overview]].

## Order of operations

1. **Already running?** `launchctl print "gui/$(id -u)/com.codex.dingtalk-ears"` and `curl --fail --silent --show-error --output /dev/null http://127.0.0.1:8766/` (8766 = default example; real port in `config.local.json`). Healthy instance → reuse it and hand over the panel link; never start a second copy.
2. **Deps/config:** `python3`, `dws`, `codex` executable; reuse the installed launch item's Python; nvm needs Node on PATH. `python3 -m backend init --output config.local.json` only writes a template (no DWS identity) — run it only when config is missing.
3. **Diagnose** (only with nothing running): `python3 -m backend --config config.local.json doctor` — clear blockers, explain warnings.
4. **Run:** foreground `python3 -m backend --config config.local.json run`; background after the foreground exits `python3 -m backend --config config.local.json service --install`; installed but unloaded `launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.codex.dingtalk-ears.plist"`. A regenerated `.plist` does not overwrite an existing one — pass `--output <new path>`.
5. **Verify before reporting started:** process alive + port HTTP + `运行状态.json` in `paths.output_dir` updating + listener/App Server status. `ready` = subscriptions ready only, **not** proof real group messages are delivered; report `degraded` honestly.

## Stop / data

- Ctrl+C for foreground; `launchctl bootout "gui/$(id -u)/com.codex.dingtalk-ears"` for the macOS background item. Never kill Python/Node/Codex processes broadly. A port held by an already-healthy instance is not a problem to fix — reuse it.
- `paths.state_dir` holds DB, logs, sessions (`config.local.json` lives in the project root; read only port/path fields, never echo the whole private file); `paths.output_dir` holds run status and summaries. Preserve on restart.
- `run --adopt-state` only for a backed-up old DB verified as the same account and same group; on identity mismatch use a separate directory and don't delete the identity marker.
- Startup checks are read-only: no DingTalk sends, no todos; every reply/todo needs the owner's confirmation; no OA approval integration.

Message handling during a run: [[dingtalk-ears-message-digest-contract]].
