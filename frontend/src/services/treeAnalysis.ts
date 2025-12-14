/**
 * 树分析服务
 * 调用后端 AI 分析 API
 */
import api from './api';

// ==================== 团队树分析类型 ====================

export interface TeamAnalysisResult {
  team_health: {
    score: number;
    status: 'healthy' | 'needs_attention' | 'at_risk' | 'critical';
    summary: string;
  };
  workload_analysis: {
    overloaded_members: Array<{
      name: string;
      task_count: number;
      blocked_count: number;
      suggestion: string;
    }>;
    idle_members: Array<{
      name: string;
      task_count: number;
      suggestion: string;
    }>;
    balance_score: number;
  };
  bottlenecks: Array<{
    type: string;
    description: string;
    affected_members: string[];
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
  recommendations: Array<{
    action: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }>;
  insights?: string;
}

// ==================== 项目全景分析类型 ====================

export interface ProjectsOverviewResult {
  organization_health: {
    score: number;
    status: 'healthy' | 'needs_attention' | 'at_risk' | 'critical';
    summary: string;
  };
  project_comparison: Array<{
    project_name: string;
    health_score: number;
    risk_level: 'high' | 'medium' | 'low';
    key_issue: string | null;
    recommendation: string;
  }>;
  resource_analysis: {
    utilization_score: number;
    imbalances: Array<{
      description: string;
      affected_projects: string[];
      suggestion: string;
    }>;
  };
  risk_heatmap: {
    high_risk_projects: string[];
    medium_risk_projects: string[];
    low_risk_projects: string[];
  };
  top_priorities: Array<{
    action: string;
    project: string;
    urgency: 'high' | 'medium' | 'low';
  }>;
  insights?: string;
}

// ==================== 服务方法 ====================

export const treeAnalysisService = {
  /**
   * 分析团队任务树
   */
  async analyzeTeam(projectId: string): Promise<TeamAnalysisResult> {
    const response = await api.post<{ analysis: TeamAnalysisResult }>(
      `/tree-analysis/projects/${projectId}/team`
    );
    return response.analysis;
  },

  /**
   * 分析项目全景
   */
  async analyzeProjectsOverview(workspaceId: string): Promise<ProjectsOverviewResult> {
    const response = await api.post<{ analysis: ProjectsOverviewResult }>(
      `/tree-analysis/workspaces/${workspaceId}/overview`
    );
    return response.analysis;
  },
};

export default treeAnalysisService;

