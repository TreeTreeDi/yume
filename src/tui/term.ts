export const MIN_COLUMNS = 60;
export const NARROW_COLUMNS = 84;

export function tuiEligible({
  env = process.env,
  stderr = process.stderr,
  json = false,
}: {
  env?: NodeJS.ProcessEnv;
  stderr?: NodeJS.WriteStream;
  json?: boolean;
} = {}): boolean {
  if (json) return false;
  if (!stderr.isTTY) return false;
  if (env.NO_COLOR !== undefined) return false;
  if (env.CI) return false;
  if ((env.TERM || '') === 'dumb') return false;
  if ((stderr.columns || 80) < MIN_COLUMNS) return false;
  return true;
}

export function colorDepth({
  env = process.env,
  stderr = process.stderr,
}: {
  env?: NodeJS.ProcessEnv;
  stderr?: NodeJS.WriteStream;
} = {}): 0 | 4 | 24 {
  if (env.NO_COLOR !== undefined || !stderr.isTTY) return 0;
  const colorterm = (env.COLORTERM || '').toLowerCase();
  if (colorterm.includes('truecolor') || colorterm.includes('24bit')) return 24;
  return 4;
}

export function backgroundFromColorFgBg(value: string | undefined): 'dark' | 'light' | null {
  if (!value) return null;
  const parts = String(value).split(';');
  const bg = Number(parts[parts.length - 1]);
  if (!Number.isInteger(bg) || bg < 0 || bg > 255) return null;
  return bg === 7 || bg >= 9 ? 'light' : 'dark';
}

export function backgroundFromOscResponse(text: string): 'dark' | 'light' | null {
  const match = /\]11;rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(String(text || ''));
  if (!match) return null;
  const channel = (hex: string) => parseInt(hex, 16) / (16 ** hex.length - 1);
  const [r, g, b] = [match[1], match[2], match[3]].map(channel);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 0.5 ? 'light' : 'dark';
}

export function detectBackground({
  env = process.env,
  stdin = process.stdin,
  stderr = process.stderr,
  timeoutMs = 50,
}: {
  env?: NodeJS.ProcessEnv;
  stdin?: NodeJS.ReadStream;
  stderr?: NodeJS.WriteStream;
  timeoutMs?: number;
} = {}): Promise<'dark' | 'light'> {
  const fallback = backgroundFromColorFgBg(env.COLORFGBG) || 'dark';
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function' || !stderr.isTTY) {
    return Promise.resolve(fallback);
  }

  return new Promise((resolve) => {
    let settled = false;
    let response = '';
    const wasRaw = stdin.isRaw === true;

    const finish = (value: 'dark' | 'light') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stdin.off('data', onData);
      try {
        if (!wasRaw) stdin.setRawMode(false);
        stdin.pause();
      } catch {
        // Terminal state restoration is best-effort.
      }
      resolve(value);
    };

    const onData = (chunk: Buffer | string) => {
      response += chunk.toString('utf8');
      const parsed = backgroundFromOscResponse(response);
      if (parsed) finish(parsed);
      else if (response.includes('\x07') || response.includes('\x1b\\')) finish(fallback);
    };

    const timer = setTimeout(() => finish(fallback), timeoutMs);

    try {
      stdin.setRawMode(true);
      stdin.on('data', onData);
      stdin.resume();
      stderr.write('\x1b]11;?\x07');
    } catch {
      finish(fallback);
    }
  });
}
