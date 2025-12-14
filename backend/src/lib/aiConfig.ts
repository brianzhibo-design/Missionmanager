export interface AIConfig {
  enabled: boolean;
  provider: 'anthropic' | 'openai' | 'mock';
  model: string;
  timeout: number;
  maxRetries: number;
  rateLimit: {
    maxConcurrent: number;
    maxPerMinute: number;
    maxPerDayPerUser: number;
  };
}

export const aiConfig: AIConfig = {
  enabled: process.env.AI_ENABLED !== 'false',
  provider: (process.env.AI_PROVIDER as AIConfig['provider']) || 'anthropic',
  model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
  timeout: parseInt(process.env.AI_TIMEOUT || '60000'),
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2'),
  rateLimit: {
    maxConcurrent: parseInt(process.env.AI_MAX_CONCURRENT || '5'),
    maxPerMinute: parseInt(process.env.AI_MAX_PER_MINUTE || '20'),
    maxPerDayPerUser: parseInt(process.env.AI_MAX_PER_DAY_USER || '100'),
  },
};

export function isAIEnabled(): boolean {
  return aiConfig.enabled && !!process.env.ANTHROPIC_API_KEY;
}
