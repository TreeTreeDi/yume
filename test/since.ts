import assert from 'node:assert/strict';
import { parseSince, sinceCutoff, filterTranscriptsBySince } from '../src/since.js';

{
  assert.deepEqual(parseSince(undefined), { kind: 'all' });
  assert.deepEqual(parseSince('all'), { kind: 'all' });
  const week = parseSince('7d');
  assert.equal(week.kind, 'duration');
  if (week.kind === 'duration') assert.equal(week.ms, 7 * 86_400_000);
  const month = parseSince('30d');
  if (month.kind === 'duration') assert.equal(month.ms, 30 * 86_400_000);
  const mo = parseSince('1mo');
  if (mo.kind === 'duration') assert.equal(mo.ms, 30 * 86_400_000);
  assert.equal(sinceCutoff(parseSince('7d'), Date.parse('2026-11-09T00:00:00Z')), Date.parse('2026-11-02T00:00:00Z'));
  try {
    parseSince('yesterday');
    assert.fail('expected invalid --since to throw');
  } catch (err) {
    assert.match(String(err), /invalid --since/);
  }
  console.log('PASS  parseSince 7d and 30d');
}

{
  const now = Date.parse('2026-11-09T12:00:00Z');
  const paths = [
    'test/fixtures/pi-01-stale-fact.jsonl',
    'test/fixtures/pi-02-buried-detail.jsonl',
    'test/fixtures/pi-03-overlap-conflict.jsonl',
  ];
  const week = filterTranscriptsBySince(paths, parseSince('7d'), now);
  assert.equal(week.kept.length, 0);
  assert.equal(week.skipped.length, 3);
  const month = filterTranscriptsBySince(paths, parseSince('30d'), Date.parse('2026-10-20T00:00:00Z'));
  assert.equal(month.kept.length, 3);
  const all = filterTranscriptsBySince(paths, parseSince('all'), now);
  assert.equal(all.kept.length, 3);
  console.log('PASS  filterTranscriptsBySince uses session createdAt');
}
