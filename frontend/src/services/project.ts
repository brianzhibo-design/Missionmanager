/**
 * 项目服务
 */
import { api } from './api';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

export const projectService = {
  // 获取工作区下的项目列表
  async getProjects(workspaceId: string): Promise<Project[]> {
    const response = await api.get<ProjectsResponse>(`/projects?workspaceId=${workspaceId}`);
    return response.projects;
  },

  // 获取项目详情
  async getProject(projectId: string): Promise<Project> {
    const response = await api.get<ProjectResponse>(`/projects/${projectId}`);
    return response.project;
  },

  // 创建项目
  async createProject(workspaceId: string, name: string, description?: string): Promise<Project> {
    const response = await api.post<{ project: Project }>('/projects', {
      workspaceId,
      name,
      description,
    });
    return response.project;
  },

  // 更新项目
  async updateProject(projectId: string, data: { name?: string; description?: string }): Promise<Project> {
    const response = await api.patch<{ project: Project }>(`/projects/${projectId}`, data);
    return response.project;
  },

  // 删除项目
  async deleteProject(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}`);
  },
};

