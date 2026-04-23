export interface ToolConfig {
  readonly toolName: string;
  readonly allowed?: boolean;
  readonly settings?: Record<string, unknown>;
}
