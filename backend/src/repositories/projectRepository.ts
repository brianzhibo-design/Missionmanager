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
    leaderId?: string;
  }): Promise<Project> {
    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        workspaceId: data.workspaceId,
        leaderId: data.leaderId,
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
   * 查找工作区下的所有项目（带任务统计和团队信息）
   */
  async findByWorkspaceId(workspaceId: string) {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          select: { status: true },
        },
        leader: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
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
   * 查找成员参与的项目（作为负责人或团队成员）
   */
  async findByWorkspaceIdForMember(workspaceId: string, userId: string) {
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        OR: [
          { leaderId: userId }, // 是项目负责人
          { members: { some: { userId } } }, // 是团队成员
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          select: { status: true },
        },
        leader: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
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
    data: { name?: string; description?: string; status?: string; leaderId?: string | null }
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
        leader: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
    return project;
  },

  /**
   * 查找项目成员
   */
  async findProjectMember(projectId: string, userId: string) {
    return prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  },

  /**
   * 获取项目所有成员
   */
  async findProjectMembers(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * 添加项目成员
   */
  async addProjectMember(projectId: string, userId: string, role: string = 'member') {
    return prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  },

  /**
   * 移除项目成员
   */
  async removeProjectMember(projectId: string, userId: string) {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  },

  /**
   * 获取项目详情（包含负责人和团队成员）
   */
  async findByIdWithTeam(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        leader: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { tasks: true } },
      },
    });
  },
};

