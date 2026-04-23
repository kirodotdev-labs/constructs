# Task 1: ToolConfig Interface, BuiltInTool Factories, and Shell Permissions

Parent: [l2-constructs.md](./l2-constructs.md) — Task 1

## Context

All source files live in `packages/kiro-constructs/src/`. Tests in `packages/kiro-constructs/test/`.

Existing conventions:
- No license headers in source files (Apache-2.0 license at repo root is sufficient)
- ESM (`"type": "module"`, `.js` extensions in imports)
- Tests use `vitest` (`describe`, `it`, `expect`), temp dirs for synth tests
- Existing exports in `src/index.ts` — append new exports, don't reorder existing ones

The `CfgAgent` L1 (in `src/l1/cfg-agent.ts`) already supports these fields that tools wire into:
- `tools: string[]` — list of tool names
- `allowedTools: string[]` — auto-approved tool names
- `toolsSettings: Record<string, object>` — per-tool settings keyed by tool name

## Steps

### Step 1: Create `src/tools/tool-config.ts`

Create the file with the Apache-2.0 header. Define and export:

```ts
export interface ToolConfig {
  readonly toolName: string;
  readonly allowed?: boolean;
  readonly settings?: Record<string, unknown>;
}
```

### Step 2: Create `src/tools/shell-commands.ts`

Create the file with the Apache-2.0 header. Implement regex builder helpers for safe shell command patterns.

Define these constants (not exported):

```ts
const SAFE_ARGS = '( [^;|&`$]+)?';
const SAFE_PIPE = '( \\| (tail|head)( -[0-9n]+)?| \\| grep( [^;|&`$]+)?)?';
const STDERR_REDIRECT = '( 2>(&1|/dev/null))?';
const CD_PREFIX = '(cd [^ ]+ && )?';
```

Implement and export:

```ts
export function buildPattern(cmd: string, subcommands: string[]): string
// Returns: `^${CD_PREFIX}(${cmd} (${cmds_joined_by_pipe}))${SAFE_ARGS}${STDERR_REDIRECT}${SAFE_PIPE}$`

export function git(...subcommands: string[]): string
// Calls buildPattern('git', subcommands)

export function npm(...subcommands: string[]): string
// Calls buildPattern('npm', subcommands)

export function fileOps(...commands: string[]): string
// Different pattern: `^${CD_PREFIX}(${cmds_joined_by_pipe})${SAFE_ARGS}${STDERR_REDIRECT}${SAFE_PIPE}$`
// Note: fileOps treats each command as a top-level command, not a subcommand
```

### Step 3: Create `src/tools/shell.ts`

Create the file with the Apache-2.0 header. Import `git`, `npm`, `fileOps` from `./shell-commands.js`.

Define and export:

```ts
export interface IShellPermission {
  readonly patterns: string[];
}
```

Implement `Shell` class with private constructor and static members:

```ts
export class Shell {
  static readonly git = {
    readonly: (): IShellPermission =>
      ({ patterns: [git('status', 'log', 'diff', 'show', 'branch', 'blame', 'rev-parse', 'ls-files')] }),
    write: (): IShellPermission =>
      ({ patterns: [git('add', 'commit', 'pull', 'fetch', 'merge', 'checkout', 'switch', 'stash', 'push')] }),
    destructive: (): IShellPermission =>
      ({ patterns: [git('push --force', 'reset --hard', 'clean -fd')] }),
  };

  static readonly files = {
    inspect: (): IShellPermission =>
      ({ patterns: [fileOps('ls', 'cat', 'head', 'tail', 'wc', 'grep', 'find', 'tree')] }),
  };

  static readonly npm = {
    scripts: (): IShellPermission =>
      ({ patterns: [npm('run', 'test', 'build', 'install')] }),
  };

  static command(pattern: string): IShellPermission {
    return { patterns: [pattern] };
  }

  private constructor() {}
}
```

### Step 4: Create `src/tools/built-in-tools.ts`

Create the file with the Apache-2.0 header. Import `ToolConfig` from `./tool-config.js` and `IShellPermission` from `./shell.js`.

Define and export these prop interfaces:

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

export interface AllToolsProps extends BuiltInToolProps {
  readonly shell?: ShellToolProps;
  readonly read?: PathToolProps;
  readonly write?: PathToolProps;
  readonly glob?: PathToolWithReadOnlyProps;
  readonly grep?: PathToolWithReadOnlyProps;
  readonly aws?: BuiltInToolProps;
  readonly webFetch?: BuiltInToolProps;
  readonly webSearch?: BuiltInToolProps;
  readonly code?: BuiltInToolProps;
}
```

