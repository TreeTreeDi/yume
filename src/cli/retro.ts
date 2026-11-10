import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfigOrExit } from '../config.js';
import { checkRetro, collectPending, loadProcessed } from '../retro.js';
import { flag, intFlag } from './flags.js';

// yume retro --check: read-only trigger check. Counts unreflected transcripts
// (by session, contentHash) plus their bytes, compares against the resolved
// retro.trigger thresholds, prints {ready, sessions, bytes, threshold}.
// Never runs the dream pipeline and never writes.

const args = process.argv.slice(2);
const flag_ = (name: string): string | undefined => flag(args, name);

if (!args.includes('--check')) {
  console.error('usage: yume retro --check [--config <path>] [--transcripts <dir>] [--report <path>] [--retro-min-sessions <n>] [--retro-min-bytes <n>]');
  process.exit(2);
}

const config = loadConfigOrExit({
  configPath: flag_('config'),
  flags: {
    minSessions: intFlag(args, 'retro-min-sessions', 1),
    minBytes: intFlag(args, 'retro-min-bytes'),
  },
});

function listInputs(): string[] {
  const positional = args.filter((a, i) => {
    if (a.startsWith('--')) return false;
    const prev = args[i - 1];
    if (prev?.startsWith('--') && ['config', 'transcripts', 'report', 'retro-min-sessions', 'retro-min-bytes'].includes(prev.slice(2))) {
      return false;
    }
    return a !== '--check';
  });
  if (positional.length) return positional.map((p) => resolve(p));
  const dir = resolve(flag_('transcripts') ?? 'data/transcripts');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => join(dir, f));
}

const reportPath = resolve(flag_('report') ?? 'data/runs/latest/dream-report.json');
const pending = collectPending(listInputs(), loadProcessed(reportPath));
console.log(
  JSON.stringify(
    checkRetro(pending, {
      minSessions: config.retro.trigger.minSessions.value,
      minBytes: config.retro.trigger.minBytes.value,
    }),
    null,
    2,
  ),
);
