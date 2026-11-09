---
name: open-design-repo-conventions
description: Hard conventions for the internal-open-design repo (root command boundary, daemon data-dir contract, UI/CLI dual-track, test placement, release channels, boundary constraints); read before editing code, scripts, workflows or release identity there.
metadata: from root AGENTS.md injected 2026-09-29 → 2026-10-10, session 01a0eb05
---

# internal-open-design repo conventions

Repo `/Users/mac/workspace/projects/internal-open-design` — the private **Internal OpenDesign Distribution**, derived from upstream tag `open-design-v0.21.1`; Gateway lives at `apps/gateway` after a history-preserving import, original Gateway repo stays the rollback source until cutover.

## Environment and commands

- Node `~24`, `pnpm@10.33.2` via Corepack. New entrypoints/modules/scripts/tests/configs default to TypeScript; new `.js`/`.mjs`/`.cjs` needs an explicit generated/vendor/compat reason and must pass `pnpm guard` (allowlist in `scripts/guard.ts`).
- Root scripts are limited to `pnpm guard`, `pnpm typecheck`, `pnpm tools-dev`, `pnpm tools-pack`, `pnpm tools-serve`. **No** root `pnpm dev`, `pnpm dev:all`, `pnpm daemon`, `pnpm preview`, `pnpm start`, `pnpm build`, `pnpm test`, or `pnpm tools-pr`. Sole exception: `pnpm gate-dev` forwards to `pnpm --filter @open-design/gateway dev`.
- Local lifecycle entry point is `pnpm tools-dev`; ports come from `--daemon-port` / `--web-port`; it exports `OD_PORT` (web proxy target) and `OD_WEB_PORT` (web listener). Never `NEXT_PORT`.
- Build/test commands stay package-scoped (`pnpm --filter <pkg> …`) or tool-scoped (`pnpm tools-pack …`); e2e commands and ownership live in `e2e/AGENTS.md`.

## Daemon data directory contract

One truth source: on startup `apps/daemon/src/server.ts` resolves `OD_DATA_DIR` into `RUNTIME_DATA_DIR`; every daemon-owned path derives from it or from a constant derived from it (`PROJECTS_DIR`, `ARTIFACTS_DIR`). Imported-folder projects are the exception and use `metadata.baseDir`. Sanctioned narrow exceptions: `OD_MEDIA_CONFIG_DIR` (only `media-config.json`), `OD_LEGACY_DATA_DIR` (migration source only). Sandbox logs, SQLite, app config, memory, MCP tokens, automation state, plugin state, connector credentials and agent runtime homes are all daemon data under that root. Agent subprocesses inherit `OD_DATA_DIR`. Do not document concrete example paths; do not extend the known "escape" patterns (cwd-relative legacy defaults, helpers that recompute the root, `openDatabase(projectRoot)` fallbacks). Development isolation requires passing `OD_DATA_DIR` to the daemon; `tools-dev --namespace` alone does not isolate data.

## Layout and boundaries

