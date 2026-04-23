# L2 Constructs for @kiro/constructs

## Overview

Add an opinionated L2 layer on top of the existing L1 constructs (`CfgAgent`, `CfgPrompt`). L2s provide higher-level abstractions with builder-style APIs, sensible defaults, and composition patterns that make agent configuration significantly easier than hand-writing JSON.

The existing L1s map 1:1 to output files. L2s encode opinions: they manage relationships between agents, skills, and prompts; they use `Lazy` for deferred rendering; and they provide `addX()` methods for incremental composition.

## Current State

The repo ships two L1 constructs:

- `CfgAgent` — synthesizes to `agents/{name}.json` with full config passthrough
- `CfgPrompt` — synthesizes to `prompts/{name}.md` with optional YAML frontmatter

Plus core infrastructure: `App`, `Assembly`, `Source`, `Lazy`, `Cache`, `Logger`, model providers.

## What We're Building

Three L2 construct families — **Agent**, **Skill**, **Prompt** — plus a **Tool** abstraction that lets L2 tool objects wire themselves into agents automatically.

---

## Task 1: `ToolConfig` Interface and `BuiltInTool` Factories

**Files:** `src/tools/tool-config.ts`, `src/tools/built-in-tools.ts`, `src/tools/shell.ts`, `src/tools/shell-commands.ts`

The core idea: tools are objects that carry their own name, auto-approval flag, and settings. When you pass a tool to an `Agent`, the agent splits it into the right L1 fields (`tools`, `allowedTools`, `toolsSettings`).

### ToolConfig Interface

```ts
export interface ToolConfig {
  readonly toolName: string;
  readonly allowed?: boolean;
  readonly settings?: Record<string, unknown>;
}
```

This is the contract. Any L2 tool factory returns a `ToolConfig` (or `ToolConfig[]`). The `Agent` L2 accepts `(string | ToolConfig)[]` — strings are bare tool names, `ToolConfig` objects carry settings.

### How Agent Wires Tools

When `Agent` receives tools, it decomposes each `ToolConfig` into three L1 fields:

| ToolConfig field | L1 CfgAgent field | Behavior |
|---|---|---|
| `toolName` | `tools[]` | Always added to the tools list |
| `allowed: true` | `allowedTools[]` | Added to auto-approved list |
| `settings` | `toolsSettings[toolName]` | Merged (deep) if same tool added twice |

This means you can do:

```ts
new Agent(app, 'dev', {
  tools: [
    'read',                                    // bare string → just adds to tools[]
    BuiltInTool.shell({ allowed: true }),       // → tools: ['shell'], allowedTools: ['shell']
    BuiltInTool.write({ deniedPaths: ['.env'] }), // → tools: ['write'], toolsSettings: { write: { deniedPaths: ['.env'] } }
  ],
});
```

### BuiltInTool Factories

Static factory methods that return `ToolConfig` with the correct tool name and settings:

```ts
export class BuiltInTool {
  static shell(props?: ShellToolProps): ToolConfig;
  static read(props?: PathToolProps): ToolConfig;
  static write(props?: PathToolProps): ToolConfig;
  static glob(props?: PathToolWithReadOnlyProps): ToolConfig;
  static grep(props?: PathToolWithReadOnlyProps): ToolConfig;
  static aws(props?: BuiltInToolProps): ToolConfig;
  static webFetch(props?: BuiltInToolProps): ToolConfig;
  static webSearch(props?: BuiltInToolProps): ToolConfig;
  static code(props?: BuiltInToolProps): ToolConfig;
  static all(props?: AllToolsProps): ToolConfig[];
}
```

Props per tool type:

