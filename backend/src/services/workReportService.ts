/**
 * 工作日报服务
 * 处理日报/周报/月报的创建、查询和统计
 */
import { prisma } from '../infra/database';

export type ReportType = 'daily' | 'weekly' | 'monthly';
export type Mood = 'happy' | 'normal' | 'tired' | 'stressed';
export type Workload = 'light' | 'normal' | 'heavy' | 'overload';

export interface CreateWorkReportInput {
  userId: string;
  workspaceId: string;
  type: ReportType;
  reportDate: Date;
  projectId?: string;
  todayWork?: string;
  tomorrowPlan?: string;
  issues?: string;
  needSupport?: string;
  summary?: string;
  mood?: Mood;
  workload?: Workload;
  totalHours?: number;
}

export interface UpdateWorkReportInput {
  todayWork?: string;
  tomorrowPlan?: string;
  issues?: string;
  needSupport?: string;
  summary?: string;
  mood?: Mood;
  workload?: Workload;
  totalHours?: number;
}

export interface WorkReportWithUser {
  id: string;
  type: string;
  reportDate: Date;
  todayWork: string | null;
  tomorrowPlan: string | null;
  issues: string | null;
  needSupport: string | null;
  summary: string | null;
  completedCount: number;
  inProgressCount: number;
  totalHours: number | null;
  mood: string | null;
  workload: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  completedTasks?: any[];
  inProgressTasks?: any[];
}

