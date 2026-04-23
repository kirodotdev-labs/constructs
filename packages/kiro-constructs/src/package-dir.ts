import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves the root directory of the package containing the caller.
 *
 * Walks up from `import.meta.dirname` to find the nearest `package.json`.
 * Library authors use this to produce absolute paths so that `from*` methods
 * resolve relative to the library package, not the consumer's cwd.
 *
 * @example
 * ```typescript
 * import { packageDir } from '@kiro/constructs';
 *
 * const root = packageDir(import.meta);
 * Content.fromFile(scope, path.join(root, 'templates/prompt.md'));
 * ```
 */
export function packageDir(importMeta: { dirname: string }): string {
  let dir = importMeta.dirname;
  const { root } = path.parse(dir);

  while (dir !== root) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  throw new Error(
    `No package.json found in any ancestor of ${importMeta.dirname}. ` +
      'Ensure packageDir() is called from within a Node.js package.',
  );
}
