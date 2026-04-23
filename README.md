# Kiro Constructs

A TypeScript framework for defining [Kiro](https://kiro.dev) agentic configurations using CDK-style constructs. Enables composability, reusability, and type safety for AI agent configuration.

## Installation

```bash
npm install @kiro/constructs constructs
```

## Quick Start

```typescript
import { App, Agent, Skill, Prompt, BuiltInTool, Shell } from '@kiro/constructs';

const app = new App();

const skill = new Skill(app, 'typescript', {
  description: 'TypeScript development expertise',
  instructions: '# TypeScript\n\nUse strict TypeScript with no `any`.',
});

const prompt = new Prompt(app, 'review', {
  content: '# Code Review\n\nReview for correctness and readability.',
});

new Agent(app, 'dev', {
  description: 'Development assistant',
  prompt: 'You are a helpful development assistant.',
  skills: [skill],
  prompts: [prompt],
  tools: [
    BuiltInTool.all({ allowed: true }),
    BuiltInTool.shell({
      allow: [Shell.git.readonly(), Shell.npm.scripts()],
      deny: [Shell.git.destructive()],
    }),
  ],
});

await app.synth();
```

This synthesizes to:

```
.kiro-constructs.out/
├── agents/dev.json
├── skills/typescript/SKILL.md
└── prompts/review.md
```

## Constructs

### Agent

Higher-level construct for Kiro CLI agents. Accepts typed tool configs, skills, and prompts, and decomposes them into the correct JSON fields.

```typescript
const agent = new Agent(app, 'dev', {
  description: 'Development assistant',
  prompt: 'You are helpful.',
  tools: [BuiltInTool.all({ allowed: true })],
  skills: [skill],
  prompts: [prompt],
});

// Builder methods for post-construction composition
agent.addTool(BuiltInTool.write({ deniedPaths: ['.env'] }));
agent.addMcpServer('github', { command: 'gh-mcp' });
agent.addHook('agentSpawn', { command: 'git status' });
agent.addSkill(anotherSkill);
agent.addPrompt(anotherPrompt);
```

### Skill

Synthesizes a skill directory with a `SKILL.md` file (YAML frontmatter + markdown body) and optional assets.

```typescript
new Skill(app, 'typescript', {
  description: 'TypeScript expertise',
  instructions: '# TypeScript\n\nFollow strict conventions...',
  assets: { 'tsconfig.example.json': '{ "strict": true }' },
});

// Load from an existing skill directory
const existing = Skill.fromDirectory(app, 'review', './skills/review');
```

### Prompt

Synthesizes a prompt markdown file with optional YAML frontmatter.

```typescript
const prompt = new Prompt(app, 'review', {
  content: '# Code Review\n\nReview for correctness.',
  metadata: { version: '2.0' },
});

prompt.appendContent('## Additional Guidelines\n\nCheck for security issues.');

// Load from an existing file
const fromDisk = Prompt.fromFile(app, 'security', './prompts/security.md');
```

### BuiltInTool & Shell

Typed factories for Kiro's built-in tools with shell permission helpers.

```typescript
// Individual tools with settings
BuiltInTool.shell({ allowed: true, denyByDefault: true });
BuiltInTool.write({ deniedPaths: ['.env', '*.pem'] });
BuiltInTool.glob({ allowReadOnly: true });

// All 9 built-in tools at once
BuiltInTool.all({ allowed: true });

// Shell permissions
BuiltInTool.shell({
  allow: [Shell.git.readonly(), Shell.npm.scripts(), Shell.files.inspect()],
  deny: [Shell.git.destructive()],
});
```

### L1 Constructs

Low-level constructs that map 1:1 to output files, for when you need full control:

- `CfgAgent` — synthesizes to `agents/{name}.json`
- `CfgPrompt` — synthesizes to `prompts/{name}.md`

### Core

- **App** — Root construct that drives synthesis
- **Source** — Content factories (text, JSON, file copy)
- **Assembly** — File system output abstraction
- **Lazy** — Deferred value resolution
- **Cache** — SHA-based caching for LLM-generated content

## Model Providers

For LLM-assisted synthesis, pass a model provider to `App`:

```typescript
import { App, BedrockProvider } from '@kiro/constructs';

const app = new App({
  modelProvider: new BedrockProvider({ region: 'us-east-1' }),
});
```

Built-in providers:

- `BedrockProvider` — Amazon Bedrock (Claude, etc.)
- `KiroCliProvider` — Spawns `kiro-cli chat`

## Development

```bash
npm install
npm run build
npm run lint
npm test
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