Implement `BuiltInTool` class with private constructor:

- `static shell(props: ShellToolProps = {}): ToolConfig` — Flatten `props.allow` into `settings.allowedCommands` (flatMap `.patterns`). Flatten `props.deny` into `settings.deniedCommands`. Include `autoAllowReadonly` and `denyByDefault` in settings if defined. Return `{ toolName: 'shell', allowed?, settings? }`. Only include `allowed` key if `props.allowed !== undefined`. Only include `settings` key if it has entries.

- `static read(props: PathToolProps = {}): ToolConfig` — Delegate to private `pathTool('read', props)`.

- `static write(props: PathToolProps = {}): ToolConfig` — Delegate to private `pathTool('write', props)`.

- `static glob(props: PathToolWithReadOnlyProps = {}): ToolConfig` — Delegate to private `pathTool('glob', props)`.

- `static grep(props: PathToolWithReadOnlyProps = {}): ToolConfig` — Delegate to private `pathTool('grep', props)`.

- `static aws(props: BuiltInToolProps = {}): ToolConfig` — Return `{ toolName: 'aws', allowed? }`.

- `static webFetch(props: BuiltInToolProps = {}): ToolConfig` — Return `{ toolName: 'web_fetch', allowed? }`.

- `static webSearch(props: BuiltInToolProps = {}): ToolConfig` — Return `{ toolName: 'web_search', allowed? }`.

- `static code(props: BuiltInToolProps = {}): ToolConfig` — Return `{ toolName: 'code', allowed? }`.

- `static all(props: AllToolsProps = {}): ToolConfig[]` — Return array of all 9 tools. For each tool, cascade `props.allowed` as the default `allowed` value, but let per-tool `allowed` override. Example: `BuiltInTool.shell({ ...props.shell, allowed: props.shell?.allowed ?? props.allowed })`.

- `private static pathTool(toolName: string, props: PathToolWithReadOnlyProps): ToolConfig` — Build settings from `allowedPaths`, `deniedPaths`, `allowReadOnly` (only include keys that are defined and non-empty). Return `{ toolName, allowed?, settings? }`.

### Step 5: Create `src/tools/index.ts`

Create the barrel file with the Apache-2.0 header:

```ts
export { type ToolConfig } from './tool-config.js';
export {
  BuiltInTool,
  type AllToolsProps,
  type BuiltInToolProps,
  type ShellToolProps,
  type PathToolProps,
  type PathToolWithReadOnlyProps,
} from './built-in-tools.js';
export { Shell, type IShellPermission } from './shell.js';
```

### Step 6: Update `src/index.ts`

Append these exports at the end of the existing `src/index.ts` (do NOT modify existing exports):

```ts
export {
  type ToolConfig,
  BuiltInTool,
  type AllToolsProps,
  type BuiltInToolProps,
  type ShellToolProps,
  type PathToolProps,
  type PathToolWithReadOnlyProps,
  Shell,
  type IShellPermission,
} from './tools/index.js';
```

### Step 7: Create `test/tools.test.ts`

Create the test file with the Apache-2.0 header. Import from `../src/index.js`. Use `describe`/`it`/`expect` from `vitest`.

Write these test cases:

