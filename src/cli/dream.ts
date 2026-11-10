import { resolve } from 'node:path';
import { runDream, listTranscripts } from '../dream.js';
import { loadConfigOrExit } from '../config.js';
import { startTui } from '../tui/index.js';
import { filterTranscriptsBySince, parseSince } from '../since.js';
import { flag as flagArg } from './flags.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => flagArg(args, name);
const json = args.includes('--json');

const memDir = resolve(flag('memory') ?? 'data/memory');
const workDir = resolve(flag('work') ?? 'data/runs/latest');
const flagNames = new Set(['memory', 'work', 'transcripts', 'since', 'config', 'lead-model', 'analyzer-model', 'organizer-model']);
const inputs = args.filter((a, i) => {
  if (a.startsWith('--')) return false;
  const prev = args[i - 1];
  if (prev?.startsWith('--') && flagNames.has(prev.slice(2))) return false;
  return true;
});

// Model flags feed the config layer (flag > env > file > default); the
// boundary parses once here and the frozen result travels with the run.
const config = loadConfigOrExit({
  configPath: flag('config'),
  flags: {
    lead: flag('lead-model'),
    analyzer: flag('analyzer-model'),
    organizer: flag('organizer-model'),
  },
});

let since;
try {
  since = parseSince(flag('since'));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
}

const listed = inputs.length
  ? inputs.map((p) => resolve(p))
  : listTranscripts(resolve(flag('transcripts') ?? 'data/transcripts'));
const { kept: transcriptPaths, skipped } = filterTranscriptsBySince(listed, since);
for (const row of skipped) console.error(`skip ${row.path}: ${row.reason}`);

if (!transcriptPaths.length) {
  console.error(
    since.kind === 'all'
      ? 'no transcripts found; pass paths or --transcripts <dir>'
      : `no transcripts within --since ${since.spec}; ${listed.length} listed, ${skipped.length} skipped`,
  );
  process.exit(1);
}

const tui = await startTui({ json });
try {
  const report = await runDream({ transcriptPaths, memDir, workDir, config });
  tui?.stop();
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length || !report.organized) process.exit(1);
} catch (err) {
  tui?.stop();
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
} finally {
  tui?.stop();
}
