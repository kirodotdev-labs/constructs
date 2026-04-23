# Task 2: Agent L2 Construct

Parent: [l2-constructs.md](./l2-constructs.md) — Task 2

## Context

All source files live in `packages/kiro-constructs/src/`. Tests in `packages/kiro-constructs/test/`.

Conventions:
- No license headers in source files (Apache-2.0 at repo root)
- ESM (`"type": "module"`, `.js` extensions in imports)
- Tests use `vitest` (`describe`, `it`, `expect`), temp dirs for synth tests
- Existing exports in `src/index.ts` — append new exports, don't reorder existing ones
- Build and test from repo root: `npm run build && npm test`

The `Agent` L2 wraps the `CfgAgent` L1 and provides builder-style composition. The key feature: it accepts `ToolConfig` objects (from Task 1) and automatically decomposes them into the L1's `tools`, `allowedTools`, and `toolsSettings` fields.

### Key existing types to use

`CfgAgent` L1 (in `src/l1/cfg-agent.ts`) accepts:
- `tools: string[]` — tool name strings
- `allowedTools: string[]` — auto-approved tool names
- `toolsSettings: Record<string, object>` — per-tool settings keyed by name
- `mcpServers: Record<string, CfgAgent.McpServerProperty>` — MCP server configs
- `hooks: CfgAgent.HooksProperty` — lifecycle hooks (agentSpawn, userPromptSubmit, preToolUse, postToolUse, stop)
- `resources: (string | CfgAgent.ResourceProperty)[]` — knowledge base resources
- `description`, `prompt`, `model`, `name`, `toolAliases`, `includeMcpJson`, `keyboardShortcut`, `welcomeMessage`

`Lazy.any(() => value)` (in `src/lazy.ts`) — defers evaluation until `resolve()` is called during synthesis. Use this for any field that can be mutated after construction via `addX()`.

`ToolConfig` (in `src/tools/tool-config.ts`):
- `toolName: string` → goes into `tools[]`
- `allowed?: boolean` → if `true`, goes into `allowedTools[]`
- `settings?: Record<string, unknown>` → goes into `toolsSettings[toolName]`, deep-merged if same tool added twice

## Steps

### Step 1: Create `src/agent.ts`

Create the file. Import from:
- `constructs` → `Construct`
- `./l1/cfg-agent.js` → `CfgAgent`
- `./lazy.js` → `Lazy`
- `./tools/tool-config.js` → `ToolConfig`

Define and export the `AgentProps` interface:

```ts
export interface AgentProps {
  readonly name?: string;
  readonly description: string;
  readonly prompt?: string;
  readonly model?: string;
  readonly tools?: (string | ToolConfig | ToolConfig[])[];
  readonly mcpServers?: Record<string, CfgAgent.McpServerProperty>;
  readonly hooks?: CfgAgent.HooksProperty;
  readonly resources?: (string | CfgAgent.ResourceProperty)[];
  readonly toolAliases?: Record<string, string>;
  readonly includeMcpJson?: boolean;
  readonly keyboardShortcut?: string;
  readonly welcomeMessage?: string;
}
```

Implement the `Agent` class extending `Construct`:

**Private state** — mutable arrays/maps that `addX()` methods push into:
```ts
private readonly agentName: string;
private readonly _tools: (string | ToolConfig)[] = [];
private readonly _mcpServers: Map<string, CfgAgent.McpServerProperty> = new Map();
private readonly _hooks: Map<string, CfgAgent.HookProperty[]> = new Map();
private readonly _resources: (string | CfgAgent.ResourceProperty)[] = [];
```

**Constructor** — takes `(scope: Construct, id: string, props: AgentProps)`:
1. Call `super(scope, id)`
2. Set `this.agentName = props.name ?? id`
3. Flatten and push initial `props.tools` into `this._tools` (flatten any nested arrays)
4. Copy initial `props.mcpServers` entries into `this._mcpServers`
5. Copy initial `props.hooks` entries into `this._hooks`
6. Copy initial `props.resources` into `this._resources`
7. Create the L1 internally:

