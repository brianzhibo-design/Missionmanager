/**
 * 后端统一类型定义
 */

// ============ 通用响应类型 ============

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** API 响应 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============ 用户相关类型 ============

/** 用户基础信息（用于关联查询返回） */
export interface UserBasic {
  id: string;
  name: string;
  avatar?: string | null;
}

/** 用户完整信息 */
export interface UserInfo extends UserBasic {
  email: string;
}

// ============ 日报相关类型 ============

/** 日报评论 */
export interface DailyReportComment {
  id: string;
  content: string;
  dailyReportId: string;
  userId: string;
  createdAt: Date;
  user: UserBasic;
}

/** 日报点赞用户 */
export interface DailyReportLikeInfo {
  users: UserBasic[];
  count: number;
  liked: boolean;
}

/** 日报（带用户信息） */
export interface DailyReportWithUser {
  id: string;
  date: Date;
  completed: string;
  planned: string;
  issues: string | null;
  workHours: number | null;
  taskStats: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  user: UserBasic;
}

// ============ 通知相关类型 ============

/** 通知 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  link?: string | null;
  read: boolean;
  createdAt: Date;
  userId: string;
}

// ============ 广播相关类型 ============

/** 广播消息 */
export interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  workspaceId: string;
  senderId: string;
  createdAt: Date;
  sender?: UserBasic;
}

/** 咖啡抽奖 */
export interface CoffeeLottery {
  id: string;
  workspaceId: string;
  creatorId: string;
  winnerId?: string | null;
  participantIds: string[];
  status: 'pending' | 'completed';
  createdAt: Date;
  completedAt?: Date | null;
  creator?: UserBasic;
  winner?: UserBasic | null;
}

// ============ 任务相关类型 ============

/** 任务状态 */
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

/** 任务优先级 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/** 任务基础信息 */
export interface TaskBasic {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
}

// ============ 项目相关类型 ============

/** 项目基础信息 */
export interface ProjectBasic {
  id: string;
  name: string;
  workspaceId: string;
  leaderId?: string | null;
}

// ============ 工作区相关类型 ============

/** 工作区角色 */
export type WorkspaceRole = 'owner' | 'director' | 'manager' | 'member' | 'observer';

/** 工作区成员 */
export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  permissions: string[];
  joinedAt: Date;
  user: UserInfo;
}

// ============ 报告相关类型 ============

/** 任务统计 */
export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  blocked: number;
  overdue: number;
}

/** 成员统计 */
export interface MemberStats {
  userId: string;
  userName: string;
  taskCount: number;
  completedCount: number;
  completionRate: number;
}

/** 项目统计 */
export interface ProjectStats {
  projectId: string;
  projectName: string;
  taskStats: TaskStats;
  memberCount: number;
}







