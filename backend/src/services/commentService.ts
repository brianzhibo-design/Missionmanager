/**
 * 评论服务
 * 处理任务评论的创建、查询和@提及通知
 */
import { prisma } from '../infra/database';
import { notificationService } from './notificationService';

export interface CreateCommentInput {
  taskId: string;
  userId: string;
  content: string;
  mentionedUserIds?: string[];
}

export interface CommentWithUser {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  mentions: {
    mentionedUser: {
      id: string;
      name: string;
    };
  }[];
}

export const commentService = {
  /**
   * 创建评论
   */
  async create(input: CreateCommentInput): Promise<CommentWithUser> {
    const { taskId, userId, content, mentionedUserIds = [] } = input;

    // 验证任务存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        assignee: true,
      },
    });

    if (!task) {
      throw new Error('TASK_NOT_FOUND');
    }

    // 创建评论和提及
    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId,
        userId,
        mentions: {
          create: mentionedUserIds.map((mentionedUserId) => ({
            mentionedUserId,
          })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // 创建任务事件
    await prisma.taskEvent.create({
      data: {
        type: 'commented',
        taskId,
        userId,
        data: {
          commentId: comment.id,
          content: content.substring(0, 100), // 只保存前100个字符
        },
      },
    });

    // 发送通知给被@的用户
    const commenterName = comment.user.name;
    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId !== userId) {
        await notificationService.create({
          userId: mentionedUserId,
          type: 'mention',
          title: '有人在评论中提到了你',
          message: `${commenterName} 在任务「${task.title}」中提到了你`,
          taskId,
          projectId: task.projectId,
        });
      }
    }

    // 如果任务有负责人且不是评论者，也发送通知
    if (task.assigneeId && task.assigneeId !== userId && !mentionedUserIds.includes(task.assigneeId)) {
      await notificationService.create({
        userId: task.assigneeId,
        type: 'task_comment',
        title: '你负责的任务有新评论',
        message: `${commenterName} 在任务「${task.title}」中发表了评论`,
        taskId,
        projectId: task.projectId,
      });
    }

    return comment;
  },

  /**
   * 获取任务的所有评论
   */
  async getByTaskId(taskId: string): Promise<CommentWithUser[]> {
    return prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * 删除评论
   */
  async delete(commentId: string, userId: string): Promise<void> {
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('COMMENT_NOT_FOUND');
    }

    if (comment.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    await prisma.taskComment.delete({
      where: { id: commentId },
    });
  },

  /**
   * 更新评论
   */
  async update(commentId: string, userId: string, content: string): Promise<CommentWithUser> {
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('COMMENT_NOT_FOUND');
    }

    if (comment.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    return prisma.taskComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },
};

