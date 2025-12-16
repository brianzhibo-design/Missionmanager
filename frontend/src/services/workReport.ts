/**
 * 工作日报服务
 */
import { api } from './api';

export type ReportType = 'daily' | 'weekly' | 'monthly';
export type Mood = 'happy' | 'normal' | 'tired' | 'stressed';
export type Workload = 'light' | 'normal' | 'heavy' | 'overload';

export interface WorkReport {
  id: string;
  type: ReportType;
  reportDate: string;
  todayWork: string | null;
  tomorrowPlan: string | null;
  issues: string | null;
  needSupport: string | null;
  summary: string | null;
  completedCount: number;
  inProgressCount: number;
  totalHours: number | null;
  mood: Mood | null;
  workload: Workload | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  completedTasks?: {
    id: string;
    title: string;
    completedAt: string;
    project?: { name: string };
  }[];
  inProgressTasks?: {
    id: string;
    title: string;
    dueDate: string | null;
    project?: { name: string };
  }[];
}

export interface CreateWorkReportInput {
  type: ReportType;
  reportDate: string;
  projectId?: string;
  todayWork?: string;
  tomorrowPlan?: string;
  issues?: string;
  needSupport?: string;
  summary?: string;
  mood?: Mood;
  workload?: Workload;
  totalHours?: number;
}

export interface TeamReportStats {
  totalMembers: number;
  submittedCount: number;
  notSubmittedMembers: {
    id: string;
    name: string;
    avatar: string | null;
  }[];
}

export const workReportService = {
  /**
   * 创建或更新日报
   */
  async createOrUpdate(workspaceId: string, input: CreateWorkReportInput): Promise<WorkReport> {
    return api.post<WorkReport>(`/work-reports/workspaces/${workspaceId}`, input);
  },

  /**
   * 获取我的日报列表
   */
  async getMyReports(
    workspaceId: string,
    options: {
      type?: ReportType;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: WorkReport[]; total: number }> {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<{ reports: WorkReport[]; total: number }>(
      `/work-reports/workspaces/${workspaceId}/my${query}`
    );
  },

  /**
   * 获取团队日报
   */
  async getTeamReports(
    workspaceId: string,
    options: {
      projectId?: string;
      type?: ReportType;
      reportDate?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: WorkReport[]; total: number; canView: boolean }> {
    const params = new URLSearchParams();
    if (options.projectId) params.append('projectId', options.projectId);
    if (options.type) params.append('type', options.type);
    if (options.reportDate) params.append('reportDate', options.reportDate);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<{ reports: WorkReport[]; total: number; canView: boolean }>(
      `/work-reports/workspaces/${workspaceId}/team${query}`
    );
  },

  /**
   * 获取团队日报统计
   */
  async getTeamStats(
    workspaceId: string,
    type: ReportType,
    reportDate: string,
    projectId?: string
  ): Promise<TeamReportStats> {
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('reportDate', reportDate);
    if (projectId) params.append('projectId', projectId);

    return api.get<TeamReportStats>(
      `/work-reports/workspaces/${workspaceId}/team/stats?${params.toString()}`
    );
  },

  /**
   * 获取日报详情
   */
  async getById(reportId: string): Promise<WorkReport> {
    return api.get<WorkReport>(`/work-reports/${reportId}`);
  },

  /**
   * 删除日报
   */
  async delete(reportId: string): Promise<void> {
    await api.delete(`/work-reports/${reportId}`);
  },

  /**
   * 检查今日是否已提交
   */
  async checkTodaySubmitted(
    workspaceId: string,
    type: ReportType = 'daily'
  ): Promise<boolean> {
    const result = await api.get<{ submitted: boolean }>(
      `/work-reports/workspaces/${workspaceId}/check-today?type=${type}`
    );
    return result.submitted;
  },
};

// 辅助函数
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  daily: '日报',
  weekly: '周报',
  monthly: '月报',
};

export const MOOD_LABELS: Record<Mood, string> = {
  happy: '😊 开心',
  normal: '😐 一般',
  tired: '😩 疲惫',
  stressed: '😰 焦虑',
};

export const WORKLOAD_LABELS: Record<Workload, string> = {
  light: '轻松',
  normal: '适中',
  heavy: '繁忙',
  overload: '超负荷',
};

export const MOOD_ICONS: Record<Mood, string> = {
  happy: '😊',
  normal: '😐',
  tired: '😩',
  stressed: '😰',
};