export const workReportService = {
  /**
   * 创建或更新日报
   */
  async createOrUpdate(input: CreateWorkReportInput): Promise<WorkReportWithUser> {
    const {
      userId,
      workspaceId,
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
    } = input;

    // 标准化日期（只保留日期部分）
    const normalizedDate = new Date(reportDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // 获取日期范围（用于统计任务）
    const { startDate, endDate } = getDateRange(type, normalizedDate);

    // 统计已完成和进行中的任务
    const completedTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        project: { workspaceId },
        ...(projectId ? { projectId } : {}),
        status: 'done',
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { id: true, title: true, completedAt: true },
    });

    const inProgressTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        project: { workspaceId },
        ...(projectId ? { projectId } : {}),
        status: 'in_progress',
      },
      select: { id: true, title: true, dueDate: true },
    });

    // 创建或更新日报
    const report = await prisma.workReport.upsert({
      where: {
        userId_workspaceId_type_reportDate: {
          userId,
          workspaceId,
          type,
          reportDate: normalizedDate,
        },
      },
      create: {
        userId,
        workspaceId,
        type,
        reportDate: normalizedDate,
        projectId,
        todayWork,
        tomorrowPlan,
        issues,
        needSupport,
        summary,
        mood,
        workload,
        totalHours,
        completedTaskIds: completedTasks.map(t => t.id),
        inProgressTaskIds: inProgressTasks.map(t => t.id),
        completedCount: completedTasks.length,
        inProgressCount: inProgressTasks.length,
      },
      update: {
        todayWork,
        tomorrowPlan,
        issues,
        needSupport,
        summary,
        mood,
        workload,
        totalHours,
        completedTaskIds: completedTasks.map(t => t.id),
        inProgressTaskIds: inProgressTasks.map(t => t.id),
        completedCount: completedTasks.length,
        inProgressCount: inProgressTasks.length,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return {
      ...report,
      completedTasks,
      inProgressTasks,
    };
  },

  /**
   * 获取用户的日报列表
   */
  async getMyReports(
    userId: string,
    workspaceId: string,
    options: {
      type?: ReportType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: WorkReportWithUser[]; total: number }> {
    const { type, startDate, endDate, limit = 20, offset = 0 } = options;

    const where: any = {
      userId,
      workspaceId,
    };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) where.reportDate.gte = startDate;
      if (endDate) where.reportDate.lte = endDate;
    }

    const [reports, total] = await Promise.all([
      prisma.workReport.findMany({
        where,
        orderBy: { reportDate: 'desc' },
        skip: offset,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      prisma.workReport.count({ where }),
    ]);

    return { reports, total };
  },

  /**
   * 获取项目成员的日报（项目负责人/管理者使用）
   */
  async getTeamReports(
    viewerId: string,
    workspaceId: string,
    options: {
      projectId?: string;
      type?: ReportType;
      reportDate?: Date;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: WorkReportWithUser[]; total: number; canView: boolean }> {
    const { projectId, type, reportDate, startDate, endDate, limit = 50, offset = 0 } = options;

    // 检查查看者权限
    const viewerMembership = await prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: { userId: viewerId, workspaceId },
      },
    });

    if (!viewerMembership) {
      return { reports: [], total: 0, canView: false };
    }

    // 获取可以查看的成员列表
    let memberIds: string[] = [];

    if (['owner', 'director'].includes(viewerMembership.role)) {
      // 管理员可以看所有人
      const members = await prisma.workspaceUser.findMany({
        where: { workspaceId },
        select: { userId: true },
      });
      memberIds = members.map(m => m.userId);
    } else if (projectId) {
      // 检查是否是项目负责人
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            select: { userId: true, managerId: true },
          },
        },
      });

      if (project) {
        if (project.leaderId === viewerId) {
          // 项目负责人可以看所有项目成员
          memberIds = project.members.map(m => m.userId);
        } else {
          // 检查是否是成员的管理者
          const managedMembers = project.members.filter(m => m.managerId === viewerId);
          memberIds = managedMembers.map(m => m.userId);
        }
      }
    } else {
      // 获取所有管理的项目成员
      const managedMembers = await prisma.projectMember.findMany({
        where: {
          project: { workspaceId },
          managerId: viewerId,
        },
        select: { userId: true },
      });

      // 获取负责的项目的所有成员
      const leadingProjects = await prisma.project.findMany({
        where: {
          workspaceId,
          leaderId: viewerId,
        },
        include: {
          members: { select: { userId: true } },
        },
      });

      const leadingMemberIds = leadingProjects.flatMap(p => p.members.map(m => m.userId));
      memberIds = [...new Set([...managedMembers.map(m => m.userId), ...leadingMemberIds])];
    }

    if (memberIds.length === 0) {
      return { reports: [], total: 0, canView: true };
    }

    // 构建查询条件
    const where: any = {
      userId: { in: memberIds },
      workspaceId,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (type) {
      where.type = type;
    }

    if (reportDate) {
      const normalizedDate = new Date(reportDate);
      normalizedDate.setHours(0, 0, 0, 0);
      where.reportDate = normalizedDate;
    } else if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) where.reportDate.gte = startDate;
      if (endDate) where.reportDate.lte = endDate;
    }

    const [reports, total] = await Promise.all([
      prisma.workReport.findMany({
        where,
        orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      prisma.workReport.count({ where }),
    ]);

    return { reports, total, canView: true };
  },

  /**
   * 获取单个日报详情
   */
  async getById(reportId: string, userId: string): Promise<WorkReportWithUser | null> {
    const report = await prisma.workReport.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    if (!report) return null;

    // 获取关联的任务详情
    const completedTaskIds = (report.completedTaskIds as string[]) || [];
    const inProgressTaskIds = (report.inProgressTaskIds as string[]) || [];

    const [completedTasks, inProgressTasks] = await Promise.all([
      prisma.task.findMany({
        where: { id: { in: completedTaskIds } },
        select: { id: true, title: true, completedAt: true, project: { select: { name: true } } },
      }),
      prisma.task.findMany({
        where: { id: { in: inProgressTaskIds } },
        select: { id: true, title: true, dueDate: true, project: { select: { name: true } } },
      }),
    ]);

    return {
      ...report,
      completedTasks,
      inProgressTasks,
    };
  },

  /**
   * 删除日报
   */
  async delete(reportId: string, userId: string): Promise<void> {
    const report = await prisma.workReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('REPORT_NOT_FOUND');
    }

    if (report.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    await prisma.workReport.delete({
      where: { id: reportId },
    });
  },

  /**
   * 获取团队日报统计
   */
  async getTeamStats(
    viewerId: string,
    workspaceId: string,
    options: {
      type: ReportType;
      reportDate: Date;
      projectId?: string;
    }
  ): Promise<{
    totalMembers: number;
    submittedCount: number;
    notSubmittedMembers: { id: string; name: string; avatar: string | null }[];
  }> {
    const { type, reportDate, projectId } = options;

    // 标准化日期
    const normalizedDate = new Date(reportDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // 获取可查看的成员
    let memberIds: string[] = [];

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: { select: { userId: true } } },
      });
      if (project) {
        memberIds = project.members.map(m => m.userId);
      }
    } else {
      const members = await prisma.workspaceUser.findMany({
        where: { workspaceId },
        select: { userId: true },
      });
      memberIds = members.map(m => m.userId);
    }

    // 获取已提交的日报
    const submittedReports = await prisma.workReport.findMany({
      where: {
        userId: { in: memberIds },
        workspaceId,
        type,
        reportDate: normalizedDate,
        ...(projectId ? { projectId } : {}),
      },
      select: { userId: true },
    });

    const submittedUserIds = new Set(submittedReports.map(r => r.userId));
    const notSubmittedUserIds = memberIds.filter(id => !submittedUserIds.has(id));

    // 获取未提交成员信息
    const notSubmittedMembers = await prisma.user.findMany({
      where: { id: { in: notSubmittedUserIds } },
      select: { id: true, name: true, avatar: true },
    });

    return {
      totalMembers: memberIds.length,
      submittedCount: submittedReports.length,
      notSubmittedMembers,
    };
  },

  /**
   * 检查今日是否已提交日报
   */
  async checkTodaySubmitted(
    userId: string,
    workspaceId: string,
    type: ReportType = 'daily'
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const report = await prisma.workReport.findUnique({
      where: {
        userId_workspaceId_type_reportDate: {
          userId,
          workspaceId,
          type,
          reportDate: today,
        },
      },
    });

    return !!report;
  },
};

/**
 * 根据报告类型获取日期范围
 */
function getDateRange(type: ReportType, date: Date): { startDate: Date; endDate: Date } {
  const startDate = new Date(date);
  const endDate = new Date(date);

  if (type === 'daily') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (type === 'weekly') {
    // 获取本周一和本周日
    const day = startDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startDate.setDate(startDate.getDate() + diffToMonday);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (type === 'monthly') {
    // 获取本月第一天和最后一天
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setMonth(endDate.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

