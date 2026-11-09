# Changelog

All notable changes to Yume are recorded here. The file is the timeline `AGENTS.md` requires every landed change to update.

## Unreleased

- `README.md` is English. `README.zh-CN.md` is Chinese. Each page links to the other.
- README shows `docs/yume-icon.png` under the title.
- README names the Mastra Agent inner loop, the dynamic-workflow outer graph, the live TUI, and `--since`.
- Live dream progress TUI on stderr when the terminal is eligible. Analyzer failures stay as rows. A throwing renderer does not stop the run.
- `--since` filters inputs by session `createdAt`. `7d` and `30d` work. `1mo` is 30 days. `m` is minutes.
- Default Magpie models: Lead `cline/cline-pass/mimo-v2.6-pro`, Analyzer and Organizer `cursor/grok-4.6`. Override with `--lead-model` / `--analyzer-model` / `--organizer-model` or `YUME_*_MODEL`.
- Agent steps retry twice when structured output drifts.
- GitHub Actions `ci` runs `tsc` and the parser / since / TUI scripts on pull requests.

## 0.1.0 - 2026-11-08

- End-to-end dream on local pi/codex transcripts through Mastra.
- Analyzer / Organizer / Lead prompts ported from the cookbook at `ce8b2629`, with format, path, and run-surface adaptations listed in `docs/prompt-fidelity.md`.
- Honest dream report counts analyzer step results, not lead intent.
- Agent docs: issue tracker, domain pointers, model routing.
