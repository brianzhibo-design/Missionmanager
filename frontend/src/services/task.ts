/**
 * 任务服务
 */
import { api } from './api';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  creatorId: string;
  assigneeId: string | null;
  parentId: string | null;
  project?: {
    id: string;
    name: string;
    workspaceId?: string;
    leaderId?: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  subTasks?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  availableTransitions?: string[];
  _count?: {
    subTasks: number;
  };
}

export interface TaskEvent {
  id: string;
  type: string;
  data: {
    description: string;
    oldValue?: string;
    newValue?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TasksResponse {
  tasks: Task[];
}

interface TaskResponse {
  task: Task;
}

interface TaskEventsResponse {
  events: TaskEvent[];
}

export interface TaskWithProject extends Omit<Task, 'project'> {
  project?: {
    id: string;
    name: string;
  };
}

export interface MyTasksStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
  dueToday: number;
}

export interface MyTasksResponse {
  tasks: TaskWithProject[];
  stats: MyTasksStats;
}

// 智能状态转换结果
export interface StatusChangeResult {
  task: Task;
  actualStatus: string;
  message: string;
  statusChanged: boolean;
}

// 批量完成结果
export interface BatchCompleteResult {
  results: {
    success: string[];
    failed: Array<{ id: string; reason: string }>;
    autoReviewed?: string[];
  };
  message: string;
}

export const taskService = {
  // 获取项目下的任务列表
  async getTasks(projectId: string): Promise<Task[]> {
    const response = await api.get<TasksResponse>(`/tasks?projectId=${projectId}`);
    return response.tasks;
  },

  // 获取任务详情
  async getTask(taskId: string): Promise<Task> {
    const response = await api.get<TaskResponse>(`/tasks/${taskId}`);
    return response.task;
  },

  // 获取任务事件历史
  async getTaskEvents(taskId: string): Promise<TaskEvent[]> {
    const response = await api.get<TaskEventsResponse>(`/tasks/${taskId}/events`);
    return response.events;
  },

  // 创建任务
  async createTask(data: {
    projectId: string;
    title: string;
    description?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
    parentId?: string; // 父任务 ID，用于创建子任务
  }): Promise<Task> {
    const response = await api.post<{ task: Task }>('/tasks', data);
    return response.task;
  },

  // 智能状态转换（保留用户习惯，后端智能处理）
  async updateTaskStatus(taskId: string, status: string): Promise<StatusChangeResult> {
    // API 封装层已经提取了 data.data，所以这里直接接收 StatusChangeResult
    const response = await api.patch<StatusChangeResult>(`/tasks/${taskId}/status`, {
      status,
    });
    
    // 安全检查
    if (!response) {
      throw new Error('状态更新返回数据为空');
    }
    
    // 确保所有必需字段存在
    return {
      task: response.task || {} as Task,
      actualStatus: response.actualStatus || status,
      message: response.message || '',
      statusChanged: response.statusChanged ?? false,
    };
  },

  // 更新任务
  async updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
    const response = await api.patch<{ task: Task }>(`/tasks/${taskId}`, data);
    return response.task;
  },

  // 获取当前用户的所有任务
  async getMyTasks(filters?: {
    status?: string;
    priority?: string;
    dueFilter?: string;
  }): Promise<MyTasksResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.dueFilter) params.append('dueFilter', filters.dueFilter);
    
    return api.get<MyTasksResponse>(`/tasks/my?${params.toString()}`);
  },

  // 删除任务
  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  // 批量完成任务（智能实现 - 遵循审核流程）
  async batchComplete(taskIds: string[]): Promise<BatchCompleteResult> {
    // API 封装层已经提取了 data.data，所以这里直接接收 { results, message }
    const response = await api.post<{
      results: {
        success: string[];
        failed: Array<{ id: string; reason: string }>;
        autoReviewed?: string[];
      };
      message: string;
    }>('/tasks/batch/complete', { taskIds });
    
    // 确保返回格式正确
    if (!response || !response.results) {
      console.error('批量完成返回数据格式错误:', response);
      throw new Error('批量完成返回数据格式错误');
    }
    
    return {
      results: response.results,
      message: response.message || '',
    };
  },

  // 批量删除任务（含级联删除子任务）
  async batchDelete(taskIds: string[]): Promise<{
    results: {
      success: string[];
      failed: Array<{ id: string; reason: string }>;
      subtaskCount: number;
    };
    message: string;
  }> {
    const response = await api.post<{
      results: {
        success: string[];
        failed: Array<{ id: string; reason: string }>;
        subtaskCount: number;
      };
      message: string;
    }>('/tasks/batch/delete', { taskIds });
    return response;
  },

  // ===== 任务审核相关 =====

  /**
   * 提交任务审核
   * 任务负责人将任务从 in_progress 转为 review
   */
  async submitForReview(taskId: string): Promise<{ task: Task }> {
    const response = await api.post<{ task: Task }>(`/tasks/${taskId}/submit-review`);
    return response;
  },

  /**
   * 审核通过
   * 项目负责人/管理员将任务从 review 转为 done
   */
  async approveTask(taskId: string): Promise<{ task: Task }> {
    const response = await api.post<{ task: Task }>(`/tasks/${taskId}/approve`);
    return response;
  },

  /**
   * 审核不通过
   * 项目负责人/管理员将任务从 review 退回 in_progress
   */
  async rejectTask(taskId: string, reason?: string): Promise<{ task: Task }> {
    const response = await api.post<{ task: Task }>(`/tasks/${taskId}/reject`, { reason });
    return response;
  },

  /**
   * 开始任务
   * 将任务从 todo 转为 in_progress
   */
  async startTask(taskId: string): Promise<{ task: Task }> {
    const response = await api.post<{ task: Task }>(`/tasks/${taskId}/start`);
    return response;
  },

  /**
   * 重新打开任务
   * 将任务从 done 转为 in_progress
   */
  async reopenTask(taskId: string): Promise<{ task: Task }> {
    const response = await api.post<{ task: Task }>(`/tasks/${taskId}/reopen`);
    return response;
  },

  /**
   * 直接完成任务（无需审核）
   * 将任务从 in_progress 转为 done
   */
  async completeTask(taskId: string): Promise<{ task: Task }> {
    const response = await api.post<{ task: Task }>(`/tasks/${taskId}/complete`);
    return response;
  },
};

// 状态标签映射
export const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  review: '审核中',
  done: '已完成',
};

// 优先级标签映射
export const PRIORITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

// 状态颜色映射
export const STATUS_COLORS: Record<string, string> = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  review: '#8b5cf6',
  done: '#10b981',
};

// 优先级颜色映射
export const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

