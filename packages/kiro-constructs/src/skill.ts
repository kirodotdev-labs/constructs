import { Construct } from 'constructs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IAssembly } from './synthesis/assembly.js';
import type { ISynthesizable } from './synthesis/synthesizable.js';
import { Source } from './synthesis/source.js';
import { App } from './app.js';
import matter from 'gray-matter';

export interface SkillProps {
  readonly name?: string;
  readonly description: string;
  readonly instructions: string;
  readonly assets?: Record<string, string>;
  readonly metadata?: Record<string, unknown>;
}

export class Skill extends Construct implements ISynthesizable {
  readonly skillName: string;
  private readonly description: string;
  private readonly instructions: string;
  private readonly assets?: Record<string, string>;
  private readonly metadata?: Record<string, unknown>;

  constructor(scope: Construct, id: string, props: SkillProps) {
    super(scope, id);
    this.skillName = props.name ?? id;
    this.description = props.description;
    this.instructions = props.instructions;
    this.assets = props.assets;
    this.metadata = props.metadata;
  }

  synthesize(assembly: IAssembly): void {
    const sub = assembly.subAssembly('skills').subAssembly(this.skillName);
    const frontmatter: Record<string, unknown> = {
      ...this.metadata,
      name: this.skillName,
      description: this.description,
    };
    const content = matter.stringify('\n' + this.instructions, frontmatter);
    sub.writeAsset('SKILL.md', Source.text(content));
    if (this.assets) {
      for (const [name, value] of Object.entries(this.assets)) {
        sub.writeAsset(name, Source.text(value));
      }
    }
  }

  static fromDirectory(scope: Construct, id: string, dirPath: string): Skill {
    const resolved = path.resolve(App.of(scope).sourceDir, dirPath);
    const raw = fs.readFileSync(path.join(resolved, 'SKILL.md'), 'utf-8');
    const { data, content } = matter(raw);
    const { name, description, ...rest } = data as Record<string, unknown>;
    return new Skill(scope, id, {
      name: (name as string) ?? id,
      description: description as string,
      instructions: content.trim(),
      metadata: Object.keys(rest).length ? rest : undefined,
    });
  }
}
