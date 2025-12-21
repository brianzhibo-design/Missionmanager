/**
 * 权限管理服务
 */
import { api } from './api';

// 可用权限列表 - 分组展示
export const PERMISSION_GROUPS = {
  basic: { label: '基础权限', icon: '📋' },
  management: { label: '管理权限', icon: '👔' },
  features: { label: '特殊功能', icon: '✨' },
  fun: { label: '趣味功能', icon: '🎉' },
} as const;

export const AVAILABLE_PERMISSIONS = [
  // 基础权限
  { id: 'VIEW_WORKSPACE', label: '查看工作区', description: '可以查看工作区基本信息', group: 'basic' },
  { id: 'VIEW_ALL_REPORTS', label: '查看所有日报', description: '可以查看所有成员的工作日报', group: 'basic' },
  
  // 管理权限
  { id: 'MANAGE_PROJECTS', label: '管理项目', description: '可以创建、编辑、删除项目', group: 'management' },
  { id: 'MANAGE_MEMBERS', label: '管理成员', description: '可以邀请、移除成员，修改角色', group: 'management' },
  { id: 'MANAGE_TASKS', label: '管理所有任务', description: '可以查看和管理所有成员的任务', group: 'management' },
  { id: 'MANAGE_SETTINGS', label: '管理设置', description: '可以修改工作区设置', group: 'management' },
  
  // 特殊功能
  { id: 'EXPORT_DATA', label: '导出数据', description: '可以导出工作区的数据和报告', group: 'features' },
  { id: 'AI_ANALYSIS', label: 'AI 分析', description: '可以使用 AI 分析和优化功能', group: 'features' },
  { id: 'BROADCAST_MESSAGES', label: '群发消息', description: '可以向工作区所有成员发送通知消息', group: 'features' },
  
  // 趣味功能
  { id: 'COFFEE_LOTTERY', label: '咖啡抽奖', description: '可以发起和管理咖啡抽奖活动', group: 'fun' },
  { id: 'TEAM_KUDOS', label: '团队点赞', description: '可以给团队成员发送表扬和认可', group: 'fun' },
  { id: 'FUN_EVENTS', label: '趣味活动', description: '可以创建和管理团队趣味活动', group: 'fun' },
] as const;

export type WorkspacePermission = typeof AVAILABLE_PERMISSIONS[number]['id'];

export interface UserPermissionData {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  role: string;
  isOwner: boolean;
  permissions: WorkspacePermission[];
  joinedAt?: string;
}

export interface PermissionListData {
  members: UserPermissionData[];
  availablePermissions: WorkspacePermission[];
}

export const permissionService = {
  /**
   * 获取用户在工作区的权限
   */
  async getUserPermissions(workspaceId: string, userId: string): Promise<UserPermissionData> {
    return api.get<UserPermissionData>(`/permissions/${workspaceId}/${userId}`);
  },

  /**
   * 获取当前用户在工作区的权限（简化版）
   */
  async getMyPermissions(workspaceId: string): Promise<UserPermissionData> {
    return api.get<UserPermissionData>(`/permissions/${workspaceId}/me`);
  },

  /**
   * 更新用户权限（仅创始人可操作）
   */
  async updateUserPermissions(
    workspaceId: string,
    userId: string,
    permissions: WorkspacePermission[]
  ): Promise<UserPermissionData> {
    return api.put<UserPermissionData>(`/permissions/${workspaceId}/${userId}`, { permissions });
  },

  /**
   * 获取工作区所有成员的权限列表
   */
  async getWorkspacePermissions(workspaceId: string): Promise<PermissionListData> {
    return api.get<PermissionListData>(`/permissions/${workspaceId}`);
  },
};

// 默认角色权限映射
export const DEFAULT_ROLE_PERMISSIONS: Record<string, WorkspacePermission[]> = {
  owner: AVAILABLE_PERMISSIONS.map(p => p.id), // 创始人拥有所有权限
  admin: [
    'VIEW_WORKSPACE', 'MANAGE_PROJECTS', 'MANAGE_MEMBERS', 'MANAGE_TASKS',
    'VIEW_ALL_REPORTS', 'MANAGE_SETTINGS', 'EXPORT_DATA', 'AI_ANALYSIS',
    'BROADCAST_MESSAGES', 'COFFEE_LOTTERY', 'TEAM_KUDOS', 'FUN_EVENTS'
  ],
  leader: [
    'VIEW_WORKSPACE', 'VIEW_ALL_REPORTS', 'AI_ANALYSIS',
    'COFFEE_LOTTERY', 'TEAM_KUDOS', 'FUN_EVENTS'
  ],
  member: [
    'VIEW_WORKSPACE', 'COFFEE_LOTTERY', 'TEAM_KUDOS'
  ],
  guest: ['VIEW_WORKSPACE'],
};
