import type { App } from './app.js';

export interface InvokeInput {
  prompt: string;
}

export interface InvokeOutput {
  content: string;
}

/**
 * Interface for LLM invocation during synth.
 * Abstracts the underlying provider (Bedrock, kiro-cli, etc.)
 */
export interface IModelProvider {
  /** Called by App to configure the provider with app context (logger, etc.) */
  configure(app: App): void;
  invoke(input: InvokeInput): Promise<InvokeOutput>;
}