```
describe('ToolConfig and BuiltInTool', () => {

  describe('BuiltInTool.shell', () => {
    it('returns toolName shell with no settings when called with no args')
      → expect(BuiltInTool.shell()).toEqual({ toolName: 'shell' })

    it('includes allowed when specified')
      → expect(BuiltInTool.shell({ allowed: true })).toEqual({ toolName: 'shell', allowed: true })

    it('maps allow permissions to allowedCommands in settings')
      → result = BuiltInTool.shell({ allow: [Shell.git.readonly()] })
      → expect(result.toolName).toBe('shell')
      → expect(result.settings?.allowedCommands).toBeInstanceOf(Array)
      → expect((result.settings?.allowedCommands as string[]).length).toBe(1)
      → expect((result.settings?.allowedCommands as string[])[0]).toMatch(/^.*git.*status.*$/)

    it('maps deny permissions to deniedCommands in settings')
      → result = BuiltInTool.shell({ deny: [Shell.git.destructive()] })
      → expect(result.settings?.deniedCommands).toBeInstanceOf(Array)

    it('includes autoAllowReadonly and denyByDefault in settings')
      → result = BuiltInTool.shell({ autoAllowReadonly: true, denyByDefault: true })
      → expect(result.settings).toEqual({ autoAllowReadonly: true, denyByDefault: true })

    it('combines multiple permissions by flattening patterns')
      → result = BuiltInTool.shell({ allow: [Shell.git.readonly(), Shell.npm.scripts()] })
      → expect((result.settings?.allowedCommands as string[]).length).toBe(2)
  })

  describe('BuiltInTool path tools', () => {
    it('read returns toolName read')
      → expect(BuiltInTool.read()).toEqual({ toolName: 'read' })

    it('write includes path settings')
      → result = BuiltInTool.write({ deniedPaths: ['.env'] })
      → expect(result).toEqual({ toolName: 'write', settings: { deniedPaths: ['.env'] } })

    it('glob includes allowReadOnly')
      → result = BuiltInTool.glob({ allowReadOnly: true })
      → expect(result).toEqual({ toolName: 'glob', settings: { allowReadOnly: true } })

    it('grep includes allowedPaths and deniedPaths')
      → result = BuiltInTool.grep({ allowedPaths: ['/src'], deniedPaths: ['/dist'] })
      → expect(result.settings).toEqual({ allowedPaths: ['/src'], deniedPaths: ['/dist'] })
  })

  describe('BuiltInTool simple tools', () => {
    it('aws returns toolName aws')
      → expect(BuiltInTool.aws()).toEqual({ toolName: 'aws' })

    it('webFetch uses toolName web_fetch')
      → expect(BuiltInTool.webFetch()).toEqual({ toolName: 'web_fetch' })

    it('webSearch uses toolName web_search')
      → expect(BuiltInTool.webSearch()).toEqual({ toolName: 'web_search' })

    it('code returns toolName code')
      → expect(BuiltInTool.code()).toEqual({ toolName: 'code' })
  })

  describe('BuiltInTool.all', () => {
    it('returns exactly 9 tools')
      → expect(BuiltInTool.all()).toHaveLength(9)

    it('returns all expected tool names')
      → names = BuiltInTool.all().map(t => t.toolName)
      → expect(names).toEqual(['shell', 'read', 'write', 'glob', 'grep', 'aws', 'web_fetch', 'web_search', 'code'])

    it('cascades allowed to all tools')
      → tools = BuiltInTool.all({ allowed: true })
      → tools.forEach(t => expect(t.allowed).toBe(true))

    it('allows per-tool override of allowed')
      → tools = BuiltInTool.all({ allowed: true, shell: { allowed: false } })
      → shell = tools.find(t => t.toolName === 'shell')!
      → expect(shell.allowed).toBe(false)
      → rest = tools.filter(t => t.toolName !== 'shell')
      → rest.forEach(t => expect(t.allowed).toBe(true))

    it('passes per-tool settings through')
      → tools = BuiltInTool.all({ write: { deniedPaths: ['.env'] } })
      → write = tools.find(t => t.toolName === 'write')!
      → expect(write.settings).toEqual({ deniedPaths: ['.env'] })
  })

  describe('Shell', () => {
    it('Shell.command returns custom pattern')
      → expect(Shell.command('my-cmd.*').patterns).toEqual(['my-cmd.*'])

    it('Shell.git.readonly returns patterns matching git read commands')
      → patterns = Shell.git.readonly().patterns
      → expect(patterns.length).toBe(1)
      → expect(patterns[0]).toContain('git')
      → expect(patterns[0]).toContain('status')

    it('Shell.npm.scripts returns patterns matching npm commands')
      → patterns = Shell.npm.scripts().patterns
      → expect(patterns[0]).toContain('npm')
      → expect(patterns[0]).toContain('run')

    it('Shell.files.inspect returns patterns matching file commands')
      → patterns = Shell.files.inspect().patterns
      → expect(patterns[0]).toContain('ls')
      → expect(patterns[0]).toContain('cat')
  })
})
```

### Step 8: Build and test

Run from the repo root:

```bash
cd packages/kiro-constructs && npm run build && npm test
```

Fix any type errors or test failures. All existing tests must continue to pass.

## Files Created/Modified

| File | Action |
|------|--------|
| `src/tools/tool-config.ts` | Create |
| `src/tools/shell-commands.ts` | Create |
| `src/tools/shell.ts` | Create |
| `src/tools/built-in-tools.ts` | Create |
| `src/tools/index.ts` | Create |
| `src/index.ts` | Append exports |
| `test/tools.test.ts` | Create |

## Commit

When all tests pass, commit with:

```
feat: add ToolConfig interface, BuiltInTool factories, and Shell permissions

Co-authored-by: Kiro Agent <244629292+kiro-agent@users.noreply.github.com>
```
