/**
 * 管理服务
 * 处理角色管理和汇报关系管理
 */
import { projectMemberRepository } from '../repositories/projectMemberRepository';
import { workspaceRepository, WorkspaceRole } from '../repositories/workspaceRepository';
import { projectRepository } from '../repositories/projectRepository';
import { AppError } from '../middleware/errorHandler';

// 项目角色优先级（数字越小权限越高）
const PROJECT_ROLE_PRIORITY: Record<string, number> = {
  project_admin: 1,
  team_lead: 2,
  senior: 3,
  member: 4,
  observer: 5,
};

// 获取角色优先级（自定义角色默认为成员级别）
const getRolePriority = (role: string): number => {
  return PROJECT_ROLE_PRIORITY[role] ?? 4; // 默认为 member 级别
};

export const adminService = {
  /**
   * 检查是否为 owner
   * 只有 owner 有最高管理权限
   */
  async requireSuperAdmin(workspaceId: string, userId: string): Promise<void> {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    if (!membership || membership.role !== 'owner') {
      throw new AppError('需要最高管理员权限', 403, 'REQUIRE_SUPER_ADMIN');
    }
  },

  /**
   * 检查是否有管理权限（owner 或 director）
   */
  async requireAdmin(workspaceId: string, userId: string): Promise<void> {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    if (!membership || !['owner', 'director'].includes(membership.role)) {
      throw new AppError('需要管理员权限', 403, 'REQUIRE_ADMIN');
    }
  },

  /**
   * 检查是否为项目管理员或更高
   */
  async requireProjectAdmin(projectId: string, userId: string): Promise<void> {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 检查是否为 workspace 的 owner、director 或 manager
    const workspaceMembership = await workspaceRepository.getMembership(project.workspaceId, userId);
    if (workspaceMembership && ['owner', 'director', 'manager'].includes(workspaceMembership.role)) {
      return; // owner/director/manager 有所有项目的权限
    }

    // 检查是否为项目管理员或团队负责人
    const projectMember = await projectMemberRepository.findByProjectAndUser(projectId, userId);
    if (!projectMember || !['project_admin', 'team_lead'].includes(projectMember.role)) {
      throw new AppError('需要项目管理员或团队负责人权限', 403, 'REQUIRE_PROJECT_ADMIN');
    }
  },

  /**
   * 设置工作区成员角色（仅 owner 可操作）
   */
  async setWorkspaceRole(
    operatorId: string,
    workspaceId: string,
    targetUserId: string,
    newRole: string
  ) {
    // 1. 验证操作者权限（必须是 owner）
    await this.requireSuperAdmin(workspaceId, operatorId);

    // 2. 验证目标用户是工作区成员
    const targetMembership = await workspaceRepository.getMembership(workspaceId, targetUserId);
    if (!targetMembership) {
      throw new AppError('用户不是工作区成员', 404, 'USER_NOT_IN_WORKSPACE');
    }

    // 3. 不能修改 owner 的角色
    if (targetMembership.role === 'owner') {
      throw new AppError('不能修改工作区创建者的角色', 400, 'CANNOT_CHANGE_OWNER_ROLE');
    }

    // 4. 验证角色值（使用正确的角色枚举）
    if (!['director', 'manager', 'member', 'observer'].includes(newRole)) {
      throw new AppError('无效的角色', 400, 'INVALID_ROLE');
    }

    // 5. 更新角色
    return workspaceRepository.updateMemberRole(workspaceId, targetUserId, newRole as WorkspaceRole);
  },

  /**
   * 设置项目成员角色
   */
  async setProjectMemberRole(
    operatorId: string,
    projectId: string,
    targetUserId: string,
    newRole: string,
    managerId?: string | null
  ) {
    // 1. 验证操作者权限
    await this.requireProjectAdmin(projectId, operatorId);

    // 2. 验证角色值 - 允许预设角色和自定义角色
    const presetRoles = ['project_admin', 'team_lead', 'senior', 'member', 'observer'];
    // 自定义角色名称长度限制
    if (!presetRoles.includes(newRole) && (newRole.length < 1 || newRole.length > 30)) {
      throw new AppError('角色名称长度必须在1-30个字符之间', 400, 'INVALID_ROLE_LENGTH');
    }

    // 3. 如果设置了上级，验证上级存在且在同一项目
    if (managerId) {
      const managerMember = await projectMemberRepository.findByProjectAndUser(projectId, managerId);
      if (!managerMember) {
        throw new AppError('指定的上级不是项目成员', 400, 'MANAGER_NOT_IN_PROJECT');
      }

      // 上级的角色优先级必须更高
      if (getRolePriority(managerMember.role) >= getRolePriority(newRole)) {
        throw new AppError('上级的角色级别必须高于下属', 400, 'INVALID_MANAGER_ROLE');
      }

      // 不能把自己设为自己的上级
      if (managerId === targetUserId) {
        throw new AppError('不能将自己设为自己的上级', 400, 'SELF_MANAGER_NOT_ALLOWED');
      }
    }

    // 4. 创建或更新项目成员
    return projectMemberRepository.upsert({
      projectId,
      userId: targetUserId,
      role: newRole,
      managerId: managerId ?? undefined,
    });
  },

  /**
   * 获取项目成员列表（带层级信息）
   */
  async getProjectMembers(operatorId: string, projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 验证操作者是工作区成员
    const membership = await workspaceRepository.getMembership(project.workspaceId, operatorId);
    if (!membership) {
      throw new AppError('无权访问此项目', 403, 'ACCESS_DENIED');
    }

    return projectMemberRepository.findByProjectId(projectId);
  },

  /**
   * 批量设置汇报关系
   */
  async setReportingRelation(
    operatorId: string,
    projectId: string,
    subordinateIds: string[],
    managerId: string | null
  ) {
    await this.requireProjectAdmin(projectId, operatorId);

    // 验证所有下属都是项目成员
    for (const userId of subordinateIds) {
      const member = await projectMemberRepository.findByProjectAndUser(projectId, userId);
      if (!member) {
        throw new AppError(`用户 ${userId} 不是项目成员`, 400, 'USER_NOT_IN_PROJECT');
      }
    }

    // 验证上级（如果指定）
    if (managerId) {
      const managerMember = await projectMemberRepository.findByProjectAndUser(projectId, managerId);
      if (!managerMember) {
        throw new AppError('指定的上级不是项目成员', 400, 'MANAGER_NOT_IN_PROJECT');
      }
    }

    const count = await projectMemberRepository.setManager(projectId, subordinateIds, managerId);
    return { updated: count };
  },

  /**
   * 获取用户在项目中的所有下属
   */
  async getSubordinates(operatorId: string, projectId: string, managerId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 验证操作者是工作区成员
    const membership = await workspaceRepository.getMembership(project.workspaceId, operatorId);
    if (!membership) {
      throw new AppError('无权访问此项目', 403, 'ACCESS_DENIED');
    }

    return projectMemberRepository.findAllSubordinates(projectId, managerId);
  },
};
