import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfigOrExit, type ResolvedConfig } from '../config.js';
import { flag, intFlag } from './flags.js';

const args = process.argv.slice(2);
const flag_ = (name: string): string | undefined => flag(args, name);
const intFlag_ = (name: string, min?: number): number | undefined => intFlag(args, name, min);
const json = args.includes('--json');

function usage(): never {
  console.error('usage: yume config show [--config <path>] [--lead-model <m>] [--analyzer-model <m>] [--organizer-model <m>] [--retro-min-sessions <n>] [--retro-min-bytes <n>] [--json]');
  process.exit(2);
}

if (args[0] !== 'show') usage();

const config: ResolvedConfig = loadConfigOrExit({
  configPath: flag_('config'),
  flags: {
    lead: flag_('lead-model'),
    analyzer: flag_('analyzer-model'),
    organizer: flag_('organizer-model'),
    minSessions: intFlag_('retro-min-sessions', 1),
    minBytes: intFlag_('retro-min-bytes'),
  },
});

const configTarget = flag_('config') ? resolve(flag_('config') as string) : resolve('yume.config.json');

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
        configFile: existsSync(configTarget) ? configTarget : null,
      },
      null,
      2,
    ),
  );
} else {
  for (const [k, v] of rows) console.log(`${k} = ${v}`);
}
