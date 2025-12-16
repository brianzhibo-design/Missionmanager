/**
 * 报告控制器
 */
import { Router, Request, Response, NextFunction } from 'express';
import { reportService } from '../services/reportService';
import { notificationService } from '../services/notificationService';
import { requireAuth } from '../middleware/authMiddleware';
import { generateReportPDF } from '../lib/pdfService';
import { generateReportExcel } from '../lib/excelService';
import { getReportEmailTemplate } from '../lib/emailTemplates';
import { 
  sendReportEmail, 
  sendTaskReminders, 
  sendDailySummaries 
} from '../services/notificationEmailService';

export const reportRouter = Router();

reportRouter.use(requireAuth);

// POST /reports/workspaces/:workspaceId/weekly - 生成周报
reportRouter.post(
  '/workspaces/:workspaceId/weekly',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.userId;

      const report = await reportService.generateWeeklyReport(workspaceId, userId);

      // 通知用户
      await notificationService.create({
        userId,
        type: 'report_ready',
        title: '周报生成完成',
        message: `${report.title} 已生成完成，点击查看详情`,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /reports/workspaces/:workspaceId/monthly - 生成月报
reportRouter.post(
  '/workspaces/:workspaceId/monthly',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.userId;

      const report = await reportService.generateMonthlyReport(workspaceId, userId);

      await notificationService.create({
        userId,
        type: 'report_ready',
        title: '月报生成完成',
        message: `${report.title} 已生成完成，点击查看详情`,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /reports/workspaces/:workspaceId - 获取报告列表
reportRouter.get(
  '/workspaces/:workspaceId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const { type } = req.query;

      const reports = await reportService.getReports(workspaceId, type as string);

      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /reports/:id - 获取报告详情
reportRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const report = await reportService.getReport(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: { message: '报告不存在' },
        });
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /reports/:id/export/pdf - 导出 PDF
reportRouter.get(
  '/:id/export/pdf',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const report = await reportService.getReport(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: { message: '报告不存在' },
        });
      }

      // 提取报告内容
      const content = report.content as any || {};
      
      const reportData = {
        id: report.id,
        type: report.type as 'weekly' | 'monthly',
        title: report.title,
        period: {
          start: new Date(report.startDate).toLocaleDateString('zh-CN'),
          end: new Date(report.endDate).toLocaleDateString('zh-CN'),
        },
        workspace: {
          name: report.workspace?.name || '未知工作区',
        },
        data: {
          summary: {
            totalProjects: content.totalProjects || 0,
            totalTasks: content.totalTasks || 0,
            completedTasks: content.tasksCompleted || 0,
            newTasks: content.tasksCreated || 0,
            blockedTasks: content.tasksBlocked || 0,
            overdueCount: content.overdueCount || 0,
          },
          projectBreakdown: (content.projectStats || []).map((p: any) => ({
            projectName: p.name || '未知项目',
            totalTasks: p.total || 0,
            completedTasks: p.completed || 0,
            completionRate: p.completionRate || 0,
          })),
          aiInsights: report.highlights as string[] || [],
        },
        createdAt: report.createdAt.toISOString(),
      };

      const pdfBuffer = await generateReportPDF(reportData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(reportData.title)}-${reportData.period.start}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Export PDF error:', error);
      next(error);
    }
  }
);

// GET /reports/:id/export/excel - 导出 Excel
reportRouter.get(
  '/:id/export/excel',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const report = await reportService.getReport(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: { message: '报告不存在' },
        });
      }

      // 提取报告内容
      const content = report.content as any || {};

      const reportData = {
        id: report.id,
        type: report.type as 'weekly' | 'monthly',
        title: report.title,
        period: {
          start: new Date(report.startDate).toLocaleDateString('zh-CN'),
          end: new Date(report.endDate).toLocaleDateString('zh-CN'),
        },
        workspace: {
          name: report.workspace?.name || '未知工作区',
        },
        data: {
          summary: {
            totalProjects: content.totalProjects || 0,
            totalTasks: content.totalTasks || 0,
            completedTasks: content.tasksCompleted || 0,
            newTasks: content.tasksCreated || 0,
            blockedTasks: content.tasksBlocked || 0,
            overdueCount: content.overdueCount || 0,
          },
          projectBreakdown: (content.projectStats || []).map((p: any) => ({
            projectName: p.name || '未知项目',
            totalTasks: p.total || 0,
            completedTasks: p.completed || 0,
            completionRate: p.completionRate || 0,
          })),
        },
        createdAt: report.createdAt.toISOString(),
      };

      const excelBuffer = await generateReportExcel(reportData);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(reportData.title)}-${reportData.period.start}.xlsx"`
      );
      res.send(excelBuffer);
    } catch (error) {
      console.error('Export Excel error:', error);
      next(error);
    }
  }
);

// POST /reports/:id/send-email - 发送报告邮件
reportRouter.post(
  '/:id/send-email',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { email, recipientName } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { message: '请提供收件人邮箱' },
        });
      }

      await sendReportEmail(id, email, recipientName);

      res.json({
        success: true,
        data: { message: `报告已发送到 ${email}` },
      });
    } catch (error) {
      console.error('Send email error:', error);
      next(error);
    }
  }
);

// POST /reports/trigger/task-reminders - 手动触发任务提醒（测试用）
reportRouter.post(
  '/trigger/task-reminders',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await sendTaskReminders();
      res.json({
        success: true,
        data: { message: '任务提醒已发送' },
      });
    } catch (error) {
      console.error('Trigger task reminders error:', error);
      next(error);
    }
  }
);

// POST /reports/trigger/daily-summary - 手动触发每日摘要（测试用）
reportRouter.post(
  '/trigger/daily-summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await sendDailySummaries();
      res.json({
        success: true,
        data: { message: '每日摘要已发送' },
      });
    } catch (error) {
      console.error('Trigger daily summary error:', error);
      next(error);
    }
  }
);

// 移除未使用的导入
void getReportEmailTemplate;
