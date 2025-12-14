/**
 * 通知服务
 */
import { prisma } from '../infra/database';

const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  review: '审核中',
  blocked: '阻塞',
  done: '已完成',
};

export const notificationService = {
  /**
   * 创建通知
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    taskId?: string;
    projectId?: string;
  }) {
    return prisma.notification.create({
      data,
    });
  },

  /**
   * 批量创建通知（发送给多个用户）
   */
  async createMany(
    userIds: string[],
    data: {
      type: string;
      title: string;
      message: string;
      taskId?: string;
      projectId?: string;
    }
  ) {
    return prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        ...data,
      })),
    });
  },

  /**
   * 获取用户通知列表
   */
  async getByUser(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { userId };
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          task: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  },

  /**
   * 标记为已读
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  /**
   * 标记所有为已读
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  /**
   * 删除通知
   */
  async delete(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  },

  /**
   * 任务分配通知
   */
  async notifyTaskAssigned(task: any, assigneeId: string, assignerName: string) {
    return this.create({
      userId: assigneeId,
      type: 'task_assigned',
      title: '新任务分配',
      message: `${assignerName} 将任务「${task.title}」分配给了你`,
      taskId: task.id,
      projectId: task.projectId,
    });
  },

  /**
   * 任务状态变更通知
   */
  async notifyTaskStatusChanged(
    task: any,
    oldStatus: string,
    newStatus: string,
    changerName: string,
    notifyUserIds: string[]
  ) {
    return this.createMany(notifyUserIds, {
      type: 'task_status_changed',
      title: '任务状态更新',
      message: `${changerName} 将任务「${task.title}」从 ${STATUS_LABELS[oldStatus] || oldStatus} 改为 ${STATUS_LABELS[newStatus] || newStatus}`,
      taskId: task.id,
      projectId: task.projectId,
    });
  },

  /**
   * 任务即将到期通知
   */
  async notifyTaskDueSoon(task: any, daysRemaining: number) {
    if (!task.assigneeId) return;

    return this.create({
      userId: task.assigneeId,
      type: 'task_due_soon',
      title: '任务即将到期',
      message: `任务「${task.title}」将在 ${daysRemaining} 天后到期`,
      taskId: task.id,
      projectId: task.projectId,
    });
  },

  /**
   * 任务逾期通知
   */
  async notifyTaskOverdue(task: any) {
    if (!task.assigneeId) return;

    return this.create({
      userId: task.assigneeId,
      type: 'task_overdue',
      title: '任务已逾期',
      message: `任务「${task.title}」已经逾期，请尽快处理`,
      taskId: task.id,
      projectId: task.projectId,
    });
  },

  /**
   * 报告生成完成通知
   */
  async notifyReportReady(userId: string, reportType: string, workspaceName: string) {
    return this.create({
      userId,
      type: 'report_ready',
      title: `${reportType === 'weekly' ? '周报' : '月报'}已生成`,
      message: `${workspaceName} 的${reportType === 'weekly' ? '周报' : '月报'}已生成，点击查看`,
    });
  },
};

