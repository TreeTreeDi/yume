import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { emitProgress, setProgressSink, clearProgressSink } from '../src/progress.js';
import { initialState, reduceEvent } from '../src/tui/state.js';
import { formatElapsed, renderFrame, stripAnsi, visibleWidth } from '../src/tui/render.js';
import { makeTheme } from '../src/tui/theme.js';
import { tuiEligible } from '../src/tui/term.js';
import { Tui } from '../src/tui/index.js';

const T0 = Date.parse('2026-11-09T02:00:00Z');
const plain = makeTheme({ depth: 0 });

function stateAfter(events: [string, Record<string, unknown>][]) {
  const state = initialState();
  events.forEach(([event, data], index) => reduceEvent(state, event, data, T0 + index * 1000));
  return state;
}

function render(state: ReturnType<typeof initialState>, width = 100) {
  return renderFrame(state, { width, theme: plain, now: T0 + 60_000, spin: '⠸' }).map(stripAnsi);
}

{
  const env = { NO_COLOR: '1', TERM: 'xterm-256color' };
  const stderr = { isTTY: true, columns: 80 } as NodeJS.WriteStream;
  assert.equal(tuiEligible({ env, stderr, json: false }), false);
  assert.equal(tuiEligible({ env: { TERM: 'xterm' }, stderr, json: true }), false);
  assert.equal(tuiEligible({ env: { TERM: 'xterm', CI: 'true' }, stderr }), false);
  assert.equal(tuiEligible({ env: { TERM: 'xterm' }, stderr: { isTTY: true, columns: 40 } as NodeJS.WriteStream }), false);
  assert.equal(tuiEligible({ env: { TERM: 'xterm' }, stderr, json: false }), true);
  console.log('PASS  tui eligibility');
}

{
  assert.equal(formatElapsed(12), '12ms');
  assert.equal(formatElapsed(4000), '0:04');
  assert.equal(visibleWidth('\x1b[31mabc\x1b[0m'), 3);
  console.log('PASS  tui formatters');
}

{
  const state = stateAfter([
    ['dream:start', { expected: 3 }],
    ['phase:start', { phase: 'render' }],
    ['phase:done', { phase: 'render' }],
    ['phase:start', { phase: 'lead' }],
    ['phase:done', { phase: 'lead' }],
    ['analyzer:plan', { id: 'a1', source: '/tmp/a.txt', label: 'a.txt' }],
    ['analyzer:plan', { id: 'a2', source: '/tmp/b.txt', label: 'b.txt' }],
    ['phase:start', { phase: 'analyze' }],
    ['analyzer:active', { source: '/tmp/a.txt' }],
    ['analyzer:done', { source: '/tmp/b.txt', error: 'timeout' }],
  ]);
  assert.equal(state.phases.render.status, 'done');
  assert.equal(state.phases.analyze.status, 'active');
  assert.equal(state.analyzers[0].status, 'active');
  assert.equal(state.analyzers[1].status, 'error');
  assert.equal(state.analyzers[1].error, 'timeout');
  const lines = render(state);
  assert.ok(lines.some((l) => l.includes('yume')));
  assert.ok(lines.some((l) => l.includes('b.txt') && l.includes('timeout')));
  console.log('PASS  analyzer error is a row, not a crash');
}

{
  const state = stateAfter([
    ['dream:start', { expected: 1 }],
    ['phase:start', { phase: 'lead' }],
    ['dream:fail', { error: 'lead plan has no dream-root definition' }],
  ]);
  assert.equal(state.fatal, 'lead plan has no dream-root definition');
  const lines = render(state);
  assert.ok(lines.some((l) => l.includes('lead plan has no dream-root definition')));
  console.log('PASS  fatal error stays on the frame');
}

{
  let calls = 0;
  setProgressSink(() => {
    calls += 1;
    throw new Error('renderer exploded');
  });
  emitProgress('phase:start', { phase: 'lead' });
  emitProgress('phase:done', { phase: 'lead' });
  clearProgressSink();
  assert.equal(calls, 2);
  console.log('PASS  throwing sink does not escape emitProgress');
}

{
  const chunks: string[] = [];
  const stderr = Object.assign(new EventEmitter(), {
    isTTY: true,
    columns: 100,
    write(s: string) {
      chunks.push(s);
      return true;
    },
  }) as unknown as NodeJS.WriteStream;
  const tui = new Tui({ theme: plain, stderr });
  tui.onEvent('dream:start', { expected: 1 });
  tui.onEvent('phase:start', { phase: 'analyze' });
  tui.onEvent('analyzer:plan', { id: 'a1', source: '/tmp/a.txt', label: 'session-a.txt' });
  tui.onEvent('analyzer:done', { source: '/tmp/a.txt', error: 'quota exceeded' });
  tui.paint(true);
  tui.stop();
  const text = chunks.join('');
  assert.ok(text.includes('session-a.txt'));
  assert.ok(text.includes('quota exceeded'));
  assert.ok(text.includes('\x1b[?25h'));
  console.log('PASS  Tui paints analyzer errors to stderr and restores the cursor');
}
