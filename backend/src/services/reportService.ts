/**
 * 报告服务 - 优化版
 * 支持周报/月报生成，自动汇总日报数据
 */
import { prisma } from '../infra/database';
import { getProvider } from '../ai/aiService';
import { logger } from '../infra/logger';

export const reportService = {
  /**
   * 获取自然周范围（周一到周日）
   */
  getWeekRange(date: Date = new Date()): { startDate: Date; endDate: Date } {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    // 计算周一（如果今天是周日(0)，往前推6天；否则往前推到周一）
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    // 周日是周一+6天
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { startDate: monday, endDate: sunday };
  },

  /**
   * 获取自然月范围
   */
  getMonthRange(date: Date = new Date()): { startDate: Date; endDate: Date } {
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  },

  /**
   * 检查是否已有同期报告
   */
  async checkExistingReport(
    workspaceId: string,
    type: 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const existing = await prisma.report.findFirst({
      where: {
        workspaceId,
        type,
        startDate: { gte: startDate, lte: endDate },
      },
    });
    return !!existing;
  },

  /**
   * 生成周报（自然周：周一~周日，自动汇总日报）
   */
  async generateWeeklyReport(workspaceId: string, userId: string, options?: { forceRegenerate?: boolean }) {
    const { startDate, endDate } = this.getWeekRange();

    // 检查是否已有本周报告
    if (!options?.forceRegenerate) {
      const exists = await this.checkExistingReport(workspaceId, 'weekly', startDate, endDate);
      if (exists) {
        throw new Error('本周周报已生成。如需重新生成，请先删除现有周报。');
      }
    }

    // 获取本周所有日报
    const dailyReports = await prisma.dailyReport.findMany({
      where: {
        workspaceId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { date: 'asc' },
    });

    logger.info(`生成周报: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}, 日报数量: ${dailyReports.length}`);

    return this.generateReport(workspaceId, userId, 'weekly', startDate, endDate, dailyReports);
  },

  /**
   * 生成月报（自然月）
   */
  async generateMonthlyReport(workspaceId: string, userId: string, options?: { forceRegenerate?: boolean }) {
    const { startDate, endDate } = this.getMonthRange();

    // 检查是否已有本月报告
    if (!options?.forceRegenerate) {
      const exists = await this.checkExistingReport(workspaceId, 'monthly', startDate, endDate);
      if (exists) {
        throw new Error('本月月报已生成。如需重新生成，请先删除现有月报。');
      }
    }

    // 获取本月所有日报
    const dailyReports = await prisma.dailyReport.findMany({
      where: {
        workspaceId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { date: 'asc' },
    });

    return this.generateReport(workspaceId, userId, 'monthly', startDate, endDate, dailyReports);
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
                  { completedAt: { gte: startDate, lte: endDate } },
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
        t.status === 'done' && t.completedAt && new Date(t.completedAt) >= startDate
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

      if (projectTasks.length > 0 || created > 0 || completed > 0) {
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
    }

    // 汇总日报内容
    if (dailyReports && dailyReports.length > 0) {
      const dailySummary = {
        reportCount: dailyReports.length,
        totalWorkHours: dailyReports.reduce((sum, r) => sum + (r.workHours || 0), 0),
        avgWorkHoursPerDay: 0,
        memberReports: {} as Record<string, { name: string; avatar: string | null; count: number; hours: number }>,
        completedItems: [] as string[],
        issueItems: [] as string[],
        dailyDetails: [] as { date: string; count: number; hours: number }[],
      };

      // 按日期统计
      const byDate = new Map<string, { count: number; hours: number }>();

      dailyReports.forEach(report => {
        const dateKey = new Date(report.date).toLocaleDateString();
        
        // 按日期统计
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, { count: 0, hours: 0 });
        }
        const dateStats = byDate.get(dateKey)!;
        dateStats.count++;
        dateStats.hours += report.workHours || 0;

        // 按成员统计
        if (!dailySummary.memberReports[report.userId]) {
          dailySummary.memberReports[report.userId] = {
            name: report.user.name,
            avatar: report.user.avatar,
            count: 0,
            hours: 0,
          };
        }
        dailySummary.memberReports[report.userId].count++;
        dailySummary.memberReports[report.userId].hours += report.workHours || 0;

        // 汇总完成内容（去重提取关键词）
        if (report.completed) {
          const items = report.completed.split('\n').filter((item: string) => item.trim());
          items.forEach((item: string) => {
            const cleanItem = item.replace(/^[•\-\*]\s*/, '').trim();
            if (cleanItem && !dailySummary.completedItems.includes(cleanItem)) {
              dailySummary.completedItems.push(`[${report.user.name}] ${cleanItem}`);
            }
          });
        }

        // 汇总问题
        if (report.issues && report.issues.trim()) {
          dailySummary.issueItems.push(`[${report.user.name}] ${report.issues}`);
        }
      });

      // 转换日期统计为数组
      dailySummary.dailyDetails = Array.from(byDate.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 计算平均工时
      if (dailySummary.dailyDetails.length > 0) {
        dailySummary.avgWorkHoursPerDay = dailySummary.totalWorkHours / dailySummary.dailyDetails.length;
      }

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
      summary = this.generateFallbackSummary(type, stats);
    }

    // 格式化标题
    const periodStr = type === 'weekly' 
      ? `第${this.getWeekNumber(startDate)}周`
      : `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`;

    // 保存报告
    const report = await prisma.report.create({
      data: {
        workspaceId,
        type,
        title: `${workspace.name} ${type === 'weekly' ? '周报' : '月报'} - ${periodStr}`,
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
   * 获取周数
   */
  getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },

  /**
   * 生成备用摘要（AI失败时）
   */
  generateFallbackSummary(type: 'weekly' | 'monthly', stats: any): string {
    const period = type === 'weekly' ? '周' : '月';
    const parts = [];
    
    parts.push(`本${period}共完成 ${stats.tasksCompleted} 个任务，创建 ${stats.tasksCreated} 个新任务。`);
    
    if (stats.tasksInProgress > 0) {
      parts.push(`当前有 ${stats.tasksInProgress} 个任务进行中。`);
    }
    
    if (stats.tasksBlocked > 0) {
      parts.push(`存在 ${stats.tasksBlocked} 个阻塞任务需要关注。`);
    }

    if (stats.dailySummary) {
      parts.push(`团队共提交 ${stats.dailySummary.reportCount} 份日报，累计工时 ${stats.dailySummary.totalWorkHours.toFixed(1)} 小时。`);
    }

    return parts.join('');
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
    if (stats.dailySummary) {
      const ds = stats.dailySummary;
      const memberList = Object.values(ds.memberReports)
        .map((m: any) => `${m.name}(${m.count}份/${m.hours.toFixed(1)}h)`)
        .join('、');

      dailySection = `

日报汇总：
- 本${type === 'weekly' ? '周' : '月'}共收到 ${ds.reportCount} 份日报
- 累计工时：${ds.totalWorkHours.toFixed(1)} 小时（日均 ${ds.avgWorkHoursPerDay.toFixed(1)}h）
- 成员贡献：${memberList}
- 主要完成工作：
${ds.completedItems.slice(0, 8).map((item: string) => `  · ${item}`).join('\n')}
${ds.issueItems.length > 0 ? `- 反馈的问题（${ds.issueItems.length}条）：\n${ds.issueItems.slice(0, 3).map((item: string) => `  · ${item}`).join('\n')}` : ''}`;
    }

    const prompt = `你是一个项目管理助手，请根据以下统计数据生成一份简洁专业的${type === 'weekly' ? '周报' : '月报'}摘要。

工作区：${workspaceName}

任务统计：
- 项目总数：${stats.totalProjects}
- 涉及任务：${stats.totalTasks}
- 本期新建：${stats.tasksCreated}
- 本期完成：${stats.tasksCompleted}
- 进行中：${stats.tasksInProgress}
- 阻塞中：${stats.tasksBlocked}

各项目情况：
${stats.projectStats.length > 0 
  ? stats.projectStats.map((p: any) => `- ${p.name}：完成率 ${p.completionRate}%，完成 ${p.completed}/${p.total}，阻塞 ${p.blocked}`).join('\n')
  : '- 暂无活跃项目'}${dailySection}

请以 JSON 格式返回，要求：
1. summary: 2-3句话的整体总结，突出重点成果
2. highlights: 3个左右的亮点（具体成就）
3. concerns: 1-2个需要关注的问题（如有）

{
  "summary": "简洁的整体总结",
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "concerns": ["关注点1"]
}`;

    try {
      const provider = getProvider();
      const result = await provider.analyzeWithPrompt<any>(prompt);
      
      return {
        summary: result.summary || '',
        highlights: Array.isArray(result.highlights) ? result.highlights : [],
        concerns: Array.isArray(result.concerns) ? result.concerns : [],
      };
    } catch (e) {
      logger.error('AI analysis error:', e);
      throw e;
    }
  },

  /**
   * 删除报告
   */
  async deleteReport(reportId: string, userId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('报告不存在');
    }

    // 检查权限（只有生成者或管理员可以删除）
    const membership = await prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: report.workspaceId } },
    });

    const { mapRole } = await import('../repositories/workspaceRepository');
    const mappedRole = membership ? mapRole(membership.role) : null;
    if (!membership || (report.generatedBy !== userId && !['owner', 'director'].includes(mappedRole || ''))) {
      throw new Error('无权删除此报告');
    }

    await prisma.report.delete({ where: { id: reportId } });
    return { success: true };
  },

  /**
   * 获取报告列表
   */
  async getReports(workspaceId: string, type?: string, limit = 20) {
    const where: any = { workspaceId };
    if (type) where.type = type;

    return prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
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
