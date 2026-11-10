import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { loadTranscript } from './transcripts/load.js';

// Pending-retro accounting. Identity is (session, contentHash): a transcript
// counts once no matter how many runs list it.

export interface ProcessedEntry {
  session: string;
  contentHash: string;
}

export interface PendingEntry extends ProcessedEntry {
  path: string;
  bytes: number;
}

export interface RetroThreshold {
  minSessions: number;
  minBytes: number;
}

export interface RetroCheck {
  ready: boolean;
  sessions: number;
  bytes: number;
  threshold: RetroThreshold;
}

export function contentHashOf(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function sessionOf(path: string): string {
  try {
    const id = loadTranscript(path).id;
    if (id) return id;
  } catch {
    // Unparseable bytes still count under their file name.
  }
  return basename(path, '.jsonl');
}

export function transcriptIdentity(path: string): ProcessedEntry & { bytes: number } {
  return { session: sessionOf(path), contentHash: contentHashOf(path), bytes: statSync(path).size };
}

function key(e: ProcessedEntry): string {
  return JSON.stringify([e.session, e.contentHash]);
}

/** Read processed[] from a previous dream-report.json. Missing file means none. */
export function loadProcessed(reportPath: string): ProcessedEntry[] {
  if (!existsSync(reportPath)) return [];
  try {
    const data = JSON.parse(readFileSync(reportPath, 'utf8')) as {
      processed?: ProcessedEntry[];
    };
    if (!Array.isArray(data.processed)) return [];
    return data.processed.filter(
      (e): e is ProcessedEntry =>
        typeof e?.session === 'string' && typeof e?.contentHash === 'string',
    );
  } catch {
    return [];
  }
}

/** Union old and new processed entries, deduped by (session, contentHash). */
export function mergeProcessed(
  existing: ProcessedEntry[],
  fresh: ProcessedEntry[],
): ProcessedEntry[] {
  const seen = new Set(existing.map(key));
  const out = [...existing];
  for (const e of fresh) {
    const k = key(e);
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ session: e.session, contentHash: e.contentHash });
    }
  }
  return out;
}

/** Transcripts not yet reflected, by (session, contentHash). */
export function collectPending(
  transcriptPaths: string[],
  processed: ProcessedEntry[],
): PendingEntry[] {
  const done = new Set(processed.map(key));
  const out: PendingEntry[] = [];
  const seenInRun = new Set<string>();
  for (const path of transcriptPaths) {
    const id = transcriptIdentity(path);
    const k = key(id);
    if (done.has(k) || seenInRun.has(k)) continue;
    seenInRun.add(k);
    out.push({ session: id.session, contentHash: id.contentHash, path, bytes: id.bytes });
  }
  return out;
}

/** Compare pending work against the trigger. Ready when either side reaches. */
export function checkRetro(pending: PendingEntry[], threshold: RetroThreshold): RetroCheck {
  const sessions = pending.length;
  const bytes = pending.reduce((sum, p) => sum + p.bytes, 0);
  return {
    ready: sessions >= threshold.minSessions || bytes >= threshold.minBytes,
    sessions,
    bytes,
    threshold: { minSessions: threshold.minSessions, minBytes: threshold.minBytes },
  };
}
