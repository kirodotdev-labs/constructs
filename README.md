# Kiro Constructs

A TypeScript framework for defining [Kiro](https://kiro.dev) agentic configurations using CDK-style constructs. Enables composability, reusability, and type safety for AI agent configuration.

## Installation

> **Note:** This package is not yet published to npm. Install from source:

```bash
git clone https://github.com/kirodotdev-labs/constructs.git
cd constructs
npm install
npm run build
cd packages/kiro-constructs
npm link
```

Then in your project, link the package and install the required `constructs` peer dependency:

```bash
npm link @kiro/constructs
npm install constructs
```

## Quick Start

```typescript
import { App, CfgAgent, CfgPrompt } from '@kiro/constructs';

const app = new App();

new CfgAgent(app, 'dev', {
  description: 'Development assistant',
  prompt: 'You are a helpful development assistant.',
  tools: ['@builtin'],
});

new CfgPrompt(app, 'review', {
  content: '# Code Review\n\nReview the code for correctness and readability.',
});

await app.synth();
```

This synthesizes to:

```
.kiro-constructs.out/
├── agents/dev.json
└── prompts/review.md
```

## Core Concepts

- **App** — Root construct that drives synthesis to an output directory
- **CfgAgent** — L1 construct for Kiro CLI agent configuration (`.kiro/agents/*.json`)
- **CfgPrompt** — L1 construct for Kiro prompts (`.kiro/prompts/*.md`)
- **Source** — Content factories for text, JSON, and file copy
- **Assembly** — File system output abstraction
- **Lazy** — Deferred value resolution
- **Content** — File loading helper for construct content
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
