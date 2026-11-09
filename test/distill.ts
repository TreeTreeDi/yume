import assert from 'node:assert/strict';
import { loadTranscript } from '../src/transcripts/load.js';
import { renderTranscript } from '../src/transcripts/types.js';
import { distillEvents } from '../src/transcripts/distill.js';
import type { TranscriptEvent } from '../src/transcripts/types.js';

// #24 distill acceptance: per-fixture checks on inflated large variants.
// Raw fixtures are tiny (a few hundred bytes), so a 10% ratio is only
// meaningful after tool payloads grow past the trim thresholds. The test
// expands every tool payload with filler, then checks: distilled bytes <=
// 10% of raw, known error line survives, user prompts survive verbatim,
// prune markers are self-consistent (pruned + kept == original lines).
const FIXTURES = [
  'test/fixtures/pi-01-stale-fact.jsonl',
  'test/fixtures/pi-02-buried-detail.jsonl',
  'test/fixtures/pi-03-overlap-conflict.jsonl',
  'test/fixtures/codex-01-release-process.jsonl',
];

const KNOWN_ERROR_LINE =
  'Traceback (most recent call last): ValueError: TIDEWICK_DATA_DIR is required';

function fillerLine(i: number): string {
  return `filler log line ${i} abcdefghijklmnopqrstuvwxyz0123456789 padding padding`;
}

function inflateToolText(original: string, lines: number): string {
  const filler: string[] = [];
  for (let i = 0; i < lines; i++) filler.push(fillerLine(i));
  return original + '\n' + filler.join('\n');
}

function makeLargeErrorText(): string {
  const filler: string[] = [];
  for (let i = 0; i < 1000; i++) {
    if (i === 500) filler.push(KNOWN_ERROR_LINE);
    else if (i === 501) filler.push('Exception: buried detail check FAILED marker');
    else filler.push(fillerLine(i));
  }
  return filler.join('\n');
}

function buildLargeEvents(events: TranscriptEvent[]): TranscriptEvent[] {
  const out: TranscriptEvent[] = events.map((e) => {
    if (e.kind === 'tool_result') return { ...e, text: inflateToolText(e.text, 1000) };
    if (e.kind === 'tool_call') return { ...e, input: inflateToolText(e.input, 200) };
    return e;
  });
  out.push({ kind: 'tool_result', name: 'bash', text: makeLargeErrorText(), isError: true });
  return out;
}

const PRUNE_RE = /\(pruned (\d+) lines, (\d+) bytes\)/g;

for (const path of FIXTURES) {
  const transcript = loadTranscript(path);
  const userTexts = transcript.events.filter((e) => e.kind === 'user').map((e) => e.text);
  assert.ok(userTexts.length > 0, `${path} has no user prompt`);

  const largeEvents = buildLargeEvents(transcript.events);
  const largeTranscript = { ...transcript, events: largeEvents };

  const rawText = renderTranscript(largeTranscript, { distill: false });
  const rawBytes = Buffer.byteLength(rawText, 'utf8');

  const distilled = distillEvents(largeEvents);
  assert.equal(distilled.length, largeEvents.length, `${path} distill must keep event count`);
  const distilledTranscript = { ...transcript, events: distilled };
  const distilledTextDefault = renderTranscript(largeTranscript);
  const distilledText = renderTranscript(distilledTranscript, { distill: false });
  assert.equal(
    distilledTextDefault,
    distilledText,
    `${path} default render must equal pre-distilled render`,
  );
  const distilledBytes = Buffer.byteLength(distilledText, 'utf8');

  // 1. distilled bytes <= 10% of raw.
  assert.ok(
    distilledBytes <= rawBytes * 0.1,
    `${path} ratio ${distilledBytes}/${rawBytes} exceeds 10%`,
  );

  // 2. known error line survives.
  assert.ok(
    distilledText.includes(KNOWN_ERROR_LINE),
    `${path} known error line pruned away`,
  );

  // 3. user prompts survive verbatim.
  for (const u of userTexts) {
    assert.ok(distilledText.includes(u), `${path} user prompt lost: ${JSON.stringify(u)}`);
  }
  for (const e of distilled) {
    if (e.kind === 'user') {
      const orig = largeEvents.find(
        (o) => o.kind === 'user' && o.text === e.text,
      );
      assert.ok(orig, `${path} user event altered`);
    }
  }

  // 4. markers self-consistent: one marker per trimmed tool event, and
  // pruned lines + distilled lines == original lines (marker occupies 1 line).
  let markerCount = 0;
  for (let i = 0; i < largeEvents.length; i++) {
    const orig = largeEvents[i];
    const d = distilled[i];
    const origText =
      orig.kind === 'tool_result'
        ? orig.text
        : orig.kind === 'tool_call'
          ? orig.input
          : null;
    if (origText === null) continue;
    const dText =
      d.kind === 'tool_result'
        ? d.text
        : d.kind === 'tool_call'
          ? (d as { kind: 'tool_call'; input: string }).input
          : null;
    if (dText === null) continue;
    const markers = [...dText.matchAll(PRUNE_RE)];
    if (dText === origText) {
      assert.equal(markers.length, 0, `${path} event ${i} untrimmed but has marker`);
      continue;
    }
    assert.equal(markers.length, 1, `${path} event ${i} must carry exactly 1 prune marker`);
    markerCount++;
    const prunedLines = Number(markers[0][1]);
    const prunedBytes = Number(markers[0][2]);
    assert.ok(prunedLines > 0 && prunedBytes > 0, `${path} event ${i} marker non-positive`);
    const origLines = origText.split('\n').length;
    const distilledLines = dText.split('\n').length;
    assert.equal(
      prunedLines + distilledLines,
      origLines + 1,
      `${path} event ${i} line accounting: pruned ${prunedLines} + distilled ${distilledLines} != original ${origLines} + marker`,
    );
  }
  assert.ok(markerCount > 0, `${path} expected at least one prune marker`);
  const textMarkers = [...distilledText.matchAll(PRUNE_RE)];
  assert.equal(
    textMarkers.length,
    markerCount,
    `${path} rendered markers ${textMarkers.length} != trimmed events ${markerCount}`,
  );

  console.log(
    `PASS  distill ${path}  —  ${rawBytes}B -> ${distilledBytes}B (${((distilledBytes / rawBytes) * 100).toFixed(1)}%), markers ${markerCount}`,
  );
}

console.log('PASS  distill all fixtures');
