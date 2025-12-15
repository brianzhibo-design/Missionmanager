/**
 * 项目服务
 */
import { projectRepository } from '../repositories/projectRepository';
import { workspaceService } from './workspaceService';
import { AppError } from '../middleware/errorHandler';

export const projectService = {
  /**
   * 创建项目
   * 权限：owner, director, manager 可以创建项目
   */
  async create(
    userId: string,
    workspaceId: string,
    data: { name: string; description?: string }
  ) {
    await workspaceService.requireRole(workspaceId, userId, ['owner', 'director', 'manager']);

    return projectRepository.create({
      name: data.name,
      description: data.description,
      workspaceId,
    });
  },

  /**
   * 获取工作区下的所有项目
   * 权限：所有工作区成员都可以查看项目列表
   */
  async getByWorkspace(userId: string, workspaceId: string) {
    // 所有角色都可以查看项目列表
    await workspaceService.requireRole(workspaceId, userId, ['owner', 'director', 'manager', 'member', 'observer']);
    return projectRepository.findByWorkspaceId(workspaceId);
  },

  /**
   * 获取项目详情
   * 权限：所有工作区成员都可以查看项目详情
   */
  async getById(userId: string, projectId: string) {
    const project = await projectRepository.findByIdWithStats(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 所有角色都可以查看项目详情
    await workspaceService.requireRole(project.workspaceId, userId, ['owner', 'director', 'manager', 'member', 'observer']);

    return project;
  },

  /**
   * 更新项目
   * 权限：owner, director, 项目负责人 可以修改项目
   */
  async update(
    userId: string,
    projectId: string,
    data: { name?: string; description?: string; status?: string }
  ) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 检查权限：工作区管理员或项目负责人
    const isWorkspaceAdmin = await workspaceService.hasRole(project.workspaceId, userId, ['owner', 'director']);
    const isProjectLeader = project.leaderId === userId;

    if (!isWorkspaceAdmin && !isProjectLeader) {
      throw new AppError('没有权限修改项目', 403, 'FORBIDDEN');
    }

    return projectRepository.update(projectId, data);
  },

  /**
   * 删除项目
   * 权限：仅 owner 可以删除项目
   */
  async delete(userId: string, projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    await workspaceService.requireRole(project.workspaceId, userId, ['owner']);

    await projectRepository.delete(projectId);
  },

  /**
   * 设置项目负责人
   * 权限：owner, director 可以设置负责人
   */
  async setLeader(userId: string, projectId: string, leaderId: string | null) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    await workspaceService.requireRole(project.workspaceId, userId, ['owner', 'director']);

    // 如果设置负责人，检查该用户是否是工作区成员
    if (leaderId) {
      const isMember = await workspaceService.isMember(project.workspaceId, leaderId);
      if (!isMember) {
        throw new AppError('该用户不是工作区成员', 400, 'NOT_WORKSPACE_MEMBER');
      }
    }

    return projectRepository.update(projectId, { leaderId });
  },

  /**
   * 获取项目团队成员
   */
  async getTeamMembers(userId: string, projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    await workspaceService.requireRole(project.workspaceId, userId, ['owner', 'director', 'manager', 'member', 'observer']);

    return projectRepository.findProjectMembers(projectId);
  },

  /**
   * 添加团队成员
   * 权限：owner, director, manager, 项目负责人 可以添加成员
   */
  async addTeamMember(userId: string, projectId: string, memberId: string, role: string = 'member') {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 检查权限：工作区管理员或项目负责人
    const isWorkspaceAdmin = await workspaceService.hasRole(project.workspaceId, userId, ['owner', 'director', 'manager']);
    const isProjectLeader = project.leaderId === userId;

    if (!isWorkspaceAdmin && !isProjectLeader) {
      throw new AppError('没有权限添加团队成员', 403, 'FORBIDDEN');
    }

    // 检查该用户是否是工作区成员
    const isMember = await workspaceService.isMember(project.workspaceId, memberId);
    if (!isMember) {
      throw new AppError('该用户不是工作区成员', 400, 'NOT_WORKSPACE_MEMBER');
    }

    // 检查是否已经是项目成员
    const existingMember = await projectRepository.findProjectMember(projectId, memberId);
    if (existingMember) {
      throw new AppError('该用户已经是项目成员', 400, 'ALREADY_PROJECT_MEMBER');
    }

    return projectRepository.addProjectMember(projectId, memberId, role);
  },

  /**
   * 移除团队成员
   * 权限：owner, director, manager, 项目负责人 可以移除成员
   */
  async removeTeamMember(userId: string, projectId: string, memberId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 检查权限
    const isWorkspaceAdmin = await workspaceService.hasRole(project.workspaceId, userId, ['owner', 'director', 'manager']);
    const isProjectLeader = project.leaderId === userId;

    if (!isWorkspaceAdmin && !isProjectLeader) {
      throw new AppError('没有权限移除团队成员', 403, 'FORBIDDEN');
    }

    // 不能移除项目负责人
    if (project.leaderId === memberId) {
      throw new AppError('不能移除项目负责人，请先更换负责人', 400, 'CANNOT_REMOVE_LEADER');
    }

    await projectRepository.removeProjectMember(projectId, memberId);
  },

  /**
   * 检查用户是否是项目负责人
   */
  async isProjectLeader(projectId: string, userId: string): Promise<boolean> {
    const project = await projectRepository.findById(projectId);
    return project?.leaderId === userId;
  },

  /**
   * 检查用户是否是项目团队成员
   */
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const member = await projectRepository.findProjectMember(projectId, userId);
    return !!member;
  },

  /**
   * 检查用户在项目中的权限
   * 返回: 'leader' | 'member' | null
   */
  async getProjectRole(projectId: string, userId: string): Promise<'leader' | 'member' | null> {
    const project = await projectRepository.findById(projectId);
    if (!project) return null;

    if (project.leaderId === userId) {
      return 'leader';
    }

    const member = await projectRepository.findProjectMember(projectId, userId);
    if (member) {
      return 'member';
    }

    return null;
  },
};