```ts
export interface BuiltInToolProps {
  readonly allowed?: boolean;
}

export interface ShellToolProps extends BuiltInToolProps {
  readonly allow?: IShellPermission[];
  readonly deny?: IShellPermission[];
  readonly autoAllowReadonly?: boolean;
  readonly denyByDefault?: boolean;
}

export interface PathToolProps extends BuiltInToolProps {
  readonly allowedPaths?: string[];
  readonly deniedPaths?: string[];
}

export interface PathToolWithReadOnlyProps extends PathToolProps {
  readonly allowReadOnly?: boolean;
}
```

`ShellToolProps.allow` and `.deny` accept `IShellPermission` objects — these are typed shell permission providers that expand to regex patterns in `toolsSettings.shell.allowedCommands` / `deniedCommands`.

### Shell Permissions

```ts
export interface IShellPermission {
  readonly patterns: string[];
}

export class Shell {
  static readonly git: {
    readonly(): IShellPermission;
    write(): IShellPermission;
    destructive(): IShellPermission;
  };
  static readonly npm: {
    scripts(): IShellPermission;
  };
  static readonly files: {
    inspect(): IShellPermission;
  };
  static command(pattern: string): IShellPermission;
}
```

Usage:

```ts
BuiltInTool.shell({
  allowed: true,
  allow: [Shell.git.readonly(), Shell.npm.scripts()],
  deny: [Shell.git.destructive()],
})
```

This produces:

```json
{
  "tools": ["shell"],
  "allowedTools": ["shell"],
  "toolsSettings": {
    "shell": {
      "allowedCommands": ["^(git (status|log|diff|...))...$", "^(npm (run|test|...))...$"],
      "deniedCommands": ["^(git (push --force|reset --hard|...))...$"]
    }
  }
}
```

### `BuiltInTool.all()` — Convenience Bundle

Returns all 9 built-in tools. Per-tool overrides via named props:

```ts
BuiltInTool.all({
  allowed: true,  // default for all
  shell: { allow: [Shell.git.readonly()] },
  write: { deniedPaths: ['.env', '*.pem'] },
})
```

### Acceptance Criteria

- [ ] `ToolConfig` interface exported
- [ ] `BuiltInTool` static factories produce correct `ToolConfig` objects
- [ ] `Shell` permission helpers produce correct regex patterns
- [ ] `BuiltInTool.all()` returns 9 tools with per-tool overrides
- [ ] Unit tests: each factory, shell permissions, `all()` with overrides

---

## Task 2: `Agent` L2 Construct

**File:** `src/agent.ts`

A higher-level agent construct that wraps `CfgAgent` and provides builder-style composition. The key feature: it accepts `ToolConfig` objects and decomposes them into the right L1 fields.

### Interface

```ts
export interface AgentProps {
  readonly name?: string;
  readonly description: string;
  readonly prompt?: string;
  readonly model?: string;
  readonly tools?: (string | ToolConfig | ToolConfig[])[];
  readonly skills?: Skill[];
  readonly prompts?: Prompt[];
  readonly mcpServers?: Record<string, McpServerConfig>;
  readonly hooks?: HooksConfig;
  readonly resources?: (string | ResourceConfig)[];
}
```

Note `tools` accepts `ToolConfig[]` too (from `BuiltInTool.all()`), which gets flattened. `skills` and `prompts` accept L2 construct instances and wire them into the `resources` array as `skill://` and `file://` URIs respectively.

### Behavior

- Implements `ISynthesizable` — creates a `CfgAgent` L1 internally during `synthesize()`
- Uses `Lazy` to defer rendering so `addX()` calls work after construction
- `addTool(tool: string | ToolConfig | ToolConfig[])` — flattens arrays, splits into tools/allowedTools/toolsSettings
- `addMcpServer(name, config)` — adds to MCP servers map
- `addHook(event, entry)` — appends to hooks for the given lifecycle event
- `addResource(resource)` — appends to resources list
- `addSkill(skill: Skill)` — adds a `skill://` resource pointing to the skill's synthesized SKILL.md path. This is how Kiro CLI discovers skills for an agent: via `skill://` URIs in the `resources` array. The skill's output path is `skills/{skillName}/SKILL.md`, so this method adds `skill://skills/{skillName}/SKILL.md` to the resources list.
- `addPrompt(prompt: Prompt)` — adds a `file://` resource pointing to the prompt's synthesized markdown path (`prompts/{name}.md`). This loads the prompt content into the agent's context at startup.
- All `addX()` methods return `this` for chaining
- When the same tool is added twice, settings are deep-merged (via `lodash.merge` or manual spread)

