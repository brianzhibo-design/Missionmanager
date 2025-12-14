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

interface WorkspacesResponse {
  workspaces: Workspace[];
}

export const workspaceService = {
  // 获取用户的工作区列表
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await api.get<WorkspacesResponse>('/workspaces');
    return response.workspaces;
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

