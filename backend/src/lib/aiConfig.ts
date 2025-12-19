export interface AIConfig {
  enabled: boolean;
  provider: 'anthropic';
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
  provider: 'anthropic',
  model: process.env.AI_MODEL || 'claude-3-5-haiku-20241022',
  timeout: parseInt(process.env.AI_TIMEOUT || '60000'),
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2'),
  rateLimit: {
    maxConcurrent: parseInt(process.env.AI_MAX_CONCURRENT || '5'),
    maxPerMinute: parseInt(process.env.AI_MAX_PER_MINUTE || '20'),
    maxPerDayPerUser: parseInt(process.env.AI_MAX_PER_DAY_USER || '100'),
  },
};

export function isAIEnabled(): boolean {
  if (!aiConfig.enabled) return false;
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getActiveApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || '';
}

// 诊断函数：检查 AI 配置状态
export function getAIStatus(): {
  enabled: boolean;
  hasApiKey: boolean;
  provider: string;
  model: string;
  reason?: string;
} {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const enabled = aiConfig.enabled && hasApiKey;
  
  let reason: string | undefined;
  if (!aiConfig.enabled) {
    reason = 'AI_ENABLED 设置为 false';
  } else if (!hasApiKey) {
    reason = '未配置 ANTHROPIC_API_KEY';
  }
  
  return {
    enabled,
    hasApiKey,
    provider: aiConfig.provider,
    model: aiConfig.model,
    reason,
  };
}
