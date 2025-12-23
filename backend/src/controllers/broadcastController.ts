/**
 * 群发消息控制器
 * 处理工作区群发消息相关的 HTTP 请求
 */
import { Router, Request, Response } from 'express';
import { broadcastService } from '../services/broadcastService';
import { coffeeService } from '../services/coffeeService';
import { schedulerService } from '../services/schedulerService';
import { requireAuth } from '../middleware/authMiddleware';
import { prisma } from '../infra/database';

const router = Router();

// 所有路由都需要认证
router.use(requireAuth);

/**
 * 检查用户是否是工作区创始人
 */
async function isWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
  const membership = await prisma.workspaceUser.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });
  return membership?.role === 'owner';
}

/**
 * 检查用户是否有咖啡抽奖权限
 * owner 和 director 默认有权限，或者用户有 COFFEE_LOTTERY 自定义权限
 */
async function hasCoffeeLotteryPermission(userId: string, workspaceId: string): Promise<boolean> {
  const membership = await prisma.workspaceUser.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });
  
  if (!membership) return false;
  
  // owner 和 director 默认有权限
  if (['owner', 'director', 'admin'].includes(membership.role)) return true;
  
  // 检查自定义权限
  const permissions = membership.permissions as string[] || [];
  return permissions.includes('COFFEE_LOTTERY');
}

/**
 * 发送群发消息
 * POST /broadcast/workspaces/:workspaceId/send
 */
router.post('/workspaces/:workspaceId/send', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { title, content, recipientIds, sendEmail } = req.body;
    const senderId = req.user!.userId;

    if (!title || !content || !recipientIds || recipientIds.length === 0) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '请填写标题、内容，并选择至少一位接收者',
      });
    }

    const result = await broadcastService.send({
      workspaceId,
      senderId,
      title,
      content,
      recipientIds,
      sendEmail: sendEmail || false,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('发送群发消息失败:', error);
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'FORBIDDEN', message: '无权限发送群发消息' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '发送失败' });
  }
});

/**
 * 获取群发消息历史
 * GET /broadcast/workspaces/:workspaceId/history
 */
router.get('/workspaces/:workspaceId/history', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await broadcastService.getHistory(workspaceId, { limit, offset });
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('获取群发消息历史失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取失败' });
  }
});

/**
 * 获取今日咖啡获奖者（需要 COFFEE_LOTTERY 权限）
 * GET /broadcast/workspaces/:workspaceId/coffee-winner
 */
router.get('/workspaces/:workspaceId/coffee-winner', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;

    // 检查咖啡抽奖权限
    if (!(await hasCoffeeLotteryPermission(userId, workspaceId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '无咖啡抽奖权限' });
    }

    const winner = await coffeeService.getTodayWinner(workspaceId);
    res.json({ success: true, data: { winner } });
  } catch (error: any) {
    console.error('获取咖啡获奖者失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取失败' });
  }
});

/**
 * 手动执行咖啡抽奖（需要 COFFEE_LOTTERY 权限）
 * POST /broadcast/workspaces/:workspaceId/draw-coffee
 */
router.post('/workspaces/:workspaceId/draw-coffee', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;

    // 检查咖啡抽奖权限
    if (!(await hasCoffeeLotteryPermission(userId, workspaceId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '无咖啡抽奖权限' });
    }

    const result = await coffeeService.drawLottery(workspaceId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('咖啡抽奖失败:', error);
    if (error.message === 'NO_MEMBERS') {
      return res.status(400).json({ error: 'NO_MEMBERS', message: '工作区没有成员' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '抽奖失败' });
  }
});

/**
 * 获取咖啡抽奖历史（需要 COFFEE_LOTTERY 权限）
 * GET /broadcast/workspaces/:workspaceId/coffee-history
 */
router.get('/workspaces/:workspaceId/coffee-history', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;

    // 检查咖啡抽奖权限
    if (!(await hasCoffeeLotteryPermission(userId, workspaceId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '无咖啡抽奖权限' });
    }

    const limit = parseInt(req.query.limit as string) || 30;
    const history = await coffeeService.getHistory(workspaceId, { limit });
    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('获取咖啡历史失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取失败' });
  }
});

/**
 * 手动触发每日提醒（仅供测试）
 * POST /broadcast/trigger-daily-reminder
 */
router.post('/trigger-daily-reminder', async (req: Request, res: Response) => {
  try {
    await schedulerService.triggerDailyReminders();
    res.json({ success: true, message: '已触发每日提醒' });
  } catch (error: any) {
    console.error('触发每日提醒失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '触发失败' });
  }
});

export default router;

