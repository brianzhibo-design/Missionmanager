/**
 * 日报服务（极简版）
 * 处理日报的创建、查询和AI自动填充
 */
import { prisma } from '../infra/database';
import { aiService } from './aiService';

export interface CreateDailyReportInput {
  userId: string;
  workspaceId: string;
  date: Date;
  completed: string;
  planned: string;
  issues?: string;
  workHours?: number;
}

export interface DailyReportWithUser {
  id: string;
  date: Date;
  completed: string;
  planned: string;
  issues: string | null;
  workHours: number | null;
  taskStats: any;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export const dailyReportService = {
  /**
   * 创建或更新日报
   * 注意：observer 不能创建日报
   */
  async createOrUpdate(input: CreateDailyReportInput): Promise<DailyReportWithUser> {
    const { userId, workspaceId, date, completed, planned, issues, workHours } = input;

    // 检查用户角色，observer 不能创建日报
    const { mapRole } = await import('../repositories/workspaceRepository');
    const membership = await prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    
    if (!membership) {
      throw new Error('NOT_WORKSPACE_MEMBER');
    }
    
    const userRole = mapRole(membership.role);
    if (userRole === 'observer') {
      throw new Error('OBSERVER_CANNOT_CREATE_REPORT');
    }

    // 标准化日期
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // 获取今日任务统计
    const taskStats = await this.getTaskStats(userId, workspaceId, normalizedDate);

    const report = await prisma.dailyReport.upsert({
      where: {
        userId_workspaceId_date: {
          userId,
          workspaceId,
          date: normalizedDate,
        },
      },
      create: {
        userId,
        workspaceId,
        date: normalizedDate,
        completed,
        planned,
        issues,
        workHours,
        taskStats,
      },
      update: {
        completed,
        planned,
        issues,
        workHours,
        taskStats,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return report;
  },

  /**
   * 获取用户的日报列表
   */
  async getMyReports(
    userId: string,
    workspaceId: string,
    options: { startDate?: Date; endDate?: Date; limit?: number } = {}
  ): Promise<DailyReportWithUser[]> {
    const { startDate, endDate, limit = 30 } = options;

    const where: any = { userId, workspaceId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  },

  /**
   * 获取团队日报（管理者用）
   */
  async getTeamReports(
    viewerId: string,
    workspaceId: string,
    date: Date
  ): Promise<{ reports: DailyReportWithUser[]; notSubmitted: { id: string; name: string; avatar: string | null }[] }> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // 检查权限
    const viewerMembership = await prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId: viewerId, workspaceId } },
    });

    const { mapRole } = await import('../repositories/workspaceRepository');
    const mappedRole = viewerMembership ? mapRole(viewerMembership.role) : null;
    if (!viewerMembership || !['owner', 'director', 'manager'].includes(mappedRole || '')) {
      return { reports: [], notSubmitted: [] };
    }

    // 获取所有成员
    const members = await prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    // 获取已提交的日报
    const reports = await prisma.dailyReport.findMany({
      where: { workspaceId, date: normalizedDate },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 找出未提交的成员
    const submittedUserIds = new Set(reports.map(r => r.userId));
    const notSubmitted = members
      .filter(m => !submittedUserIds.has(m.userId))
      .map(m => m.user);

    return { reports, notSubmitted };
  },

  /**
   * 获取单个日报
   */
  async getById(reportId: string): Promise<DailyReportWithUser | null> {
    return prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  },

  /**
   * 获取今日日报（检查是否已提交）
   */
  async getTodayReport(userId: string, workspaceId: string): Promise<DailyReportWithUser | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.dailyReport.findUnique({
      where: {
        userId_workspaceId_date: { userId, workspaceId, date: today },
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  },

  /**
   * 删除日报
   */
  async delete(reportId: string, userId: string): Promise<void> {
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new Error('REPORT_NOT_FOUND');
    if (report.userId !== userId) throw new Error('FORBIDDEN');

    await prisma.dailyReport.delete({ where: { id: reportId } });
  },

  /**
   * AI 自动填充日报内容
   */
  async aiAutoFill(userId: string, workspaceId: string, date?: Date): Promise<{
    completed: string;
    planned: string;
    issues: string;
    taskStats: any;
  }> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    // 获取今日任务变更
    const taskStats = await this.getTaskStats(userId, workspaceId, targetDate);
    
    // 获取今日完成的任务
    const completedTasks = taskStats.completed || [];
    // 获取进行中的任务
    const inProgressTasks = taskStats.inProgress || [];
    
    // 获取明天到期的任务
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const upcomingTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        project: { workspaceId },
        status: { in: ['todo', 'in_progress'] },
        dueDate: { lte: tomorrowEnd },
      },
      select: { id: true, title: true, priority: true },
      orderBy: { priority: 'desc' },
      take: 5,
    });

    // 构建日报内容
    let completed = '';
    let planned = '';
    let issues = '';

    if (completedTasks.length > 0) {
      completed = completedTasks.map((t: any) => `• ${t.title}`).join('\n');
    } else if (inProgressTasks.length > 0) {
      completed = `正在进行：\n${inProgressTasks.slice(0, 3).map((t: any) => `• ${t.title}`).join('\n')}`;
    } else {
      completed = '• 今日无任务更新';
    }

    if (upcomingTasks.length > 0) {
      planned = upcomingTasks.map(t => `• ${t.title}`).join('\n');
    } else if (inProgressTasks.length > 0) {
      planned = `继续进行：\n${inProgressTasks.slice(0, 3).map((t: any) => `• ${t.title}`).join('\n')}`;
    } else {
      planned = '• 待安排';
    }

    // 检查是否有逾期任务
    const overdueTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        project: { workspaceId },
        status: { in: ['todo', 'in_progress'] },
        dueDate: { lt: targetDate },
      },
      select: { title: true },
      take: 3,
    });

    if (overdueTasks.length > 0) {
      issues = `存在 ${overdueTasks.length} 个逾期任务：\n${overdueTasks.map(t => `• ${t.title}`).join('\n')}`;
    }

    return { completed, planned, issues, taskStats };
  },

  /**
   * 获取日期范围内的日报（用于周报汇总）
   */
  async getReportsInRange(
    userId: string,
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyReportWithUser[]> {
    return prisma.dailyReport.findMany({
      where: {
        userId,
        workspaceId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  },

  /**
   * 获取任务统计
   */
  async getTaskStats(userId: string, workspaceId: string, date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // 今日完成的任务
    const completed = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        project: { workspaceId },
        status: 'done',
        completedAt: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true, title: true, completedAt: true },
    });

    // 进行中的任务
    const inProgress = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        project: { workspaceId },
        status: 'in_progress',
      },
      select: { id: true, title: true, dueDate: true },
    });

    return {
      completed,
      inProgress,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
    };
  },
};

