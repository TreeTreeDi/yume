# Changelog

All notable changes to Yume are recorded here. The file is the timeline `AGENTS.md` requires every landed change to update.

## Unreleased

- The project is MIT licensed. The license text is in `LICENSE`.
- `README.md` is English. `README.zh-CN.md` is Chinese. Each page links to the other.
- README shows `docs/yume-icon.png` under the title.
- README names the Mastra Agent inner loop, the dynamic-workflow outer graph, the live TUI, and `--since`.
- Live dream progress TUI on stderr when the terminal is eligible. Analyzer failures stay as rows. A throwing renderer does not stop the run.
- `--since` filters inputs by session `createdAt`. `7d` and `30d` work. `1mo` is 30 days. `m` is minutes.
- Default Magpie models: Lead `cline/cline-pass/mimo-v2.6-pro`, Analyzer and Organizer `cursor/grok-4.6`. Override with `--lead-model` / `--analyzer-model` / `--organizer-model` or `YUME_*_MODEL`.
- Agent steps retry twice when structured output drifts.
- GitHub Actions `ci` runs `tsc` and the parser / since / TUI scripts on pull requests.
- Add research doc on `backpass` (kunchenguid/backpass) mechanism and memory gradient flow architecture in `docs/research/backpass-mechanism-research.md` (2026-11-09).
- Long transcripts are clipped deterministically before rendering (`src/transcripts/distill.ts`, on by default): tool payloads keep head/tail lines with a prune marker, error lines are rescued (#24, 2026-11-09).
- Memory writes share one per-run quota (`MAX_WRITES_PER_RUN` across write and edit): a refused write stays undone and is listed as not done. The Organizer extracts a reusable process into its own skill file only when all three hold (reusable process, over half the file body, off-topic section) (#25, 2026-11-09).
- `yume.config.json` carries model routing and retro thresholds: `yume config show` prints effective values with sources, `yume retro --check` reports pending transcripts against the thresholds without writing (#26, 2026-11-09).
- `.pi/` goal runtime state and `.DS_Store` are untracked and ignored; they no longer ship in the integration branch (2026-11-10).
- Review fixes: `createMastra` and `DreamInput` require a `ResolvedConfig`, so nothing below the CLI boundary re-reads env or the config file. The write quota resets at `runDream` start instead of inside `createMastra`. Oversized tool payloads that fit few lines are byte-pruned instead of returned whole. `yume retro --check` accepts `--retro-min-sessions` / `--retro-min-bytes`. CLI flag parsing shares `src/cli/flags.ts`, and `config show --json` reports `configFile: null` when no file exists (2026-11-10).
- `test:distill` is registered and CI runs `test:distill`, `test:tools`, `test:config`, and `test:retro` (2026-11-10).

## 0.1.0 - 2026-11-08

- End-to-end dream on local pi/codex transcripts through Mastra.
- Analyzer / Organizer / Lead prompts ported from the cookbook at `ce8b2629`, with format, path, and run-surface adaptations listed in `docs/prompt-fidelity.md`.
- Honest dream report counts analyzer step results, not lead intent.
- Agent docs: issue tracker, domain pointers, model routing.
