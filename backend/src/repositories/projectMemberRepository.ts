/**
 * 项目成员数据访问层
 */
import { prisma } from '../infra/database';
import { ProjectMember } from '@prisma/client';

export interface CreateProjectMemberInput {
  projectId: string;
  userId: string;
  isLeader?: boolean;
  managerId?: string;
}

export interface UpdateProjectMemberInput {
  isLeader?: boolean;
  managerId?: string | null;
}

export const projectMemberRepository = {
  // 创建或更新项目成员
  async upsert(data: CreateProjectMemberInput): Promise<ProjectMember> {
    return prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: data.projectId,
          userId: data.userId,
        },
      },
      create: {
        projectId: data.projectId,
        userId: data.userId,
        isLeader: data.isLeader || false,
        managerId: data.managerId,
      },
      update: {
        isLeader: data.isLeader,
        managerId: data.managerId,
      },
    });
  },

  // 查找项目成员
  async findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMember | null> {
    return prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  },

  // 获取项目所有成员
  async findByProjectId(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ isLeader: 'desc' }, { createdAt: 'asc' }],
    });
  },

  // 获取用户的直属下属（在某项目中）
  async findSubordinates(projectId: string, managerId: string) {
    return prisma.projectMember.findMany({
      where: { projectId, managerId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // 获取用户在项目中的所有下属（递归）
  async findAllSubordinates(projectId: string, managerId: string): Promise<string[]> {
    const result: string[] = [];
    const queue = [managerId];

    while (queue.length > 0) {
      const currentManagerId = queue.shift()!;
      const subordinates = await prisma.projectMember.findMany({
        where: { projectId, managerId: currentManagerId },
        select: { userId: true },
      });

      for (const sub of subordinates) {
        if (!result.includes(sub.userId)) {
          result.push(sub.userId);
          queue.push(sub.userId);
        }
      }
    }

    return result;
  },

  // 更新项目成员
  async update(projectId: string, userId: string, data: UpdateProjectMemberInput): Promise<ProjectMember> {
    return prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data,
    });
  },

  // 删除项目成员
  async delete(projectId: string, userId: string): Promise<void> {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  },

  // 批量设置汇报关系
  async setManager(projectId: string, userIds: string[], managerId: string | null): Promise<number> {
    const result = await prisma.projectMember.updateMany({
      where: {
        projectId,
        userId: { in: userIds },
      },
      data: { managerId },
    });
    return result.count;
  },
};

