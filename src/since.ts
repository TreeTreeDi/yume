import { loadTranscript } from './transcripts/load.js';

const MS = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  mo: 30 * 86_400_000,
} as const;

export type SinceWindow = { kind: 'all' } | { kind: 'duration'; spec: string; ms: number };

export function parseSince(since: string | undefined): SinceWindow {
  if (since === undefined || since === '' || since === 'all' || since === '0') {
    return { kind: 'all' };
  }
  const match = String(since)
    .trim()
    .match(/^(\d+)\s*(mo|[dhwm])$/i);
  if (!match) {
    throw new Error(`invalid --since value "${since}"; use 7d, 30d, 2w, 12h, 1mo, or all`);
  }
  const n = Number(match[1]);
  const unit = match[2].toLowerCase() as keyof typeof MS;
  return { kind: 'duration', spec: `${n}${unit}`, ms: n * MS[unit] };
}

export function sinceCutoff(window: SinceWindow, now = Date.now()): number | null {
  return window.kind === 'all' ? null : now - window.ms;
}

export function createdAtMs(createdAt: string): number | null {
  const t = Date.parse(createdAt);
  return Number.isFinite(t) ? t : null;
}

export function filterTranscriptsBySince(
  paths: string[],
  window: SinceWindow,
  now = Date.now(),
): { kept: string[]; skipped: { path: string; reason: string }[] } {
  const cutoff = sinceCutoff(window, now);
  if (cutoff === null || window.kind === 'all') return { kept: paths, skipped: [] };
  const kept: string[] = [];
  const skipped: { path: string; reason: string }[] = [];
  for (const path of paths) {
    const createdAt = loadTranscript(path).createdAt;
    const t = createdAtMs(createdAt);
    if (t === null) {
      skipped.push({ path, reason: `no parseable createdAt (${createdAt || 'empty'})` });
      continue;
    }
    if (t < cutoff) {
      skipped.push({ path, reason: `created ${createdAt} is older than --since ${window.spec}` });
      continue;
    }
    kept.push(path);
  }
  return { kept, skipped };
}
