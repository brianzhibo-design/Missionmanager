/**
 * 报告服务
 */
import { prisma } from '../infra/database';
import { getProvider } from '../ai/aiService';
import { logger } from '../infra/logger';

export const reportService = {
  /**
   * 生成周报（自动汇总日报）
   */
  async generateWeeklyReport(workspaceId: string, userId: string) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // 获取本周所有日报
    const dailyReports = await prisma.dailyReport.findMany({
      where: {
        workspaceId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    return this.generateReport(workspaceId, userId, 'weekly', startDate, endDate, dailyReports);
  },

  /**
   * 生成月报
   */
  async generateMonthlyReport(workspaceId: string, userId: string) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.generateReport(workspaceId, userId, 'monthly', startDate, endDate);
  },

  /**
   * 生成报告（支持汇总日报）
   */
  async generateReport(
    workspaceId: string,
    userId: string,
    type: 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date,
    dailyReports?: any[]
  ) {
    // 获取工作区信息
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        projects: {
          include: {
            tasks: {
              where: {
                OR: [
                  { createdAt: { gte: startDate, lte: endDate } },
                  { updatedAt: { gte: startDate, lte: endDate } },
                ],
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new Error('工作区不存在');
    }

    // 收集统计数据
    const stats: any = {
      totalProjects: workspace.projects.length,
      totalTasks: 0,
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksBlocked: 0,
      tasksByPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      projectStats: [] as any[],
    };

    for (const project of workspace.projects) {
      const projectTasks = project.tasks;
      const created = projectTasks.filter(t => 
        new Date(t.createdAt) >= startDate && new Date(t.createdAt) <= endDate
      ).length;
      const completed = projectTasks.filter(t => 
        t.status === 'done' && new Date(t.updatedAt) >= startDate
      ).length;
      const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
      const blocked = projectTasks.filter(t => t.status === 'blocked').length;

      stats.totalTasks += projectTasks.length;
      stats.tasksCreated += created;
      stats.tasksCompleted += completed;
      stats.tasksInProgress += inProgress;
      stats.tasksBlocked += blocked;

      projectTasks.forEach(t => {
        const priority = t.priority as keyof typeof stats.tasksByPriority;
        if (stats.tasksByPriority[priority] !== undefined) {
          stats.tasksByPriority[priority]++;
        }
      });

      stats.projectStats.push({
        name: project.name,
        total: projectTasks.length,
        created,
        completed,
        inProgress,
        blocked,
        completionRate: projectTasks.length > 0 
          ? Math.round((completed / projectTasks.length) * 100) 
          : 0,
      });
    }

    // 汇总日报内容（用于周报）
    if (dailyReports && dailyReports.length > 0) {
      const dailySummary = {
        reportCount: dailyReports.length,
        totalWorkHours: dailyReports.reduce((sum, r) => sum + (r.workHours || 0), 0),
        memberReports: {} as Record<string, { name: string; count: number; hours: number }>,
        allCompleted: [] as string[],
        allIssues: [] as string[],
      };

      dailyReports.forEach(report => {
        // 按成员统计
        if (!dailySummary.memberReports[report.userId]) {
          dailySummary.memberReports[report.userId] = {
            name: report.user.name,
            count: 0,
            hours: 0,
          };
        }
        dailySummary.memberReports[report.userId].count++;
        dailySummary.memberReports[report.userId].hours += report.workHours || 0;

        // 汇总完成内容
        if (report.completed) {
          dailySummary.allCompleted.push(`[${report.user.name}] ${report.completed.substring(0, 100)}`);
        }
        // 汇总问题
        if (report.issues) {
          dailySummary.allIssues.push(`[${report.user.name}] ${report.issues}`);
        }
      });

      stats.dailySummary = dailySummary;
    }

    // 生成 AI 摘要
    let summary = '';
    let highlights: string[] = [];
    let concerns: string[] = [];

    try {
      const aiResult = await this.generateAISummary(workspace.name, type, stats, dailyReports);
      summary = aiResult.summary;
      highlights = aiResult.highlights;
      concerns = aiResult.concerns;
    } catch (e) {
      logger.error('AI summary generation failed:', e);
      summary = `本${type === 'weekly' ? '周' : '月'}共完成 ${stats.tasksCompleted} 个任务，创建 ${stats.tasksCreated} 个新任务。`;
    }

    // 保存报告
    const report = await prisma.report.create({
      data: {
        workspaceId,
        type,
        title: `${workspace.name} ${type === 'weekly' ? '周报' : '月报'} - ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`,
        startDate,
        endDate,
        content: stats,
        summary,
        highlights,
        concerns,
        generatedBy: userId,
      },
    });

    return report;
  },

  /**
   * AI 生成摘要（支持日报汇总）
   */
  async generateAISummary(
    workspaceName: string,
    type: 'weekly' | 'monthly',
    stats: any,
    dailyReports?: any[]
  ) {
    let dailySection = '';
    if (dailyReports && dailyReports.length > 0 && stats.dailySummary) {
      const ds = stats.dailySummary;
      dailySection = `

日报汇总：
- 本周共收到 ${ds.reportCount} 份日报
- 累计工时：${ds.totalWorkHours.toFixed(1)} 小时
- 成员提交情况：${Object.values(ds.memberReports).map((m: any) => `${m.name}(${m.count}份)`).join('、')}
- 主要完成工作：${ds.allCompleted.slice(0, 5).join('；')}
${ds.allIssues.length > 0 ? `- 反馈的问题：${ds.allIssues.slice(0, 3).join('；')}` : ''}`;
    }

    const prompt = `你是一个项目管理助手，请根据以下统计数据生成一份简洁的${type === 'weekly' ? '周报' : '月报'}摘要。

工作区：${workspaceName}

统计数据：
- 项目总数：${stats.totalProjects}
- 任务总数：${stats.totalTasks}
- 本期新建任务：${stats.tasksCreated}
- 本期完成任务：${stats.tasksCompleted}
- 进行中任务：${stats.tasksInProgress}
- 阻塞任务：${stats.tasksBlocked}

各项目情况：
${stats.projectStats.map((p: any) => `- ${p.name}：完成率 ${p.completionRate}%，完成 ${p.completed} 个，阻塞 ${p.blocked} 个`).join('\n')}${dailySection}

请以 JSON 格式返回，包含以下字段：
{
  "summary": "简洁的整体总结，2-3句话",
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "concerns": ["关注点1", "关注点2"]
}`;

    try {
      const provider = getProvider();
      const result = await provider.analyzeWithPrompt<any>(prompt);
      
      return {
        summary: result.summary || '',
        highlights: result.highlights || [],
        concerns: result.concerns || [],
      };
    } catch (e) {
      logger.error('AI analysis error:', e);
      return {
        summary: `本${type === 'weekly' ? '周' : '月'}完成 ${stats.tasksCompleted} 个任务。`,
        highlights: [],
        concerns: [],
      };
    }
  },

  /**
   * 获取报告列表
   */
  async getReports(workspaceId: string, type?: string) {
    const where: any = { workspaceId };
    if (type) where.type = type;

    return prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  },

  /**
   * 获取报告详情
   */
  async getReport(reportId: string) {
    return prisma.report.findUnique({
      where: { id: reportId },
      include: {
        workspace: true,
      },
    });
  },
};

