import { readFileSync } from 'node:fs';
import { parsePiSession } from './pi.js';
import { parseCodexSession } from './codex.js';
import type { SessionTranscript } from './types.js';

export function loadTranscript(path: string): SessionTranscript {
  const head = readFileSync(path, 'utf8').split('\n', 1)[0] ?? '';
  if (head.includes('"type":"session_meta"') || head.includes('"type": "session_meta"')) {
    return parseCodexSession(path);
  }
  return parsePiSession(path);
}
