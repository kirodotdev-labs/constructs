import { git, npm, fileOps } from './shell-commands.js';

export interface IShellPermission {
  readonly patterns: string[];
}

export class Shell {
  static readonly git = {
    readonly: (): IShellPermission => ({
      patterns: [git('status', 'log', 'diff', 'show', 'branch', 'blame', 'rev-parse', 'ls-files')],
    }),
    write: (): IShellPermission => ({
      patterns: [
        git('add', 'commit', 'pull', 'fetch', 'merge', 'checkout', 'switch', 'stash', 'push'),
      ],
    }),
    destructive: (): IShellPermission => ({
      patterns: [git('push --force', 'reset --hard', 'clean -fd')],
    }),
  };

  static readonly files = {
    inspect: (): IShellPermission => ({
      patterns: [fileOps('ls', 'cat', 'head', 'tail', 'wc', 'grep', 'find', 'tree')],
    }),
  };

  static readonly npm = {
    scripts: (): IShellPermission => ({ patterns: [npm('run', 'test', 'build', 'install')] }),
  };

  static command(pattern: string): IShellPermission {
    return { patterns: [pattern] };
  }

  private constructor() {}
}
