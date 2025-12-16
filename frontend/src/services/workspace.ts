/**
 * 工作区服务
 */
import { api } from './api';

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

interface WorkspacesResponse {
  workspaces: Workspace[];
}

export const workspaceService = {
  // 获取用户的工作区列表
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await api.get<WorkspacesResponse>('/workspaces');
    return response.workspaces;
  },

  // 获取工作区成员列表
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await api.get<{ members: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`);
    return response.members;
  },

  // 创建工作区
  async createWorkspace(name: string, description?: string): Promise<Workspace> {
    const response = await api.post<{ workspace: Workspace }>('/workspaces', {
      name,
      description,
    });
    return response.workspace;
  },

  // 更新工作区
  async updateWorkspace(workspaceId: string, data: { name?: string; description?: string }): Promise<Workspace> {
    const response = await api.patch<{ workspace: Workspace }>(`/workspaces/${workspaceId}`, data);
    return response.workspace;
  },

  // 删除工作区
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}`);
  },
};

