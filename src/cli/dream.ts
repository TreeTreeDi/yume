import { resolve } from 'node:path';
import { runDream, listTranscripts } from '../dream.js';
import { startTui } from '../tui/index.js';
import { filterTranscriptsBySince, parseSince } from '../since.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const json = args.includes('--json');

const memDir = resolve(flag('memory') ?? 'data/memory');
const workDir = resolve(flag('work') ?? 'data/runs/latest');
const flagNames = new Set(['memory', 'work', 'transcripts', 'since', 'lead-model', 'analyzer-model', 'organizer-model']);
const inputs = args.filter((a, i) => {
  if (a.startsWith('--')) return false;
  const prev = args[i - 1];
  if (prev?.startsWith('--') && flagNames.has(prev.slice(2))) return false;
  return true;
});

if (flag('lead-model')) process.env.YUME_LEAD_MODEL = flag('lead-model');
if (flag('analyzer-model')) process.env.YUME_ANALYZER_MODEL = flag('analyzer-model');
if (flag('organizer-model')) process.env.YUME_ORGANIZER_MODEL = flag('organizer-model');

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
  const report = await runDream({ transcriptPaths, memDir, workDir });
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
