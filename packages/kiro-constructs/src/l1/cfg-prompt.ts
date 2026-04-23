import { Construct } from 'constructs';
import type { IAssembly } from '../synthesis/assembly.js';
import type { ISynthesizable } from '../synthesis/synthesizable.js';
import { resolve } from '../lazy.js';
import { Source } from '../synthesis/source.js';
import matter from 'gray-matter';

export interface CfgPromptProps {
  readonly name?: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * L1 construct for Kiro Prompts - reusable snippets invoked with @prompt-name in chat.
 * Synthesizes to prompts/{name}.md
 */
export class CfgPrompt extends Construct implements ISynthesizable {
  private readonly promptName: string;
  private readonly content: string;
  private readonly metadata?: Record<string, unknown>;

  constructor(scope: Construct, id: string, props: CfgPromptProps) {
    super(scope, id);
    this.promptName = props.name ?? id;
    this.content = props.content;
    this.metadata = props.metadata;
  }

  synthesize(assembly: IAssembly): void {
    const meta = resolve(this.metadata);
    const content = resolve(this.content);
    const output =
      meta && Object.keys(meta).length > 0 ? matter.stringify('\n' + content, meta) : content;
    assembly.subAssembly('prompts').writeAsset(`${this.promptName}.md`, Source.text(output));
  }
}
