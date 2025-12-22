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

  // ============ 加入申请相关 ============

  // 通过 ID 查找工作区
  async lookupWorkspace(workspaceId: string): Promise<{ id: string; name: string; description: string | null } | null> {
    try {
      const response = await api.get<{ workspace: { id: string; name: string; description: string | null } }>(`/workspaces/lookup/${workspaceId}`);
      return response.workspace;
    } catch {
      return null;
    }
  },

  // 申请加入工作区
  async requestJoin(workspaceId: string, message?: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/join-request`, { message });
  },

  // 获取工作区的待审批申请
  async getJoinRequests(workspaceId: string): Promise<JoinRequest[]> {
    const response = await api.get<{ requests: JoinRequest[] }>(`/workspaces/${workspaceId}/join-requests`);
    return response.requests;
  },

  // 审批申请
  async reviewJoinRequest(requestId: string, approved: boolean, role?: string): Promise<void> {
    await api.post(`/workspaces/join-requests/${requestId}/review`, { approved, role });
  },

  // 获取我的申请列表
  async getMyJoinRequests(): Promise<MyJoinRequest[]> {
    const response = await api.get<{ requests: MyJoinRequest[] }>('/workspaces/my-join-requests');
    return response.requests;
  },
};

export interface JoinRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export interface MyJoinRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  workspace: {
    id: string;
    name: string;
  };
  reviewer: {
    id: string;
    name: string;
  } | null;
}

