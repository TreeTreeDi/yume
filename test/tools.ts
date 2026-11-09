import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MAX_WRITES_PER_RUN,
  editMemoryFile,
  resetWriteQuota,
  setToolRoots,
  writeMemoryFile,
  writeQuotaUsage,
} from '../src/tools.js';
import { ORGANIZER_SYSTEM } from '../src/prompts.js';
import { createMastra } from '../src/mastra.js';

// Issue #25 acceptance: quota enforcement, per-run reset, skill extraction.
// Style mirrors test/assertions.ts: named checks, all reported, nonzero exit on failure.
interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];
function check(name: string, fn: () => string): void {
  try {
    checks.push({ name, ok: true, detail: fn() });
  } catch (err) {
    checks.push({ name, ok: false, detail: err instanceof Error ? err.message : String(err) });
  }
}

const tmpRoot = mkdtempSync(join(tmpdir(), 'yume-quota-'));
const memDir = join(tmpRoot, 'memory');
const txDir = join(tmpRoot, 'transcripts');
setToolRoots(memDir, txDir);
process.env.YUME_DB = join(tmpRoot, 'yume.db');

// 1. Writes past the quota are refused, and the error names quota and used count.
check('quota refuses writes past the limit', () => {
  resetWriteQuota();
  for (let i = 0; i < MAX_WRITES_PER_RUN - 1; i++) {
    writeMemoryFile(`bulk-${i}.md`, `# note ${i}\n`);
  }
  // write and edit share one counter: the last free slot goes to an edit.
  editMemoryFile('bulk-0.md', '# note 0', '# note 0 (touched)\n');
  assert.equal(writeQuotaUsage().used, MAX_WRITES_PER_RUN);
  assert.throws(
    () => writeMemoryFile('bulk-over.md', 'one too many\n'),
    (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      assert.match(message, /quota/i, 'error names the quota');
      assert.ok(message.includes(String(MAX_WRITES_PER_RUN)), 'error names the quota value');
      assert.ok(
        message.includes(`already used ${MAX_WRITES_PER_RUN}`),
        'error names the used count',
      );
      return true;
    },
  );
  return `limit ${MAX_WRITES_PER_RUN}, refused write past it`;
});

// 2. The counter resets at the start of each run (createMastra is the run entry).
check('counter resets at run start', () => {
  // Phase 1 leaves the counter exhausted; a new run must zero it.
  createMastra();
  writeMemoryFile('after-reset.md', 'fresh run\n');
  assert.equal(writeQuotaUsage().used, 1);
  return 'write succeeds right after createMastra';
});

// 3. Extraction: new file carries frontmatter, original keeps [[slug]] only.
check('extraction moves detail behind a pointer', () => {
  resetWriteQuota();
  const slug = 'retry-runbook';
  const detail = [
    'RETRY-RUNBOOK-7f3a9c: when a deploy flakes, run deploy --retry 3,',
    'then wait 60s, then run deploy --verify; repeat at most twice.',
    'If verify still fails, page the release owner with the run id.',
  ].join('\n');
  const intro = 'Deploy notes use the pi agent.\n';
  const body = `${intro}\n${detail}\n`;
  assert.ok(detail.length > body.length / 2, 'fixture detail is over half the body');
  writeMemoryFile('deploy-notes.md', `---\nname: deploy-notes\ndescription: deploy notes\n---\n${body}`);
  writeMemoryFile(
    `${slug}.md`,
    `---\nname: ${slug}\ndescription: retry runbook for flaky deploys\n---\n${detail}\n`,
  );
  editMemoryFile('deploy-notes.md', detail, 'Retry policy lives in [[retry-runbook]].');
  const extracted = readFileSync(join(memDir, `${slug}.md`), 'utf8');
  const original = readFileSync(join(memDir, 'deploy-notes.md'), 'utf8');
  assert.ok(extracted.startsWith('---\n'), 'new file starts with frontmatter');
  assert.ok(extracted.includes(`name: ${slug}`), 'new file names the slug');
  assert.ok(extracted.includes('description:'), 'new file describes itself');
  assert.ok(extracted.includes(detail), 'new file carries the moved detail');
  assert.ok(original.includes(`[[${slug}]]`), 'original keeps the pointer');
  assert.ok(!original.includes(detail), 'original no longer carries the detail text');
  return 'new file has frontmatter, original holds [[retry-runbook]] only';
});

// 4. The Organizer prompt states the extraction rule (all three must hold) and the quota.
check('organizer prompt states extraction criteria and quota', () => {
  for (const needle of [
    'more than half',
    'reusable process',
    "differs from the file's own topic",
    'MAX_WRITES_PER_RUN',
    '[[new-slug]]',
    'frontmatter',
  ]) {
    assert.ok(ORGANIZER_SYSTEM.includes(needle), `prompt missing: ${needle}`);
  }
  return 'three criteria plus quota present in ORGANIZER_SYSTEM';
});

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}  —  ${c.detail}`);
  if (!c.ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
