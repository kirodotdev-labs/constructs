# Task 3+4: Skill L2, Prompt L2, and L2 Example

Parent: [l2-constructs.md](./l2-constructs.md) — Tasks 3, 4, 5

## Context

All source files live in `packages/kiro-constructs/src/`. Tests in `packages/kiro-constructs/test/`.

Conventions:
- No license headers in source files (Apache-2.0 at repo root)
- ESM (`"type": "module"`, `.js` extensions in imports)
- Tests use `vitest` (`describe`, `it`, `expect`), temp dirs for synth tests
- Build and test from repo root: `npm run build && npm test`
- `gray-matter` is already a dependency — use it for frontmatter parsing
- Keep tests focused — one test per distinct behavior, combine related assertions

## Steps

### Step 1: Create `src/skill.ts`

Import from:
- `constructs` → `Construct`
- `./synthesis/assembly.js` → `IAssembly`
- `./synthesis/synthesizable.js` → `ISynthesizable`
- `./synthesis/source.js` → `Source`
- `gray-matter` → `matter`
- `node:fs` and `node:path`

Define and export:

```ts
export interface SkillProps {
  readonly name?: string;
  readonly description: string;
  readonly instructions: string;
  readonly assets?: Record<string, string>;
  readonly metadata?: Record<string, unknown>;
}
```

Implement `Skill` class extending `Construct` implementing `ISynthesizable`:

- `readonly skillName: string` (public, set from `props.name ?? id`)
- Store `description`, `instructions`, `assets`, `metadata` from props

**`synthesize(assembly: IAssembly)`:**
1. Create a sub-assembly: `assembly.subAssembly('skills').subAssembly(this.skillName)`
2. Build frontmatter object: `{ name: this.skillName, description: this.description, ...this.metadata }`
3. Use `matter.stringify('\n' + this.instructions, frontmatter)` to produce the SKILL.md content
4. Write `SKILL.md` via `Source.text()`
5. If `assets` is defined, write each entry as `Source.text(value)` to the skill sub-assembly

**`static fromDirectory(scope: Construct, id: string, dirPath: string): Skill`:**
1. Resolve `dirPath` relative to `App.sourceDir` using `App.of(scope).sourceDir`
2. Read `SKILL.md` from the directory using `fs.readFileSync`
3. Parse with `matter()` to extract frontmatter and content
4. Return `new Skill(scope, id, { name: frontmatter.name ?? id, description: frontmatter.description, instructions: content.trim(), metadata: remaining frontmatter fields })`

### Step 2: Create `src/prompt.ts`

Import from:
- `constructs` → `Construct`
- `./l1/cfg-prompt.js` → `CfgPrompt`
- `./lazy.js` → `Lazy`
- `gray-matter` → `matter`
- `node:fs` and `node:path`

Define and export:

```ts
export interface PromptProps {
  readonly name?: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}
```

Implement `Prompt` class extending `Construct`:

- Store `_content: string` and `_appendedContent: string[]` (for `appendContent`)
- In constructor, create the L1 internally:

```ts
new CfgPrompt(this, 'Resource', {
  name: props.name ?? id,
  content: Lazy.any(() => this.renderContent()),
  metadata: props.metadata,
});
```

**`appendContent(content: string): this`** — push to `_appendedContent`, return `this`

**`private renderContent(): string`** — return `this._content` + joined appended content (separated by `\n\n`)

**`static fromFile(scope: Construct, id: string, filePath: string): Prompt`:**
1. Resolve `filePath` relative to `App.of(scope).sourceDir`
2. Read file with `fs.readFileSync`
3. Parse with `matter()` to extract frontmatter and content
4. Return `new Prompt(scope, id, { name: frontmatter.name ?? id, content: content.trim(), metadata: remaining frontmatter fields })`

### Step 3: Update `src/index.ts`

Append at the end:

```ts
export { Skill, type SkillProps } from './skill.js';
export { Prompt, type PromptProps } from './prompt.js';
```

