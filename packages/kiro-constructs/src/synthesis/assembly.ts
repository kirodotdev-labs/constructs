import * as fs from 'node:fs';
import * as path from 'node:path';
import { type ISource } from './source.js';

/**
 * Output assembly - abstracts file system operations.
 */
export interface IAssembly {
  /** Write a source to a file path relative to this assembly's output directory. */
  writeAsset(filePath: string, source: ISource): void;

  /** Get a sub-assembly for nested output */
  subAssembly(name: string): IAssembly;

  /** The output directory */
  readonly outdir: string;
}

/**
 * Default assembly implementation that writes to the file system.
 */
export class Assembly implements IAssembly {
  constructor(public readonly outdir: string) {}

  writeAsset(filePath: string, source: ISource): void {
    const fullPath = path.join(this.outdir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    source.writeTo(fullPath);
  }

  subAssembly(name: string): IAssembly {
    return new Assembly(path.join(this.outdir, name));
  }
}
