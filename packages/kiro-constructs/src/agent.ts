import { Construct } from 'constructs';
import { CfgAgent } from './l1/cfg-agent.js';
import { Lazy } from './lazy.js';
import type { ToolConfig } from './tools/tool-config.js';
import type { Skill } from './skill.js';
import type { Prompt } from './prompt.js';

export interface AgentProps {
  readonly name?: string;
  readonly description: string;
  readonly prompt?: string;
  readonly model?: string;
  readonly tools?: (string | ToolConfig | ToolConfig[])[];
  readonly skills?: Skill[];
  readonly prompts?: Prompt[];
  readonly mcpServers?: Record<string, CfgAgent.McpServerProperty>;
  readonly hooks?: CfgAgent.HooksProperty;
  readonly resources?: (string | CfgAgent.ResourceProperty)[];
  readonly toolAliases?: Record<string, string>;
  readonly includeMcpJson?: boolean;
  readonly keyboardShortcut?: string;
  readonly welcomeMessage?: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const tVal = target[key];
    const sVal = source[key];
    if (Array.isArray(tVal) && Array.isArray(sVal)) {
      result[key] = [...(tVal as unknown[]), ...(sVal as unknown[])];
    } else if (isPlainObject(tVal) && isPlainObject(sVal)) {
      result[key] = deepMerge(tVal, sVal);
    } else {
      result[key] = sVal;
    }
  }
  return result;
}

function isToolConfig(v: string | ToolConfig): v is ToolConfig {
  return typeof v === 'object' && 'toolName' in v;
}

export class Agent extends Construct {
  private readonly agentName: string;
  private readonly _tools: (string | ToolConfig)[] = [];
  private readonly _mcpServers: Map<string, CfgAgent.McpServerProperty> = new Map();
  private readonly _hooks: Map<keyof CfgAgent.HooksProperty, CfgAgent.HookProperty[]> = new Map();
  private readonly _resources: (string | CfgAgent.ResourceProperty)[] = [];

  constructor(scope: Construct, id: string, props: AgentProps) {
    super(scope, id);
    this.agentName = props.name ?? id;

    if (props.tools) {
      for (const t of props.tools) {
        if (Array.isArray(t)) {
          this._tools.push(...t);
        } else {
          this._tools.push(t);
        }
      }
    }

    if (props.mcpServers) {
      for (const [k, v] of Object.entries(props.mcpServers)) {
        this._mcpServers.set(k, v);
      }
    }

    if (props.hooks) {
      for (const [k, v] of Object.entries(props.hooks)) {
        if (v)
          this._hooks.set(k as keyof CfgAgent.HooksProperty, [...(v as CfgAgent.HookProperty[])]);
      }
    }

    if (props.resources) {
      this._resources.push(...props.resources);
    }

    if (props.skills) {
      for (const s of props.skills) this.addSkill(s);
    }

    if (props.prompts) {
      for (const p of props.prompts) this.addPrompt(p);
    }

    new CfgAgent(this, 'Resource', {
      name: this.agentName,
      description: props.description,
      prompt: props.prompt,
      model: props.model,
      toolAliases: props.toolAliases,
      includeMcpJson: props.includeMcpJson,
      keyboardShortcut: props.keyboardShortcut,
      welcomeMessage: props.welcomeMessage,
      tools: Lazy.any(() => this.renderTools()),
      allowedTools: Lazy.any(() => this.renderAllowedTools()),
      toolsSettings: Lazy.any(() => this.renderToolsSettings()),
      mcpServers: Lazy.any(() => this.renderMcpServers()),
      hooks: Lazy.any(() => this.renderHooks()),
      resources: Lazy.any(() => this.renderResources()),
    });
  }

  addTool(tool: string | ToolConfig | ToolConfig[]): this {
    if (Array.isArray(tool)) {
      this._tools.push(...tool);
    } else {
      this._tools.push(tool);
    }
    return this;
  }

  addMcpServer(name: string, config: CfgAgent.McpServerProperty): this {
    this._mcpServers.set(name, config);
    return this;
  }

  addHook(event: keyof CfgAgent.HooksProperty, hook: CfgAgent.HookProperty): this {
    const existing = this._hooks.get(event) ?? [];
    existing.push(hook);
    this._hooks.set(event, existing);
    return this;
  }

  addResource(resource: string | CfgAgent.ResourceProperty): this {
    this._resources.push(resource);
    return this;
  }

  addSkill(skill: Skill): this {
    this._resources.push(`skill://skills/${skill.skillName}/SKILL.md`);
    return this;
  }

  addPrompt(prompt: Prompt): this {
    this._resources.push(`file://prompts/${prompt.promptName}.md`);
    return this;
  }

  private renderTools(): string[] | undefined {
    const names = this._tools.map((t) => (isToolConfig(t) ? t.toolName : t));
    const deduped = [...new Set(names)];
    return deduped.length ? deduped : undefined;
  }

  private renderAllowedTools(): string[] | undefined {
    const names = this._tools
      .filter((t): t is ToolConfig => isToolConfig(t) && t.allowed === true)
      .map((t) => t.toolName);
    const deduped = [...new Set(names)];
    return deduped.length ? deduped : undefined;
  }

  private renderToolsSettings(): Record<string, object> | undefined {
    const result: Record<string, Record<string, unknown>> = {};
    for (const t of this._tools) {
      if (isToolConfig(t) && t.settings) {
        result[t.toolName] = result[t.toolName]
          ? deepMerge(result[t.toolName], t.settings)
          : { ...t.settings };
      }
    }
    return Object.keys(result).length ? result : undefined;
  }

  private renderMcpServers(): Record<string, CfgAgent.McpServerProperty> | undefined {
    return this._mcpServers.size ? Object.fromEntries(this._mcpServers) : undefined;
  }

  private renderHooks(): CfgAgent.HooksProperty | undefined {
    return this._hooks.size ? Object.fromEntries(this._hooks) : undefined;
  }

  private renderResources(): (string | CfgAgent.ResourceProperty)[] | undefined {
    return this._resources.length ? this._resources : undefined;
  }
}