### Step 4: Create `test/skill.test.ts`

Write these test cases:

```
describe('Skill', () => {

  it('synthesizes SKILL.md with frontmatter and instructions')
    → new Skill(app, 'typescript', { description: 'TS expertise', instructions: '# TypeScript\n\nUse strict mode.' })
    → synth, read skills/typescript/SKILL.md
    → parse with matter()
    → expect data.name === 'typescript'
    → expect data.description === 'TS expertise'
    → expect content.trim() to contain '# TypeScript'

  it('writes assets to skill subdirectory')
    → new Skill(app, 'ts', { description: 'TS', instructions: 'instructions', assets: { 'example.json': '{}' } })
    → synth
    → expect skills/ts/example.json to exist and equal '{}'

  it('fromDirectory reads existing SKILL.md')
    → write a SKILL.md with frontmatter to a temp dir
    → Skill.fromDirectory(app, 'loaded', tempSkillDir)
    → synth, read the output SKILL.md
    → expect frontmatter and content match what was written

)
```

### Step 5: Create `test/prompt.test.ts`

Write these test cases:

```
describe('Prompt', () => {

  it('synthesizes identically to CfgPrompt')
    → new Prompt(app, 'review', { content: '# Review\n\nCheck code.' })
    → synth, read prompts/review.md
    → expect content === '# Review\n\nCheck code.'

  it('appendContent adds content after construction')
    → const p = new Prompt(app, 'review', { content: '# Review' })
    → p.appendContent('## Section 2')
    → synth, read prompts/review.md
    → expect content to contain both '# Review' and '## Section 2'

  it('fromFile reads existing markdown with frontmatter')
    → write a markdown file with frontmatter to temp dir
    → Prompt.fromFile(app, 'loaded', tempFilePath)
    → synth, read the output
    → expect content and metadata match

)
```

### Step 6: Create `examples/l2.ts`

Create a single example showing all L2 constructs together:

```ts
/**
 * L2 constructs example: Agent, Skill, and Prompt working together.
 *
 * Run: npx tsx examples/l2.ts
 * Output: .kiro-constructs.out/agents/dev.json
 *         .kiro-constructs.out/skills/typescript/SKILL.md
 *         .kiro-constructs.out/prompts/review.md
 */

import { App, Agent, Skill, Prompt, BuiltInTool, Shell } from '@kiro/constructs';

const app = new App();

new Agent(app, 'dev', {
  description: 'Full-stack development assistant',
  prompt: 'You are a senior full-stack developer.',
  tools: [
    BuiltInTool.all({ allowed: true }),
    BuiltInTool.shell({
      allow: [Shell.git.readonly(), Shell.git.write(), Shell.npm.scripts()],
      deny: [Shell.git.destructive()],
    }),
    BuiltInTool.write({ deniedPaths: ['.env', '*.pem'] }),
  ],
});

new Skill(app, 'typescript', {
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

new Prompt(app, 'review', {
  content: [
    '# Code Review',
    '',
    'Review the code for:',
    '- Correctness and edge cases',
    '- Performance implications',
    '- Readability and naming',
  ].join('\n'),
});

app.synth().then(() => console.log('Synthesized to', app.outdir));
```

### Step 7: Build and test

Run from the repo root:

```bash
npm run build && npm test
```

Also run the example to verify output:

```bash
npx tsx examples/l2.ts
```

Fix any type errors or test failures.

## Files Created/Modified

| File | Action |
|------|--------|
| `src/skill.ts` | Create |
| `src/prompt.ts` | Create |
| `src/index.ts` | Append exports |
| `test/skill.test.ts` | Create |
| `test/prompt.test.ts` | Create |
| `examples/l2.ts` | Create |

## Commit

When all tests pass:

```
feat: add Skill and Prompt L2 constructs

Co-authored-by: Kiro Agent <244629292+kiro-agent@users.noreply.github.com>
```