```ts
new CfgAgent(this, 'Resource', {
  name: this.agentName,
  description: props.description,
  prompt: props.prompt,
  model: props.model,
  toolAliases: props.toolAliases,
  includeMcpJson: props.includeMcpJson,
  keyboardShortcut: props.keyboardShortcut,
  welcomeMessage: props.welcomeMessage,
  tools: Lazy.any(() => this.renderTools()),
  allowedTools: Lazy.any(() => this.renderAllowedTools()),
  toolsSettings: Lazy.any(() => this.renderToolsSettings()),
  mcpServers: Lazy.any(() => this.renderMcpServers()),
  hooks: Lazy.any(() => this.renderHooks()),
  resources: Lazy.any(() => this.renderResources()),
});
```

**Builder methods** — all return `this`:

- `addTool(tool: string | ToolConfig | ToolConfig[]): this` — if array, flatten and push each; otherwise push directly into `this._tools`
- `addMcpServer(name: string, config: CfgAgent.McpServerProperty): this` — set into `this._mcpServers`
- `addHook(event: string, hook: CfgAgent.HookProperty): this` — append to `this._hooks` for the given event key
- `addResource(resource: string | CfgAgent.ResourceProperty): this` — push into `this._resources`

**Private render methods** — called lazily during synthesis, return `undefined` when empty (so the key is omitted from JSON):

- `renderTools(): string[] | undefined` — iterate `this._tools`, extract `toolName` from `ToolConfig` objects, strings pass through. Deduplicate. Return `undefined` if empty.

- `renderAllowedTools(): string[] | undefined` — iterate `this._tools`, collect `toolName` where `allowed === true`. Deduplicate. Return `undefined` if empty.

- `renderToolsSettings(): Record<string, object> | undefined` — iterate `this._tools`, for each `ToolConfig` with `settings`, deep-merge into a map keyed by `toolName`. For deep merge, use a simple recursive merge function (see below). Return `undefined` if empty.

- `renderMcpServers(): Record<string, CfgAgent.McpServerProperty> | undefined` — convert `this._mcpServers` to object. Return `undefined` if empty.

- `renderHooks(): CfgAgent.HooksProperty | undefined` — convert `this._hooks` to object. Return `undefined` if empty.

- `renderResources(): (string | CfgAgent.ResourceProperty)[] | undefined` — return `this._resources` or `undefined` if empty.

**Deep merge helper** — implement a private static method or standalone function for merging tool settings. Do NOT add `lodash.merge` as a dependency. Instead write a minimal recursive merge:

```ts
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const tVal = target[key];
    const sVal = source[key];
    if (isPlainObject(tVal) && isPlainObject(sVal)) {
      result[key] = deepMerge(tVal as Record<string, unknown>, sVal as Record<string, unknown>);
    } else {
      result[key] = sVal;
    }
  }
  return result;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
```

### Step 2: Update `src/index.ts`

Append at the end:

```ts
export { Agent, type AgentProps } from './agent.js';
```

### Step 3: Create `test/agent.test.ts`

Import from `../src/index.js`: `App`, `Agent`, `BuiltInTool`, `Shell`, `CfgAgent`.
Import `fs`, `os`, `path` from node.
Import `describe`, `it`, `expect`, `beforeEach`, `afterEach` from `vitest`.

Use the same temp dir pattern as existing tests:

