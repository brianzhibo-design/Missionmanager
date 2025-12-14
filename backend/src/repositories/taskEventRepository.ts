/**
 * 任务事件数据访问层
 */
import { prisma } from '../infra/database';
import { TaskEvent, Prisma } from '@prisma/client';

export interface TaskEventData {
  description: string;
  oldValue?: string;
  newValue?: string;
  [key: string]: unknown;
}

export interface CreateTaskEventInput {
  taskId: string;
  userId: string;
  type: string;
  data: TaskEventData;
}

export const taskEventRepository = {
  /**
   * 创建事件
   */
  async create(input: CreateTaskEventInput): Promise<TaskEvent> {
    return prisma.taskEvent.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        type: input.type,
        data: input.data as Prisma.InputJsonValue,
      },
    });
  },

  /**
   * 获取任务的事件历史
   */
  async findByTaskId(taskId: string, limit: number = 20) {
    return prisma.taskEvent.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

