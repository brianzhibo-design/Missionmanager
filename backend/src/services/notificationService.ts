/**
 * 通知服务
 * 处理系统通知的创建、查询和管理
 */
import { prisma } from '../infra/database';
import { emailService } from '../lib/emailService';
import { pushNotificationToUser, pushNotificationToUsers } from '../lib/socketService';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  sendEmail?: boolean;
}

export interface NotificationWithRelations {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  task?: {
    id: string;
    title: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

export const notificationService = {
  /**
   * 创建通知
   */
  async create(input: CreateNotificationInput): Promise<NotificationWithRelations> {
    const { userId, type, title, message, taskId, projectId, sendEmail = false } = input;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        taskId,
        projectId,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 通过 WebSocket 实时推送通知
    try {
      pushNotificationToUser(userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        taskId: notification.task?.id,
        projectId: notification.project?.id,
        createdAt: notification.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('WebSocket 推送失败:', error);
    }

    // 如果需要发送邮件通知
    if (sendEmail) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        try {
          await emailService.sendNotificationEmail(user.email, user.name, title, message);
        } catch (error) {
          console.error('发送通知邮件失败:', error);
        }
      }
    }

    return notification;
  },

  /**
   * 获取用户的通知列表
   */
  async getByUserId(
    userId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  ): Promise<{ notifications: NotificationWithRelations[]; total: number; unreadCount: number }> {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  },

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  },

  /**
   * 删除通知
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  },

  /**
   * 清空所有已读通知
   */
  async clearRead(userId: string): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });

    return result.count;
  },

  /**
   * 批量创建通知（用于群发消息）
   */
  async createBatch(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    options: { taskId?: string; projectId?: string; sendEmail?: boolean } = {}
  ): Promise<number> {
    const { taskId, projectId, sendEmail = false } = options;

    // 批量创建通知
    const result = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        taskId,
        projectId,
      })),
    });

    // 通过 WebSocket 实时推送通知给所有用户
    try {
      const now = new Date().toISOString();
      pushNotificationToUsers(userIds, {
        id: `batch-${Date.now()}`,
        type,
        title,
        message,
        taskId,
        projectId,
        createdAt: now,
      });
    } catch (error) {
      console.error('批量 WebSocket 推送失败:', error);
    }

    // 如果需要发送邮件
    if (sendEmail) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { email: true, name: true },
      });

      for (const user of users) {
        if (user.email) {
          try {
            await emailService.sendNotificationEmail(user.email, user.name, title, message);
          } catch (error) {
            console.error(`发送邮件给 ${user.email} 失败:`, error);
          }
        }
      }
    }

    return result.count;
  },
};
