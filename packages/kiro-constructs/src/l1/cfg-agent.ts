import { Construct } from 'constructs';
import type { IAssembly } from '../synthesis/assembly.js';
import type { ISynthesizable } from '../synthesis/synthesizable.js';
import { resolve } from '../lazy.js';
import { Source } from '../synthesis/source.js';

export interface CfgAgentProps {
  readonly name?: string;
  readonly description?: string;
  readonly prompt?: string;
  readonly mcpServers?: Record<string, CfgAgent.McpServerProperty>;
  readonly tools?: string[];
  readonly toolAliases?: Record<string, string>;
  readonly allowedTools?: string[];
  readonly toolsSettings?: Record<string, object>;
  readonly resources?: (string | CfgAgent.ResourceProperty)[];
  readonly hooks?: CfgAgent.HooksProperty;
  readonly includeMcpJson?: boolean;
  readonly model?: string;
  readonly keyboardShortcut?: string;
  readonly welcomeMessage?: string;
}

export class CfgAgent extends Construct implements ISynthesizable {
  private readonly agentName: string;
  private readonly props: CfgAgentProps;

  constructor(scope: Construct, id: string, props: CfgAgentProps = {}) {
    super(scope, id);
    this.agentName = props.name ?? id;
    this.props = props;
  }

  synthesize(assembly: IAssembly): void {
    const { name: _name, ...config } = resolve(this.props);
    assembly.subAssembly('agents').writeAsset(`${this.agentName}.json`, Source.json(config));
  }
}

export namespace CfgAgent {
  export interface McpServerProperty {
    readonly command: string;
    readonly args?: string[];
    readonly env?: Record<string, string>;
    readonly timeout?: number;
  }

  export interface ResourceProperty {
    readonly type: 'knowledgeBase';
    readonly source: string;
    readonly name: string;
    readonly description?: string;
    readonly indexType?: 'best' | 'fast';
    readonly autoUpdate?: boolean;
  }

  export interface HookProperty {
    readonly command: string;
    readonly matcher?: string;
  }

  export interface HooksProperty {
    readonly agentSpawn?: HookProperty[];
    readonly userPromptSubmit?: HookProperty[];
    readonly preToolUse?: HookProperty[];
    readonly postToolUse?: HookProperty[];
    readonly stop?: HookProperty[];
  }
}
