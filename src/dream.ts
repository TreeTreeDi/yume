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

// The lead writes each analyzer's brief into one mapping entry; the brief names
// its transcript path literally (see LEAD_TEMPLATE), so the brief text maps an
// input file to the analyzer definition that processes it.
function briefTexts(graph: unknown[]): string[] {
  const out: string[] = [];
  for (const entry of graph as Record<string, unknown>[]) {
    if (entry.type === 'mapping') out.push(String(entry.mapConfig ?? ''));
    if (entry.type === 'parallel') out.push(...briefTexts(entry.steps as unknown[]));
  }
  return out;
}

// The root runs each analyzer definition through one workflow entry; the run
// records that entry's analyzer step result under the entry's id.
function workflowEntries(graph: unknown[]): { id: string; workflowId: string }[] {
  const out: { id: string; workflowId: string }[] = [];
  for (const entry of graph as Record<string, unknown>[]) {
    if (entry.type === 'workflow') {
      out.push({ id: String(entry.id ?? ''), workflowId: String(entry.workflowId ?? '') });
    }
    if (entry.type === 'parallel') out.push(...workflowEntries(entry.steps as unknown[]));
  }
  return out;
}

export async function runDream(input: DreamInput): Promise<DreamReport> {
  const { transcriptPaths, memDir, workDir } = input;
  mkdirSync(memDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });

  // Transcripts render to plain text for the analyzers (upstream renders exports to text).
  const textDir = join(workDir, 'transcripts');
  mkdirSync(textDir, { recursive: true });
  const rendered: { path: string; source: string; text: string }[] = [];
  for (const p of transcriptPaths) {
    const s = loadTranscript(p);
    const text = renderTranscript(s);
    const out = join(textDir, `${s.id || basename(p, '.jsonl')}.txt`);
    writeFileSync(out, text);
    rendered.push({ path: p, source: out, text });
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

  // Honest accounting (upstream report semantics): inputs_processed counts the
  // analyzer step results the run actually returned, and an input the plan never
  // names in an analyzer brief becomes a failure instead of a silent pass.
  const steps = (result as { steps?: Record<string, { status?: string; output?: unknown; error?: unknown }> }).steps ?? {};
  const report: DreamReport = {
    inputs_expected: transcriptPaths.length,
    inputs_processed: 0,
    failures: [],
    organized: false,
    index_entries: null,
    changes: [],
  };

  const analyzerBriefs = plan.definitions
    .filter((d) => d.id !== root.id)
    .map((d) => ({ id: d.id, brief: briefTexts(d.graph).join('\n') }));
  const rootWorkflowSteps = workflowEntries(root.graph);

  for (const r of rendered) {
    const stepIds = analyzerBriefs
      .filter((b) => b.brief.includes(r.source))
      .flatMap((b) => rootWorkflowSteps.filter((e) => e.workflowId === b.id).map((e) => e.id));
    if (stepIds.length === 0) {
      report.failures.push({
        input: r.path,
        reason: `lead plan omits this input: no analyzer brief names ${r.source}`,
      });
      continue;
    }
    const analyzerSteps = stepIds.map((id) => steps[id]);
    if (analyzerSteps.some((s) => s && s.status === 'success' && s.output != null)) {
      report.inputs_processed++;
    } else {
      const err = analyzerSteps.map((s) => s?.error).find((e) => e != null);
      report.failures.push({
        input: r.path,
        reason: err ? String((err as Error).message ?? err) : 'analyzer returned no result',
      });
    }
  }

  if (result.status === 'success') {
    const out = result.result as { index_entries?: number; changes?: string[] };
    report.organized = true;
    report.index_entries = out.index_entries ?? null;
    report.changes = out.changes ?? [];
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