### How Skills and Prompts Wire Into Agents

Per the [Kiro CLI agent configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference/), skills are registered on agents via the `resources` field using URI schemes:

- `skill://path/to/SKILL.md` — skill resources are progressively loaded: metadata (name, description) at startup, full content on demand
- `file://path/to/file.md` — file resources are loaded directly into context at startup

When you call `agent.addSkill(skill)`, the Agent adds `skill://skills/{skillName}/SKILL.md` to its resources. When you call `agent.addPrompt(prompt)`, it adds `file://prompts/{promptName}.md`.

### Example

```ts
const agent = new Agent(app, 'dev', {
  description: 'Development assistant',
  prompt: 'You are a helpful development assistant.',
  tools: [
    BuiltInTool.all({ allowed: true }),
    BuiltInTool.shell({
      allow: [Shell.git.readonly(), Shell.npm.scripts()],
      deny: [Shell.git.destructive()],
    }),
  ],
});

const skill = new Skill(app, 'typescript', {
  description: 'TypeScript expertise',
  instructions: '# TypeScript\n\nUse strict mode...',
});

const prompt = new Prompt(app, 'review', {
  content: '# Code Review\n\nReview for correctness.',
});

agent.addSkill(skill);
agent.addPrompt(prompt);

agent.addMcpServer('github', {
  command: 'gh-mcp',
  env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
});
```

### Acceptance Criteria

- [ ] `Agent` synthesizes identical JSON to an equivalent `CfgAgent`
- [ ] `addTool()` / `addMcpServer()` / `addHook()` / `addResource()` work after construction
- [ ] `ToolConfig` objects correctly split into `tools`, `allowedTools`, `toolsSettings`
- [ ] Tool settings deep-merge when same tool added twice
- [ ] `ToolConfig[]` (from `BuiltInTool.all()`) flattened correctly
- [ ] `addSkill(skill)` adds `skill://skills/{name}/SKILL.md` to resources
- [ ] `addPrompt(prompt)` adds `file://prompts/{name}.md` to resources
- [ ] Unit tests: basic synth, builder methods, tool decomposition, tool merging, skill/prompt registration

---

## Task 3: `Skill` L2 Construct

**File:** `src/skill.ts`

A construct that synthesizes a Kiro skill directory with a `SKILL.md` file (YAML frontmatter + markdown body) and optional asset files.

### Interface

```ts
export interface SkillProps {
  readonly name?: string;
  readonly description: string;
  readonly instructions: string;
  readonly assets?: Record<string, string>;
  readonly metadata?: Record<string, unknown>;
}
```

### Behavior

- Implements `ISynthesizable`
- Synthesizes to `skills/{name}/SKILL.md` with YAML frontmatter containing `name`, `description`, and any extra `metadata`
- Body is the `instructions` content
- Optional `assets` map writes additional files into the skill directory
- `Skill.fromDirectory()` static factory reads an existing skill directory from disk, parsing `SKILL.md` frontmatter

### Example

```ts
const skill = new Skill(app, 'typescript', {
  description: 'TypeScript development expertise',
  instructions: '# TypeScript\n\nFollow strict TypeScript conventions...',
  assets: {
    'tsconfig.example.json': '{ "strict": true }',
  },
});

// Load from existing directory
const existing = Skill.fromDirectory(app, 'review', './skills/review');
```

### Acceptance Criteria

