// Progress event bus between the dream run and the live view.
// Stages emit through emitProgress. With no sink registered, events go nowhere,
// so a non-TTY run is unchanged.

export type ProgressSink = (event: string, data?: Record<string, unknown>) => void;

let sink: ProgressSink | null = null;

export function setProgressSink(fn: ProgressSink): void {
  sink = fn;
}

export function clearProgressSink(): void {
  sink = null;
}

export function emitProgress(event: string, data: Record<string, unknown> = {}): void {
  if (!sink) return;
  try {
    sink(event, data);
  } catch {
    // Rendering is best-effort. A throwing view must not stop the dream.
  }
}
