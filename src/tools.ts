import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

// Memory tools are scoped: read is allowed for memory and transcripts; write and
// edit stay inside the memory directory (upstream: "Write only inside that directory").
let memRoot = resolve('.');
let transcriptRoot = resolve('.');
let onReadTranscript: ((abs: string) => void) | null = null;
let onMemoryChange: (() => void) | null = null;

export function setToolRoots(memory: string, transcripts: string): void {
  memRoot = resolve(memory);
  transcriptRoot = resolve(transcripts);
}

export function setToolActivity(hooks: {
  onReadTranscript?: (abs: string) => void;
  onMemoryChange?: () => void;
} | null): void {
  onReadTranscript = hooks?.onReadTranscript ?? null;
  onMemoryChange = hooks?.onMemoryChange ?? null;
}

// Per-run write quota (one shared counter for write and edit): a run that
// rewrites memory without bound is a runaway, so the tools refuse writes past
// the named limit instead of silently continuing. Only mutations that actually
// land consume the quota; refused paths and failed validations do not.
// The counter resets at the start of each run (see resetWriteQuota, called
// from the run entry point).
export const MAX_WRITES_PER_RUN = 100;

let writesThisRun = 0;

export function resetWriteQuota(): void {
  writesThisRun = 0;
}

export function writeQuotaUsage(): { used: number; quota: number } {
  return { used: writesThisRun, quota: MAX_WRITES_PER_RUN };
}

function consumeWriteQuota(): void {
  if (writesThisRun >= MAX_WRITES_PER_RUN) {
    throw new Error(
      `memory write quota exceeded: quota is ${MAX_WRITES_PER_RUN} writes per run, already used ${writesThisRun}; start a new run to reset the counter`,
    );
  }
  writesThisRun++;
}

function inside(root: string, p: string): boolean {
  const abs = resolve(p);
  return abs === root || abs.startsWith(root + '/');
}

function requireMemPath(p: string): string {
  const abs = resolve(p);
  if (!inside(memRoot, abs)) throw new Error(`outside memory directory: ${p}`);
  return abs;
}

// The memory is a directory of Markdown files on disk (upstream's own store
// definition), and the organizer's mechanics assume every file is a memory
// file with a [[slug]] and an index entry. Write and edit therefore accept
// only .md paths, so scratch files cannot strand outside that world.
function requireMemFile(p: string): string {
  const abs = requireMemPath(p);
  if (!abs.endsWith('.md')) throw new Error(`memory files are Markdown (.md): ${p}`);
  return abs;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export function writeMemoryFile(path: string, content: string): { path: string; bytes: number } {
  const abs = requireMemFile(resolve(memRoot, path));
  consumeWriteQuota();
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  onMemoryChange?.();
  return { path: abs, bytes: content.length };
}

export function editMemoryFile(path: string, oldText: string, newText: string): { path: string } {
  const abs = requireMemFile(resolve(memRoot, path));
  const text = readFileSync(abs, 'utf8');
  if (!text.includes(oldText)) {
    throw new Error(`oldText not found in ${path}; re-read the file before editing`);
  }
  consumeWriteQuota();
  writeFileSync(abs, text.replace(oldText, newText));
  onMemoryChange?.();
  return { path: abs };
}

export const readTool = createTool({
  id: 'read',
  description: 'Read a file. Allowed for the memory directory and assigned transcript files.',
  inputSchema: z.object({ path: z.string().describe('absolute or memory-relative path') }),
  execute: async ({ path }) => {
    const abs = resolve(memRoot, path);
    const ok = inside(memRoot, abs) || inside(transcriptRoot, abs);
    if (!ok) throw new Error(`read refused outside memory and transcripts: ${path}`);
    if (inside(transcriptRoot, abs)) onReadTranscript?.(abs);
    return { text: readFileSync(abs, 'utf8') };
  },
});

export const writeTool = createTool({
  id: 'write',
  description:
    'Write a Markdown memory file inside the memory directory. Creates parent directories. Shares a per-run quota with edit (MAX_WRITES_PER_RUN writes per run).',
  inputSchema: z.object({ path: z.string(), content: z.string() }),
  execute: async ({ path, content }) => writeMemoryFile(path, content),
});

export const editTool = createTool({
  id: 'edit',
  description:
    'Replace one exact string in a memory file. Refuses if the old text is absent. Shares a per-run quota with write (MAX_WRITES_PER_RUN writes per run).',
  inputSchema: z.object({ path: z.string(), oldText: z.string(), newText: z.string() }),
  execute: async ({ path, oldText, newText }) => editMemoryFile(path, oldText, newText),
});

function globToRegExp(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          // globstar followed by '/': match zero or more directories
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i++;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

export const globTool = createTool({
  id: 'glob',
  description: 'List memory files whose path matches the glob pattern (e.g. "*.md" or "**/*.md").',
  inputSchema: z.object({ pattern: z.string() }),
  execute: async ({ pattern }) => {
    const files = walk(memRoot).map((p) => relative(memRoot, p).split(sep).join('/'));
    const re = globToRegExp(pattern.includes('/') ? pattern : `**/${pattern}`);
    return { files: files.filter((f) => re.test(f)).sort() };
  },
});

export const grepTool = createTool({
  id: 'grep',
  description: 'Search memory files for a regular expression. Returns matching lines.',
  inputSchema: z.object({ pattern: z.string() }),
  execute: async ({ pattern }) => {
    const re = new RegExp(pattern, 'i');
    const hits: string[] = [];
    for (const p of walk(memRoot)) {
      const lines = readFileSync(p, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (re.test(line)) hits.push(`${relative(memRoot, p)}:${i + 1}: ${line}`);
      });
    }
    return { matches: hits.slice(0, 200) };
  },
});

export const memoryTools = {
  read: readTool,
  write: writeTool,
  edit: editTool,
  glob: globTool,
  grep: grepTool,
};

export function memoryFileCount(): number {
  if (!existsSync(memRoot)) return 0;
  return walk(memRoot).length;
}
