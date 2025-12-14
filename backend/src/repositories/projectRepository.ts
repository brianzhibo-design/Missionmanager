/**
 * 项目数据访问层
 */
import { prisma } from '../infra/database';
import { Project } from '@prisma/client';

export const projectRepository = {
  /**
   * 创建项目
   */
  async create(data: {
    name: string;
    description?: string;
    workspaceId: string;
  }): Promise<Project> {
    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        workspaceId: data.workspaceId,
      },
    });
  },

  /**
   * 根据 ID 查找项目
   */
  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({ where: { id } });
  },

  /**
   * 查找工作区下的所有项目（带任务统计）
   */
  async findByWorkspaceId(workspaceId: string) {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          select: { status: true },
        },
      },
    });
    
    // 计算每个项目的任务统计
    return projects.map(project => {
      const tasks = project.tasks;
      const taskStats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        done: tasks.filter(t => t.status === 'done').length,
      };
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tasks: _, ...projectWithoutTasks } = project;
      return {
        ...projectWithoutTasks,
        taskStats,
      };
    });
  },

  /**
   * 更新项目
   */
  async update(
    id: string,
    data: { name?: string; description?: string; status?: string }
  ): Promise<Project> {
    return prisma.project.update({ where: { id }, data });
  },

  /**
   * 删除项目
   */
  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  },

  /**
   * 带统计信息的项目查询
   */
  async findByIdWithStats(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true } },
      },
    });
    return project;
  },
};

