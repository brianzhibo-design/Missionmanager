/**
 * 任务相关常量
 */

// 任务状态
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
} as const;

export type TaskStatusType = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// 状态显示配置
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  todo: { 
    label: '待办', 
    color: 'var(--text-secondary)', 
    bg: 'var(--bg-surface-secondary)' 
  },
  in_progress: { 
    label: '进行中', 
    color: 'var(--color-info)', 
    bg: 'var(--color-info-alpha-10)' 
  },
  review: { 
    label: '审核中', 
    color: 'var(--color-warning)', 
    bg: 'var(--color-warning-alpha-10)' 
  },
  done: { 
    label: '已完成', 
    color: 'var(--color-success)', 
    bg: 'var(--color-success-alpha-10)' 
  },
};

// 状态标签映射
export const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  review: '审核中',
  done: '已完成',
};

// 任务优先级
export const TASK_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type TaskPriorityType = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

// 优先级显示配置
export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: '紧急', color: 'var(--color-danger)' },
  high: { label: '高', color: 'var(--color-warning)' },
  medium: { label: '中', color: 'var(--color-info)' },
  low: { label: '低', color: 'var(--text-tertiary)' },
};

// 优先级标签映射
export const PRIORITY_LABELS: Record<string, string> = {
  critical: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

// 优先级权重（用于排序）
export const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// 排序选项类型
export type SortOption = 'created_desc' | 'created_asc' | 'priority_desc' | 'priority_asc' | 'due_asc' | 'due_desc';

// 排序选项配置
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created_desc', label: '创建时间（最新）' },
  { value: 'created_asc', label: '创建时间（最早）' },
  { value: 'priority_desc', label: '优先级（高→低）' },
  { value: 'priority_asc', label: '优先级（低→高）' },
  { value: 'due_asc', label: '截止日期（最近）' },
  { value: 'due_desc', label: '截止日期（最远）' },
];

// 辅助函数：获取状态标签
export function getStatusLabel(status: string | undefined): string {
  if (!status) return '待办';
  const normalized = status.toLowerCase();
  return STATUS_LABELS[normalized] || '待办';
}

// 辅助函数：获取优先级标签
export function getPriorityLabel(priority: string | undefined): string {
  if (!priority) return '中';
  const normalized = priority.toLowerCase();
  return PRIORITY_LABELS[normalized] || '中';
}

// 辅助函数：获取状态颜色
export function getStatusColor(status: string | undefined): string {
  if (!status) return STATUS_CONFIG.todo.color;
  const normalized = status.toLowerCase();
  return STATUS_CONFIG[normalized]?.color || STATUS_CONFIG.todo.color;
}

// 辅助函数：获取优先级颜色
export function getPriorityColor(priority: string | undefined): string {
  if (!priority) return PRIORITY_CONFIG.medium.color;
  const normalized = priority.toLowerCase();
  return PRIORITY_CONFIG[normalized]?.color || PRIORITY_CONFIG.medium.color;
}