- Workspace globs from `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `shells/*`, `tools/*`, `e2e`. Content dirs: `skills/`, `design-templates/`, `design-systems/`, `craft/`, `mocks/`.
- `apps/nextjs` and `packages/shared` were removed — do not recreate or reference them. `apps/web` is Next.js 16 App Router + React 18.
- No app imports another app's private `src/`/`tests/`; specifically `apps/web/**` must not import `apps/daemon/src/**`. Shared web/daemon DTOs, SSE event unions and error shapes live in `packages/contracts`, which stays pure TypeScript (no Next.js, Express, Node fs/process, browser APIs, SQLite, daemon internals, sidecar control-plane).
- Tests for `apps/`, `packages/`, `tools/` sit in a sibling `tests/` directory, never `*.test.ts(x)` under `src/`; Playwright automation belongs to `e2e/ui/`. Cross-app consistency checks belong in `e2e/tests/`.
- Sidecar process stamps have exactly five fields: `app`, `mode`, `namespace`, `ipc`, `source`. Orchestration layers (`tools-dev`, `tools-pack`, packaged launchers) must call package primitives instead of hand-building `--od-stamp-*` args or process-scan regexes. Default runtime files: `<project-root>/.tmp/<source>/<namespace>/...`; IPC sockets: `/tmp/open-design/ipc/<namespace>/<app>.sock`.

## Capability exposure (UI + CLI dual track)

Every user-facing capability must ship in the same PR on **all three** surfaces: an HTTP endpoint in `apps/daemon/src/*-routes.ts` with a contract type in `packages/contracts/src/api/`, a UI surface in `apps/web/src/`, and an `od <capability>` subcommand in `apps/daemon/src/cli.ts` registered via `SUBCOMMAND_MAP`. The CLI is the embeddability contract (external agents drive `od`, not the UI): it must support `--json` and `--prompt-file <path|->`. Reference shapes: `od automation …` (mirrors the Automations tab over `/api/routines`), `od plugin|ui|project|media|mcp|research …`.

## GitHub automation and CI

- `.github/AGENTS.md` must be read before touching `.github/workflows|scripts|actions`, PR follow-on automation, `workflow_run` trusted writes or CI handoff artifacts.
- Two layers: business workflows (`ci.yml` = low-privilege PR / merge-queue / manual validation, produces typed handoff artifacts) and atomic capability workflows (`comment.atom.yml`, `autofix.atom.yml`, `report.atom.yml`). Don't add a new business-named follow-on workflow before trying a `ci.yml` producer + existing capability; keep artifact naming/storage/parsing in `.github/scripts/handoff.py`.
- CI scope planning: changed paths → source units → test sets → workloads; omission policy belongs in the `plan` job, not a downstream guard. Unknown/mixed/below-threshold input selects the full plan; changing a test/fixture/suite manifest selects its consuming test set; shared harness/contract/lockfile changes fan out. Confidence methodology lives in `specs/current/ci.md` (required reading before changing `.github/config/scopes.json` or `.github/scripts/scopes.py`).

## Release channels

`internal` (versions like `0.21.1-internal.1`; never published through public lanes), `beta` (daily R&D validation, not part of the stable gate), `prerelease` (internal validation; stable depends on it), `preview` (independent, stable-like rigor, `X.Y.Z-preview.N`, R2 `preview` channel, updater feed `preview/latest`), `stable`. Packaged app names must stay distinct: `Open Design`, `Open Design Beta`, `Open Design Prerelease`, `Open Design Preview` — never ship a non-stable mac DMG whose drag-install bundle is `Open Design.app`. Windows beta updater validation must use the real beta namespace `release-beta-win`, otherwise a separate uninstall registry key appears. Read `tools/pack/AGENTS.md` ("Packaged auto-update architecture and harness") before touching the updater, installer identity or release identity; `tools/pack/CACHE.md` before changing a build-cache node key.

## Other rules

- Git commits must not include `Co-authored-by` trailers or any other co-author metadata.
- PRs use `.github/pull_request_template.md`; fill every section, including "Why" (author's use case **and** the pain) and user-visible "What users will see"; UI-checked PRs need an entry-point screenshot; bug fixes link the red-spec test that went red on `main` and green on the branch.
- Review standard is `docs/code-review-guidelines.md`, walked top-down (product relevance → forbidden surfaces → ownership/scope → lane → checklist → comments → approval bar); only maintainers may close a PR instead of requesting changes.
- `pnpm guard` enforces the "run start choke point": every physical Run goes through `internalRunCreation.start(run, analytics, starter)`; direct run-registry `.start(` calls bypass analytics. The `analytics` argument is mandatory — pass `requestAnalyticsContext: null` explicitly for no identity. Lineage uses `inheritedRunLineageHints`, not the source Run's `analyticsRecovery`.
- Clarifying questions have exactly one mechanism: the inline `<question-form>` markdown artifact, valid on any turn, answers returned as the next user message. No `AskUserQuestion` tool, no `/api/runs/:id/tool-result` endpoint.
- Windows native is best-effort; `corepack enable` fails with EPERM, use `npm install -g pnpm@10.33.2`; `better-sqlite3` compiles from source (~2 min, VS Build Tools 2022+).
