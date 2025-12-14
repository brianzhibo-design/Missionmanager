import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必要的环境变量: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  // 应用
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  
  // 数据库
  databaseUrl: requireEnv('DATABASE_URL'),
  
  // Redis
  redisUrl: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
  
  // JWT
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '7d'),
  
  // AI
  aiProvider: optionalEnv('AI_PROVIDER', 'mock') as 'mock' | 'deepseek' | 'openai' | 'anthropic',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  
  // 辅助方法
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};
