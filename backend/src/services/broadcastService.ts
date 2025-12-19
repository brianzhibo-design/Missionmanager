/**
 * 群发消息服务
 * 处理工作区群发消息功能
 */
import { prisma } from '../infra/database';
import { notificationService } from './notificationService';
import { emailService } from '../lib/emailService';

export interface SendBroadcastInput {
  workspaceId: string;
  senderId: string;
  title: string;
  content: string;
  recipientIds: string[];
  sendEmail: boolean;
}

export const broadcastService = {
  /**
   * 发送群发消息
   */
  async send(input: SendBroadcastInput): Promise<{
    messageId: string;
    recipientCount: number;
  }> {
    const { workspaceId, senderId, title, content, recipientIds, sendEmail } = input;

    // 验证发送者权限（必须是 owner 或 director）
    const senderMembership = await prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId: senderId,
          workspaceId,
        },
      },
    });

    if (!senderMembership) {
      throw new Error('FORBIDDEN');
    }
    const { mapRole } = await import('../repositories/workspaceRepository');
    const mappedRole = mapRole(senderMembership.role);
    if (!['owner', 'admin'].includes(mappedRole)) {
      throw new Error('FORBIDDEN');
    }

    // 获取发送者和工作区信息
    const [sender, workspace] = await Promise.all([
      prisma.user.findUnique({ where: { id: senderId }, select: { name: true } }),
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
    ]);

    if (!sender || !workspace) {
      throw new Error('NOT_FOUND');
    }

    // 创建消息记录
    const message = await prisma.broadcastMessage.create({
      data: {
        workspaceId,
        senderId,
        title,
        content,
        sendEmail,
        recipients: {
          create: recipientIds.map((recipientId) => ({
            recipientId,
          })),
        },
      },
    });

    // 创建通知
    await notificationService.createBatch(
      recipientIds,
      'broadcast',
      title,
      content,
      { sendEmail: false } // 邮件单独处理
    );

    // 如果需要发送邮件
    if (sendEmail) {
      const recipients = await prisma.user.findMany({
        where: { id: { in: recipientIds } },
        select: { email: true, name: true },
      });

      for (const recipient of recipients) {
        if (recipient.email) {
          try {
            await emailService.sendBroadcastEmail(
              recipient.email,
              recipient.name,
              sender.name,
              title,
              content,
              workspace.name
            );
          } catch (error) {
            console.error(`发送邮件给 ${recipient.email} 失败:`, error);
          }
        }
      }
    }

    return {
      messageId: message.id,
      recipientCount: recipientIds.length,
    };
  },

  /**
   * 获取工作区的群发消息历史
   */
  async getHistory(workspaceId: string, options: { limit?: number; offset?: number } = {}) {
    const { limit = 20, offset = 0 } = options;

    const [messages, total] = await Promise.all([
      prisma.broadcastMessage.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
          _count: {
            select: { recipients: true },
          },
        },
      }),
      prisma.broadcastMessage.count({ where: { workspaceId } }),
    ]);

    return { messages, total };
  },
};

