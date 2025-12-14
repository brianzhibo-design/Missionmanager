/**
 * 模拟 AI Provider
 * 用于开发和测试，返回固定格式的模拟数据
 */
import {
  AiProvider,
  TaskAnalysisInput,
  TeamTreeAnalysisResult,
  ProjectsOverviewResult,
} from '../types';
import { AiAnalysisResult } from '../../repositories/taskAiAnalysisRepository';

export const mockProvider: AiProvider = {
  name: 'mock',

  async analyzeTask(input: TaskAnalysisInput) {
    // 模拟一点延迟，让体验更真实
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 根据任务状态生成不同的模拟结果
    const statusMap: Record<string, AiAnalysisResult['progress_assessment']['status']> = {
      todo: 'on_track',
      in_progress: 'on_track',
      review: 'on_track',
      blocked: 'blocked',
      done: 'on_track',
    };

    const progressMap: Record<string, number> = {
      todo: 0,
      in_progress: 40,
      review: 80,
      blocked: 30,
      done: 100,
    };

    const result: AiAnalysisResult = {
      progress_assessment: {
        percentage: progressMap[input.task.status] || 50,
        status: statusMap[input.task.status] || 'on_track',
        summary: `任务「${input.task.title}」当前处于${getStatusName(input.task.status)}状态，${getProgressSummary(input.task.status)}`,
      },
      next_actions: generateMockActions(input),
      risks: generateMockRisks(input),
      insights: `[模拟分析] 该任务属于项目「${input.context.projectName}」，项目整体完成度 ${Math.round((input.context.completedProjectTasks / input.context.totalProjectTasks) * 100) || 0}%。`,
    };

    return {
      result,
      tokenUsage: 0, // 模拟不消耗 token
    };
  },

  async analyzeWithPrompt<T>(prompt: string): Promise<T> {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 根据 prompt 内容判断返回类型
    if (prompt.includes('团队管理分析')) {
      return getMockTeamAnalysis() as T;
    } else if (prompt.includes('组织管理分析')) {
      return getMockProjectsOverview() as T;
    }

    throw new Error('Unknown analysis type');
  },
};

// 辅助函数
function getStatusName(status: string): string {
  const names: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    review: '审核中',
    blocked: '已阻塞',
    done: '已完成',
  };
  return names[status] || status;
}

function getProgressSummary(status: string): string {
  const summaries: Record<string, string> = {
    todo: '尚未开始执行',
    in_progress: '正在推进中',
    review: '已进入审核阶段',
    blocked: '遇到障碍需要处理',
    done: '已顺利完成',
  };
  return summaries[status] || '状态正常';
}

function generateMockActions(input: TaskAnalysisInput) {
  const actions: AiAnalysisResult['next_actions'] = [];

  if (input.task.status === 'todo') {
    actions.push({
      action: '开始执行任务，将状态更新为「进行中」',
      priority: 'high',
      estimated_minutes: 5,
    });
  }

  if (input.task.status === 'in_progress') {
    actions.push({
      action: '继续推进核心工作内容',
      priority: 'high',
      estimated_minutes: 60,
    });
  }

  if (input.task.status === 'blocked') {
    actions.push({
      action: '识别并解决阻塞原因',
      priority: 'high',
      estimated_minutes: 30,
    });
  }

  if (!input.task.dueDate) {
    actions.push({
      action: '设置明确的截止日期',
      priority: 'medium',
      estimated_minutes: 5,
    });
  }

  if (!input.task.assignee) {
    actions.push({
      action: '分配负责人',
      priority: 'medium',
      estimated_minutes: 5,
    });
  }

  if (input.task.subTasks.length === 0) {
    actions.push({
      action: '考虑将任务拆分为更小的子任务',
      priority: 'low',
      estimated_minutes: 15,
    });
  }

  return actions.slice(0, 5); // 最多 5 条
}

