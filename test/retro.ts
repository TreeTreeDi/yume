import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkRetro, collectPending, mergeProcessed } from '../src/retro.js';

// Two transcripts, 10 bytes each. Thresholds pick which side of the trigger
// each case lands on.
const dir = mkdtempSync(join(tmpdir(), 'yume-retro-'));
const a = join(dir, 'sess-a.jsonl');
const b = join(dir, 'sess-b.jsonl');
writeFileSync(a, 'x'.repeat(10));
writeFileSync(b, 'y'.repeat(10));
const paths = [a, b];

{
  // Below both thresholds: not ready.
  const pending = collectPending(paths, []);
  const out = checkRetro(pending, { minSessions: 3, minBytes: 1000 });
  assert.deepEqual(out, {
    ready: false,
    sessions: 2,
    bytes: 20,
    threshold: { minSessions: 3, minBytes: 1000 },
  });
  console.log('PASS  retro below thresholds reports ready=false');
}

{
  // Session count reaches the threshold: ready.
  const pending = collectPending(paths, []);
  const out = checkRetro(pending, { minSessions: 2, minBytes: 1000 });
  assert.equal(out.ready, true);
  assert.equal(out.sessions, 2);
  console.log('PASS  retro session count at threshold reports ready=true');
}

{
  // Byte count reaches the threshold while sessions stay below: ready.
  const pending = collectPending([a], []);
  const out = checkRetro(pending, { minSessions: 5, minBytes: 10 });
  assert.equal(out.ready, true);
  assert.equal(out.sessions, 1);
  assert.equal(out.bytes, 10);
  console.log('PASS  retro byte count at threshold reports ready=true');
}

{
  // Same transcript across two runs: processed grows once, pending drops to 0.
  const first = collectPending(paths, []);
  const afterFirst = mergeProcessed([], first);
  assert.equal(afterFirst.length, 2);
  const second = collectPending(paths, afterFirst);
  assert.equal(second.length, 0, 'already-processed transcripts must not count again');
  const afterSecond = mergeProcessed(afterFirst, second);
  assert.equal(afterSecond.length, 2, 're-running the same transcripts must not grow processed');
  const out = checkRetro(second, { minSessions: 1, minBytes: 1 });
  assert.deepEqual(out, {
    ready: false,
    sessions: 0,
    bytes: 0,
    threshold: { minSessions: 1, minBytes: 1 },
  });
  console.log('PASS  same transcript run twice does not raise sessions');
}
