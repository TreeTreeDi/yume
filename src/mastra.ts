import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { toStandardSchema } from '@mastra/core/schema';
import { LibSQLStore } from '@mastra/libsql';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import { memoryTools } from './tools.js';
import { ANALYZER_SYSTEM, ORGANIZER_SYSTEM, LEAD_SYSTEM } from './prompts.js';

// Model routing follows the project standard recorded on the decision map:
// key judgment uses Codex, research execution uses DeepSeek or Grok, prose uses Muse.
const BASE_URL = process.env.OPENAI_BASE_URL ?? 'http://127.0.0.1:3425/v1';
const API_KEY = process.env.OPENAI_API_KEY ?? 'magpie';

const provider = createOpenAICompatible({
  name: 'magpie',
  baseURL: BASE_URL,
  apiKey: API_KEY,
  // The magpie endpoint accepts response_format json_schema but does not
  // hard-enforce it (verified against 127.0.0.1:3425), so the agents below
  // additionally use jsonPromptInjection to make the final object reliable.
  supportsStructuredOutputs: true,
});

// Workflow agent steps declare their own output schema; these defaults pair it
// with prompt-level JSON enforcement, which is the closest faithful migration
// of upstream's native structured-output enforcement to this local gateway.
const ANALYZER_OUTPUT = toStandardSchema<{ summary: string }>(
  z.object({ summary: z.string() }),
);
const ORGANIZER_OUTPUT = toStandardSchema<{ index_entries: number; changes: string[] }>(
  z.object({ index_entries: z.number(), changes: z.array(z.string()) }),
);

const LEAD_MODEL = process.env.YUME_LEAD_MODEL ?? 'codex/gpt-6.1-sol';
const ANALYZER_MODEL = process.env.YUME_ANALYZER_MODEL ?? 'workbuddy/deepseek-v4.1-flash';
const ORGANIZER_MODEL = process.env.YUME_ORGANIZER_MODEL ?? 'cline/cline-pass/muse-spark-1.3-contributor';

export const leadAgent = new Agent({
  id: 'memory-distiller',
  name: 'memory-distiller',
  model: provider(LEAD_MODEL),
  instructions: LEAD_SYSTEM,
});

export const analyzerAgent = new Agent<
  'transcript-analyzer',
  typeof memoryTools,
  { summary: string }
>({
  id: 'transcript-analyzer',
  name: 'transcript-analyzer',
  model: provider(ANALYZER_MODEL),
  instructions: ANALYZER_SYSTEM,
  tools: memoryTools,
  defaultOptions: {
    maxSteps: 60,
    structuredOutput: { schema: ANALYZER_OUTPUT, jsonPromptInjection: 'system' },
  },
});

export const organizerAgent = new Agent<
  'memory-organizer',
  typeof memoryTools,
  { index_entries: number; changes: string[] }
>({
  id: 'memory-organizer',
  name: 'memory-organizer',
  model: provider(ORGANIZER_MODEL),
  instructions: ORGANIZER_SYSTEM,
  tools: memoryTools,
  defaultOptions: {
    maxSteps: 60,
    structuredOutput: { schema: ORGANIZER_OUTPUT, jsonPromptInjection: 'system' },
  },
});

export function createMastra(): Mastra {
  return new Mastra({
    agents: {
      'memory-distiller': leadAgent,
      'transcript-analyzer': analyzerAgent,
      'memory-organizer': organizerAgent,
    },
    storage: new LibSQLStore({
      id: 'yume',
      url: `file:${process.env.YUME_DB ?? './yume.db'}`,
    }),
  });
}
