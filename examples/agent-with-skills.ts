/**
 * L2 constructs example: Agent with Skills and Prompts.
 *
 * Run: npx tsx examples/l2.ts
 * Output: .kiro-constructs.out/agents/dev.json
 *         .kiro-constructs.out/skills/typescript/SKILL.md
 *         .kiro-constructs.out/prompts/review.md
 */

import { App, Agent, Skill, Prompt, BuiltInTool, Shell } from '@kiro/constructs';

const app = new App();

const skill = new Skill(app, 'typescript', {
  description: 'TypeScript development expertise',
  instructions: [
    '# TypeScript',
    '',
    'Follow these conventions:',
    '- Use strict TypeScript with no `any`',
    '- Prefer `interface` over `type` for object shapes',
    '- Use `readonly` for immutable properties',
  ].join('\n'),
});

const prompt = new Prompt(app, 'review', {
  content: [
    '# Code Review',
    '',
    'Review the code for:',
    '- Correctness and edge cases',
    '- Performance implications',
    '- Readability and naming',
  ].join('\n'),
});

new Agent(app, 'dev', {
  description: 'Full-stack development assistant',
  prompt: 'You are a senior full-stack developer.',
  skills: [skill],
  prompts: [prompt],
  tools: [
    BuiltInTool.all({ allowed: true }),
    BuiltInTool.shell({
      allow: [Shell.git.readonly(), Shell.git.write(), Shell.npm.scripts()],
      deny: [Shell.git.destructive()],
    }),
    BuiltInTool.write({ deniedPaths: ['.env', '*.pem'] }),
  ],
});

app.synth().then(() => console.log('Synthesized to', app.outdir));
