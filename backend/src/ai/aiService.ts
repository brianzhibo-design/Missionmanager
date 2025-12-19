/**
 * AI 服务
 * 提供任务分析功能，支持多 Provider
 */
import { config } from '../infra/config';
import { taskRepository } from '../repositories/taskRepository';
import { taskEventRepository } from '../repositories/taskEventRepository';
import { taskAiAnalysisRepository } from '../repositories/taskAiAnalysisRepository';
import { workspaceService } from '../services/workspaceService';
import { AiProvider, TaskAnalysisInput } from './types';
import { mockProvider } from './providers/mockProvider';
import { getAnthropicProvider } from './providers/anthropicProvider';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../infra/logger';

// 缓存 provider 实例
let cachedProvider: AiProvider | null = null;

// 获取当前配置的 provider
export function getProvider(): AiProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = config.aiProvider;
  logger.info(`初始化 AI provider: ${providerName}`);

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

// 重置 provider（用于切换或测试）
export function resetAiProvider(): void {
  cachedProvider = null;
}

export const aiService = {
  /**
   * 分析单个任务
   */
  async analyzeTask(userId: string, taskId: string) {
    // 1. 获取任务详情
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 2. 权限检查（所有成员都可以使用 AI 分析）
    await workspaceService.requireRole(task.project.workspaceId, userId, ['owner', 'admin', 'leader', 'member', 'guest']);

    // 3. 获取任务事件历史
    const events = await taskEventRepository.findByTaskId(taskId, 10);

    // 4. 获取项目统计
    const projectStats = await taskRepository.getProjectStats(task.projectId);
    const totalTasks = Object.values(projectStats).reduce((a, b) => a + b, 0);
    const completedTasks = projectStats.done || 0;

    // 5. 构建分析输入
    const input: TaskAnalysisInput = {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate,
        assignee: task.assignee ? { name: task.assignee.name } : null,
        subTasks: task.subTasks.map((s) => ({ title: s.title, status: s.status })),
      },
      recentEvents: events.map((e) => ({
        type: e.type,
        data: e.data,
        createdAt: e.createdAt,
      })),
      context: {
        projectName: task.project.name,
        totalProjectTasks: totalTasks,
        completedProjectTasks: completedTasks,
      },
    };

    // 6. 调用 AI Provider
    const provider = getProvider();
    logger.info(`使用 AI provider: ${provider.name}`);

    const { result } = await provider.analyzeTask(input);

    // 7. 保存分析结果
    const analysis = await taskAiAnalysisRepository.create({
      taskId,
      analysisType: 'task_level',
      result,
      modelVersion: provider.name,
    });

    // 8. 记录事件
    await taskEventRepository.create({
      taskId,
      userId,
      type: 'ai_analyzed',
      data: {
        description: 'AI 分析了任务',
        model: provider.name,
        analysisId: analysis.id,
      },
    });

    return {
      analysis: {
        id: analysis.id,
        createdAt: analysis.createdAt,
        model: analysis.modelVersion,
        result,
      },
    };
  },

  /**
   * 获取任务的分析历史
   */
  async getAnalysisHistory(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    await workspaceService.requireRole(task.project.workspaceId, userId, ['owner', 'admin', 'leader', 'member', 'guest']);

    return taskAiAnalysisRepository.findByTaskId(taskId);
  },

  /**
   * 获取当前使用的 AI provider 信息
   */
  getProviderInfo() {
    const provider = getProvider();
    return {
      name: provider.name,
      isMock: provider.name === 'mock',
    };
  },
};

