/**
 * Prometheus 指标服务
 * 收集和导出应用性能指标
 */
import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// 创建注册表
const register = new client.Registry();

// 添加默认指标（CPU、内存等）
client.collectDefaultMetrics({ register });

// ==================== 自定义指标 ====================

// HTTP 请求总数
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// HTTP 请求持续时间
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// 当前活跃请求数
const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

// 数据库查询持续时间
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// AI 分析持续时间
const aiAnalysisDuration = new client.Histogram({
  name: 'ai_analysis_duration_seconds',
  help: 'Duration of AI analysis operations in seconds',
  labelNames: ['type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// AI 分析总数
const aiAnalysisTotal = new client.Counter({
  name: 'ai_analysis_total',
  help: 'Total number of AI analysis operations',
  labelNames: ['type', 'status'],
  registers: [register],
});

// 任务统计
const tasksTotal = new client.Gauge({
  name: 'tasks_total',
  help: 'Total number of tasks by status',
  labelNames: ['status'],
  registers: [register],
});

// 活跃用户数
const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of active users in the last 24 hours',
  registers: [register],
});

// ==================== 中间件 ====================

// 指标中间件
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // 跳过 /metrics 和 /health 端点
  if (req.path === '/metrics' || req.path.startsWith('/health')) {
    return next();
  }

  const start = Date.now();
  httpRequestsInFlight.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const path = normalizePath(req.route?.path || req.path);

    httpRequestsTotal.inc({
      method: req.method,
      path,
      status: res.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        path,
        status: res.statusCode,
      },
      duration
    );

    httpRequestsInFlight.dec();
  });

  next();
}

// 路径规范化（避免高基数）
function normalizePath(path: string): string {
  // 替换 UUID
  path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  // 替换数字 ID
  path = path.replace(/\/\d+/g, '/:id');
  return path;
}

// 指标端点处理器
export async function metricsEndpoint(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

// ==================== 辅助函数 ====================

export const metrics = {
  recordDbQuery: (operation: string, table: string, duration: number) => {
    dbQueryDuration.observe({ operation, table }, duration / 1000);
  },

  recordAiAnalysis: (type: string, duration: number, success: boolean) => {
    aiAnalysisDuration.observe({ type }, duration / 1000);
    aiAnalysisTotal.inc({ type, status: success ? 'success' : 'error' });
  },

  updateTaskStats: async (prisma: any) => {
    const stats = await prisma.task.groupBy({
      by: ['status'],
      _count: true,
    });
    stats.forEach((stat: any) => {
      tasksTotal.set({ status: stat.status }, stat._count);
    });
  },

  updateActiveUsers: (count: number) => {
    activeUsers.set(count);
  },
};

