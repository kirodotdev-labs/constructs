const SAFE_ARGS = '( [^;|&`$]+)?';
const SAFE_PIPE = '( \\| (tail|head)( -[0-9n]+)?| \\| grep( [^;|&`$]+)?)?';
const STDERR_REDIRECT = '( 2>(&1|/dev/null))?';
const CD_PREFIX = '(cd [^ ]+ && )?';

export function buildPattern(cmd: string, subcommands: string[]): string {
  return `^${CD_PREFIX}(${cmd} (${subcommands.join('|')}))${SAFE_ARGS}${STDERR_REDIRECT}${SAFE_PIPE}$`;
}

export function git(...subcommands: string[]): string {
  return buildPattern('git', subcommands);
}

export function npm(...subcommands: string[]): string {
  return buildPattern('npm', subcommands);
}

export function fileOps(...commands: string[]): string {
  return `^${CD_PREFIX}(${commands.join('|')})${SAFE_ARGS}${STDERR_REDIRECT}${SAFE_PIPE}$`;
}
