import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import matter from 'gray-matter';
import { App, Prompt } from '../src/index.js';

let tmpDir: string;
let outdir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-constructs-test-'));
  outdir = path.join(tmpDir, '.kiro-constructs.out');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Prompt', () => {
  it('synthesizes identically to CfgPrompt', async () => {
    const app = new App({ outdir });
    new Prompt(app, 'review', { content: '# Review\n\nCheck code.' });
    await app.synth();
    const raw = fs.readFileSync(path.join(outdir, 'prompts', 'review.md'), 'utf-8');
    expect(raw).toBe('# Review\n\nCheck code.');
  });

  it('appendContent adds content after construction', async () => {
    const app = new App({ outdir });
    const p = new Prompt(app, 'review', { content: '# Review' });
    p.appendContent('## Section 2');
    await app.synth();
    const raw = fs.readFileSync(path.join(outdir, 'prompts', 'review.md'), 'utf-8');
    expect(raw).toContain('# Review');
    expect(raw).toContain('## Section 2');
  });

  it('fromFile reads existing markdown with frontmatter', async () => {
    const filePath = path.join(tmpDir, 'guide.md');
    fs.writeFileSync(
      filePath,
      matter.stringify('\n# Guide\n\nDo the thing.', { name: 'guide', audience: 'devs' }),
    );
    const app = new App({ outdir, sourceDir: tmpDir });
    Prompt.fromFile(app, 'loaded', 'guide.md');
    await app.synth();
    const raw = fs.readFileSync(path.join(outdir, 'prompts', 'guide.md'), 'utf-8');
    const { data, content } = matter(raw);
    expect(data.audience).toBe('devs');
    expect(content.trim()).toContain('# Guide');
  });
});
