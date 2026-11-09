import { clearProgressSink, setProgressSink } from '../progress.js';
import { colorDepth, detectBackground, tuiEligible } from './term.js';
import { makeTheme } from './theme.js';
import { SPINNER_INTERVAL_MS, renderFrame, spinnerFrame } from './render.js';
import { initialState, reduceEvent, type DreamTuiState } from './state.js';

const PAINT_THROTTLE_MS = 40;

export async function startTui({
  stderr = process.stderr,
  json = false,
}: {
  stderr?: NodeJS.WriteStream;
  json?: boolean;
} = {}): Promise<Tui | null> {
  if (!tuiEligible({ stderr, json })) return null;
  const depth = colorDepth({ stderr });
  const background = await detectBackground({ stderr });
  const tui = new Tui({ theme: makeTheme({ depth, background }), stderr });
  tui.start();
  return tui;
}

export class Tui {
  private theme: ReturnType<typeof makeTheme>;
  private stderr: NodeJS.WriteStream;
  private state: DreamTuiState;
  private painted = 0;
  private lastPaint = 0;
  private stopped = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly onResize = () => this.paint(true);
  private readonly onSigint = () => {
    this.stop();
    process.exit(130);
  };
  private readonly onSigterm = () => {
    this.stop();
    process.exit(143);
  };
  private readonly onExit = () => {
    if (!this.stopped) this.stderr.write('\x1b[?25h');
  };

  constructor({ theme, stderr }: { theme: ReturnType<typeof makeTheme>; stderr: NodeJS.WriteStream }) {
    this.theme = theme;
    this.stderr = stderr;
    this.state = initialState();
  }

  start(): void {
    setProgressSink((event, data) => this.onEvent(event, data ?? {}));
    this.stderr.write('\x1b[?25l');
    this.timer = setInterval(() => this.paint(), SPINNER_INTERVAL_MS);
    this.stderr.on('resize', this.onResize);
    process.on('SIGINT', this.onSigint);
    process.on('SIGTERM', this.onSigterm);
    process.once('exit', this.onExit);
    this.paint(true);
  }

  onEvent(event: string, data: Record<string, unknown>): void {
    reduceEvent(this.state, event, data);
    this.paint();
  }

  paint(force = false): void {
    if (this.stopped) return;
    const now = Date.now();
    if (!force && now - this.lastPaint < PAINT_THROTTLE_MS) return;
    this.lastPaint = now;
    const lines = renderFrame(this.state, {
      width: this.stderr.columns || 80,
      theme: this.theme,
      now,
      spin: spinnerFrame(now),
    });
    let out = '\x1b[?2026h';
    if (this.painted > 0) out += `\x1b[${this.painted}A`;
    out += '\r';
    for (const line of lines) out += `\x1b[2K${line}\n`;
    if (this.painted > lines.length) out += '\x1b[0J';
    out += '\x1b[?2026l';
    this.stderr.write(out);
    this.painted = lines.length;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    clearProgressSink();
    this.stderr.off('resize', this.onResize);
    process.off('SIGINT', this.onSigint);
    process.off('SIGTERM', this.onSigterm);
    let out = '';
    if (this.painted > 0) out += `\x1b[${this.painted}A\r\x1b[0J`;
    out += '\x1b[?25h';
    this.stderr.write(out);
    this.painted = 0;
  }
}

export { initialState, reduceEvent } from './state.js';
export { renderFrame, spinnerFrame, stripAnsi, visibleWidth, formatElapsed } from './render.js';
export { makeTheme } from './theme.js';
export { tuiEligible } from './term.js';
