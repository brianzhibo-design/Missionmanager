/**
 * 管理服务
 * 处理角色管理和汇报关系管理
 */
import { projectMemberRepository } from '../repositories/projectMemberRepository';
import { workspaceRepository, WorkspaceRole, mapRole } from '../repositories/workspaceRepository';
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
   * 检查是否有管理权限（owner 或 admin）
   */
  async requireAdmin(workspaceId: string, userId: string): Promise<void> {
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    if (!membership) {
      throw new AppError('需要管理员权限', 403, 'REQUIRE_ADMIN');
    }
    const mappedRole = mapRole(membership.role);
    if (!['owner', 'admin'].includes(mappedRole)) {
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

    // 检查是否为 workspace 的 owner、admin 或 leader
    const workspaceMembership = await workspaceRepository.getMembership(project.workspaceId, userId);
    if (workspaceMembership) {
      const mappedRole = mapRole(workspaceMembership.role);
      if (['owner', 'admin', 'leader'].includes(mappedRole)) {
        return; // owner/admin/leader 有所有项目的权限
      }
    }

    // 检查是否为项目负责人（通过 leaderId 或 ProjectMember.isLeader）
    if (project.leaderId === userId) {
      return; // 项目负责人有权限
    }

    // 检查 ProjectMember 中的 isLeader 标记（如果数据库已更新）
    const projectMember = await projectMemberRepository.findByProjectAndUser(projectId, userId);
    if (projectMember && (projectMember as any).isLeader) {
      return; // 项目负责人标记
    }

    throw new AppError('需要项目管理员权限或项目负责人', 403, 'REQUIRE_PROJECT_ADMIN');
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

    // 4. 验证角色值（支持新旧角色代码）
    const validRoles = ['admin', 'leader', 'member', 'guest', 'director', 'manager', 'observer'];
    if (!validRoles.includes(newRole)) {
      throw new AppError('无效的角色', 400, 'INVALID_ROLE');
    }
    
    // 映射旧角色代码到新角色代码
    const mappedRole = mapRole(newRole);

    // 5. 更新角色（使用映射后的新角色代码）
    return workspaceRepository.updateMemberRole(workspaceId, targetUserId, mappedRole);
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
    // 1. 获取项目信息
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 2. 验证操作者权限
    const workspaceMembership = await workspaceRepository.getMembership(project.workspaceId, operatorId);
    if (!workspaceMembership) {
      throw new AppError('无权访问此项目', 403, 'ACCESS_DENIED');
    }

    // 3. 映射角色代码
    const mappedRole = mapRole(workspaceMembership.role);
    
    // 4. 如果是 leader，只能编辑自己负责的项目
    if (mappedRole === 'leader' && project.leaderId !== operatorId) {
      throw new AppError('只能编辑自己负责的项目', 403, 'CAN_ONLY_EDIT_OWN_PROJECT');
    }

    // 5. owner 和 admin 可以编辑所有项目，继续检查项目管理员权限
    if (!['owner', 'admin'].includes(mappedRole)) {
      await this.requireProjectAdmin(projectId, operatorId);
    }

    // 6. 根据新方案：项目层面只保留 isLeader 标记
    // 如果 newRole 是 'lead' 或 'project_admin'，设置为项目负责人
    const isProjectLeader = newRole === 'lead' || newRole === 'project_admin';
    
    // 如果设置为项目负责人，更新 Project.leaderId
    if (isProjectLeader) {
      await projectRepository.update(projectId, { leaderId: targetUserId });
    }

    // 7. 创建或更新项目成员（保留 role 字段以向后兼容，但主要逻辑使用 leaderId）
    // 注意：数据库迁移后，可以移除 role 字段，只保留 isLeader 标记
    return projectMemberRepository.upsert({
      projectId,
      userId: targetUserId,
      role: newRole, // 暂时保留，向后兼容
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
