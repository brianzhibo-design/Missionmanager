/**
 * Tree API 服务
 * 提供树状结构查询接口
 */
import { api } from './api';

// ==================== 类型定义 ====================

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  blocked: number;
  done: number;
}

export interface TaskBrief {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

export interface MemberNode {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  taskStats: TaskStats;
  tasks: TaskBrief[];
  children: MemberNode[];
}

export interface ProjectLeaderInfo {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface ProjectTeamMember {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  isLeader: boolean;
}

export interface MemberTreeResponse {
  workspaceId: string;
  workspaceName: string;
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  leader: ProjectLeaderInfo | null;
  teamMembers: ProjectTeamMember[];
  tree: MemberNode;
}

export interface ProjectNode {
  projectId: string;
  name: string;
  description: string | null;
  progress: number;
  taskStats: TaskStats;
  topMembers: Array<{
    userId: string;
    name: string;
    avatar?: string | null;
    role: string;
    taskCount: number;
  }>;
  recentActivity: string | null;
}

export interface ProjectTreeResponse {
  workspaceId: string;
  workspaceName: string;
  totalProjects: number;
  overallStats: TaskStats;
  projects: ProjectNode[];
}

// ==================== API 服务 ====================

export const treeService = {
  // 获取项目成员任务树
  async getMemberTree(projectId: string): Promise<MemberTreeResponse> {
    const response = await api.get<MemberTreeResponse>(
      `/tree/projects/${projectId}/members`
    );
    return response;
  },

  // 获取工作区项目树
  async getProjectTree(workspaceId: string): Promise<ProjectTreeResponse> {
    const response = await api.get<ProjectTreeResponse>(
      `/tree/workspaces/${workspaceId}/projects`
    );
    return response;
  },

  // 更新项目成员角色
  async updateMemberRole(
    projectId: string,
    userId: string,
    role: string
  ): Promise<void> {
    await api.post(`/admin/projects/${projectId}/members`, {
      userId,
      role,
    });
  },
};

