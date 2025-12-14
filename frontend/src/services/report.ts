/**
 * 报告服务
 */
import api from './api';

export interface ReportContent {
  totalProjects: number;
  totalTasks: number;
  tasksCreated: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksBlocked: number;
  tasksByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  projectStats: Array<{
    name: string;
    total: number;
    created: number;
    completed: number;
    inProgress: number;
    blocked: number;
    completionRate: number;
  }>;
}

export interface Report {
  id: string;
  type: 'weekly' | 'monthly';
  title: string;
  startDate: string;
  endDate: string;
  content: ReportContent;
  summary?: string;
  highlights?: string[];
  concerns?: string[];
  createdAt: string;
}

export const reportService = {
  async generateWeekly(workspaceId: string): Promise<Report> {
    return api.post<Report>(`/reports/workspaces/${workspaceId}/weekly`);
  },

  async generateMonthly(workspaceId: string): Promise<Report> {
    return api.post<Report>(`/reports/workspaces/${workspaceId}/monthly`);
  },

  async getReports(workspaceId: string, type?: string): Promise<Report[]> {
    const params = type ? `?type=${type}` : '';
    const result = await api.get<Report[]>(`/reports/workspaces/${workspaceId}${params}`);
    return result || [];
  },

  async getReport(reportId: string): Promise<Report> {
    return api.get<Report>(`/reports/${reportId}`);
  },
};

