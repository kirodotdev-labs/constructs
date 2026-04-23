import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { App, KiroCliProvider } from '../src/index.js';
import { Construct } from 'constructs';

const execFileAsync = promisify(execFile);

let kiroCliAvailable = false;

beforeAll(async () => {
  try {
    await execFileAsync('kiro-cli', ['--version']);
    kiroCliAvailable = true;
  } catch {
    kiroCliAvailable = false;
  }
});

describe.runIf(() => kiroCliAvailable)('KiroCliProvider', () => {
  it('constructs without error', () => {
    const provider = new KiroCliProvider();
    expect(provider).toBeDefined();
  });

  it('accepts model option', () => {
    const provider = new KiroCliProvider({ model: 'sonnet' });
    expect(provider).toBeDefined();
  });

  it.skip('invokes kiro-cli and returns response', async () => {
    const provider = new KiroCliProvider();
    const app = new App({ modelProvider: provider });
    new Construct(app, 'Dummy');

    const result = await provider.invoke({ prompt: 'Reply with exactly: hello' });
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  }, 30000);
});
