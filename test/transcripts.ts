import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// CLI behavior a retro agent relies on: distilled render by default, --raw
// unpruned, --since filters by session createdAt, unusable input exits
// nonzero. One fresh synthetic session keeps --since deterministic.
const run = (argv: string[]) =>
  spawnSync('npx', ['tsx', 'src/cli/transcripts.ts', ...argv], { encoding: 'utf8' });

const dir = mkdtempSync(join(tmpdir(), 'yume-transcripts-'));
const now = new Date().toISOString();
const big = Array.from({ length: 80 }, (_, i) => `payload-line-${i}`).join('\n');
const sess = join(dir, 'sess-today.jsonl');
writeFileSync(
  sess,
  [
    JSON.stringify({ type: 'session', id: 'sess-today', timestamp: now, cwd: '/tmp/retro' }),
    JSON.stringify({
      type: 'message',
      id: 'm1',
      parentId: null,
      timestamp: now,
      message: { role: 'user', content: [{ type: 'text', text: 'hello retro' }] },
    }),
    JSON.stringify({
      type: 'message',
      id: 'm2',
      parentId: null,
      timestamp: now,
      message: { role: 'toolResult', toolName: 'bash', isError: false, content: [{ type: 'text', text: big }] },
    }),
  ].join('\n'),
);
const old = join(dir, 'sess-old.jsonl');
writeFileSync(
  old,
  JSON.stringify({ type: 'session', id: 'sess-old', timestamp: '2020-01-01T00:00:00.000Z', cwd: '/tmp/retro' }),
);

{
  // Default: distilled render on stdout.
  const out = run([sess]);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /SESSION sess-today/);
  assert.match(out.stdout, /USER:\nhello retro/);
  assert.match(out.stdout, /\(pruned \d+ lines, \d+ bytes\)/, 'oversized tool payload must carry a prune marker');
  assert.ok(!out.stdout.includes('payload-line-40'), 'distilled output must drop the pruned middle');
  console.log('PASS  default render is distilled and carries prune marker');
}

{
  // --raw: same render without the distill pass.
  const out = run([sess, '--raw']);
  assert.equal(out.status, 0, out.stderr);
  assert.ok(out.stdout.includes('payload-line-40'), '--raw must keep the unpruned middle');
  assert.ok(!out.stdout.includes('(pruned '), '--raw must not emit prune markers');
  console.log('PASS  --raw keeps unpruned tool payload');
}

{
  // --since drops sessions older than the window.
  const out = run(['--transcripts', dir, '--since', '1d']);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /SESSION sess-today/);
  assert.ok(!out.stdout.includes('SESSION sess-old'), 'session older than --since must be filtered');
  assert.match(out.stderr, /skip .*sess-old.*older than --since/);
  console.log('PASS  --since filters by session createdAt');
}

{
  // Nothing usable: every input filtered out, exit 1 with reason on stderr.
  const out = run([old, '--since', '1d']);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /no transcripts within --since 1d/);
  console.log('PASS  fully filtered input exits 1');
}

{
  // Bad --since value: exit 2 at the flag boundary.
  const out = run([sess, '--since', 'bogus']);
  assert.equal(out.status, 2);
  assert.match(out.stderr, /invalid --since/);
  console.log('PASS  invalid --since exits 2');
}
