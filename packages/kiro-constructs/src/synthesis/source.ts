import * as fs from 'node:fs';

/**
 * Represents a source of content that can be written to the assembly output.
 */
export interface ISource {
  /** Write this source's content to the given absolute file path. Parent directories are guaranteed to exist. */
  writeTo(fullPath: string): void;
}

/**
 * Built-in source factories for common content types.
 *
 * @example
 * assembly.writeAsset('config.json', Source.json({ key: 'value' }));
 * assembly.writeAsset('readme.md', Source.text('# Hello'));
 * assembly.writeAsset('bin/tool', Source.file('./bin/tool'));
 */
export class Source {
  /** A UTF-8 text source. */
  static text(content: string): ISource {
    return {
      writeTo(fullPath: string) {
        fs.writeFileSync(fullPath, content, 'utf-8');
      },
    };
  }

  /** A JSON source (2-space indent, trailing newline). */
  static json(content: object): ISource {
    return Source.text(JSON.stringify(content, null, 2) + '\n');
  }

  /** A binary-safe file copy that preserves permissions. */
  static file(sourcePath: string): ISource {
    return {
      writeTo(fullPath: string) {
        fs.copyFileSync(sourcePath, fullPath);
        fs.chmodSync(fullPath, fs.statSync(sourcePath).mode);
      },
    };
  }

  private constructor() {}
}
