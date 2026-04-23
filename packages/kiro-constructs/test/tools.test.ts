import { describe, it, expect } from 'vitest';
import { BuiltInTool, Shell } from '../src/index.js';

describe('BuiltInTool', () => {
  it('shell maps allow/deny permissions to settings', () => {
    const result = BuiltInTool.shell({
      allowed: true,
      allow: [Shell.git.readonly(), Shell.npm.scripts()],
      deny: [Shell.git.destructive()],
      denyByDefault: true,
    });
    expect(result.toolName).toBe('shell');
    expect(result.allowed).toBe(true);
    expect(result.settings?.allowedCommands).toHaveLength(2);
    expect(result.settings?.deniedCommands).toHaveLength(1);
    expect(result.settings?.denyByDefault).toBe(true);
  });

  it('path tools map allowedPaths, deniedPaths, and allowReadOnly to settings', () => {
    expect(BuiltInTool.write({ deniedPaths: ['.env'] })).toEqual({
      toolName: 'write',
      settings: { deniedPaths: ['.env'] },
    });
    expect(BuiltInTool.glob({ allowReadOnly: true })).toEqual({
      toolName: 'glob',
      settings: { allowReadOnly: true },
    });
  });

  it('simple tools use correct toolNames', () => {
    expect(BuiltInTool.webFetch().toolName).toBe('web_fetch');
    expect(BuiltInTool.webSearch().toolName).toBe('web_search');
  });

  it('no-arg factories return only toolName', () => {
    const result = BuiltInTool.shell();
    expect(result).toEqual({ toolName: 'shell' });
    expect(result).not.toHaveProperty('settings');
    expect(result).not.toHaveProperty('allowed');
  });

  it('all() returns 9 tools with cascading allowed and per-tool overrides', () => {
    const tools = BuiltInTool.all({ allowed: true, shell: { allowed: false } });
    expect(tools).toHaveLength(9);
    expect(tools.map((t) => t.toolName)).toEqual([
      'shell',
      'read',
      'write',
      'glob',
      'grep',
      'aws',
      'web_fetch',
      'web_search',
      'code',
    ]);
    expect(tools.find((t) => t.toolName === 'shell')!.allowed).toBe(false);
    expect(tools.filter((t) => t.toolName !== 'shell').every((t) => t.allowed)).toBe(true);
  });
});

describe('Shell', () => {
  it('permission helpers produce regex patterns matching expected commands', () => {
    expect(Shell.git.readonly().patterns[0]).toContain('status');
    expect(Shell.npm.scripts().patterns[0]).toContain('npm');
    expect(Shell.files.inspect().patterns[0]).toContain('ls');
    expect(Shell.command('my-cmd').patterns).toEqual(['my-cmd']);
  });
});
