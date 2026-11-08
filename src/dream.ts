import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { loadTranscript } from './transcripts/load.js';
import { renderTranscript } from './transcripts/types.js';
import { setToolRoots } from './tools.js';
import { createMastra, leadAgent } from './mastra.js';
import { LEAD_TEMPLATE } from './prompts.js';

const ALLOWED_NODES = new Set(['workflow', 'parallel', 'agent', 'mapping']);

export interface DreamInput {
  transcriptPaths: string[];
  memDir: string;
  workDir: string;
}

export interface DreamReport {
  inputs_expected: number;
  inputs_processed: number;
  failures: { input: string; reason: string }[];
  organized: boolean;
  index_entries: number | null;
  changes: string[];
}

function assertNodeSet(graph: unknown[], where: string): void {
  for (const entry of graph as Record<string, unknown>[]) {
    const t = String(entry.type ?? '');
    if (!ALLOWED_NODES.has(t)) {
      throw new Error(`lead plan uses disallowed node "${t}" in ${where}`);
    }
    if (t === 'parallel') assertNodeSet(entry.steps as unknown[], where);
    if (t === 'workflow') {
      const id = String(entry.id ?? '');
      if (!id) throw new Error(`workflow entry without id in ${where}`);
    }
  }
}

export async function runDream(input: DreamInput): Promise<DreamReport> {
  const { transcriptPaths, memDir, workDir } = input;
  mkdirSync(memDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });

  // Transcripts render to plain text for the analyzers (upstream renders exports to text).
  const textDir = join(workDir, 'transcripts');
  mkdirSync(textDir, { recursive: true });
  const rendered: { source: string; text: string }[] = [];
  for (const p of transcriptPaths) {
    const s = loadTranscript(p);
    const text = renderTranscript(s);
    const out = join(textDir, `${s.id || basename(p, '.jsonl')}.txt`);
    writeFileSync(out, text);
    rendered.push({ source: out, text });
  }

  // A run saves a copy of the store's files first (upstream: run saves a copy before writing).
  const backupDir = join(workDir, `memory-backup-${Date.now()}`);
  cpSync(memDir, backupDir, { recursive: true });

  setToolRoots(memDir, textDir);

  const mastra = createMastra();

  // The lead writes the plan; code checks the node set; Mastra validates the rest at registration.
  const message = [
    `Dream over the transcript files listed below: distill what they show into the memory directory at ${memDir}.`,
    '',
    '<inputs>',
    ...rendered.map((r) => r.source),
    '</inputs>',
    '',
    `You have two predefined agents. "transcript-analyzer" reads one transcript and adds what it learned to memory. "memory-organizer" tidies the whole memory once the analyzers are done.`,
    'Output the workflow definition JSON following this template exactly in shape:',
    LEAD_TEMPLATE,
  ].join('\n');

  const planRes = await leadAgent.generate(message);
  const raw = planRes.text.trim().replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
  const plan = JSON.parse(raw) as {
    definitions: { id: string; graph: Record<string, unknown>[] }[];
  };

  for (const def of plan.definitions) assertNodeSet(def.graph, def.id);
  await mastra.addDynamicWorkflows(plan.definitions as never);

  const root = plan.definitions.find((d) => d.id === 'dream-root');
  if (!root) throw new Error('lead plan has no dream-root definition');

  const run = await mastra.getWorkflow('dream-root').createRun();
  const result = await run.start({ inputData: { memDir } });

  const report: DreamReport = {
    inputs_expected: transcriptPaths.length,
    inputs_processed: 0,
    failures: [],
    organized: false,
    index_entries: null,
    changes: [],
  };

  if (result.status === 'success') {
    const out = result.result as { index_entries?: number; changes?: string[] };
    report.organized = true;
    report.index_entries = out.index_entries ?? null;
    report.changes = out.changes ?? [];
    report.inputs_processed = transcriptPaths.length;
  } else {
    // A failed analyzer is recorded with its reason and does not stop the run upstream;
    // here the run result carries per-step status.
    const steps = (result as { steps?: Record<string, { status?: string; error?: unknown }> }).steps ?? {};
    for (const [id, step] of Object.entries(steps)) {
      if (step.status === 'failed') {
        report.failures.push({ input: id, reason: String((step.error as Error)?.message ?? step.error) });
      }
    }
    report.inputs_processed = transcriptPaths.length - report.failures.length;
  }

  writeFileSync(join(workDir, 'dream-report.json'), JSON.stringify(report, null, 2));
  return report;
}

export function listTranscripts(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => join(dir, f));
}
