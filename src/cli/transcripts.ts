import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadTranscript } from '../transcripts/load.js';
import { renderTranscript } from '../transcripts/types.js';
import { filterTranscriptsBySince, parseSince } from '../since.js';
import { flag as flagArg } from './flags.js';

// yume transcripts: read-only fetch of rendered session text for external
// retro agents. Default output applies the same deterministic distill the
// dream pipeline renders; --raw prints the unpruned render. Never runs a
// model, never writes. #28

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => flagArg(args, name);
const raw = args.includes('--raw');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log('usage: yume transcripts [files...] [--transcripts <dir>] [--since <7d|30d|12h|1mo|all>] [--raw]');
  process.exit(0);
}

let since;
try {
  since = parseSince(flag('since'));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
}

const flagNames = new Set(['transcripts', 'since']);
const positional = args.filter((a, i) => {
  if (a.startsWith('--')) return false;
  const prev = args[i - 1];
  if (prev?.startsWith('--') && flagNames.has(prev.slice(2))) return false;
  return true;
});

function listInputs(): string[] {
  if (positional.length) return positional.map((p) => resolve(p));
  const dir = resolve(flag('transcripts') ?? 'data/transcripts');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => join(dir, f));
}

const listed = listInputs();
const { kept, skipped } = filterTranscriptsBySince(listed, since);
for (const row of skipped) console.error(`skip ${row.path}: ${row.reason}`);

if (!kept.length) {
  console.error(
    since.kind === 'all'
      ? 'no transcripts found; pass paths or --transcripts <dir>'
      : `no transcripts within --since ${since.spec}; ${listed.length} listed, ${skipped.length} skipped`,
  );
  process.exit(1);
}

let emitted = 0;
for (const path of kept) {
  try {
    process.stdout.write(renderTranscript(loadTranscript(path), { distill: !raw }) + '\n');
    emitted += 1;
  } catch (err) {
    console.error(`skip ${path}: ${err instanceof Error ? err.message : err}`);
  }
}
if (!emitted) process.exit(1);
