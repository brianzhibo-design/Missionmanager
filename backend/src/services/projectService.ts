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
   * 权限：owner, director 可以修改项目
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

    await workspaceService.requireRole(project.workspaceId, userId, ['owner', 'director']);

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
};

