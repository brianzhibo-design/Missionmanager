/**
 * 权限管理服务
 * 
 * 角色体系：
 *   - owner (扛把子) = 工作区创始人，拥有所有权限
 *   - director (大管家) = 总监/主管，管理多个项目
 *   - manager (堂主) = 项目经理/组长
 *   - member (少侠) = 普通成员
 *   - observer (吃瓜) = 观察者，只读权限
 */
import { api } from './api';

// 可用权限列表 - 分组展示
export const PERMISSION_GROUPS = {
  organization: { label: '组织管理', icon: '🏢' },
  personnel: { label: '人事管理', icon: '👥' },
  project: { label: '项目管理', icon: '📁' },
  task: { label: '任务管理', icon: '✅' },
  data: { label: '数据访问', icon: '📊' },
  ai: { label: 'AI 功能', icon: '🤖' },
  daily: { label: '日常操作', icon: '📝' },
  features: { label: '特殊功能', icon: '✨' },
} as const;

export const AVAILABLE_PERMISSIONS = [
  // === 组织管理 ===
  { id: 'VIEW_WORKSPACE', label: '查看工作区', description: '可以查看工作区基本信息', group: 'organization' },
  { id: 'MANAGE_SETTINGS', label: '工作区设置', description: '可以修改工作区设置', group: 'organization' },
  { id: 'DISSOLVE_WORKSPACE', label: '解散工作区', description: '可以解散工作区', group: 'organization' },
  
  // === 人事管理 ===
  { id: 'INVITE_MEMBERS', label: '邀请成员', description: '可以邀请新成员加入工作区', group: 'personnel' },
  { id: 'MANAGE_ROLES', label: '设置角色', description: '可以修改成员的角色', group: 'personnel' },
  { id: 'REMOVE_MEMBERS', label: '移除成员', description: '可以将成员移出工作区', group: 'personnel' },
  { id: 'MANAGE_MEMBERS', label: '管理成员', description: '可以管理所有成员（邀请、修改角色、移除）', group: 'personnel' },
  
  // === 项目管理 ===
  { id: 'CREATE_PROJECTS', label: '创建项目', description: '可以创建新项目', group: 'project' },
  { id: 'EDIT_PROJECTS', label: '编辑项目', description: '可以编辑项目信息', group: 'project' },
  { id: 'DELETE_PROJECTS', label: '删除项目', description: '可以删除项目', group: 'project' },
  { id: 'MANAGE_PROJECTS', label: '管理项目', description: '可以创建、编辑、删除所有项目', group: 'project' },
  
  // === 任务管理 ===
  { id: 'CREATE_TASKS', label: '创建任务', description: '可以创建新任务', group: 'task' },
  { id: 'EDIT_TASKS', label: '编辑任务', description: '可以编辑任务信息', group: 'task' },
  { id: 'DELETE_TASKS', label: '删除任务', description: '可以删除任务', group: 'task' },
  { id: 'ASSIGN_TASKS', label: '分配任务', description: '可以将任务分配给其他成员', group: 'task' },
  { id: 'MANAGE_TASKS', label: '管理所有任务', description: '可以查看和管理所有成员的任务', group: 'task' },
  
  // === 数据访问 ===
  { id: 'VIEW_ADMIN_TREE', label: '管理员视图', description: '可以访问管理员树视图', group: 'data' },
  { id: 'VIEW_REPORTS', label: '查看统计报告', description: '可以查看统计报告', group: 'data' },
  { id: 'VIEW_ALL_REPORTS', label: '查看所有日报', description: '可以查看所有成员的工作日报', group: 'data' },
  { id: 'VIEW_TEAM_REPORTS', label: '查看团队日报', description: '可以查看团队成员的日报', group: 'data' },
  
  // === AI 功能 ===
  { id: 'AI_GLOBAL_ANALYSIS', label: '全局分析', description: '可以使用 AI 全局分析功能', group: 'ai' },
  { id: 'AI_PROJECT_ANALYSIS', label: '项目分析', description: '可以使用 AI 项目分析功能', group: 'ai' },
  { id: 'AI_TASK_ANALYSIS', label: '任务分析', description: '可以使用 AI 任务分析功能', group: 'ai' },
  { id: 'AI_ANALYSIS', label: 'AI 分析', description: '可以使用所有 AI 分析功能', group: 'ai' },
  
  // === 日常操作 ===
  { id: 'WRITE_DAILY_REPORT', label: '填写日报', description: '可以填写个人工作日报', group: 'daily' },
  { id: 'COMMENT', label: '评论', description: '可以在任务和日报中发表评论', group: 'daily' },
  
  // === 特殊功能 ===
  { id: 'BROADCAST_MESSAGES', label: '群发消息', description: '可以向工作区所有成员发送通知消息', group: 'features' },
  { id: 'COFFEE_LOTTERY', label: '咖啡抽奖', description: '可以发起和管理咖啡抽奖活动', group: 'features' },
  { id: 'EXPORT_DATA', label: '导出数据', description: '可以导出工作区的数据和报告', group: 'features' },
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
//   - director (大管家) = 总监/主管，管理多个项目
//   - manager (堂主) = 项目经理/组长
//   - member (少侠) = 普通成员
//   - observer (吃瓜) = 观察者，只读权限
//
// 权限说明：
//   - BROADCAST_MESSAGES 和 COFFEE_LOTTERY 默认只有 owner/director 拥有
//   - MANAGE_SETTINGS 和 DISSOLVE_WORKSPACE 仅 owner 拥有
//   - manager 的"编辑项目"为"自己的项目"，"查看报告"为"团队范围"，通过项目权限控制
//   - member 的"编辑任务"为"自己的任务"，"查看报告"为"自己的"，通过任务权限控制
export const DEFAULT_ROLE_PERMISSIONS: Record<string, WorkspacePermission[]> = {
  // 扛把子 - 工作区创始人，拥有所有权限
  owner: AVAILABLE_PERMISSIONS.map(p => p.id),
  
  // 大管家 - 总监/主管
  director: [
    // 组织管理（无工作区设置、解散）
    'VIEW_WORKSPACE',
    // 人事管理
    'INVITE_MEMBERS', 'MANAGE_ROLES', 'REMOVE_MEMBERS', 'MANAGE_MEMBERS',
    // 项目管理
    'CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS', 'MANAGE_PROJECTS',
    // 任务管理
    'CREATE_TASKS', 'EDIT_TASKS', 'DELETE_TASKS', 'ASSIGN_TASKS', 'MANAGE_TASKS',
    // 数据访问
    'VIEW_ADMIN_TREE', 'VIEW_REPORTS', 'VIEW_ALL_REPORTS', 'VIEW_TEAM_REPORTS',
    // AI 功能
    'AI_GLOBAL_ANALYSIS', 'AI_PROJECT_ANALYSIS', 'AI_TASK_ANALYSIS', 'AI_ANALYSIS',
    // 日常操作
    'WRITE_DAILY_REPORT', 'COMMENT',
    // 特殊功能
    'BROADCAST_MESSAGES', 'COFFEE_LOTTERY', 'EXPORT_DATA',
  ],
  
  // 堂主 - 项目经理/组长
  manager: [
    // 组织管理
    'VIEW_WORKSPACE',
    // 人事管理（仅邀请成员）
    'INVITE_MEMBERS',
    // 项目管理（创建，编辑仅自己的项目）
    'CREATE_PROJECTS', 'EDIT_PROJECTS',
    // 任务管理
    'CREATE_TASKS', 'EDIT_TASKS', 'DELETE_TASKS', 'ASSIGN_TASKS',
    // 数据访问（管理员视图只读，报告仅团队）
    'VIEW_ADMIN_TREE', 'VIEW_REPORTS', 'VIEW_TEAM_REPORTS',
    // AI 功能（项目分析、任务分析）
    'AI_PROJECT_ANALYSIS', 'AI_TASK_ANALYSIS',
    // 日常操作
    'WRITE_DAILY_REPORT', 'COMMENT',
  ],
  
  // 少侠 - 普通成员
  member: [
    // 组织管理
    'VIEW_WORKSPACE',
    // 项目管理（仅创建）
    'CREATE_PROJECTS',
    // 任务管理（创建、编辑仅自己的）
    'CREATE_TASKS', 'EDIT_TASKS',
    // 数据访问（报告仅自己）
    'VIEW_REPORTS',
    // AI 功能（仅任务分析）
    'AI_TASK_ANALYSIS',
    // 日常操作
    'WRITE_DAILY_REPORT', 'COMMENT',
  ],
  
  // 吃瓜 - 观察者，只读权限
  observer: [
    // 组织管理
    'VIEW_WORKSPACE',
    // 日常操作（仅评论）
    'COMMENT',
  ],
  
  // === 兼容旧角色代码 ===
  // admin 映射到 director
  admin: [
    'VIEW_WORKSPACE',
    'INVITE_MEMBERS', 'MANAGE_ROLES', 'REMOVE_MEMBERS', 'MANAGE_MEMBERS',
    'CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS', 'MANAGE_PROJECTS',
    'CREATE_TASKS', 'EDIT_TASKS', 'DELETE_TASKS', 'ASSIGN_TASKS', 'MANAGE_TASKS',
    'VIEW_ADMIN_TREE', 'VIEW_REPORTS', 'VIEW_ALL_REPORTS', 'VIEW_TEAM_REPORTS',
    'AI_GLOBAL_ANALYSIS', 'AI_PROJECT_ANALYSIS', 'AI_TASK_ANALYSIS', 'AI_ANALYSIS',
    'WRITE_DAILY_REPORT', 'COMMENT',
    'BROADCAST_MESSAGES', 'COFFEE_LOTTERY', 'EXPORT_DATA',
  ],
  
  // leader 映射到 manager
  leader: [
    'VIEW_WORKSPACE',
    'INVITE_MEMBERS',
    'CREATE_PROJECTS', 'EDIT_PROJECTS',
    'CREATE_TASKS', 'EDIT_TASKS', 'DELETE_TASKS', 'ASSIGN_TASKS',
    'VIEW_ADMIN_TREE', 'VIEW_REPORTS', 'VIEW_TEAM_REPORTS',
    'AI_PROJECT_ANALYSIS', 'AI_TASK_ANALYSIS',
    'WRITE_DAILY_REPORT', 'COMMENT',
  ],
  
  // guest 映射到 observer
  guest: [
    'VIEW_WORKSPACE',
    'COMMENT',
  ],
};




