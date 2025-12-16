/**
 * 工作日报控制器
 * 处理日报/周报/月报相关的 HTTP 请求
 */
import { Router, Request, Response } from 'express';
import { workReportService, ReportType } from '../services/workReportService';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(requireAuth);

/**
 * 创建或更新日报
 * POST /work-reports/workspaces/:workspaceId
 */
router.post('/workspaces/:workspaceId', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;
    const {
      type,
      reportDate,
      projectId,
      todayWork,
      tomorrowPlan,
      issues,
      needSupport,
      summary,
      mood,
      workload,
      totalHours,
    } = req.body;

    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '无效的报告类型',
      });
    }

    if (!reportDate) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '请选择日期',
      });
    }

    const report = await workReportService.createOrUpdate({
      userId,
      workspaceId,
      type: type as ReportType,
      reportDate: new Date(reportDate),
      projectId,
      todayWork,
      tomorrowPlan,
      issues,
      needSupport,
      summary,
      mood,
      workload,
      totalHours,
    });

    res.status(201).json({ success: true, data: report });
  } catch (error: any) {
    console.error('创建日报失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '创建日报失败' });
  }
});

/**
 * 获取我的日报列表
 * GET /work-reports/workspaces/:workspaceId/my
 */
router.get('/workspaces/:workspaceId/my', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;
    const { type, startDate, endDate, limit, offset } = req.query;

    const result = await workReportService.getMyReports(userId, workspaceId, {
      type: type as ReportType | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('获取日报列表失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取日报列表失败' });
  }
});

/**
 * 获取团队日报（负责人查看）
 * GET /work-reports/workspaces/:workspaceId/team
 */
router.get('/workspaces/:workspaceId/team', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;
    const { projectId, type, reportDate, startDate, endDate, limit, offset } = req.query;

    const result = await workReportService.getTeamReports(userId, workspaceId, {
      projectId: projectId as string | undefined,
      type: type as ReportType | undefined,
      reportDate: reportDate ? new Date(reportDate as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('获取团队日报失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取团队日报失败' });
  }
});

/**
 * 获取团队日报统计
 * GET /work-reports/workspaces/:workspaceId/team/stats
 */
router.get('/workspaces/:workspaceId/team/stats', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;
    const { type, reportDate, projectId } = req.query;

    if (!type || !reportDate) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '请提供报告类型和日期',
      });
    }

    const stats = await workReportService.getTeamStats(userId, workspaceId, {
      type: type as ReportType,
      reportDate: new Date(reportDate as string),
      projectId: projectId as string | undefined,
    });

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('获取团队统计失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取团队统计失败' });
  }
});

/**
 * 获取日报详情
 * GET /work-reports/:reportId
 */
router.get('/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = req.user!.userId;

    const report = await workReportService.getById(reportId, userId);

    if (!report) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: '日报不存在',
      });
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('获取日报详情失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取日报详情失败' });
  }
});

/**
 * 删除日报
 * DELETE /work-reports/:reportId
 */
router.delete('/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = req.user!.userId;

    await workReportService.delete(reportId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('删除日报失败:', error);
    if (error.message === 'REPORT_NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: '日报不存在' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'FORBIDDEN', message: '无权限删除此日报' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '删除日报失败' });
  }
});

/**
 * 检查今日是否已提交
 * GET /work-reports/workspaces/:workspaceId/check-today
 */
router.get('/workspaces/:workspaceId/check-today', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;
    const { type } = req.query;

    const submitted = await workReportService.checkTodaySubmitted(
      userId,
      workspaceId,
      (type as ReportType) || 'daily'
    );

    res.json({ success: true, data: { submitted } });
  } catch (error: any) {
    console.error('检查日报状态失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '检查日报状态失败' });
  }
});

export default router;

