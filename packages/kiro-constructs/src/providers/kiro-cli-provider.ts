import { execFile } from 'child_process';
import { promisify } from 'util';
import type { App } from '../app.js';
import type { IModelProvider, InvokeInput, InvokeOutput } from '../model-provider.js';
import type { ILogger } from '../logger.js';

const execFileAsync = promisify(execFile);

export interface KiroCliProviderProps {
  /** Model to use (passed to --model flag). Defaults to claude-haiku-4.5 */
  model?: string;
  /** Agent to use (passed to --agent flag) */
  agent?: string;
}

/**
 * IModelProvider implementation that spawns kiro-cli chat.
 */
export class KiroCliProvider implements IModelProvider {
  private readonly model: string;
  private readonly agent?: string;
  private logger?: ILogger;

  constructor(props: KiroCliProviderProps = {}) {
    this.model = props.model ?? 'claude-haiku-4.5';
    this.agent = props.agent;
  }

  configure(app: App): void {
    this.logger = app.logger;
  }

  async invoke(input: InvokeInput): Promise<InvokeOutput> {
    if (!this.logger) {
      throw new Error('KiroCliProvider not configured - must be passed to App');
    }

    this.logger.info('Invoking kiro-cli...');

    const args = ['chat', '--no-interactive', '--model', this.model];
    if (this.agent) {
      args.push('--agent', this.agent);
    }
    args.push(input.prompt);

    const { stdout } = await execFileAsync('kiro-cli', args);
    // Strip ANSI escape codes and leading "> " prefix from output
    // eslint-disable-next-line no-control-regex
    const content = stdout.replace(/\x1B\[[0-9;]*m/g, '').replace(/^> /, '');

    this.logger.info('kiro-cli complete');

    return { content };
  }
}
