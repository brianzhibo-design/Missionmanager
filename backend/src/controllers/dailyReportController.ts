/**
 * 日报控制器（极简版）
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { dailyReportService } from '../services/dailyReportService';
import { prisma } from '../infra/database';

const router = Router();

// 所有路由需要认证
router.use(requireAuth);

/**
 * POST /daily-reports - 创建/更新日报
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, date, completed, planned, issues, workHours } = req.body;

    if (!workspaceId || !date || !completed || !planned) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: '工作区ID、日期、今日完成和明日计划为必填项',
      });
    }

    const report = await dailyReportService.createOrUpdate({
      userId,
      workspaceId,
      date: new Date(date),
      completed,
      planned,
      issues,
      workHours,
    });

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('创建日报失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '创建日报失败' });
  }
});

/**
 * GET /daily-reports/my - 获取我的日报列表
 */
router.get('/my', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, startDate, endDate, limit } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '工作区ID为必填项' });
    }

    const reports = await dailyReportService.getMyReports(
      userId,
      workspaceId as string,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      }
    );

    res.json({ success: true, data: reports });
  } catch (error: any) {
    console.error('获取日报列表失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取日报列表失败' });
  }
});

/**
 * GET /daily-reports/today - 获取今日日报
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '工作区ID为必填项' });
    }

    const report = await dailyReportService.getTodayReport(userId, workspaceId as string);

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('获取今日日报失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取今日日报失败' });
  }
});

/**
 * GET /daily-reports/by-date - 获取指定日期的日报
 */
router.get('/by-date', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, date } = req.query;

    if (!workspaceId || !date) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '工作区ID和日期为必填项' });
    }

    const targetDate = new Date(date as string);
    targetDate.setHours(0, 0, 0, 0);

    const report = await prisma.dailyReport.findUnique({
      where: {
        userId_workspaceId_date: {
          userId,
          workspaceId: workspaceId as string,
          date: targetDate,
        },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('获取日报失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取日报失败' });
  }
});

/**
 * GET /daily-reports/team - 获取团队日报
 */
router.get('/team', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, date } = req.query;

    if (!workspaceId || !date) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '工作区ID和日期为必填项' });
    }

    const result = await dailyReportService.getTeamReports(
      userId,
      workspaceId as string,
      new Date(date as string)
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('获取团队日报失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取团队日报失败' });
  }
});

/**
 * GET /daily-reports/ai-fill - AI自动填充日报
 */
router.get('/ai-fill', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, date } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '工作区ID为必填项' });
    }

    const content = await dailyReportService.aiAutoFill(
      userId,
      workspaceId as string,
      date ? new Date(date as string) : undefined
    );

    res.json({ success: true, data: content });
  } catch (error: any) {
    console.error('AI填充失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'AI填充失败' });
  }
});

/**
 * GET /daily-reports/:id - 获取单个日报
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await dailyReportService.getById(id);

    if (!report) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '日报不存在' });
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('获取日报失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取日报失败' });
  }
});

/**
 * DELETE /daily-reports/:id - 删除日报
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await dailyReportService.delete(id, userId);
    res.json({ success: true, message: '日报已删除' });
  } catch (error: any) {
    console.error('删除日报失败:', error);
    if (error.message === 'REPORT_NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: '日报不存在' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'FORBIDDEN', message: '无权删除此日报' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '删除日报失败' });
  }
});

export default router;

