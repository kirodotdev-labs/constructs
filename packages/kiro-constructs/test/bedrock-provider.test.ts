import { describe, it, expect } from 'vitest';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockProvider } from '../src/index.js';

describe('BedrockProvider', () => {
  it('constructs with defaults', () => {
    const provider = new BedrockProvider();
    expect(provider).toBeDefined();
  });

  it('accepts region and modelId options', () => {
    const provider = new BedrockProvider({
      region: 'us-west-2',
      modelId: 'anthropic.claude-3-sonnet',
    });
    expect(provider).toBeDefined();
  });

  it('accepts pre-configured client', () => {
    const client = new BedrockRuntimeClient({ region: 'eu-west-1' });
    const provider = new BedrockProvider({ client });
    expect(provider).toBeDefined();
  });

  it('accepts maxTokens option', () => {
    const provider = new BedrockProvider({ maxTokens: 8192 });
    expect(provider).toBeDefined();
  });
});
