import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import matter from 'gray-matter';
import { App, Skill } from '../src/index.js';

let tmpDir: string;
let outdir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-constructs-test-'));
  outdir = path.join(tmpDir, '.kiro-constructs.out');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Skill', () => {
  it('synthesizes SKILL.md with frontmatter and instructions', async () => {
    const app = new App({ outdir });
    new Skill(app, 'typescript', {
      description: 'TS expertise',
      instructions: '# TypeScript\n\nUse strict mode.',
    });
    await app.synth();
    const raw = fs.readFileSync(path.join(outdir, 'skills', 'typescript', 'SKILL.md'), 'utf-8');
    const { data, content } = matter(raw);
    expect(data.name).toBe('typescript');
    expect(data.description).toBe('TS expertise');
    expect(content.trim()).toContain('# TypeScript');
  });

  it('writes assets to skill subdirectory', async () => {
    const app = new App({ outdir });
    new Skill(app, 'ts', {
      description: 'TS',
      instructions: 'instructions',
      assets: { 'example.json': '{}' },
    });
    await app.synth();
    const asset = fs.readFileSync(path.join(outdir, 'skills', 'ts', 'example.json'), 'utf-8');
    expect(asset).toBe('{}');
  });

  it('fromDirectory reads existing SKILL.md', async () => {
    const skillDir = path.join(tmpDir, 'my-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      matter.stringify('\n# Loaded\n\nInstructions here.', {
        name: 'loaded',
        description: 'A loaded skill',
      }),
    );
    const app = new App({ outdir, sourceDir: tmpDir });
    Skill.fromDirectory(app, 'loaded', 'my-skill');
    await app.synth();
    const raw = fs.readFileSync(path.join(outdir, 'skills', 'loaded', 'SKILL.md'), 'utf-8');
    const { data, content } = matter(raw);
    expect(data.name).toBe('loaded');
    expect(data.description).toBe('A loaded skill');
    expect(content.trim()).toContain('# Loaded');
  });
});
