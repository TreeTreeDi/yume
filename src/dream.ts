import { cpSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { loadTranscript } from './transcripts/load.js';
import { renderTranscript } from './transcripts/types.js';
import { loadConfigOrExit, type ResolvedConfig } from './config.js';
import { contentHashOf, loadProcessed, mergeProcessed, type ProcessedEntry } from './retro.js';
import { memoryFileCount, setToolActivity, setToolRoots } from './tools.js';
import { createMastra } from './mastra.js';
import { LEAD_TEMPLATE } from './prompts.js';
import { emitProgress } from './progress.js';

const ALLOWED_NODES = new Set(['workflow', 'parallel', 'agent', 'mapping']);

export interface DreamInput {
  transcriptPaths: string[];
  memDir: string;
  workDir: string;
  config?: ResolvedConfig;
}

export interface DreamReport {
  inputs_expected: number;
  inputs_processed: number;
  failures: { input: string; reason: string }[];
  organized: boolean;
  index_entries: number | null;
  changes: string[];
  processed: ProcessedEntry[];
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

// The gateway accepts response_format but does not enforce it, so a step can
// drift to prose and miss its final object; retries re-run the step and absorb
// that transient drift instead of weakening upstream's strict object contract.
function setAgentRetries(graph: unknown[]): void {
  for (const entry of graph as Record<string, unknown>[]) {
    if (entry.type === 'agent') {
      entry.options = { ...(entry.options as object | undefined), retries: 2 };
    }
    if (Array.isArray(entry.steps)) setAgentRetries(entry.steps as unknown[]);
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
  emitProgress('dream:start', { expected: transcriptPaths.length });

  try {
    return await runDreamBody(input);
  } catch (err) {
    emitProgress('dream:fail', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  } finally {
    setToolActivity(null);
  }
}

async function runDreamBody(input: DreamInput): Promise<DreamReport> {
  const { transcriptPaths, memDir, workDir } = input;

  // Transcripts render to plain text for the analyzers (upstream renders exports to text).
  emitProgress('phase:start', { phase: 'render' });
  const textDir = join(workDir, 'transcripts');
  mkdirSync(textDir, { recursive: true });
  const rendered: { path: string; source: string; text: string; session: string }[] = [];
  for (const p of transcriptPaths) {
    const s = loadTranscript(p);
    const text = renderTranscript(s);
    const out = join(textDir, `${s.id || basename(p, '.jsonl')}.txt`);
    writeFileSync(out, text);
    rendered.push({ path: p, source: out, text, session: s.id || basename(p, '.jsonl') });
  }
  emitProgress('phase:done', { phase: 'render' });

  // A run saves a copy of the store's files first (upstream: run saves a copy before writing).
  const backupDir = join(workDir, `memory-backup-${Date.now()}`);
  cpSync(memDir, backupDir, { recursive: true });

  setToolRoots(memDir, textDir);
  setToolActivity({
    onReadTranscript: (abs) => emitProgress('analyzer:active', { source: abs }),
    onMemoryChange: () => emitProgress('memory:files', { count: memoryFileCount() }),
  });
  emitProgress('memory:files', { count: memoryFileCount() });

  const mastra = createMastra(input.config ?? loadConfigOrExit());
  const leadAgent = mastra.getAgent('memory-distiller');
  emitProgress('phase:start', { phase: 'lead' });

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
  for (const def of plan.definitions) setAgentRetries(def.graph);
  await mastra.addDynamicWorkflows(plan.definitions as never);

  const root = plan.definitions.find((d) => d.id === 'dream-root');
  if (!root) throw new Error('lead plan has no dream-root definition');
  emitProgress('phase:done', { phase: 'lead' });

  const analyzerBriefs = plan.definitions
    .filter((d) => d.id !== root.id)
    .map((d) => ({ id: d.id, brief: briefTexts(d.graph).join('\n') }));
  const rootWorkflowSteps = workflowEntries(root.graph);
  for (const r of rendered) {
    const match = analyzerBriefs.find((b) => b.brief.includes(r.source));
    emitProgress('analyzer:plan', {
      id: match?.id ?? r.source,
      source: r.source,
      label: basename(r.source),
    });
  }

  emitProgress('phase:start', { phase: 'analyze' });
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
    processed: [],
  };

  for (const r of rendered) {
    const stepIds = analyzerBriefs
      .filter((b) => b.brief.includes(r.source))
      .flatMap((b) => rootWorkflowSteps.filter((e) => e.workflowId === b.id).map((e) => e.id));
    if (stepIds.length === 0) {
      const reason = `lead plan omits this input: no analyzer brief names ${r.source}`;
      report.failures.push({ input: r.path, reason });
      emitProgress('analyzer:done', { source: r.source, error: reason });
      continue;
    }
    const analyzerSteps = stepIds.map((id) => steps[id]);
    if (analyzerSteps.some((s) => s && s.status === 'success' && s.output != null)) {
      report.inputs_processed++;
      emitProgress('analyzer:done', { source: r.source });
    } else {
      const err = analyzerSteps.map((s) => s?.error).find((e) => e != null);
      const reason = err ? String((err as Error).message ?? err) : 'analyzer returned no result';
      report.failures.push({
        input: r.path,
        reason,
      });
      emitProgress('analyzer:done', { source: r.source, error: reason });
    }
  }
  emitProgress('phase:done', { phase: 'analyze' });

  emitProgress('phase:start', { phase: 'organize' });
  if (result.status === 'success') {
    const out = result.result as { index_entries?: number; changes?: string[] };
    report.organized = true;
    report.index_entries = out.index_entries ?? null;
    report.changes = out.changes ?? [];
    emitProgress('phase:done', { phase: 'organize' });
  } else {
    emitProgress('phase:done', { phase: 'organize', error: 'organizer did not return a result' });
  }

  // processed[] accumulates across runs: only newly successful inputs join,
  // keyed by (session, contentHash), so a re-run never double-counts.
  const failed = new Set(report.failures.map((f) => f.input));
  const fresh: ProcessedEntry[] = rendered
    .filter((r) => !failed.has(r.path))
    .map((r) => ({ session: r.session, contentHash: contentHashOf(r.path) }));
  report.processed = mergeProcessed(loadProcessed(join(workDir, 'dream-report.json')), fresh);

  writeFileSync(join(workDir, 'dream-report.json'), JSON.stringify(report, null, 2));
  emitProgress('dream:done', {
    organized: report.organized,
    failures: report.failures.length,
    processed: report.inputs_processed,
  });
  return report;
}

export function listTranscripts(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => join(dir, f));
}
