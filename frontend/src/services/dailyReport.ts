/**
 * 日报前端服务（极简版）
 */
import { api } from './api';

export interface TaskStat {
  id: string;
  title: string;
  completedAt?: string;
  dueDate?: string;
}

export interface TaskStats {
  completed: TaskStat[];
  inProgress: TaskStat[];
  completedCount: number;
  inProgressCount: number;
}

export interface DailyReport {
  id: string;
  date: string;
  completed: string;
  planned: string;
  issues: string | null;
  workHours: number | null;
  taskStats: TaskStats | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface CreateDailyReportInput {
  workspaceId: string;
  date: string;
  completed: string;
  planned: string;
  issues?: string;
  workHours?: number;
}

export interface AIFillResult {
  completed: string;
  planned: string;
  issues: string;
  taskStats: TaskStats;
}

export interface TeamReportsResult {
  reports: DailyReport[];
  notSubmitted: { id: string; name: string; avatar: string | null }[];
}

export const dailyReportService = {
  /**
   * 创建或更新日报
   */
  async create(input: CreateDailyReportInput): Promise<DailyReport> {
    return api.post<DailyReport>('/daily-reports', input);
  },

  /**
   * 获取我的日报列表
   */
  async getMyReports(
    workspaceId: string,
    options?: { startDate?: string; endDate?: string; limit?: number }
  ): Promise<DailyReport[]> {
    const params = new URLSearchParams({ workspaceId });
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.limit) params.append('limit', options.limit.toString());

    return api.get<DailyReport[]>(`/daily-reports/my?${params.toString()}`);
  },

  /**
   * 获取今日日报
   */
  async getTodayReport(workspaceId: string): Promise<DailyReport | null> {
    return api.get<DailyReport | null>(`/daily-reports/today?workspaceId=${workspaceId}`);
  },

  /**
   * 获取团队日报
   */
  async getTeamReports(workspaceId: string, date: string): Promise<TeamReportsResult> {
    return api.get<TeamReportsResult>(`/daily-reports/team?workspaceId=${workspaceId}&date=${date}`);
  },

  /**
   * AI自动填充
   */
  async aiFill(workspaceId: string, date?: string): Promise<AIFillResult> {
    const params = new URLSearchParams({ workspaceId });
    if (date) params.append('date', date);
    return api.get<AIFillResult>(`/daily-reports/ai-fill?${params.toString()}`);
  },

  /**
   * 获取单个日报
   */
  async getById(id: string): Promise<DailyReport> {
    return api.get<DailyReport>(`/daily-reports/${id}`);
  },

  /**
   * 删除日报
   */
  async delete(id: string): Promise<void> {
    return api.delete(`/daily-reports/${id}`);
  },
};