```ts
let tmpDir: string;
let outdir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-constructs-test-'));
  outdir = path.join(tmpDir, '.kiro-constructs.out');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

Helper to synth and read the agent JSON:

```ts
async function synthAgent(app: App, name: string) {
  await app.synth();
  return JSON.parse(fs.readFileSync(path.join(outdir, 'agents', `${name}.json`), 'utf-8'));
}
```

Write these test cases:

```
describe('Agent', () => {

  it('synthesizes basic agent with description and prompt')
    → new Agent(app, 'dev', { description: 'Dev', prompt: 'You are helpful.' })
    → synth, read agents/dev.json
    → expect config.description === 'Dev'
    → expect config.prompt === 'You are helpful.'
    → expect config.tools to be undefined (no tools added)

  it('accepts string tools')
    → new Agent(app, 'dev', { description: 'Dev', tools: ['read', 'write'] })
    → expect config.tools === ['read', 'write']
    → expect config.allowedTools to be undefined
    → expect config.toolsSettings to be undefined

  it('decomposes ToolConfig into tools, allowedTools, and toolsSettings')
    → new Agent(app, 'dev', {
        description: 'Dev',
        tools: [
          BuiltInTool.shell({ allowed: true, denyByDefault: true }),
          BuiltInTool.write({ deniedPaths: ['.env'] }),
          'read',
        ],
      })
    → expect config.tools to contain 'shell', 'write', 'read'
    → expect config.allowedTools === ['shell']
    → expect config.toolsSettings.shell to deep equal { denyByDefault: true }
    → expect config.toolsSettings.write to deep equal { deniedPaths: ['.env'] }

  it('flattens ToolConfig[] from BuiltInTool.all()')
    → new Agent(app, 'dev', { description: 'Dev', tools: [BuiltInTool.all()] })
    → expect config.tools to have length 9
    → expect config.tools to contain 'shell', 'read', 'write', 'glob', 'grep', 'aws', 'web_fetch', 'web_search', 'code'

  it('deep-merges settings when same tool added twice')
    → const agent = new Agent(app, 'dev', {
        description: 'Dev',
        tools: [BuiltInTool.shell({ allow: [Shell.git.readonly()] })],
      })
    → agent.addTool(BuiltInTool.shell({ deny: [Shell.git.destructive()] }))
    → synth
    → expect config.toolsSettings.shell to have both allowedCommands and deniedCommands

  it('addTool works after construction')
    → const agent = new Agent(app, 'dev', { description: 'Dev' })
    → agent.addTool('shell')
    → agent.addTool(BuiltInTool.write({ allowed: true }))
    → expect config.tools === ['shell', 'write']
    → expect config.allowedTools === ['write']

  it('addMcpServer works after construction')
    → const agent = new Agent(app, 'dev', { description: 'Dev' })
    → agent.addMcpServer('github', { command: 'gh-mcp', args: ['--token', 'xxx'] })
    → expect config.mcpServers.github === { command: 'gh-mcp', args: ['--token', 'xxx'] }

  it('addHook works after construction')
    → const agent = new Agent(app, 'dev', { description: 'Dev' })
    → agent.addHook('agentSpawn', { command: 'node setup.js' })
    → agent.addHook('agentSpawn', { command: 'node warmup.js' })
    → expect config.hooks.agentSpawn to have length 2

  it('addResource works after construction')
    → const agent = new Agent(app, 'dev', { description: 'Dev' })
    → agent.addResource('/docs')
    → agent.addResource({ type: 'knowledgeBase', source: '/kb', name: 'docs' })
    → expect config.resources to have length 2

  it('builder methods return this for chaining')
    → const agent = new Agent(app, 'dev', { description: 'Dev' })
    → const result = agent.addTool('shell').addMcpServer('x', { command: 'x' }).addHook('stop', { command: 'y' }).addResource('/z')
    → expect result to be agent (same reference)

  it('omits empty fields from output')
    → new Agent(app, 'dev', { description: 'Dev' })
    → synth
    → expect config to NOT have keys: tools, allowedTools, toolsSettings, mcpServers, hooks, resources

  it('deduplicates tool names')
    → new Agent(app, 'dev', { description: 'Dev', tools: ['shell', 'shell', BuiltInTool.shell()] })
    → expect config.tools === ['shell'] (deduplicated)

  it('passes through model, keyboardShortcut, welcomeMessage')
    → new Agent(app, 'dev', {
        description: 'Dev',
        model: 'claude-sonnet',
        keyboardShortcut: 'ctrl+shift+d',
        welcomeMessage: 'Hello!',
      })
    → expect config.model === 'claude-sonnet'
    → expect config.keyboardShortcut === 'ctrl+shift+d'
    → expect config.welcomeMessage === 'Hello!'

)
```

### Step 4: Update `examples/tools.ts`

Replace the manual decomposition with the Agent L2. The new example should be:

```ts
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
```

### Step 5: Build and test

Run from the repo root:

```bash
npm run build && npm test
```

Fix any type errors or test failures. All existing tests must continue to pass.

## Files Created/Modified

| File | Action |
|------|--------|
| `src/agent.ts` | Create |
| `src/index.ts` | Append export |
| `test/agent.test.ts` | Create |
| `examples/tools.ts` | Replace contents |

## Commit

When all tests pass, commit with:

```
feat: add Agent L2 construct with ToolConfig decomposition

Co-authored-by: Kiro Agent <244629292+kiro-agent@users.noreply.github.com>
```
