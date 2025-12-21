/**
 * 树分析服务
 * 提供团队任务树分析和项目全景分析功能
 */
import { treeService } from './treeService';
import { workspaceRepository, mapRole } from '../repositories/workspaceRepository';
import { projectRepository } from '../repositories/projectRepository';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../infra/logger';
import { config } from '../infra/config';
import { mockProvider } from '../ai/providers/mockProvider';
import { getAnthropicProvider } from '../ai/providers/anthropicProvider';
import {
  AiProvider,
  TeamTreeAnalysisContext,
  TeamTreeAnalysisResult,
  ProjectsOverviewContext,
  ProjectsOverviewResult,
  MemberTreeNode,
} from '../ai/types';
import { MemberNode } from '../types/tree';

// 缓存 provider 实例
let cachedProvider: AiProvider | null = null;

function getProvider(): AiProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = config.aiProvider;
  logger.info(`树分析初始化 AI provider: ${providerName}`);

  switch (providerName) {
    case 'anthropic':
      try {
        cachedProvider = getAnthropicProvider();
      } catch (error) {
        logger.error(`Anthropic provider 初始化失败，回退到 mock: ${error}`);
        cachedProvider = mockProvider;
      }
      break;
    case 'mock':
    default:
      cachedProvider = mockProvider;
      break;
  }

  return cachedProvider;
}

