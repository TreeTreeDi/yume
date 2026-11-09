import { resolve } from 'node:path';
import { loadConfigOrExit, type ResolvedConfig } from '../config.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const intFlag = (name: string): number | undefined => {
  const raw = flag(name);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    console.error(`config error: --${name} expects an integer, got ${JSON.stringify(raw)}`);
    process.exit(2);
  }
  return n;
};
const json = args.includes('--json');

function usage(): never {
  console.error('usage: yume config show [--config <path>] [--lead-model <m>] [--analyzer-model <m>] [--organizer-model <m>] [--json]');
  process.exit(2);
}

if (args[0] !== 'show') usage();

const config: ResolvedConfig = loadConfigOrExit({
  configPath: flag('config'),
  flags: {
    lead: flag('lead-model'),
    analyzer: flag('analyzer-model'),
    organizer: flag('organizer-model'),
    minSessions: intFlag('retro-min-sessions'),
    minBytes: intFlag('retro-min-bytes'),
  },
});

const rows: [string, string][] = [
  ['models.lead', `${config.models.lead.value} (source: ${config.models.lead.source})`],
  ['models.analyzer', `${config.models.analyzer.value} (source: ${config.models.analyzer.source})`],
  ['models.organizer', `${config.models.organizer.value} (source: ${config.models.organizer.source})`],
  [
    'retro.trigger.minSessions',
    `${config.retro.trigger.minSessions.value} (source: ${config.retro.trigger.minSessions.source})`,
  ],
  [
    'retro.trigger.minBytes',
    `${config.retro.trigger.minBytes.value} (source: ${config.retro.trigger.minBytes.source})`,
  ],
];

if (json) {
  console.log(
    JSON.stringify(
      {
        models: {
          lead: config.models.lead,
          analyzer: config.models.analyzer,
          organizer: config.models.organizer,
        },
        retro: {
          trigger: {
            minSessions: config.retro.trigger.minSessions,
            minBytes: config.retro.trigger.minBytes,
          },
        },
        configFile: flag('config') ?? resolve('yume.config.json'),
      },
      null,
      2,
    ),
  );
} else {
  for (const [k, v] of rows) console.log(`${k} = ${v}`);
}
