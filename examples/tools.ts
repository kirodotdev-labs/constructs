/**
 * Tools example: configure an agent with typed tool settings and shell permissions.
 *
 * Run: npx tsx examples/tools.ts
 * Output: .kiro-constructs.out/agents/dev.json
 */

import { App, Agent, BuiltInTool, Shell } from '@kiro/constructs';

const app = new App();

new Agent(app, 'dev', {
  description: 'Development assistant with fine-grained tool permissions',
  prompt: 'You are a helpful development assistant.',
  tools: [
    BuiltInTool.all({ allowed: true }),
    BuiltInTool.shell({
      allow: [Shell.git.readonly(), Shell.git.write(), Shell.npm.scripts(), Shell.files.inspect()],
      deny: [Shell.git.destructive()],
    }),
    BuiltInTool.write({ deniedPaths: ['.env', '*.pem', '*.key'] }),
  ],
});

app.synth().then(() => console.log('Synthesized to', app.outdir));
