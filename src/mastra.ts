import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { toStandardSchema } from '@mastra/core/schema';
import { LibSQLStore } from '@mastra/libsql';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import { memoryTools, resetWriteQuota } from './tools.js';
import { ANALYZER_SYSTEM, ORGANIZER_SYSTEM, LEAD_SYSTEM } from './prompts.js';

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

const ANALYZER_OUTPUT = toStandardSchema<{ summary: string }>(
  z.object({ summary: z.string() }),
);
const ORGANIZER_OUTPUT = toStandardSchema<{ index_entries: number; changes: string[] }>(
  z.object({ index_entries: z.number(), changes: z.array(z.string()) }),
);

export const DEFAULT_MODELS = {
  lead: 'cline/cline-pass/mimo-v2.6-pro',
  analyzer: 'cursor/grok-4.6',
  organizer: 'cursor/grok-4.6',
} as const;

export function resolveModels(): { lead: string; analyzer: string; organizer: string } {
  return {
    lead: process.env.YUME_LEAD_MODEL ?? DEFAULT_MODELS.lead,
    analyzer: process.env.YUME_ANALYZER_MODEL ?? DEFAULT_MODELS.analyzer,
    organizer: process.env.YUME_ORGANIZER_MODEL ?? DEFAULT_MODELS.organizer,
  };
}

export function createMastra(): Mastra {
  // Run entry: every run builds its Mastra once (see runDreamBody), so the
  // per-run write quota starts at zero here.
  resetWriteQuota();
  const models = resolveModels();
  const leadAgent = new Agent({
    id: 'memory-distiller',
    name: 'memory-distiller',
    model: provider(models.lead),
    instructions: LEAD_SYSTEM,
  });
  const analyzerAgent = new Agent<
    'transcript-analyzer',
    typeof memoryTools,
    { summary: string }
  >({
    id: 'transcript-analyzer',
    name: 'transcript-analyzer',
    model: provider(models.analyzer),
    instructions: ANALYZER_SYSTEM,
    tools: memoryTools,
    defaultOptions: {
      maxSteps: 60,
      structuredOutput: { schema: ANALYZER_OUTPUT, jsonPromptInjection: 'system' },
    },
  });
  const organizerAgent = new Agent<
    'memory-organizer',
    typeof memoryTools,
    { index_entries: number; changes: string[] }
  >({
    id: 'memory-organizer',
    name: 'memory-organizer',
    model: provider(models.organizer),
    instructions: ORGANIZER_SYSTEM,
    tools: memoryTools,
    defaultOptions: {
      maxSteps: 60,
      structuredOutput: { schema: ORGANIZER_OUTPUT, jsonPromptInjection: 'system' },
    },
  });
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
