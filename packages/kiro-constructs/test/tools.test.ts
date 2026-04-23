// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { BuiltInTool, Shell } from '../src/index.js';

describe('ToolConfig and BuiltInTool', () => {
  describe('BuiltInTool.shell', () => {
    it('returns toolName shell with no settings when called with no args', () => {
      expect(BuiltInTool.shell()).toEqual({ toolName: 'shell' });
    });

    it('includes allowed when specified', () => {
      expect(BuiltInTool.shell({ allowed: true })).toEqual({ toolName: 'shell', allowed: true });
    });

    it('maps allow permissions to allowedCommands in settings', () => {
      const result = BuiltInTool.shell({ allow: [Shell.git.readonly()] });
      expect(result.toolName).toBe('shell');
      expect(result.settings?.allowedCommands).toBeInstanceOf(Array);
      expect((result.settings?.allowedCommands as string[]).length).toBe(1);
      expect((result.settings?.allowedCommands as string[])[0]).toMatch(/^.*git.*status.*$/);
    });

    it('maps deny permissions to deniedCommands in settings', () => {
      const result = BuiltInTool.shell({ deny: [Shell.git.destructive()] });
      expect(result.settings?.deniedCommands).toBeInstanceOf(Array);
    });

    it('includes autoAllowReadonly and denyByDefault in settings', () => {
      const result = BuiltInTool.shell({ autoAllowReadonly: true, denyByDefault: true });
      expect(result.settings).toEqual({ autoAllowReadonly: true, denyByDefault: true });
    });

    it('combines multiple permissions by flattening patterns', () => {
      const result = BuiltInTool.shell({ allow: [Shell.git.readonly(), Shell.npm.scripts()] });
      expect((result.settings?.allowedCommands as string[]).length).toBe(2);
    });
  });

  describe('BuiltInTool path tools', () => {
    it('read returns toolName read', () => {
      expect(BuiltInTool.read()).toEqual({ toolName: 'read' });
    });

    it('write includes path settings', () => {
      const result = BuiltInTool.write({ deniedPaths: ['.env'] });
      expect(result).toEqual({ toolName: 'write', settings: { deniedPaths: ['.env'] } });
    });

    it('glob includes allowReadOnly', () => {
      const result = BuiltInTool.glob({ allowReadOnly: true });
      expect(result).toEqual({ toolName: 'glob', settings: { allowReadOnly: true } });
    });

    it('grep includes allowedPaths and deniedPaths', () => {
      const result = BuiltInTool.grep({ allowedPaths: ['/src'], deniedPaths: ['/dist'] });
      expect(result.settings).toEqual({ allowedPaths: ['/src'], deniedPaths: ['/dist'] });
    });
  });

  describe('BuiltInTool simple tools', () => {
    it('aws returns toolName aws', () => {
      expect(BuiltInTool.aws()).toEqual({ toolName: 'aws' });
    });

    it('webFetch uses toolName web_fetch', () => {
      expect(BuiltInTool.webFetch()).toEqual({ toolName: 'web_fetch' });
    });

    it('webSearch uses toolName web_search', () => {
      expect(BuiltInTool.webSearch()).toEqual({ toolName: 'web_search' });
    });

    it('code returns toolName code', () => {
      expect(BuiltInTool.code()).toEqual({ toolName: 'code' });
    });
  });

  describe('BuiltInTool.all', () => {
    it('returns exactly 9 tools', () => {
      expect(BuiltInTool.all()).toHaveLength(9);
    });

    it('returns all expected tool names', () => {
      const names = BuiltInTool.all().map(t => t.toolName);
      expect(names).toEqual(['shell', 'read', 'write', 'glob', 'grep', 'aws', 'web_fetch', 'web_search', 'code']);
    });

    it('cascades allowed to all tools', () => {
      const tools = BuiltInTool.all({ allowed: true });
      tools.forEach(t => expect(t.allowed).toBe(true));
    });

    it('allows per-tool override of allowed', () => {
      const tools = BuiltInTool.all({ allowed: true, shell: { allowed: false } });
      const shell = tools.find(t => t.toolName === 'shell')!;
      expect(shell.allowed).toBe(false);
      const rest = tools.filter(t => t.toolName !== 'shell');
      rest.forEach(t => expect(t.allowed).toBe(true));
    });

    it('passes per-tool settings through', () => {
      const tools = BuiltInTool.all({ write: { deniedPaths: ['.env'] } });
      const write = tools.find(t => t.toolName === 'write')!;
      expect(write.settings).toEqual({ deniedPaths: ['.env'] });
    });
  });

  describe('Shell', () => {
    it('Shell.command returns custom pattern', () => {
      expect(Shell.command('my-cmd.*').patterns).toEqual(['my-cmd.*']);
    });

    it('Shell.git.readonly returns patterns matching git read commands', () => {
      const patterns = Shell.git.readonly().patterns;
      expect(patterns.length).toBe(1);
      expect(patterns[0]).toContain('git');
      expect(patterns[0]).toContain('status');
    });

    it('Shell.npm.scripts returns patterns matching npm commands', () => {
      const patterns = Shell.npm.scripts().patterns;
      expect(patterns[0]).toContain('npm');
      expect(patterns[0]).toContain('run');
    });

    it('Shell.files.inspect returns patterns matching file commands', () => {
      const patterns = Shell.files.inspect().patterns;
      expect(patterns[0]).toContain('ls');
      expect(patterns[0]).toContain('cat');
    });
  });
});
