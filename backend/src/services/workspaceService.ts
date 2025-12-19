/**
 * 工作区服务
 */
import { workspaceRepository, WorkspaceRole, hasRolePermission, ROLE_HIERARCHY, mapRole, isRoleInList } from '../repositories/workspaceRepository';
import { userRepository } from '../repositories/userRepository';
import { AppError } from '../middleware/errorHandler';

export const workspaceService = {
  /**
   * 创建工作区（创建者自动成为 owner）
   */
  async create(userId: string, name: string, description?: string) {
    // 1. 创建工作区
    const workspace = await workspaceRepository.create({ name, description });

    // 2. 将创建者添加为 owner
    await workspaceRepository.addMember(workspace.id, userId, 'owner');

    return workspace;
  },

  /**
   * 获取用户的所有工作区
   */
  async getUserWorkspaces(userId: string) {
    return workspaceRepository.findByUserId(userId);
  },

  /**
   * 获取工作区详情（需要权限检查）
   */
  async getById(workspaceId: string, userId: string) {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    if (!membership) {
      throw new AppError('无权访问此工作区', 403, 'ACCESS_DENIED');
    }

    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new AppError('工作区不存在', 404, 'WORKSPACE_NOT_FOUND');
    }

    return { ...workspace, role: membership.role };
  },

  /**
   * 更新工作区
   * 权限：owner, admin 可以更新工作区
   */
  async update(workspaceId: string, userId: string, data: { name?: string; description?: string }) {
    await this.requireRole(workspaceId, userId, ['owner', 'admin']);
    return workspaceRepository.update(workspaceId, data);
  },

  /**
   * 删除工作区（仅 owner）
   */
  async delete(workspaceId: string, userId: string) {
    await this.requireRole(workspaceId, userId, ['owner']);
    await workspaceRepository.delete(workspaceId);
  },

  /**
   * 获取工作区成员列表
   * 权限：所有成员都可以查看成员列表
   */
  async getMembers(workspaceId: string, userId: string) {
    await this.requireRole(workspaceId, userId, ['owner', 'admin', 'leader', 'member', 'guest']);
    return workspaceRepository.getMembers(workspaceId);
  },

  /**
   * 邀请成员
   * 权限：owner, admin, leader 可以邀请成员
   */
  async inviteMember(workspaceId: string, adminUserId: string, targetUserId: string, role: WorkspaceRole) {
    await this.requireRole(workspaceId, adminUserId, ['owner', 'admin', 'leader']);

    // 检查是否已是成员
    const existing = await workspaceRepository.getMembership(workspaceId, targetUserId);
    if (existing) {
      throw new AppError('该用户已是工作区成员', 409, 'ALREADY_MEMBER');
    }

    // 不能邀请为 owner
    if (role === 'owner') {
      throw new AppError('不能邀请用户为 owner', 400, 'INVALID_ROLE');
    }

    return workspaceRepository.addMember(workspaceId, targetUserId, role);
  },

  /**
   * 通过邮箱邀请成员
   * 权限：owner, admin, leader 可以邀请
   */
  async inviteMemberByEmail(
    workspaceId: string,
    adminUserId: string,
    email: string,
    role: string = 'member'
  ) {
    // 1. 验证操作者权限
    const adminMembership = await workspaceRepository.getMembership(workspaceId, adminUserId);
    if (!adminMembership) {
      throw new AppError('无权邀请成员', 403, 'PERMISSION_DENIED');
    }
    const mappedRole = mapRole(adminMembership.role);
    if (!['owner', 'admin', 'leader'].includes(mappedRole)) {
      throw new AppError('无权邀请成员', 403, 'PERMISSION_DENIED');
    }

    // 2. 查找被邀请的用户
    const invitee = await userRepository.findByEmail(email);
    if (!invitee) {
      throw new AppError('用户不存在，请确认邮箱正确', 404, 'USER_NOT_FOUND');
    }

    // 3. 检查是否已是成员
    const existingMembership = await workspaceRepository.getMembership(workspaceId, invitee.id);
    if (existingMembership) {
      throw new AppError('该用户已是工作区成员', 400, 'ALREADY_MEMBER');
    }

    // 4. 角色验证：不能邀请为比自己更高的角色
    const adminRoleLevel = ROLE_HIERARCHY[adminMembership.role as WorkspaceRole];
    const inviteeRoleLevel = ROLE_HIERARCHY[role as WorkspaceRole];
    
    if (adminRoleLevel === undefined || inviteeRoleLevel === undefined) {
      throw new AppError('无效的角色', 400, 'INVALID_ROLE');
    }
    
    if (inviteeRoleLevel <= adminRoleLevel) {
      throw new AppError('不能邀请为比自己更高或相同的角色', 403, 'INVALID_ROLE');
    }

    // 5. 添加成员
    return workspaceRepository.addMemberWithUser(workspaceId, invitee.id, role);
  },

  /**
   * 更新成员角色
   * 权限：owner 可以修改所有角色，admin 可以修改 leader 及以下
   */
  async updateMemberRole(
    workspaceId: string,
    adminUserId: string,
    memberId: string,
    newRole: string
  ) {
    // 1. 验证操作者权限
    const adminMembership = await workspaceRepository.getMembership(workspaceId, adminUserId);
    if (!adminMembership) {
      throw new AppError('无权修改成员角色', 403, 'PERMISSION_DENIED');
    }
    const adminMappedRole = mapRole(adminMembership.role);
    if (!['owner', 'admin'].includes(adminMappedRole)) {
      throw new AppError('无权修改成员角色', 403, 'PERMISSION_DENIED');
    }

    // 2. 不能修改自己的角色
    if (adminUserId === memberId) {
      throw new AppError('不能修改自己的角色', 400, 'CANNOT_MODIFY_SELF');
    }

    // 3. 获取目标成员
    const targetMembership = await workspaceRepository.getMembership(workspaceId, memberId);
    if (!targetMembership) {
      throw new AppError('成员不存在', 404, 'MEMBER_NOT_FOUND');
    }

    // 4. 不能修改 owner 的角色
    if (targetMembership.role === 'owner') {
      throw new AppError('不能修改所有者的角色', 403, 'CANNOT_MODIFY_OWNER');
    }

    // 5. admin 不能修改 admin 或设置为 admin/owner
    const targetMappedRole = mapRole(targetMembership.role);
    if (adminMappedRole === 'admin') {
      if (targetMappedRole === 'admin') {
        throw new AppError('大管家不能修改其他大管家的角色', 403, 'PERMISSION_DENIED');
      }
      const newMappedRole = mapRole(newRole);
      if (newMappedRole === 'owner' || newMappedRole === 'admin') {
        throw new AppError('大管家不能设置角色为扛把子或大管家', 403, 'PERMISSION_DENIED');
      }
    }

    // 6. 验证新角色有效（支持新旧角色代码）
    const validRoles = ['admin', 'leader', 'member', 'guest', 'director', 'manager', 'observer'];
    if (!validRoles.includes(newRole)) {
      throw new AppError('无效的角色', 400, 'INVALID_ROLE');
    }

    // 7. 映射新角色代码
    const mappedNewRole = mapRole(newRole);

    // 8. 更新角色（使用映射后的新角色代码）
    return workspaceRepository.updateMemberRoleWithUser(workspaceId, memberId, mappedNewRole);
  },

  /**
   * 移除成员
   * 权限：owner 可以移除所有人，admin 可以移除 leader 及以下
   */
  async removeMember(workspaceId: string, adminUserId: string, targetUserId: string) {
    const adminMembership = await this.requireRole(workspaceId, adminUserId, ['owner', 'admin']);
    const adminMappedRole = mapRole(adminMembership.role);
    
    // 不能移除自己
    if (adminUserId === targetUserId) {
      throw new AppError('不能移除自己', 400, 'CANNOT_REMOVE_SELF');
    }

    const targetMembership = await workspaceRepository.getMembership(workspaceId, targetUserId);
    if (!targetMembership) {
      throw new AppError('用户不是工作区成员', 404, 'NOT_MEMBER');
    }

    // admin 不能移除 owner 或 admin
    const targetMappedRole = mapRole(targetMembership.role);
    if (adminMappedRole === 'admin') {
      if (targetMappedRole === 'owner' || targetMappedRole === 'admin') {
        throw new AppError('大管家不能移除扛把子或其他大管家', 403, 'INSUFFICIENT_PERMISSION');
      }
    }

    await workspaceRepository.removeMember(workspaceId, targetUserId);
  },

  /**
   * 权限检查辅助方法（支持角色映射）
   * @param allowedRoles 允许的角色列表
   */
  async requireRole(workspaceId: string, userId: string, allowedRoles: WorkspaceRole[]) {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    if (!membership) {
      throw new AppError('无权访问此工作区', 403, 'ACCESS_DENIED');
    }
    const mappedRole = mapRole(membership.role);
    if (!allowedRoles.includes(mappedRole)) {
      throw new AppError('权限不足', 403, 'INSUFFICIENT_PERMISSION');
    }
    return membership;
  },

  /**
   * 检查用户是否有最低权限（使用层级比较）
   * @param minRole 最低要求的角色
   */
  async requireMinRole(workspaceId: string, userId: string, minRole: WorkspaceRole) {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    if (!membership) {
      throw new AppError('无权访问此工作区', 403, 'ACCESS_DENIED');
    }
    if (!hasRolePermission(membership.role, minRole)) {
      throw new AppError('权限不足', 403, 'INSUFFICIENT_PERMISSION');
    }
    return membership;
  },

  /**
   * 获取用户在工作区的角色
   */
  async getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    return (membership?.role as WorkspaceRole) || null;
  },

  /**
   * 检查用户是否有指定角色（不抛出异常，支持角色映射）
   */
  async hasRole(workspaceId: string, userId: string, allowedRoles: WorkspaceRole[]): Promise<boolean> {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    if (!membership) return false;
    const mappedRole = mapRole(membership.role);
    return allowedRoles.includes(mappedRole);
  },

  /**
   * 检查用户是否是工作区成员
   */
  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    return !!membership;
  },

  /**
   * 获取用户在工作区的成员信息
   */
  async getMembership(workspaceId: string, userId: string) {
    return workspaceRepository.getMembership(workspaceId, userId);
  },
};
