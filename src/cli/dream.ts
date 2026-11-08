import { resolve } from 'node:path';
import { runDream, listTranscripts } from '../dream.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const memDir = resolve(flag('memory') ?? 'data/memory');
const workDir = resolve(flag('work') ?? 'data/runs/latest');
const inputs = args.filter((a) => !a.startsWith('--') && a !== flag('memory') && a !== flag('work'));

const transcriptPaths = inputs.length
  ? inputs.map((p) => resolve(p))
  : listTranscripts(resolve(flag('transcripts') ?? 'data/transcripts'));

if (!transcriptPaths.length) {
  console.error('no transcripts found; pass paths or --transcripts <dir>');
  process.exit(1);
}

const report = await runDream({ transcriptPaths, memDir, workDir });
console.log(JSON.stringify(report, null, 2));
if (report.failures.length || !report.organized) process.exit(1);
