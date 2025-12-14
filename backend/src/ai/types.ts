/**
 * AI 相关类型定义
 */
import { AiAnalysisResult } from '../repositories/taskAiAnalysisRepository';

// 任务分析输入
export interface TaskAnalysisInput {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    createdAt: Date;
    updatedAt: Date;
    dueDate: Date | null;
    assignee: { name: string } | null;
    subTasks: Array<{ title: string; status: string }>;
  };
  recentEvents: Array<{
    type: string;
    data: unknown;
    createdAt: Date;
  }>;
  context: {
    projectName: string;
    totalProjectTasks: number;
    completedProjectTasks: number;
  };
}

// AI Provider 接口（统一抽象）
export interface AiProvider {
  name: string;
  analyzeTask(input: TaskAnalysisInput): Promise<{
    result: AiAnalysisResult;
    tokenUsage?: number;
  }>;
  // 通用 prompt 分析方法
  analyzeWithPrompt<T>(prompt: string): Promise<T>;
}

// ==================== 团队树分析 ====================

export interface MemberTreeNode {
  userId: string;
  name: string;
  role: string;
  taskStats: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    blocked: number;
    done: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
  children: MemberTreeNode[];
}

export interface TeamTreeAnalysisContext {
  project: {
    id: string;
    name: string;
  };
  memberTree: MemberTreeNode;
  totalMembers: number;
  totalTasks: number;
}

export interface TeamTreeAnalysisResult {
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
    type: 'blocked_tasks' | 'dependency' | 'resource';
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

// ==================== 项目全景分析 ====================

export interface ProjectsOverviewContext {
  workspace: {
    id: string;
    name: string;
  };
  totalProjects: number;
  overallStats: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    blocked: number;
    done: number;
  };
  projects: Array<{
    projectId: string;
    name: string;
    progress: number;
    taskStats: {
      total: number;
      todo: number;
      inProgress: number;
      review: number;
      blocked: number;
      done: number;
    };
    topMembers: Array<{
      name: string;
      role: string;
      taskCount: number;
    }>;
    recentActivity: string | null;
  }>;
}

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

