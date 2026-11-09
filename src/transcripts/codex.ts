import { readFileSync } from 'node:fs';
import { contentToText, type SessionTranscript, type TranscriptEvent } from './types.js';

// Codex rollout JSONL: session_meta header, then response_item records with
// payload.type message | function_call | function_call_output |
// custom_tool_call | custom_tool_call_output | agent_message | reasoning.
// event_msg / world_state / turn_context / token_usage_record lines are not evidence.
export function parseCodexSession(path: string): SessionTranscript {
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
    const payload = rec.payload as Record<string, unknown> | undefined;
    if (rec.type === 'session_meta' && payload) {
      id = String(payload.session_id ?? '');
      createdAt = String(payload.timestamp ?? rec.timestamp ?? '');
      cwd = String(payload.cwd ?? '');
      continue;
    }
    if (rec.type !== 'response_item' || !payload) continue;
    const t = String(payload.type ?? '');
    if (t === 'message') {
      const role = String(payload.role ?? '');
      const text = contentToText(payload.content);
      if (!text.trim()) continue;
      if (role === 'user') events.push({ kind: 'user', text });
      else if (role === 'assistant') events.push({ kind: 'assistant', text });
    } else if (t === 'function_call' || t === 'custom_tool_call') {
      events.push({
        kind: 'tool_call',
        name: String(payload.name ?? 'tool'),
        input: String(payload.input ?? payload.arguments ?? ''),
      });
    } else if (t === 'function_call_output' || t === 'custom_tool_call_output') {
      const out = payload.output;
      events.push({
        kind: 'tool_result',
        name: 'tool',
        text: typeof out === 'string' ? out : contentToText(out),
        isError: false,
      });
    } else if (t === 'agent_message') {
      const text = contentToText(payload.content);
      if (text.trim()) events.push({ kind: 'assistant', text });
    }
  }
  return { id, title: cwd || id, source: 'codex', createdAt, events };
}
