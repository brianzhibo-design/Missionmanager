/**
 * 项目服务
 */
import { projectRepository } from '../repositories/projectRepository';
import { taskRepository } from '../repositories/taskRepository';
import { workspaceService } from './workspaceService';
import { mapRole } from '../repositories/workspaceRepository';
import { AppError } from '../middleware/errorHandler';

// 初始任务类型定义
interface InitialTask {
  title: string;
  description?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  order?: number;
}

export const projectService = {
  /**
   * 创建项目
   * 权限：owner, admin, leader, member 可以创建项目
   * 可同时指定负责人、团队成员和初始任务
   */
  async create(
    userId: string,
    workspaceId: string,
    data: { 
      name: string; 
      description?: string;
      leaderId?: string;
      teamMemberIds?: string[];
      initialTasks?: InitialTask[];
    }
  ) {
    await workspaceService.requireRole(workspaceId, userId, ['owner', 'director', 'manager', 'member']);

    // 如果指定了负责人，验证是否是工作区成员
    if (data.leaderId) {
      const isLeaderMember = await workspaceService.isMember(workspaceId, data.leaderId);
      if (!isLeaderMember) {
        throw new AppError('指定的负责人不是工作区成员', 400, 'LEADER_NOT_MEMBER');
      }
    }

    // 验证团队成员是否都是工作区成员
    if (data.teamMemberIds && data.teamMemberIds.length > 0) {
      for (const memberId of data.teamMemberIds) {
        const isMember = await workspaceService.isMember(workspaceId, memberId);
        if (!isMember) {
          throw new AppError('部分团队成员不是工作区成员', 400, 'MEMBER_NOT_IN_WORKSPACE');
        }
      }
    }

    // 创建项目
    const project = await projectRepository.create({
      name: data.name,
      description: data.description,
      workspaceId,
      leaderId: data.leaderId,
    });

    // 添加团队成员
    if (data.teamMemberIds && data.teamMemberIds.length > 0) {
      for (const memberId of data.teamMemberIds) {
        // 跳过负责人（如果已设置）
        if (memberId !== data.leaderId) {
          await projectRepository.addProjectMember(project.id, memberId, false);
        }
      }
    }

    // 如果有负责人，也添加为项目成员（isLeader = true）
    if (data.leaderId) {
      await projectRepository.addProjectMember(project.id, data.leaderId, true);
    }

    // 创建初始任务
    if (data.initialTasks && data.initialTasks.length > 0) {
      for (const task of data.initialTasks) {
        await taskRepository.create({
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'medium',
          status: 'todo',
          projectId: project.id,
          creatorId: userId,
          order: task.order || 0,
        });
      }
    }

    return project;
  },

  /**
   * 获取工作区下的项目列表（带权限过滤）
   * 权限：
   * - owner, director: 可以查看所有项目
   * - manager, member, observer: 只能查看自己参与的项目（是负责人、团队成员或有分配任务）
   */
  async getByWorkspace(userId: string, workspaceId: string) {
    // 验证用户是工作区成员
    const membership = await workspaceService.getMembership(workspaceId, userId);
    if (!membership) {
      throw new AppError('您不是此工作区的成员', 403, 'NOT_WORKSPACE_MEMBER');
    }

    // 映射角色代码
    const mappedRole = mapRole(membership.role);

    // owner, director 可以查看所有项目
    if (['owner', 'director'].includes(mappedRole)) {
      return projectRepository.findByWorkspaceId(workspaceId);
    }

    // manager, member, observer 只能查看自己参与的项目
    return projectRepository.findByWorkspaceIdForMember(workspaceId, userId);
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
   * 权限：owner, admin 可以修改所有项目；项目负责人可以修改自己的项目
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

    // 检查权限：owner/admin 可以修改所有项目；项目负责人可以修改自己的项目
    const isOwnerOrAdmin = await workspaceService.hasRole(project.workspaceId, userId, ['owner', 'director']);
    const isProjectLeader = project.leaderId === userId;

    if (!isOwnerOrAdmin && !isProjectLeader) {
      throw new AppError('没有权限修改项目', 403, 'FORBIDDEN');
    }

    return projectRepository.update(projectId, data);
  },

  /**
   * 删除项目
   * 权限：owner, admin 可以删除项目
   */
  async delete(userId: string, projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    await workspaceService.requireRole(project.workspaceId, userId, ['owner', 'director']);

    await projectRepository.delete(projectId);
  },

  /**
   * 设置项目负责人
   * 权限：owner, admin 可以设置负责人
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
   * 权限：owner, admin, 项目负责人 可以添加成员
   */
  async addTeamMember(userId: string, projectId: string, memberId: string, isLeader: boolean = false) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 检查权限：工作区管理员或项目负责人
    const isWorkspaceAdmin = await workspaceService.hasRole(project.workspaceId, userId, ['owner', 'director']);
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

    // 如果设置为项目负责人，同时更新 Project.leaderId
    if (isLeader) {
      await projectRepository.update(projectId, { leaderId: memberId });
    }

    return projectRepository.addProjectMember(projectId, memberId, isLeader);
  },

  /**
   * 移除团队成员
   * 权限：owner, admin, 项目负责人 可以移除成员
   */
  async removeTeamMember(userId: string, projectId: string, memberId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 检查权限
    const isWorkspaceAdmin = await workspaceService.hasRole(project.workspaceId, userId, ['owner', 'director']);
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

