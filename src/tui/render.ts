import { NARROW_COLUMNS } from './term.js';
import { PHASES, type DreamTuiState, type StageStatus } from './state.js';
import type { Theme } from './theme.js';

export const SPINNER_FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
export const SPINNER_INTERVAL_MS = 80;

export function spinnerFrame(now: number): string {
  return SPINNER_FRAMES[Math.floor(now / SPINNER_INTERVAL_MS) % SPINNER_FRAMES.length];
}

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
const MAX_WIDTH = 110;
const PHASE_LABELS: Record<string, string> = {
  render: 'render transcripts',
  lead: 'write the plan',
  analyze: 'read sessions',
  organize: 'tidy memory',
};

export function stripAnsi(text: string): string {
  return String(text).replace(ANSI_PATTERN, '');
}

export function visibleWidth(text: string): number {
  return [...stripAnsi(text)].length;
}

export function clipLine(line: string, width: number): string {
  if (visibleWidth(line) <= width) return line;
  let out = '';
  let used = 0;
  let sawEscape = false;
  const parts = String(line).split(/(\x1b\[[0-9;]*m)/);
  for (const part of parts) {
    if (part.startsWith('\x1b[')) {
      out += part;
      sawEscape = true;
      continue;
    }
    for (const ch of part) {
      if (used >= width - 1) return sawEscape ? `${out}\x1b[0m…` : `${out}…`;
      out += ch;
      used += 1;
    }
  }
  return out;
}

export function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.max(ms, 0)}ms`;
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function padVis(text: string, width: number): string {
  const missing = width - visibleWidth(text);
  if (missing <= 0) return text;
  return text + ' '.repeat(missing);
}

function lr(left: string, right: string | null, width: number): string {
  if (!right) return clipLine(left, width);
  const room = width - visibleWidth(right);
  if (room < visibleWidth(left) + 1) return clipLine(left, width);
  return clipLine(left, room - 1) + ' ' + right;
}

function mark(theme: Theme, status: StageStatus, spin: string): string {
  if (status === 'active') return theme.paint(spin, 'mint');
  if (status === 'done') return theme.paint('✓', 'mint');
  if (status === 'error') return theme.paint('!', 'yellow');
  return theme.paint('○', 'faint');
}

function wrapBox(content: string, inner: number, border: (s: string) => string): string {
  return `${border('│')} ${padVis(clipLine(content, inner), inner)} ${border('│')}`;
}

function elapsed(startedAt: number | null, endedAt: number | null, now: number): string | null {
  if (startedAt == null) return null;
  return formatElapsed((endedAt ?? now) - startedAt);
}

export function renderFrame(
  state: DreamTuiState,
  {
    width,
    theme,
    now,
    spin,
  }: {
    width: number;
    theme: Theme;
    now: number;
    spin: string;
  },
): string[] {
  const w = Math.min(Math.max(width, 40), MAX_WIDTH);
  const narrow = w < NARROW_COLUMNS;
  const inner = w - 4;
  const border = (s: string) => theme.paint(s, 'faint');
  const lines: string[] = [];

  lines.push(border(`╭${'─'.repeat(w - 2)}╮`));
  const title = theme.gradient('yume', { bold: true }) + theme.paint('  dreaming', 'dim');
  const counts = theme.paint(
    `${state.processed || 0}/${state.expected} sessions · ${state.files} memory files`,
    'faint',
  );
  lines.push(wrapBox(lr(title, narrow ? null : counts, inner), inner, border));
  if (state.fatal) {
    lines.push(wrapBox(theme.paint(state.fatal, 'red'), inner, border));
  }
  lines.push(border(`╰${'─'.repeat(w - 2)}╯`));

  for (const key of PHASES) {
    const stage = state.phases[key];
    const name = PHASE_LABELS[key];
    const label =
      stage.status === 'pending' ? theme.paint(name, 'faint') : theme.paint(name, 'text', { bold: stage.status === 'active' });
    let summary = '';
    if (stage.error) summary = theme.paint(` ${stage.error}`, 'yellow');
    else if (key === 'analyze' && stage.status !== 'pending') {
      const done = state.analyzers.filter((a) => a.status === 'done' || a.status === 'error').length;
      summary = theme.paint(` ${done}/${state.analyzers.length || state.expected}`, 'dim');
    }
    const time = narrow ? null : elapsed(stage.startedAt, stage.endedAt, now);
    lines.push(lr(` ${mark(theme, stage.status, spin)} ${label}${summary}`, time ? theme.paint(time, 'faint') : null, w));
  }

  const active = PHASES.find((p) => state.phases[p].status === 'active') ?? (state.analyzers.length ? 'analyze' : null);
  if (active === 'analyze' && state.analyzers.length) {
    lines.push(theme.paint('── analyzers · one row per session ─'.padEnd(w, '─').slice(0, w), 'faint'));
    for (const row of state.analyzers) {
      const err = row.error ? theme.paint(` ${row.error}`, 'yellow') : '';
      const time = narrow ? null : elapsed(row.startedAt, row.endedAt, now);
      lines.push(
        lr(
          ` ${mark(theme, row.status, spin)} ${theme.paint(row.label, row.status === 'pending' ? 'faint' : 'text')}${err}`,
          time ? theme.paint(time, 'faint') : null,
          w,
        ),
      );
    }
  }

  if (state.phases.organize.status === 'done') {
    const note = state.organized
      ? theme.paint(' organizer wrote the index', 'dim')
      : theme.paint(' organizer did not return a result', 'yellow');
    lines.push(note);
  }
  if (state.failures > 0) {
    lines.push(theme.paint(` ${state.failures} analyzer failure(s); the run continues`, 'yellow'));
  }

  return lines.map((line) => clipLine(line, w));
}
