/**
 * Rate Limiting 中间件
 * 防止 API 滥用和暴力攻击
 */
import rateLimit from 'express-rate-limit';

/**
 * 通用 API 限制
 * 每个 IP 每 15 分钟最多 1000 次请求（放宽限制）
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 1000, // 每个 IP 最多 1000 次请求
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
    },
  },
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false, // 禁用 X-RateLimit-* headers
  skip: (req) => {
    // 健康检查端点和 token 刷新跳过限制
    return req.path === '/health' || 
           req.path === '/api/health' ||
           req.path === '/auth/refresh' ||
           req.path === '/api/auth/refresh';
  },
});

/**
 * 登录/注册限制
 * 每个 IP 每 15 分钟最多 30 次尝试
 * 防止暴力破解密码，但允许正常使用
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 30, // 每个 IP 最多 30 次尝试
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: '登录尝试过多，请 15 分钟后再试',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功的请求不计入限制
});

/**
 * AI API 限制
 * AI 功能消耗资源较多，需要更严格的限制
 * 每个 IP 每分钟最多 10 次请求
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 10, // 每个 IP 最多 10 次请求
  message: {
    success: false,
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI 请求过于频繁，请稍后再试',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 上传文件限制
 * 每个 IP 每小时最多 50 次上传
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 50, // 每个 IP 最多 50 次上传
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: '上传次数过多，请稍后再试',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 发送邮件/通知限制
 * 每个 IP 每小时最多 20 次
 */
export const notificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 20, // 每个 IP 最多 20 次
  message: {
    success: false,
    error: {
      code: 'NOTIFICATION_RATE_LIMIT_EXCEEDED',
      message: '发送次数过多，请稍后再试',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});





