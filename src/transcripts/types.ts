import { distillEvents } from './distill.js';

export type TranscriptEvent =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'tool_call'; name: string; input: string }
  | { kind: 'tool_result'; name: string; text: string; isError: boolean };

export interface SessionTranscript {
  id: string;
  title: string;
  source: 'pi' | 'codex';
  createdAt: string;
  events: TranscriptEvent[];
}

export function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content as Record<string, unknown>[]) {
    const t = block?.type;
    if (t === 'text' || t === 'input_text' || t === 'output_text') {
      parts.push(String(block.text ?? ''));
    } else if (t === 'thinking') {
      // thinking is not evidence; skip per upstream (thinking events left out)
    }
  }
  return parts.filter(Boolean).join('\n');
}

export function renderTranscript(s: SessionTranscript, opts?: { distill?: boolean }): string {
  const events = opts?.distill === false ? s.events : distillEvents(s.events);
  const lines: string[] = [];
  lines.push(`SESSION ${s.id}: ${s.title}`);
  lines.push(`source: ${s.source}; created ${s.createdAt}`);
  lines.push('');
  lines.push(`=== primary thread ${s.id}: ${s.source} ===`);
  lines.push('');
  for (const ev of events) {
    if (ev.kind === 'user') {
      lines.push('USER:');
      lines.push(ev.text);
    } else if (ev.kind === 'assistant') {
      lines.push('AGENT:');
      lines.push(ev.text);
    } else if (ev.kind === 'tool_call') {
      lines.push(`TOOL CALL ${ev.name}:`);
      lines.push(ev.input);
    } else {
      lines.push(`TOOL RESULT (${ev.name})${ev.isError ? ' [error]' : ''}:`);
      lines.push(ev.text);
    }
    lines.push('');
  }
  return lines.join('\n');
}
