/**
 * 工作区数据访问层
 */
import { prisma } from '../infra/database';
import { Workspace, WorkspaceUser } from '@prisma/client';

// 工作区角色类型（简化后的角色体系）
// owner: 扛把子 - 老板，最终负责
// director: 大管家 - 管理层，统筹全局
// leader: 带头大哥 - 团队负责人
// member: 少侠 - 执行者
// guest: 吃瓜群侠 - 观察者
export type WorkspaceRole = 'owner' | 'director' | 'leader' | 'member' | 'guest';

// 角色权限层级（数字越小权限越高）
export const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 0,
  director: 1,
  leader: 2,
  member: 3,
  guest: 4,
};

// 角色映射（向后兼容旧角色代码）
export const ROLE_MAPPING: Record<string, WorkspaceRole> = {
  // 旧角色 -> 新角色
  admin: 'director',    // 旧 admin 映射到 director
  manager: 'leader',
  observer: 'guest',
  // 新角色保持不变
  owner: 'owner',
  director: 'director',
  leader: 'leader',
  member: 'member',
  guest: 'guest',
};

// 映射角色代码（用于兼容旧数据）
export function mapRole(role: string): WorkspaceRole {
  return ROLE_MAPPING[role] || (role as WorkspaceRole);
}

// 检查角色是否有足够权限（角色层级 <= 要求层级）
// 支持旧角色代码自动映射
export function hasRolePermission(userRole: string, requiredRole: WorkspaceRole): boolean {
  const mappedUserRole = mapRole(userRole);
  const userLevel = ROLE_HIERARCHY[mappedUserRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  if (userLevel === undefined || requiredLevel === undefined) return false;
  return userLevel <= requiredLevel;
}

// 检查角色是否在允许的角色列表中（支持旧角色代码自动映射）
export function isRoleInList(userRole: string, allowedRoles: WorkspaceRole[]): boolean {
  const mappedUserRole = mapRole(userRole);
  return allowedRoles.includes(mappedUserRole);
}

export const workspaceRepository = {
  /**
   * 创建工作区
   */
  async create(data: { name: string; description?: string }): Promise<Workspace> {
    return prisma.workspace.create({ data });
  },

  /**
   * 根据 ID 查找工作区
   */
  async findById(id: string): Promise<Workspace | null> {
    return prisma.workspace.findUnique({ where: { id } });
  },

  /**
   * 查找用户所属的所有工作区
   */
  async findByUserId(userId: string): Promise<(Workspace & { role: string })[]> {
    const memberships = await prisma.workspaceUser.findMany({
      where: { userId },
      include: { workspace: true },
    });
    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  },

  /**
   * 更新工作区
   */
  async update(id: string, data: { name?: string; description?: string }): Promise<Workspace> {
    return prisma.workspace.update({ where: { id }, data });
  },

  /**
   * 删除工作区
   */
  async delete(id: string): Promise<void> {
    await prisma.workspace.delete({ where: { id } });
  },

  /**
   * 添加成员
   */
  async addMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceUser> {
    return prisma.workspaceUser.create({
      data: { workspaceId, userId, role },
    });
  },

  /**
   * 获取成员关系
   */
  async getMembership(workspaceId: string, userId: string): Promise<WorkspaceUser | null> {
    return prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { workspaceId, userId } },
    });
  },

  /**
   * 获取工作区所有成员
   */
  async getMembers(workspaceId: string) {
    return prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true, avatar: true } } },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });
  },

  /**
   * 添加成员并返回用户信息
   */
  async addMemberWithUser(workspaceId: string, userId: string, role: string) {
    return prisma.workspaceUser.create({
      data: { workspaceId, userId, role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  /**
   * 更新成员角色并返回用户信息
   */
  async updateMemberRoleWithUser(workspaceId: string, userId: string, role: string) {
    return prisma.workspaceUser.update({
      where: { userId_workspaceId: { workspaceId, userId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  /**
   * 更新成员角色
   */
  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceUser> {
    return prisma.workspaceUser.update({
      where: { userId_workspaceId: { workspaceId, userId } },
      data: { role },
    });
  },

  /**
   * 移除成员
   */
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await prisma.workspaceUser.delete({
      where: { userId_workspaceId: { workspaceId, userId } },
    });
  },
};

