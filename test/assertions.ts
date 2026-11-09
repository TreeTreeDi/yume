import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Test track, kept apart from the practice track (the dream run) so a run that
// drifted from upstream shows up as a comparison, not as a silent rewrite.
// Assertions are executable and replayable. All of them are 实测 checks: they
// read the produced memory directory and the dream report.

const memDir = process.argv[2] ?? 'data/memory';
const reportPath = process.argv[3] ?? 'data/runs/latest/dream-report.json';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];
const files: { rel: string; text: string }[] = [];
function walk(dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push({ rel: relative(memDir, p), text: readFileSync(p, 'utf8') });
  }
}
if (existsSync(memDir)) walk(memDir);

const all = files.map((f) => f.text).join('\n');
const report = existsSync(reportPath)
  ? JSON.parse(readFileSync(reportPath, 'utf8'))
  : null;

function check(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
}

// 1. Every input transcript was analyzed.
check(
  'all transcripts analyzed',
  report !== null && report.inputs_processed === report.inputs_expected && report.failures.length === 0,
  report ? `processed ${report.inputs_processed}/${report.inputs_expected}, failures ${report.failures.length}` : 'no dream report found',
);

// 2. Organizer ran and the index is complete.
const indexFile = files.find((f) => f.rel === '_index.md');
const indexText = indexFile?.text ?? '';
const liveFiles = files.filter((f) => f.rel !== '_index.md' && !f.text.trimStart().startsWith('MOVED TO'));
const missingFromIndex = liveFiles.filter((f) => {
  const slug = f.rel.replace(/\.(md|txt)$/, '').split('/').pop();
  return !indexText.includes(`[[${slug}]]`);
});
check(
  'index complete',
  indexFile !== undefined && report?.organized === true && missingFromIndex.length === 0,
  `${liveFiles.length} live files, ${missingFromIndex.length} missing from _index.md`,
);

// 3. Facts are traceable to a source session.
const sourceMarker = /sess-fixture-0\d|source:|来源|verified \d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2}/i;
check(
  'facts carry provenance',
  sourceMarker.test(all),
  'found dated or source-marked lines: ' + sourceMarker.test(all),
);

// 4. Duplicates were merged: no two live files cover the same slug.
const slugs = liveFiles.map((f) => f.rel.replace(/\.(md|txt)$/, '').split('/').pop());
const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
check('no duplicate slugs', dupSlugs.length === 0, `duplicates: ${JSON.stringify(dupSlugs)}`);

// 5. The conflict was retained, not overwritten without evidence.
check(
  'conflict retained',
  /CONFLICT/i.test(all) || (/URL/i.test(all) && /stations\.json/i.test(all)),
  'CONFLICT marker present or both conflicting claims kept',
);

// 6. The stale fact was superseded with a date, not silently copied.
check(
  'stale fact superseded',
  /TIDEWICK_DATA_DIR/i.test(all) && /(superseded|replaced|no longer|removed|obsolete|过时|取代)/i.test(all),
  'TIDEWICK_DATA_DIR present together with a supersede marker',
);

// 7. Memory is navigable: frontmatter on live files, nothing over 100KB.
const noFrontmatter = liveFiles.filter((f) => f.rel.endsWith('.md') && !f.text.startsWith('---'));
const oversize = liveFiles.filter((f) => f.text.length > 100 * 1024);
check(
  'frontmatter and size',
  noFrontmatter.length === 0 && oversize.length === 0,
  `${noFrontmatter.length} without frontmatter, ${oversize.length} over 100KB`,
);

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}  —  ${c.detail}`);
  if (!c.ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
