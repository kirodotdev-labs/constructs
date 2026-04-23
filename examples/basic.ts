/**
 * Basic example: synthesize a Kiro agent and prompt using core constructs.
 *
 * Run: npx tsx examples/basic.ts
 * Output: .kiro-constructs.out/agents/dev.json, .kiro-constructs.out/prompts/review.md
 */

import { App, CfgAgent, CfgPrompt } from '@kiro/constructs';

const app = new App();

new CfgAgent(app, 'dev', {
  description: 'Development assistant',
  prompt: 'You are a helpful development assistant.',
  tools: ['@builtin'],
});

new CfgPrompt(app, 'review', {
  content: '# Code Review\n\nReview the code for correctness, performance, and readability.',
});

app.synth().then(() => console.log('Synthesized to', app.outdir));
