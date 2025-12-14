/**
 * 健康检查控制器
 * 提供 Kubernetes 兼容的健康检查端点
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const startTime = Date.now();

interface HealthCheck {
  status: 'up' | 'down';
  latency?: number;
  message?: string;
}

// 基础健康检查
router.get('/', async (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// 存活检查（Kubernetes liveness probe）
router.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

// 就绪检查（Kubernetes readiness probe）
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, HealthCheck> = {};
  let isReady = true;

  // 检查数据库
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'up',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'down',
      message: (error as Error).message,
    };
    isReady = false;
  }

  // 检查 Redis（如果配置了）
  if (process.env.REDIS_URL) {
    try {
      // 这里可以添加 Redis 检查
      checks.redis = { status: 'up', latency: 0 };
    } catch (error) {
      checks.redis = {
        status: 'down',
        message: (error as Error).message,
      };
      // Redis 不可用不影响整体就绪状态
    }
  }

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// 详细健康信息（内部使用）
router.get('/details', async (_req: Request, res: Response) => {
  const memUsage = process.memoryUsage();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodejs: process.version,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
    },
    cpu: process.cpuUsage(),
  });
});

export default router;
export { router as healthRouter };


