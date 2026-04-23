import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App, Agent, Skill, Prompt, BuiltInTool, Shell } from '../src/index.js';

let tmpDir: string;
let outdir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-constructs-test-'));
  outdir = path.join(tmpDir, '.kiro-constructs.out');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function synthAgent(app: App, name: string): Promise<Record<string, unknown>> {
  await app.synth();
  return JSON.parse(
    fs.readFileSync(path.join(outdir, 'agents', `${name}.json`), 'utf-8'),
  ) as Record<string, unknown>;
}

describe('Agent', () => {
  it('decomposes ToolConfig into tools, allowedTools, and toolsSettings', async () => {
    const app = new App({ outdir });
    new Agent(app, 'dev', {
      description: 'Dev',
      tools: [
        BuiltInTool.shell({ allowed: true, denyByDefault: true }),
        BuiltInTool.write({ deniedPaths: ['.env'] }),
        'read',
      ],
    });
    const config = await synthAgent(app, 'dev');
    expect(config.tools).toEqual(['shell', 'write', 'read']);
    expect(config.allowedTools).toEqual(['shell']);
    const toolsSettings = config.toolsSettings as Record<string, unknown>;
    expect(toolsSettings.shell).toEqual({ denyByDefault: true });
    expect(toolsSettings.write).toEqual({ deniedPaths: ['.env'] });
  });

  it('flattens ToolConfig[] from BuiltInTool.all()', async () => {
    const app = new App({ outdir });
    new Agent(app, 'dev', { description: 'Dev', tools: [BuiltInTool.all()] });
    const config = await synthAgent(app, 'dev');
    expect(config.tools).toHaveLength(9);
  });

  it('deep-merges and concatenates array settings when same tool added twice', async () => {
    const app = new App({ outdir });
    const agent = new Agent(app, 'dev', {
      description: 'Dev',
      tools: [BuiltInTool.shell({ allow: [Shell.git.readonly()] })],
    });
    agent.addTool(
      BuiltInTool.shell({ allow: [Shell.npm.scripts()], deny: [Shell.git.destructive()] }),
    );
    const config = await synthAgent(app, 'dev');
    const shell = (config.toolsSettings as Record<string, Record<string, unknown>>).shell;
    expect(shell.allowedCommands).toHaveLength(2);
    expect(shell.deniedCommands).toHaveLength(1);
  });

  it('addX builder methods work after construction and chain', async () => {
    const app = new App({ outdir });
    const agent = new Agent(app, 'dev', { description: 'Dev' });
    const result = agent
      .addTool(BuiltInTool.write({ allowed: true }))
      .addMcpServer('github', { command: 'gh-mcp' })
      .addHook('agentSpawn', { command: 'node setup.js' })
      .addResource('/docs');
    expect(result).toBe(agent);

    const config = await synthAgent(app, 'dev');
    expect(config.tools).toEqual(['write']);
    expect(config.allowedTools).toEqual(['write']);
    const mcpServers = config.mcpServers as Record<string, unknown>;
    expect(mcpServers.github).toEqual({ command: 'gh-mcp' });
    const hooks = config.hooks as Record<string, unknown[]>;
    expect(hooks.agentSpawn).toHaveLength(1);
    expect(config.resources).toHaveLength(1);
  });

  it('omits empty fields and deduplicates tool names', async () => {
    const app = new App({ outdir });
    new Agent(app, 'dev', { description: 'Dev', tools: ['shell', 'shell', BuiltInTool.shell()] });
    const config = await synthAgent(app, 'dev');
    expect(config.tools).toEqual(['shell']);
    expect(config).not.toHaveProperty('allowedTools');
    expect(config).not.toHaveProperty('toolsSettings');
    expect(config).not.toHaveProperty('mcpServers');
    expect(config).not.toHaveProperty('hooks');
    expect(config).not.toHaveProperty('resources');
  });

  it('addSkill adds skill:// resource and addPrompt adds file:// resource', async () => {
    const app = new App({ outdir });
    const skill = new Skill(app, 'ts', { description: 'TS', instructions: '# TS' });
    const prompt = new Prompt(app, 'review', { content: '# Review' });
    const agent = new Agent(app, 'dev', { description: 'Dev', skills: [skill] });
    agent.addPrompt(prompt);
    const config = await synthAgent(app, 'dev');
    expect(config.resources).toEqual(['skill://skills/ts/SKILL.md', 'file://prompts/review.md']);
  });
});
