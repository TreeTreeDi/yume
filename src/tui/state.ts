export type StageStatus = 'pending' | 'active' | 'done' | 'error';
export type Phase = 'render' | 'lead' | 'analyze' | 'organize';

export const PHASES: Phase[] = ['render', 'lead', 'analyze', 'organize'];

export interface Stage {
  status: StageStatus;
  startedAt: number | null;
  endedAt: number | null;
  error: string | null;
}

export interface AnalyzerRow {
  id: string;
  source: string;
  label: string;
  status: StageStatus;
  error: string | null;
  startedAt: number | null;
  endedAt: number | null;
}

export interface DreamTuiState {
  expected: number;
  files: number;
  fatal: string | null;
  organized: boolean;
  failures: number;
  processed: number;
  phases: Record<Phase, Stage>;
  analyzers: AnalyzerRow[];
}

function emptyStage(): Stage {
  return { status: 'pending', startedAt: null, endedAt: null, error: null };
}

export function initialState(): DreamTuiState {
  return {
    expected: 0,
    files: 0,
    fatal: null,
    organized: false,
    failures: 0,
    processed: 0,
    phases: {
      render: emptyStage(),
      lead: emptyStage(),
      analyze: emptyStage(),
      organize: emptyStage(),
    },
    analyzers: [],
  };
}

function stage(status: StageStatus, now: number, prev: Stage, error: string | null = null): Stage {
  return {
    status,
    startedAt: prev.startedAt ?? (status === 'pending' ? null : now),
    endedAt: status === 'done' || status === 'error' ? now : null,
    error,
  };
}

function matchAnalyzer(rows: AnalyzerRow[], data: Record<string, unknown>): AnalyzerRow | undefined {
  const source = String(data.source ?? '');
  const id = String(data.id ?? '');
  return rows.find((row) => (source && row.source === source) || (id && row.id === id));
}

export function reduceEvent(
  state: DreamTuiState,
  event: string,
  data: Record<string, unknown> = {},
  now = Date.now(),
): DreamTuiState {
  switch (event) {
    case 'dream:start':
      state.expected = Number(data.expected ?? 0);
      break;
    case 'phase:start': {
      const phase = data.phase as Phase;
      if (state.phases[phase]) state.phases[phase] = stage('active', now, state.phases[phase]);
      break;
    }
    case 'phase:done': {
      const phase = data.phase as Phase;
      const err = data.error != null ? String(data.error) : null;
      if (state.phases[phase]) {
        state.phases[phase] = stage(err ? 'error' : 'done', now, state.phases[phase], err);
      }
      break;
    }
    case 'analyzer:plan':
      state.analyzers.push({
        id: String(data.id ?? state.analyzers.length + 1),
        source: String(data.source ?? ''),
        label: String(data.label ?? data.source ?? ''),
        status: 'pending',
        error: null,
        startedAt: null,
        endedAt: null,
      });
      break;
    case 'analyzer:active': {
      const row = matchAnalyzer(state.analyzers, data);
      if (row && row.status === 'pending') {
        row.status = 'active';
        row.startedAt = now;
      }
      break;
    }
    case 'analyzer:done': {
      const row = matchAnalyzer(state.analyzers, data);
      const err = data.error != null ? String(data.error) : null;
      if (row) {
        row.status = err ? 'error' : 'done';
        row.error = err;
        row.startedAt = row.startedAt ?? now;
        row.endedAt = now;
      }
      break;
    }
    case 'memory:files':
      state.files = Number(data.count ?? state.files);
      break;
    case 'dream:fail':
      state.fatal = String(data.error ?? 'dream failed');
      break;
    case 'dream:done':
      state.organized = Boolean(data.organized);
      state.failures = Number(data.failures ?? 0);
      state.processed = Number(data.processed ?? 0);
      break;
  }
  return state;
}
