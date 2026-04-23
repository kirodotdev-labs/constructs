import type { ToolConfig } from './tool-config.js';
import type { IShellPermission } from './shell.js';

export interface BuiltInToolProps {
  readonly allowed?: boolean;
}

export interface ShellToolProps extends BuiltInToolProps {
  readonly allow?: IShellPermission[];
  readonly deny?: IShellPermission[];
  readonly autoAllowReadonly?: boolean;
  readonly denyByDefault?: boolean;
}

export interface PathToolProps extends BuiltInToolProps {
  readonly allowedPaths?: string[];
  readonly deniedPaths?: string[];
}

export interface PathToolWithReadOnlyProps extends PathToolProps {
  readonly allowReadOnly?: boolean;
}

export interface AllToolsProps extends BuiltInToolProps {
  readonly shell?: ShellToolProps;
  readonly read?: PathToolProps;
  readonly write?: PathToolProps;
  readonly glob?: PathToolWithReadOnlyProps;
  readonly grep?: PathToolWithReadOnlyProps;
  readonly aws?: BuiltInToolProps;
  readonly webFetch?: BuiltInToolProps;
  readonly webSearch?: BuiltInToolProps;
  readonly code?: BuiltInToolProps;
}

export class BuiltInTool {
  static shell(props: ShellToolProps = {}): ToolConfig {
    const settings: Record<string, unknown> = {};
    if (props.allow?.length) settings.allowedCommands = props.allow.flatMap((p) => p.patterns);
    if (props.deny?.length) settings.deniedCommands = props.deny.flatMap((p) => p.patterns);
    if (props.autoAllowReadonly !== undefined) settings.autoAllowReadonly = props.autoAllowReadonly;
    if (props.denyByDefault !== undefined) settings.denyByDefault = props.denyByDefault;
    return this.build('shell', props.allowed, settings);
  }

  static read(props: PathToolProps = {}): ToolConfig {
    return this.pathTool('read', props);
  }

  static write(props: PathToolProps = {}): ToolConfig {
    return this.pathTool('write', props);
  }

  static glob(props: PathToolWithReadOnlyProps = {}): ToolConfig {
    return this.pathTool('glob', props);
  }

  static grep(props: PathToolWithReadOnlyProps = {}): ToolConfig {
    return this.pathTool('grep', props);
  }

  static aws(props: BuiltInToolProps = {}): ToolConfig {
    return this.build('aws', props.allowed);
  }

  static webFetch(props: BuiltInToolProps = {}): ToolConfig {
    return this.build('web_fetch', props.allowed);
  }

  static webSearch(props: BuiltInToolProps = {}): ToolConfig {
    return this.build('web_search', props.allowed);
  }

  static code(props: BuiltInToolProps = {}): ToolConfig {
    return this.build('code', props.allowed);
  }

  static all(props: AllToolsProps = {}): ToolConfig[] {
    const d = props.allowed;
    return [
      this.shell({ ...props.shell, allowed: props.shell?.allowed ?? d }),
      this.read({ ...props.read, allowed: props.read?.allowed ?? d }),
      this.write({ ...props.write, allowed: props.write?.allowed ?? d }),
      this.glob({ ...props.glob, allowed: props.glob?.allowed ?? d }),
      this.grep({ ...props.grep, allowed: props.grep?.allowed ?? d }),
      this.aws({ ...props.aws, allowed: props.aws?.allowed ?? d }),
      this.webFetch({ ...props.webFetch, allowed: props.webFetch?.allowed ?? d }),
      this.webSearch({ ...props.webSearch, allowed: props.webSearch?.allowed ?? d }),
      this.code({ ...props.code, allowed: props.code?.allowed ?? d }),
    ];
  }

  private static pathTool(toolName: string, props: PathToolWithReadOnlyProps): ToolConfig {
    const settings: Record<string, unknown> = {};
    if (props.allowedPaths?.length) settings.allowedPaths = props.allowedPaths;
    if (props.deniedPaths?.length) settings.deniedPaths = props.deniedPaths;
    if ('allowReadOnly' in props && props.allowReadOnly !== undefined)
      settings.allowReadOnly = props.allowReadOnly;
    return this.build(toolName, props.allowed, settings);
  }

  private static build(
    toolName: string,
    allowed?: boolean,
    settings?: Record<string, unknown>,
  ): ToolConfig {
    const result: { toolName: string; allowed?: boolean; settings?: Record<string, unknown> } = {
      toolName,
    };
    if (allowed !== undefined) result.allowed = allowed;
    if (settings && Object.keys(settings).length > 0) result.settings = settings;
    return result;
  }

  private constructor() {}
}
