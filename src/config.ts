import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// Single boundary parse for all runtime configuration. CLI entries resolve
// once via loadConfigOrExit and pass the frozen result down; nothing below the
// boundary reads process.env or the config file directly.

export type ConfigSource = 'flag' | 'env' | 'file' | 'default';

export interface ConfigField<T> {
  readonly value: T;
  readonly source: ConfigSource;
}

export interface ResolvedConfig {
  readonly models: {
    readonly lead: ConfigField<string>;
    readonly analyzer: ConfigField<string>;
    readonly organizer: ConfigField<string>;
  };
  readonly retro: {
    readonly trigger: {
      readonly minSessions: ConfigField<number>;
      readonly minBytes: ConfigField<number>;
    };
  };
}

export const DEFAULTS = {
  models: {
    lead: 'cline/cline-pass/mimo-v2.6-pro',
    analyzer: 'cursor/grok-4.6',
    organizer: 'cursor/grok-4.6',
  },
  retro: {
    trigger: {
      minSessions: 5,
      minBytes: 51200,
    },
  },
} as const;

const ModelsFileSchema = z.object({
  lead: z.string().min(1).optional(),
  analyzer: z.string().min(1).optional(),
  organizer: z.string().min(1).optional(),
});

const TriggerFileSchema = z.object({
  minSessions: z.number().int().positive().optional(),
  minBytes: z.number().int().nonnegative().optional(),
});

export const ConfigFileSchema = z.object({
  models: ModelsFileSchema.optional(),
  retro: z.object({ trigger: TriggerFileSchema.optional() }).optional(),
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

export class ConfigError extends Error {
  readonly details: string[];
  constructor(details: string[]) {
    super(`invalid config: ${details.join('; ')}`);
    this.name = 'ConfigError';
    this.details = details;
  }
}

function fieldErrors(prefix: string, issue: z.ZodIssue): string {
  const path = issue.path.length ? [...prefix.split('.'), ...issue.path].join('.') : prefix;
  return `${path}: ${issue.message}`;
}

/** Validate raw parsed JSON. Throws ConfigError naming each bad field path. */
export function parseConfigFile(data: unknown): ConfigFile {
  const parsed = ConfigFileSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  throw new ConfigError(parsed.error.issues.map((i) => fieldErrors('config', i)));
}

export interface FlagOverrides {
  lead?: string;
  analyzer?: string;
  organizer?: string;
  minSessions?: number;
  minBytes?: number;
}

export interface ResolveInput {
  flags?: FlagOverrides;
  file?: ConfigFile;
  env?: Record<string, string | undefined>;
}

function envInt(
  raw: string | undefined,
  fieldPath: string,
  envName: string,
): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new ConfigError([`${fieldPath} (env ${envName}): expected integer, got ${JSON.stringify(raw)}`]);
  }
  return n;
}

/** Merge flag > env > file > default, tagging each field with its source. */
export function resolveConfig(input: ResolveInput = {}): ResolvedConfig {
  const flags = input.flags ?? {};
  const file = input.file ?? {};
  const env = input.env ?? process.env;

  const leadEnv = env.YUME_LEAD_MODEL || undefined;
  const analyzerEnv = env.YUME_ANALYZER_MODEL || undefined;
  const organizerEnv = env.YUME_ORGANIZER_MODEL || undefined;

  const minSessionsEnv = envInt(
    env.YUME_RETRO_MIN_SESSIONS,
    'retro.trigger.minSessions',
    'YUME_RETRO_MIN_SESSIONS',
  );
  const minBytesEnv = envInt(
    env.YUME_RETRO_MIN_BYTES,
    'retro.trigger.minBytes',
    'YUME_RETRO_MIN_BYTES',
  );

  const pick = <T>(opts: {
    flag: T | undefined;
    env: T | undefined;
    file: T | undefined;
    fallback: T;
  }): ConfigField<T> => {
    if (opts.flag !== undefined) return { value: opts.flag, source: 'flag' };
    if (opts.env !== undefined) return { value: opts.env, source: 'env' };
    if (opts.file !== undefined) return { value: opts.file, source: 'file' };
    return { value: opts.fallback, source: 'default' };
  };

  const resolved: ResolvedConfig = {
    models: {
      lead: pick({ flag: flags.lead, env: leadEnv, file: file.models?.lead, fallback: DEFAULTS.models.lead }),
      analyzer: pick({
        flag: flags.analyzer,
        env: analyzerEnv,
        file: file.models?.analyzer,
        fallback: DEFAULTS.models.analyzer,
      }),
      organizer: pick({
        flag: flags.organizer,
        env: organizerEnv,
        file: file.models?.organizer,
        fallback: DEFAULTS.models.organizer,
      }),
    },
    retro: {
      trigger: {
        minSessions: pick({
          flag: flags.minSessions,
          env: minSessionsEnv,
          file: file.retro?.trigger?.minSessions,
          fallback: DEFAULTS.retro.trigger.minSessions,
        }),
        minBytes: pick({
          flag: flags.minBytes,
          env: minBytesEnv,
          file: file.retro?.trigger?.minBytes,
          fallback: DEFAULTS.retro.trigger.minBytes,
        }),
      },
    },
  };
  return deepFreeze(resolved);
}

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

export interface LoadInput {
  configPath?: string;
  flags?: FlagOverrides;
  env?: Record<string, string | undefined>;
  cwd?: string;
}

function readFileLayer(configPath: string | undefined, cwd: string): ConfigFile {
  const fallback = resolve(cwd, 'yume.config.json');
  const target = configPath ? resolve(cwd, configPath) : fallback;
  if (!existsSync(target)) {
    if (configPath) throw new ConfigError([`config file not found: ${target}`]);
    return {};
  }
  let raw: string;
  try {
    raw = readFileSync(target, 'utf8');
  } catch (err) {
    throw new ConfigError([`cannot read config file ${target}: ${err instanceof Error ? err.message : err}`]);
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError([`config file ${target} is not valid JSON: ${err instanceof Error ? err.message : err}`]);
  }
  try {
    return parseConfigFile(data);
  } catch (err) {
    if (err instanceof ConfigError) {
      throw new ConfigError(err.details.map((d) => `${target}: ${d}`));
    }
    throw err;
  }
}

/**
 * Boundary loader for CLI entries. Reads yume.config.json (repo root) or the
 * --config path, validates once with zod, merges flag>env>file>default.
 * Prints zod field paths to stderr and exits 2 on invalid config, so the run
 * stops before any model is touched.
 */
export function loadConfigOrExit(input: LoadInput = {}): ResolvedConfig {
  const cwd = input.cwd ?? process.cwd();
  try {
    const file = readFileLayer(input.configPath, cwd);
    return resolveConfig({ flags: input.flags, file, env: input.env });
  } catch (err) {
    if (err instanceof ConfigError) {
      for (const line of err.details) console.error(`config error: ${line}`);
      process.exit(2);
    }
    throw err;
  }
}
