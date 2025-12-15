/**
 * 项目服务
 */
import { api } from './api';

export interface ProjectLeader {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface ProjectMember {
  id: string;
  role: string;
  userId: string;
  projectId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  workspaceId: string;
  leaderId: string | null;
  leader?: ProjectLeader | null;
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

  // 设置项目负责人
  async setLeader(projectId: string, leaderId: string | null): Promise<Project> {
    const response = await api.put<{ project: Project }>(`/projects/${projectId}/leader`, { leaderId });
    return response.project;
  },

  // 获取项目团队成员
  async getTeamMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await api.get<{ members: ProjectMember[] }>(`/projects/${projectId}/team`);
    return response.members;
  },

  // 添加团队成员
  async addTeamMember(projectId: string, memberId: string, role: string = 'member'): Promise<ProjectMember> {
    const response = await api.post<{ member: ProjectMember }>(`/projects/${projectId}/team`, { memberId, role });
    return response.member;
  },

  // 移除团队成员
  async removeTeamMember(projectId: string, memberId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/team/${memberId}`);
  },
};

