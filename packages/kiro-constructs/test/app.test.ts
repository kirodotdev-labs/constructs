import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Construct } from 'constructs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App, Source, type IAssembly, type ISynthesizable } from '../src/index.js';

describe('App', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-constructs-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('synthesizes constructs to output directory', async () => {
    const outdir = path.join(tmpDir, '.kiro-constructs.out');
    const app = new App({ outdir });

    class TestConstruct extends Construct implements ISynthesizable {
      synthesize(assembly: IAssembly): void {
        assembly.writeAsset('test.txt', Source.text('hello'));
        assembly.writeAsset('config.json', Source.json({ name: 'test' }));
        assembly.subAssembly('nested').writeAsset('inner.txt', Source.text('nested'));
      }
    }

    new TestConstruct(app, 'test');
    await app.synth();

    expect(fs.readFileSync(path.join(outdir, 'test.txt'), 'utf-8')).toBe('hello');
    expect(JSON.parse(fs.readFileSync(path.join(outdir, 'config.json'), 'utf-8'))).toEqual({
      name: 'test',
    });
    expect(fs.readFileSync(path.join(outdir, 'nested', 'inner.txt'), 'utf-8')).toBe('nested');
  });

  it('collects and reports validation errors', async () => {
    const app = new App({ outdir: path.join(tmpDir, '.kiro-constructs.out') });

    class InvalidConstruct extends Construct {
      constructor(scope: Construct, id: string) {
        super(scope, id);
        this.node.addValidation({ validate: () => ['something is wrong'] });
      }
    }

    new InvalidConstruct(app, 'invalid');

    await expect(app.synth()).rejects.toThrow(/Validation failed.*something is wrong/s);
  });
});
