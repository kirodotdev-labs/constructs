import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import { App } from './app.js';

export class Content {
  static fromFile(scope: Construct, filePath: string): string {
    const sourceDir = App.of(scope).sourceDir;
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(sourceDir, filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Content.fromFile: File not found: ${resolved}`);
    }

    return fs.readFileSync(resolved, 'utf-8');
  }
}
