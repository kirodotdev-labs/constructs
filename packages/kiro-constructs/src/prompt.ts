import { Construct } from 'constructs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CfgPrompt } from './l1/cfg-prompt.js';
import { Lazy } from './lazy.js';
import { App } from './app.js';
import matter from 'gray-matter';

export interface PromptProps {
  readonly name?: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

export class Prompt extends Construct {
  readonly promptName: string;
  private readonly _content: string;
  private readonly _appendedContent: string[] = [];

  constructor(scope: Construct, id: string, props: PromptProps) {
    super(scope, id);
    this.promptName = props.name ?? id;
    this._content = props.content;
    new CfgPrompt(this, 'Resource', {
      name: this.promptName,
      content: Lazy.any(() => this.renderContent()),
      metadata: props.metadata,
    });
  }

  appendContent(content: string): this {
    this._appendedContent.push(content);
    return this;
  }

  private renderContent(): string {
    if (!this._appendedContent.length) return this._content;
    return this._content + '\n\n' + this._appendedContent.join('\n\n');
  }

  static fromFile(scope: Construct, id: string, filePath: string): Prompt {
    const resolved = path.resolve(App.of(scope).sourceDir, filePath);
    const raw = fs.readFileSync(resolved, 'utf-8');
    const { data, content } = matter(raw);
    const { name, ...rest } = data as Record<string, unknown>;
    return new Prompt(scope, id, {
      name: (name as string) ?? id,
      content: content.trim(),
      metadata: Object.keys(rest).length ? rest : undefined,
    });
  }
}
