/**
 * 任务 AI 分析数据访问层
 */
import { prisma } from '../infra/database';
import { TaskAiAnalysis } from '@prisma/client';

// AI 分析结果类型
export interface AiAnalysisResult {
  progress_assessment: {
    percentage: number;
    status: 'on_track' | 'at_risk' | 'delayed' | 'blocked';
    summary: string;
  };
  next_actions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimated_minutes: number;
  }>;
  risks: Array<{
    description: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
  insights?: string;
}

// 创建分析输入
export interface CreateAiAnalysisInput {
  taskId: string;
  analysisType: 'task_level' | 'project_level' | 'event_stream';
  result: AiAnalysisResult;
  modelVersion: string;
}

export const taskAiAnalysisRepository = {
  /**
   * 创建分析记录
   */
  async create(data: CreateAiAnalysisInput): Promise<TaskAiAnalysis> {
    return prisma.taskAiAnalysis.create({
      data: {
        taskId: data.taskId,
        analysisType: data.analysisType,
        result: data.result as object,
        modelVersion: data.modelVersion,
      },
    });
  },

  /**
   * 获取任务的最新分析
   */
  async findLatestByTaskId(taskId: string): Promise<TaskAiAnalysis | null> {
    return prisma.taskAiAnalysis.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * 获取任务的所有分析历史
   */
  async findByTaskId(taskId: string, limit: number = 10) {
    return prisma.taskAiAnalysis.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * 获取分析统计
   */
  async getStats(since: Date) {
    const stats = await prisma.taskAiAnalysis.aggregate({
      where: {
        createdAt: { gte: since },
      },
      _count: { id: true },
    });

    return {
      totalAnalyses: stats._count.id,
    };
  },
};

