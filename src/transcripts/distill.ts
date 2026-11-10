import type { TranscriptEvent } from './types.js';

// #24 transcript distill: trim tool payloads, keep user prompts.
// SessionTranscript structure is unchanged; see distillEvents.

// Tool result trim thresholds.
export const TOOL_RESULT_MAX_LINES = 60;
export const TOOL_RESULT_MAX_BYTES = 8192;
export const TOOL_RESULT_HEAD_LINES = 10;
export const TOOL_RESULT_TAIL_LINES = 10;
export const TOOL_RESULT_ERROR_HEAD_LINES = 20;
export const TOOL_RESULT_ERROR_TAIL_LINES = 20;
export const TOOL_RESULT_ERROR_MATCH_MAX = 30;

// Tool call trim thresholds (input only; no isError special case).
export const TOOL_CALL_MAX_LINES = 40;
export const TOOL_CALL_MAX_BYTES = 4096;
export const TOOL_CALL_HEAD_LINES = 5;
export const TOOL_CALL_TAIL_LINES = 5;

// User/assistant tail-only cap.
export const USER_MAX_BYTES = 8192;
export const ASSISTANT_MAX_BYTES = 8192;

// Error-signal lines rescued from the pruned middle of error results.
export const ERROR_LINE_PATTERN = /Error|FAIL|Exception|Traceback/;

export function formatPruneMarker(prunedLines: number, prunedBytes: number): string {
  return `(pruned ${prunedLines} lines, ${prunedBytes} bytes)`;
}

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

function needsTrim(text: string, maxLines: number, maxBytes: number): boolean {
  if (text.split('\n').length > maxLines) return true;
  return byteLength(text) > maxBytes;
}

function collectErrorLines(middle: string[]): string[] {
  const out: string[] = [];
  for (const ln of middle) {
    if (ERROR_LINE_PATTERN.test(ln)) {
      out.push(ln);
      if (out.length >= TOOL_RESULT_ERROR_MATCH_MAX) break;
    }
  }
  return out;
}

// Keep first `head` lines and last `tail` lines; rescued middle lines (error
// signals) are placed before the marker. Marker counts only truly pruned lines,
// so pruned + distilled == original + 1 (marker line).
function headTailPrune(text: string, head: number, tail: number, rescued: string[]): string {
  const lines = text.split('\n');
  const total = lines.length;
  const headLines = lines.slice(0, head);
  const tailLines = tail > 0 ? lines.slice(total - tail) : [];
  const middle = lines.slice(head, total - tail);
  const rescuedQueue = [...rescued];
  const keptMiddle: string[] = [];
  const prunedLines: string[] = [];
  for (const ln of middle) {
    if (rescuedQueue.length > 0 && ln === rescuedQueue[0]) {
      rescuedQueue.shift();
      keptMiddle.push(ln);
    } else {
      prunedLines.push(ln);
    }
  }
  const marker = formatPruneMarker(prunedLines.length, byteLength(prunedLines.join('\n')));
  return [...headLines, ...keptMiddle, marker, ...tailLines].join('\n');
}

// A payload oversized in few lines cannot take the head/tail line path, so
// it falls back to a byte-level head/tail prune with a byte-only marker.
function byteHeadTailPrune(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= maxBytes) return text;
  // Reserve room for the marker line so the whole result stays under the cap.
  const keep = Math.floor((maxBytes - 64) / 2);
  const head = buf.subarray(0, keep).toString('utf8');
  const tail = buf.subarray(buf.length - keep).toString('utf8');
  return `${head}\n(pruned ${buf.length - keep * 2} bytes)\n${tail}`;
}

export function distillToolResultText(text: string, isError: boolean): string {
  if (!needsTrim(text, TOOL_RESULT_MAX_LINES, TOOL_RESULT_MAX_BYTES)) return text;
  const lines = text.split('\n');
  const head = isError ? TOOL_RESULT_ERROR_HEAD_LINES : TOOL_RESULT_HEAD_LINES;
  const tail = isError ? TOOL_RESULT_ERROR_TAIL_LINES : TOOL_RESULT_TAIL_LINES;
  if (lines.length <= head + tail) return byteHeadTailPrune(text, TOOL_RESULT_MAX_BYTES);
  const middle = lines.slice(head, lines.length - tail);
  const rescued = isError ? collectErrorLines(middle) : [];
  return headTailPrune(text, head, tail, rescued);
}

export function distillToolCallInput(input: string): string {
  if (!needsTrim(input, TOOL_CALL_MAX_LINES, TOOL_CALL_MAX_BYTES)) return input;
  const lines = input.split('\n');
  if (lines.length <= TOOL_CALL_HEAD_LINES + TOOL_CALL_TAIL_LINES) {
    return byteHeadTailPrune(input, TOOL_CALL_MAX_BYTES);
  }
  return headTailPrune(input, TOOL_CALL_HEAD_LINES, TOOL_CALL_TAIL_LINES, []);
}

function tailTruncate(text: string, maxBytes: number): string {
  if (byteLength(text) <= maxBytes) return text;
  const buf = Buffer.from(text, 'utf8');
  const tail = buf.subarray(buf.length - maxBytes).toString('utf8');
  const prunedBytes = byteLength(text) - byteLength(tail);
  return `(truncated ${prunedBytes} bytes)\n${tail}`;
}

export function distillEvents(events: TranscriptEvent[]): TranscriptEvent[] {
  return events.map((e) => {
    if (e.kind === 'tool_result') {
      const text = distillToolResultText(e.text, e.isError);
      return text === e.text ? e : { ...e, text };
    }
    if (e.kind === 'tool_call') {
      const input = distillToolCallInput(e.input);
      return input === e.input ? e : { ...e, input };
    }
    if (e.kind === 'user') {
      const text = tailTruncate(e.text, USER_MAX_BYTES);
      return text === e.text ? e : { ...e, text };
    }
    const text = tailTruncate(e.text, ASSISTANT_MAX_BYTES);
    return text === e.text ? e : { ...e, text };
  });
}
