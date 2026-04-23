import {
  BedrockRuntimeClient,
  ConverseCommand,
  ThrottlingException,
} from '@aws-sdk/client-bedrock-runtime';
import pRetry from 'p-retry';
import type { App } from '../app.js';
import type { IModelProvider, InvokeInput, InvokeOutput } from '../model-provider.js';
import type { ILogger } from '../logger.js';

export interface BedrockProviderProps {
  /** AWS region. Defaults to us-east-1 */
  region?: string;
  /** Model ID. Defaults to Claude 3.5 Haiku */
  modelId?: string;
  /** Max tokens for response. Defaults to 4096 */
  maxTokens?: number;
  /** Pre-configured client for custom credential scenarios */
  client?: BedrockRuntimeClient;
  /** Max retry attempts for throttling errors. Defaults to 5 */
  maxRetries?: number;
}

export class BedrockProvider implements IModelProvider {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly maxTokens: number;
  private readonly maxRetries: number;
  private logger?: ILogger;

  constructor(props: BedrockProviderProps = {}) {
    this.modelId = props.modelId ?? 'anthropic.claude-3-5-haiku-20241022-v1:0';
    this.maxTokens = props.maxTokens ?? 4096;
    this.maxRetries = props.maxRetries ?? 5;
    this.client = props.client ?? new BedrockRuntimeClient({ region: props.region ?? 'us-east-1' });
  }

  configure(app: App): void {
    this.logger = app.logger;
  }

  private get log(): ILogger {
    if (!this.logger) {
      throw new Error('BedrockProvider not configured - must be passed to App');
    }
    return this.logger;
  }

  async invoke(input: InvokeInput): Promise<InvokeOutput> {
    this.log.info(
      `Invoking Bedrock (model=${this.modelId}, promptLength=${input.prompt.length})...`,
    );

    const response = await pRetry(
      () =>
        this.client.send(
          new ConverseCommand({
            modelId: this.modelId,
            messages: [{ role: 'user', content: [{ text: input.prompt }] }],
            inferenceConfig: { maxTokens: this.maxTokens },
          }),
        ),
      {
        retries: this.maxRetries,
        shouldRetry: (err) => err instanceof ThrottlingException,
        onFailedAttempt: (err) =>
          this.log.info(
            `Throttled, retrying (attempt ${err.attemptNumber}/${err.retriesLeft + err.attemptNumber})...`,
          ),
      },
    );

    const content = response.output?.message?.content?.[0]?.text;
    if (!content) {
      throw new Error(`Bedrock returned empty response: ${JSON.stringify(response)}`);
    }
    this.log.info(`Bedrock complete (responseLength=${content.length})`);

    return { content };
  }
}
