import { readFileSync } from 'node:fs';
import { contentToText, type SessionTranscript, type TranscriptEvent } from './types.js';

// Pi session JSONL: session header, then message records whose message.role is
// system | user | assistant | toolResult. Assistant content blocks carry text
// and toolCall entries; toolResult records carry toolName/toolCallId/content.
export function parsePiSession(path: string): SessionTranscript {
  const events: TranscriptEvent[] = [];
  let id = '';
  let createdAt = '';
  let cwd = '';
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let rec: Record<string, unknown>;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.type === 'session') {
      id = String(rec.id ?? '');
      createdAt = String(rec.timestamp ?? '');
      cwd = String(rec.cwd ?? '');
      continue;
    }
    if (rec.type !== 'message') continue;
    const msg = rec.message as Record<string, unknown>;
    if (!msg) continue;
    const role = String(msg.role ?? '');
    if (role === 'system') continue;
    if (role === 'user' || role === 'assistant') {
      const text = contentToText(msg.content);
      if (text.trim()) events.push({ kind: role, text });
      for (const block of (msg.content ?? []) as Record<string, unknown>[]) {
        if (block?.type === 'toolCall') {
          const name = String(block.toolName ?? block.name ?? 'tool');
          const args = block.args ?? block.input ?? block.arguments ?? {};
          events.push({ kind: 'tool_call', name, input: JSON.stringify(args, null, 2) });
        }
      }
    } else if (role === 'toolResult') {
      events.push({
        kind: 'tool_result',
        name: String(msg.toolName ?? 'tool'),
        text: contentToText(msg.content),
        isError: Boolean(msg.isError),
      });
    }
  }
  return { id, title: cwd || id, source: 'pi', createdAt, events };
}
