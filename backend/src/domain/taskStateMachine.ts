/**
 * 任务状态机
 * 定义任务状态及合法的状态流转规则
 */

// 任务状态枚举（与数据库保持一致，使用小写）
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  BLOCKED: 'blocked',
  DONE: 'done',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

// 任务优先级枚举
export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type TaskPriorityType = (typeof TaskPriority)[keyof typeof TaskPriority];

// 状态流转规则：从哪个状态可以转到哪些状态
const STATE_TRANSITIONS: Record<TaskStatusType, TaskStatusType[]> = {
  todo: ['in_progress', 'blocked', 'done'],           // 待办 → 进行中/阻塞/完成
  in_progress: ['todo', 'review', 'blocked', 'done'], // 进行中 → 待办/审核/阻塞/完成
  review: ['in_progress', 'blocked', 'done'],         // 审核 → 进行中/阻塞/完成
  blocked: ['todo', 'in_progress'],                   // 阻塞 → 待办/进行中
  done: ['todo', 'in_progress'],                      // 完成 → 重新打开
};

// 状态显示名称
export const STATUS_LABELS: Record<TaskStatusType, string> = {
  todo: '待办',
  in_progress: '进行中',
  review: '审核中',
  blocked: '已阻塞',
  done: '已完成',
};

// 优先级显示名称
export const PRIORITY_LABELS: Record<TaskPriorityType, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

/**
 * 检查状态转换是否合法
 */
export function canTransition(from: TaskStatusType, to: TaskStatusType): boolean {
  if (from === to) return true; // 相同状态不算转换
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 获取可转换的目标状态列表
 */
export function getAvailableTransitions(currentStatus: TaskStatusType): TaskStatusType[] {
  return STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * 验证状态值是否有效
 */
export function isValidStatus(status: string): status is TaskStatusType {
  return Object.values(TaskStatus).includes(status as TaskStatusType);
}

/**
 * 验证优先级值是否有效
 */
export function isValidPriority(priority: string): priority is TaskPriorityType {
  return Object.values(TaskPriority).includes(priority as TaskPriorityType);
}