- [ ] Synthesizes `skills/{name}/SKILL.md` with correct frontmatter
- [ ] Assets written to skill subdirectory
- [ ] `fromDirectory()` parses existing SKILL.md frontmatter and content
- [ ] Unit tests: basic synth, assets, fromDirectory

---

## Task 4: `Prompt` L2 Construct

**File:** `src/prompt.ts`

A thin L2 wrapper over `CfgPrompt` that adds builder methods and a `fromFile()` factory.

### Interface

```ts
export interface PromptProps {
  readonly name?: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}
```

Implement `Prompt` class extending `Construct`:

- `readonly promptName: string` (public, set from `props.name ?? id`) — used by `Agent.addPrompt()` to build the `file://` resource URI
- Wraps `CfgPrompt` — delegates synthesis entirely
- `Prompt.fromFile()` static factory reads a markdown file from disk, parsing YAML frontmatter into metadata and body into content
- Provides `appendContent()` method for post-construction content additions (uses `Lazy` internally)

### Example

```ts
const prompt = new Prompt(app, 'review', {
  content: '# Code Review\n\nReview for correctness and readability.',
  metadata: { version: '2.0' },
});

// Load from file
const fromDisk = Prompt.fromFile(app, 'security', './prompts/security-review.md');
```

### Acceptance Criteria

- [ ] Synthesizes identically to equivalent `CfgPrompt`
- [ ] `fromFile()` correctly parses frontmatter and content
- [ ] `appendContent()` works after construction
- [ ] Unit tests: basic synth, fromFile, appendContent

---

## Task 5: Exports

Update `src/index.ts` to add all new L2 exports alongside existing ones.

### Acceptance Criteria

- [ ] All L2 constructs importable from `@kiro/constructs`
- [ ] No circular dependencies

---

## Implementation Notes

### File Layout

Everything lives in `packages/kiro-constructs` — single package, flat exports, domain folders internally.

```
packages/kiro-constructs/src/
├── l1/
│   ├── cfg-agent.ts          # existing
│   └── cfg-prompt.ts         # existing
├── tools/
│   ├── index.ts              # barrel
│   ├── tool-config.ts        # ToolConfig interface
│   ├── built-in-tools.ts     # BuiltInTool factories
│   ├── shell.ts              # Shell permissions
│   └── shell-commands.ts     # regex builders
├── agent.ts                  # Agent L2
├── skill.ts                  # Skill L2
├── prompt.ts                 # Prompt L2
├── index.ts                  # add new exports alongside existing ones
└── ...existing files
```

All L2s export from the package root: `import { App, Agent, Skill, BuiltInTool, CfgAgent } from '@kiro/constructs'`

### Design Principles

1. **L2s compose L1s** — they don't bypass them. `Agent` creates a `CfgAgent` internally. `Prompt` wraps `CfgPrompt`.
2. **Tools are data** — `ToolConfig` is a plain object, not a construct. Tool factories (`BuiltInTool.shell()`) return data that the `Agent` knows how to decompose into L1 fields.
3. **Lazy rendering** — use `Lazy.any()` for any property that can be modified after construction via `addX()` methods.
4. **Static factories** — `fromFile()` and `fromDirectory()` for loading existing config from disk. Resolve paths relative to `App.sourceDir`.
5. **ISynthesizable** — L2s that produce output implement this interface. The `App` tree walk handles the rest.
6. **No breaking changes** — L1s remain the same. L2s are additive.

### Dependencies

- `gray-matter` — already in the repo for `CfgPrompt` frontmatter parsing. Reuse for `Skill` and `Prompt.fromFile()`.
- `lodash.merge` — needed for `Agent` tool settings merging. Add as a dependency.

### Suggested Order

1. Task 1 (ToolConfig + BuiltInTool + Shell) — foundation for Agent
2. Task 5 (exports) — wire up index.ts
3. Task 4 (Prompt) — simplest L2, validates the pattern
4. Task 2 (Agent) — core L2 with tool decomposition
5. Task 3 (Skill) — synthesizes to its own directory structure