function generateMockRisks(input: TaskAnalysisInput) {
  const risks: AiAnalysisResult['risks'] = [];

  if (input.task.status === 'blocked') {
    risks.push({
      description: '任务处于阻塞状态，可能影响项目进度',
      severity: 'high',
      mitigation: '尽快识别阻塞原因并寻求解决方案',
    });
  }

  if (input.task.dueDate) {
    const daysUntilDue = Math.ceil(
      (new Date(input.task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDue < 0) {
      risks.push({
        description: `任务已逾期 ${Math.abs(daysUntilDue)} 天`,
        severity: 'high',
        mitigation: '评估是否需要调整截止日期或增加资源',
      });
    } else if (daysUntilDue < 3 && input.task.status !== 'done') {
      risks.push({
        description: `距离截止日期仅剩 ${daysUntilDue} 天`,
        severity: 'medium',
        mitigation: '优先处理此任务，确保按时完成',
      });
    }
  }

  if (!input.task.assignee) {
    risks.push({
      description: '任务未分配负责人',
      severity: 'medium',
      mitigation: '尽快指定负责人以明确责任',
    });
  }

  return risks;
}

// ==================== 团队树分析模拟数据 ====================

function getMockTeamAnalysis(): TeamTreeAnalysisResult {
  return {
    team_health: {
      score: 72,
      status: 'needs_attention',
      summary: '[模拟分析] 团队整体运转正常，但存在任务分配不均的问题需要关注',
    },
    workload_analysis: {
      overloaded_members: [
        {
          name: '示例成员A',
          task_count: 8,
          blocked_count: 2,
          suggestion: '建议将部分任务分配给其他成员',
        },
      ],
      idle_members: [
        {
          name: '示例成员B',
          task_count: 1,
          suggestion: '可以承担更多任务',
        },
      ],
      balance_score: 65,
    },
    bottlenecks: [
      {
        type: 'blocked_tasks',
        description: '存在阻塞任务需要处理',
        affected_members: ['示例成员A'],
        priority: 'medium',
        suggestion: '优先解决阻塞任务，考虑引入外部支持',
      },
    ],
    recommendations: [
      {
        action: '重新评估任务分配，确保工作量均衡',
        impact: 'high',
        effort: 'medium',
      },
      {
        action: '建立每日站会机制，及时发现阻塞问题',
        impact: 'medium',
        effort: 'low',
      },
      {
        action: '为空闲成员安排新任务或培训',
        impact: 'medium',
        effort: 'low',
      },
    ],
    insights: '[模拟分析] 建议关注团队成员的工作负载分布，适时调整任务分配。定期进行一对一沟通，了解成员的工作状态和需求。',
  };
}

// ==================== 项目全景分析模拟数据 ====================

function getMockProjectsOverview(): ProjectsOverviewResult {
  return {
    organization_health: {
      score: 68,
      status: 'needs_attention',
      summary: '[模拟分析] 组织整体进展正常，部分项目需要重点关注',
    },
    project_comparison: [
      {
        project_name: '示例项目A',
        health_score: 85,
        risk_level: 'low',
        key_issue: null,
        recommendation: '继续保持良好势头',
      },
      {
        project_name: '示例项目B',
        health_score: 55,
        risk_level: 'medium',
        key_issue: '进度略有滞后',
        recommendation: '增加资源投入或调整截止日期',
      },
    ],
    resource_analysis: {
      utilization_score: 75,
      imbalances: [
        {
          description: '部分项目人力资源紧张，而其他项目有闲置资源',
          affected_projects: ['示例项目B'],
          suggestion: '考虑跨项目资源调配',
        },
      ],
    },
    risk_heatmap: {
      high_risk_projects: [],
      medium_risk_projects: ['示例项目B'],
      low_risk_projects: ['示例项目A'],
    },
    top_priorities: [
      {
        action: '关注阻塞任务的解决',
        project: '示例项目B',
        urgency: 'high',
      },
      {
        action: '优化资源分配',
        project: '全局',
        urgency: 'medium',
      },
    ],
    insights: '[模拟分析] 建议定期进行跨项目资源评估，确保关键项目有足够支持。同时建立预警机制，及时发现并处理风险项目。',
  };
}

