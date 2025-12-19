import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './infra/config';
import { testDatabaseConnection, disconnectDatabase } from './infra/database';
import { logger } from './infra/logger';
import { log } from './lib/logger';
import { initSocketService } from './lib/socketService';
import { metricsMiddleware, metricsEndpoint } from './lib/metrics';
import { requestLogger } from './middleware/requestLogger';
import { healthRouter } from './controllers/healthController';
import { authRouter } from './controllers/authController';
import { workspaceRouter } from './controllers/workspaceController';
import { projectRouter } from './controllers/projectController';
import { taskRouter } from './controllers/taskController';
import { aiRouter } from './controllers/aiController';
import { adminRouter } from './controllers/adminController';
import { treeRouter } from './controllers/treeController';
import { treeAnalysisRouter } from './controllers/treeAnalysisController';
import { memberRouter } from './controllers/memberController';
import notificationRouter from './controllers/notificationController';
import { reportRouter } from './controllers/reportController';
import commentRouter from './controllers/commentController';
import broadcastRouter from './controllers/broadcastController';
import dailyReportRouter from './controllers/dailyReportController';
import uploadRouter from './controllers/uploadController';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startScheduler } from './lib/scheduler';
import { verifyEmailConnection } from './lib/emailService';

const app = express();

// 基础中间件
app.use(cors());
app.use(express.json());

// 请求日志和指标中间件（在路由之前）
app.use(requestLogger);
app.use(metricsMiddleware);

// 监控端点
app.get('/metrics', metricsEndpoint);

// 路由
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/workspaces', workspaceRouter);
app.use('/projects', projectRouter);
app.use('/tasks', taskRouter);
app.use('/ai', aiRouter);
app.use('/admin', adminRouter);
app.use('/tree', treeRouter);
app.use('/tree-analysis', treeAnalysisRouter);
app.use('/members', memberRouter);
app.use('/notifications', notificationRouter);
app.use('/reports', reportRouter);
app.use('/comments', commentRouter);
app.use('/broadcast', broadcastRouter);
app.use('/daily-reports', dailyReportRouter);
app.use('/upload', uploadRouter);

// 测试错误处理的路由（开发用）
if (config.isDev) {
  app.get('/test-error', () => {
    throw new Error('测试错误');
  });
}

// 404 处理
app.use(notFoundHandler);

// 全局错误处理（必须放在最后）
app.use(errorHandler);

// 启动函数
async function bootstrap() {
  try {
    // 1. 验证数据库连接
    logger.info('正在连接数据库...');
    await testDatabaseConnection();
    logger.info('数据库连接成功');

    // 2. 验证邮件服务连接
    logger.info('正在验证邮件服务...');
    const emailOk = await verifyEmailConnection();
    if (emailOk) {
      logger.info('✅ 邮件服务就绪');
    } else {
      logger.warn('⚠️ 邮件服务不可用，邮件通知功能将被禁用');
    }

    // 3. 创建 HTTP 服务器并集成 WebSocket
    const port = config.port;
    const httpServer = createServer(app);
    
    // 初始化 WebSocket 服务
    initSocketService(httpServer);
    
    httpServer.listen(port, () => {
      log.info(`🚀 Server started`, {
        port,
        environment: config.nodeEnv,
        nodeVersion: process.version,
      });
      log.info(`📊 Metrics available at http://localhost:${port}/metrics`);
      log.info(`❤️ Health check at http://localhost:${port}/health`);
      log.info(`🔌 WebSocket available at ws://localhost:${port}/socket.io`);
      logger.info(`环境: ${config.nodeEnv}`);
      
      // 4. 启动定时任务调度器
      startScheduler();
    });

  } catch (error) {
    logger.error('启动失败', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，正在关闭...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，正在关闭...');
  await disconnectDatabase();
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('未处理的 Promise 拒绝', { reason });
  process.exit(1);
});

bootstrap();
