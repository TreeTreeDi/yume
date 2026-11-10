import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULTS, resolveConfig } from '../src/config.js';

// Four-layer priority matrix: flag > env > file > default, one row per field.
// Each row checks all four layers and the recorded source tag.
const fields = [
  {
    path: 'models.lead',
    get: (c: ReturnType<typeof resolveConfig>) => c.models.lead,
    flags: { lead: 'flag-lead' },
    env: { YUME_LEAD_MODEL: 'env-lead' },
    file: { models: { lead: 'file-lead' } },
    fallback: DEFAULTS.models.lead,
  },
  {
    path: 'models.analyzer',
    get: (c: ReturnType<typeof resolveConfig>) => c.models.analyzer,
    flags: { analyzer: 'flag-analyzer' },
    env: { YUME_ANALYZER_MODEL: 'env-analyzer' },
    file: { models: { analyzer: 'file-analyzer' } },
    fallback: DEFAULTS.models.analyzer,
  },
  {
    path: 'models.organizer',
    get: (c: ReturnType<typeof resolveConfig>) => c.models.organizer,
    flags: { organizer: 'flag-organizer' },
    env: { YUME_ORGANIZER_MODEL: 'env-organizer' },
    file: { models: { organizer: 'file-organizer' } },
    fallback: DEFAULTS.models.organizer,
  },
  {
    path: 'retro.trigger.minSessions',
    get: (c: ReturnType<typeof resolveConfig>) => c.retro.trigger.minSessions,
    flags: { minSessions: 11 },
    env: { YUME_RETRO_MIN_SESSIONS: '12' },
    file: { retro: { trigger: { minSessions: 13 } } },
    fallback: DEFAULTS.retro.trigger.minSessions,
  },
  {
    path: 'retro.trigger.minBytes',
    get: (c: ReturnType<typeof resolveConfig>) => c.retro.trigger.minBytes,
    flags: { minBytes: 1100 },
    env: { YUME_RETRO_MIN_BYTES: '1200' },
    file: { retro: { trigger: { minBytes: 1300 } } },
    fallback: DEFAULTS.retro.trigger.minBytes,
  },
] as const;

for (const f of fields) {
  assert.deepEqual(getOf(resolveConfig({ env: {} })), { value: f.fallback, source: 'default' });
  assert.deepEqual(getOf(resolveConfig({ file: f.file, env: {} })), {
    value: fileValue(f),
    source: 'file',
  });
  assert.deepEqual(getOf(resolveConfig({ file: f.file, env: { ...f.env } })), {
    value: envValue(f),
    source: 'env',
  });
  assert.deepEqual(
    getOf(resolveConfig({ flags: { ...f.flags }, file: f.file, env: { ...f.env } })),
    { value: flagValue(f), source: 'flag' },
  );
  console.log(`PASS  priority ${f.path}  —  flag>env>file>default with source tags`);

  function getOf(c: ReturnType<typeof resolveConfig>) {
    const got = f.get(c);
    return { value: got.value, source: got.source };
  }
  function fileValue(ff: typeof f): unknown {
    return 'models' in ff.file
      ? Object.values((ff.file as { models: Record<string, string> }).models)[0]
      : Object.values(
          ((ff.file as { retro: { trigger: Record<string, number> } }).retro.trigger),
        )[0];
  }
  function envValue(ff: typeof f): unknown {
    const raw = Object.values(ff.env)[0] as string;
    return typeof flagValue(ff) === 'number' ? Number(raw) : raw;
  }
  function flagValue(ff: typeof f): unknown {
    return Object.values(ff.flags)[0];
  }
}

// Invalid config must exit non-zero, name the zod field path, and never reach
// the model layer. The guard script resolves config first and only then builds
// the model stack, mirroring src/cli/dream.ts ordering.
{
  const badPath = join(tmpdir(), `yume-bad-config-${process.pid}.json`);
  writeFileSync(
    badPath,
    JSON.stringify({ models: { lead: 123 }, retro: { trigger: { minSessions: 'many' } } }),
  );
  const run = spawnSync('npx', ['tsx', 'test/helpers/config-guard.ts', badPath], {
    encoding: 'utf8',
  });
  assert.notEqual(run.status, 0, `bad config must exit non-zero, got ${run.status}`);
  assert.match(run.stderr, /models\.lead/, `stderr must name the field path, got: ${run.stderr}`);
  assert.match(
    run.stderr,
    /retro\.trigger\.minSessions/,
    `stderr must name the nested field path, got: ${run.stderr}`,
  );
  assert.ok(
    !run.stdout.includes('REACHED_MODEL_LAYER'),
    'model layer must not run on invalid config',
  );
  console.log('PASS  invalid config exits non-zero with field paths before models');
}