export const treeAnalysisService = {
  /**
   * 分析团队任务树
   * 权限：owner、director 可用；manager 只能分析自己负责的项目
   */
  async analyzeTeamTree(userId: string, projectId: string): Promise<TeamTreeAnalysisResult> {
    // 1. 权限检查
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    const workspaceMembership = await workspaceRepository.getMembership(project.workspaceId, userId);
    if (!workspaceMembership) {
      throw new AppError('无权访问此项目', 403, 'ACCESS_DENIED');
    }

    // 映射角色代码
    const mappedRole = mapRole(workspaceMembership.role);
    
    // 权限检查：owner、admin 可用；项目负责人可以分析自己的项目
    const canAnalyze = 
      ['owner', 'director'].includes(mappedRole) ||
      project.leaderId === userId;

    if (!canAnalyze) {
      throw new AppError('无权使用AI团队分析，需要项目管理员权限', 403, 'REQUIRE_PROJECT_ADMIN');
    }

    // 2. 获取成员树数据
    const treeData = await treeService.getMemberTree(userId, projectId);

    // 2. 计算统计信息
    const { totalMembers, totalTasks } = this.calculateTreeStats(treeData.tree);

    // 3. 构建分析上下文
    const context: TeamTreeAnalysisContext = {
      project: {
        id: projectId,
        name: treeData.projectName,
      },
      memberTree: this.convertToAnalysisNode(treeData.tree),
      totalMembers,
      totalTasks,
    };

    // 4. 调用 AI 分析
    const provider = getProvider();
    logger.info(`开始团队树分析，项目: ${projectId}，provider: ${provider.name}`);

    const prompt = this.buildTeamTreePrompt(context);
    const result = await provider.analyzeWithPrompt<TeamTreeAnalysisResult>(prompt);

    logger.info(`团队树分析完成`);
    return result;
  },

  /**
   * 分析项目全景
   */
  async analyzeProjectsOverview(userId: string, workspaceId: string): Promise<ProjectsOverviewResult> {
    // 1. 获取项目树数据
    const treeData = await treeService.getProjectTree(userId, workspaceId);

    // 2. 获取工作区信息
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new AppError('工作区不存在', 404, 'WORKSPACE_NOT_FOUND');
    }

    // 3. 构建分析上下文
    const context: ProjectsOverviewContext = {
      workspace: {
        id: workspaceId,
        name: workspace.name,
      },
      totalProjects: treeData.totalProjects,
      overallStats: treeData.overallStats,
      projects: treeData.projects.map((p) => ({
        projectId: p.projectId,
        name: p.name,
        progress: p.progress,
        taskStats: p.taskStats,
        topMembers: p.topMembers.map((m) => ({
          name: m.name,
          role: m.role,
          taskCount: m.taskCount,
        })),
        recentActivity: p.recentActivity,
      })),
    };

    // 4. 调用 AI 分析
    const provider = getProvider();
    logger.info(`开始项目全景分析，工作区: ${workspaceId}，provider: ${provider.name}`);

    const prompt = this.buildProjectsOverviewPrompt(context);
    const result = await provider.analyzeWithPrompt<ProjectsOverviewResult>(prompt);

    logger.info(`项目全景分析完成`);
    return result;
  },

  // ==================== 辅助方法 ====================

  calculateTreeStats(node: MemberNode): { totalMembers: number; totalTasks: number } {
    let totalMembers = 1;
    let totalTasks = node.taskStats?.total || 0;

    if (node.children) {
      for (const child of node.children) {
        const childStats = this.calculateTreeStats(child);
        totalMembers += childStats.totalMembers;
        totalTasks += childStats.totalTasks;
      }
    }

    return { totalMembers, totalTasks };
  },

  convertToAnalysisNode(node: MemberNode): MemberTreeNode {
    return {
      userId: node.userId,
      name: node.name,
      role: node.role,
      taskStats: node.taskStats,
      tasks: node.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
      children: node.children.map((c) => this.convertToAnalysisNode(c)),
    };
  },

  buildTeamTreePrompt(context: TeamTreeAnalysisContext): string {
    const formatMemberTree = (node: MemberTreeNode, indent: string = ''): string => {
      const roleEmoji = node.role === 'project_admin' ? '👑' : node.role === 'team_lead' ? '⭐' : '👤';
      let result = `${indent}${roleEmoji} ${node.name} (${node.role})\n`;
      result += `${indent}   任务: 总${node.taskStats.total} | 完成${node.taskStats.done} | 进行中${node.taskStats.inProgress} | 阻塞${node.taskStats.blocked}\n`;

      if (node.tasks.length > 0) {
        result += `${indent}   具体任务:\n`;
        node.tasks.slice(0, 5).forEach((t) => {
          result += `${indent}     - [${t.status}] ${t.title} (${t.priority})\n`;
        });
        if (node.tasks.length > 5) {
          result += `${indent}     ... 还有 ${node.tasks.length - 5} 个任务\n`;
        }
      }

      node.children.forEach((child) => {
        result += formatMemberTree(child, indent + '  ');
      });

      return result;
    };

    return `你是一个专业的团队管理分析助手。请分析以下项目团队的工作情况。

## 项目信息
- 项目名称：${context.project.name}
- 团队成员数：${context.totalMembers}
- 任务总数：${context.totalTasks}

## 团队结构与任务分布
${formatMemberTree(context.memberTree)}

---

请用 JSON 格式返回分析结果，只返回 JSON：

{
  "team_health": {
    "score": 0-100,
    "status": "healthy" | "needs_attention" | "at_risk" | "critical",
    "summary": "一句话总结"
  },
  "workload_analysis": {
    "overloaded_members": [{ "name": "姓名", "task_count": 数量, "blocked_count": 数量, "suggestion": "建议" }],
    "idle_members": [{ "name": "姓名", "task_count": 数量, "suggestion": "建议" }],
    "balance_score": 0-100
  },
  "bottlenecks": [{ "type": "blocked_tasks|dependency|resource", "description": "描述", "affected_members": [], "priority": "high|medium|low", "suggestion": "建议" }],
  "recommendations": [{ "action": "建议", "impact": "high|medium|low", "effort": "high|medium|low" }],
  "insights": "洞察"
}

分析要点：
1. 识别任务负载不均衡的情况
2. 找出阻塞任务集中的成员
3. 分析团队层级是否合理
4. 提供可执行的改进建议`;
  },

  buildProjectsOverviewPrompt(context: ProjectsOverviewContext): string {
    const completionRate = context.overallStats.total > 0
      ? Math.round((context.overallStats.done / context.overallStats.total) * 100)
      : 0;

    const projectsList = context.projects.map((p) => {
      const members = p.topMembers.map((m) => `${m.name}(${m.taskCount}任务)`).join(', ');
      return `### ${p.name}
- 进度：${p.progress}%
- 任务：总${p.taskStats.total} | 完成${p.taskStats.done} | 进行中${p.taskStats.inProgress} | 阻塞${p.taskStats.blocked}
- 主要成员：${members || '无'}
- 最近活动：${p.recentActivity ? new Date(p.recentActivity).toLocaleDateString() : '无'}`;
    }).join('\n\n');

    return `你是一个专业的组织管理分析助手。请分析以下工作区的项目全景。

## 工作区信息
- 工作区名称：${context.workspace.name}
- 项目总数：${context.totalProjects}
- 任务总数：${context.overallStats.total}
- 整体完成率：${completionRate}%

## 项目概览
${projectsList}

---

请用 JSON 格式返回分析结果，只返回 JSON：

{
  "organization_health": {
    "score": 0-100,
    "status": "healthy" | "needs_attention" | "at_risk" | "critical",
    "summary": "一句话总结"
  },
  "project_comparison": [{ "project_name": "名称", "health_score": 0-100, "risk_level": "high|medium|low", "key_issue": "问题或null", "recommendation": "建议" }],
  "resource_analysis": {
    "utilization_score": 0-100,
    "imbalances": [{ "description": "描述", "affected_projects": [], "suggestion": "建议" }]
  },
  "risk_heatmap": {
    "high_risk_projects": [],
    "medium_risk_projects": [],
    "low_risk_projects": []
  },
  "top_priorities": [{ "action": "行动", "project": "项目", "urgency": "high|medium|low" }],
  "insights": "洞察"
}

分析要点：
1. 对比各项目的健康状况
2. 识别资源分配不均的问题
3. 找出需要立即关注的风险项目
4. 提供跨项目的资源调配建议`;
  },
};

