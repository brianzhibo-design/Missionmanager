/**
 * 任务数据访问层
 */
import { prisma } from '../infra/database';
import { Task } from '@prisma/client';

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId: string;
  creatorId: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  parentId?: string;
  dueDate?: Date;
  order?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
}

/**
 * 规范化状态值（统一转为小写）
 * 兼容大写、小写、混合大小写输入
 */
function normalizeStatus(status?: string): string {
  if (!status) return 'todo';
  const normalized = status.toLowerCase();
  // 验证是否是有效状态
  const validStatuses = ['todo', 'in_progress', 'review', 'done', 'blocked'];
  return validStatuses.includes(normalized) ? normalized : 'todo';
}

/**
 * 规范化优先级值（统一转为小写）
 * 兼容大写、小写、混合大小写输入
 */
function normalizePriority(priority?: string): string {
  if (!priority) return 'medium';
  const normalized = priority.toLowerCase();
  // 验证是否是有效优先级
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  return validPriorities.includes(normalized) ? normalized : 'medium';
}

export const taskRepository = {
  /**
   * 创建任务
   * 自动规范化 status 和 priority 为小写
   */
  async create(data: CreateTaskInput): Promise<Task> {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        creatorId: data.creatorId,
        status: normalizeStatus(data.status),
        priority: normalizePriority(data.priority),
        assigneeId: data.assigneeId,
        parentId: data.parentId,
        dueDate: data.dueDate,
      },
    });
  },

  /**
   * 根据 ID 查找任务
   */
  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({ where: { id } });
  },

  /**
   * 查找任务详情（含关联信息）
   */
  async findByIdWithDetails(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, workspaceId: true, leaderId: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        parent: { select: { id: true, title: true } },
        subTasks: {
          select: { id: true, title: true, status: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  /**
   * 查找项目下的所有任务
   * 自动规范化 status 过滤条件为小写
   */
  async findByProjectId(projectId: string, options?: { status?: string; assigneeId?: string }) {
    return prisma.task.findMany({
      where: {
        projectId,
        parentId: null, // 只查顶级任务
        ...(options?.status && { status: normalizeStatus(options.status) }),
        ...(options?.assigneeId && { assigneeId: options.assigneeId }),
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { subTasks: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  },

  /**
   * 更新任务
   * 自动规范化 status 和 priority 为小写
   */
  async update(id: string, data: UpdateTaskInput): Promise<Task> {
    // 规范化 status 和 priority
    const normalizedData = { ...data };
    if (data.status !== undefined) {
      normalizedData.status = normalizeStatus(data.status);
    }
    if (data.priority !== undefined) {
      normalizedData.priority = normalizePriority(data.priority);
    }
    
    return prisma.task.update({
      where: { id },
      data: normalizedData,
    });
  },

  /**
   * 删除任务
   */
  async delete(id: string): Promise<void> {
    await prisma.task.delete({ where: { id } });
  },

  /**
   * 获取项目任务统计
   */
  async getProjectStats(projectId: string) {
    const stats = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { status: true },
    });

    const result: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      blocked: 0,
      done: 0,
    };

    stats.forEach((s) => {
      result[s.status] = s._count.status;
    });

    return result;
  },
};

