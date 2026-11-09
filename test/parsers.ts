import assert from 'node:assert/strict';
import { loadTranscript } from '../src/transcripts/load.js';
import type { TranscriptEvent } from '../src/transcripts/types.js';

// Codex rollout parsing: load.ts must dispatch the codex fixture to the codex
// parser and yield user/assistant/tool events. The dream gate deliberately runs
// the three pi sessions only; this check keeps codex parsing covered.
const transcript = loadTranscript('test/fixtures/codex-01-release-process.jsonl');
assert.equal(transcript.source, 'codex');

const kinds = new Set<TranscriptEvent['kind']>(transcript.events.map((e) => e.kind));
for (const kind of ['user', 'assistant', 'tool_call', 'tool_result'] as const) {
  assert.ok(kinds.has(kind), `codex fixture yields no ${kind} event`);
}

console.log(`PASS  codex parser  —  ${transcript.events.length} events: ${[...kinds].sort().join(', ')}`);
