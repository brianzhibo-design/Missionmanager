/**
 * 权限管理服务
 */
import { api } from './api';

// 可用权限列表 - 分组展示
export const PERMISSION_GROUPS = {
  basic: { label: '基础权限', icon: '📋' },
  management: { label: '管理权限', icon: '👔' },
  features: { label: '特殊功能', icon: '✨' },
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
  { id: 'COFFEE_LOTTERY', label: '咖啡抽奖', description: '可以发起和管理咖啡抽奖活动', group: 'features' },
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
// 角色体系：
//   - owner (扛把子) = 工作区创始人，拥有所有权限
//   - admin/director (大管家) = 总监/主管，管理多个项目
//   - leader (带头大哥) = 项目负责人，仅项目内权限
//   - member (少侠) = 普通成员
//   - guest (吃瓜) = 访客，只读权限
//
// 注意：BROADCAST_MESSAGES 和 COFFEE_LOTTERY 默认只有创始人拥有
export const DEFAULT_ROLE_PERMISSIONS: Record<string, WorkspacePermission[]> = {
  // 扛把子 - 工作区创始人，拥有所有权限
  owner: AVAILABLE_PERMISSIONS.map(p => p.id),
  
  // 大管家 - 总监/主管（对应文档 director）
  // MANAGE_SETTINGS 仅扛把子可用
  admin: [
    'VIEW_WORKSPACE', 'MANAGE_PROJECTS', 'MANAGE_MEMBERS', 'MANAGE_TASKS',
    'VIEW_ALL_REPORTS', 'EXPORT_DATA', 'AI_ANALYSIS'
  ],
  
  // 兼容 director 代码
  director: [
    'VIEW_WORKSPACE', 'MANAGE_PROJECTS', 'MANAGE_MEMBERS', 'MANAGE_TASKS',
    'VIEW_ALL_REPORTS', 'EXPORT_DATA', 'AI_ANALYSIS'
  ],
  
  // 带头大哥 - 项目负责人
  // VIEW_ALL_REPORTS 和 MANAGE_TASKS 实际为"仅项目内"，通过项目权限控制
  leader: [
    'VIEW_WORKSPACE', 'AI_ANALYSIS'
  ],
  
  // 少侠 - 普通成员
  member: [
    'VIEW_WORKSPACE', 'AI_ANALYSIS'
  ],
  
  // 吃瓜 - 访客，只读
  guest: [
    'VIEW_WORKSPACE'
  ],
};
