/**
 * 树状视图相关类型定义
 */

// ==================== 成员任务树 ====================

// 任务简要信息（树节点中使用）
export interface TaskBrief {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

// 任务统计
export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  blocked: number;
  done: number;
}

// 成员节点
export interface MemberNode {
  userId: string;
  name: string;
  email: string;
  role: string;           // project_admin, team_lead, member
  taskStats: TaskStats;
  tasks: TaskBrief[];     // 该成员直接负责的任务
  children: MemberNode[]; // 下属成员
}

// 成员任务树响应
export interface MemberTreeResponse {
  projectId: string;
  projectName: string;
  tree: MemberNode;
}

// ==================== 项目树 ====================

// 项目节点
export interface ProjectNode {
  projectId: string;
  name: string;
  description: string | null;
  progress: number;       // 完成百分比
  taskStats: TaskStats;
  topMembers: Array<{     // 项目主要成员（project_admin + team_lead）
    userId: string;
    name: string;
    role: string;
    taskCount: number;
  }>;
  recentActivity: string | null; // 最近活动时间
}

// 项目树响应
export interface ProjectTreeResponse {
  workspaceId: string;
  workspaceName: string;
  totalProjects: number;
  overallStats: TaskStats;
  projects: ProjectNode[];
}

