// Guard used by test/config.ts: resolve config first, build the model stack
// only after. Prints the sentinel iff execution reaches the model layer.
import { loadConfigOrExit } from '../../src/config.js';

const config = loadConfigOrExit({ configPath: process.argv[2] });
const { createMastra } = await import('../../src/mastra.js');
createMastra(config);
console.log('REACHED_MODEL_LAYER');
