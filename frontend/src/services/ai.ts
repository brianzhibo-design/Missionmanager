import api from './api';

export interface AIError {
  code: string;
  message: string;
  retryable?: boolean;
}

// ==================== 旧版接口（向后兼容）====================

export interface AiAnalysisResult {
  summary: string;
  suggestedActions: { action: string; priority: string; reason: string }[];
  potentialRisks: { risk: string; severity: string; mitigation: string }[];
  estimatedCompletion: {
    optimistic: string;
    realistic: string;
    pessimistic: string;
  };
  // 兼容旧版字段
  progress_assessment?: {
    overall_status: string;
    completion_percentage: number;
    confidence_level: string;
    key_findings: string[];
  };
  next_actions?: { action: string; priority: string; reason: string }[];
  risks?: { risk: string; severity: string; mitigation: string }[];
  insights?: string[];
}

export interface AiAnalysis {
  id: string;
  createdAt: string;
  model: string;
  result: AiAnalysisResult;
}

// ==================== 新版接口 ====================

// 任务分解
export interface SubTask {
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  skills: string[];
  dependencies: number[];
}

export interface TaskBreakdownResult {
  subtasks: SubTask[];
  totalEstimatedHours: number;
  suggestedOrder: number[];
  reasoning: string;
}

// 风险预测
export interface RiskFactor {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}

export interface RiskPredictionResult {
  overallRisk: 'high' | 'medium' | 'low';
  riskScore: number;
  delayProbability: number;
  estimatedDelayDays: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
}

// 优先级推荐
export interface PriorityRecommendation {
  recommendedPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  reasoning: string;
  factors: { factor: string; impact: string; weight: number }[];
}

// 分配推荐
export interface AssignmentRecommendation {
  recommendedAssignee: string;
  recommendedAssigneeName: string;
  confidence: number;
  reasoning: string;
  alternatives: { memberId: string; memberName: string; score: number; reason: string }[];
}

// 进度预估
export interface ProgressEstimation {
  currentProgress: number;
  estimatedCompletionDate: string;
  confidence: number;
  velocity: number;
  milestones: { name: string; estimatedDate: string; confidence: number; blockers: string[] }[];
  risks: string[];
  recommendations: string[];
}

// 每日建议
export interface DailySuggestions {
  greeting: string;
  focusTask?: { taskId: string; taskTitle: string; reason: string };
  insights: { type: string; title: string; description: string }[];
  productivity: { score: number; trend: string; comparison: string };
}

// 任务优化建议
export interface TaskOptimizationSuggestion {
  taskId: string;
  taskTitle: string;
  type: 'priority' | 'deadline' | 'merge' | 'split' | 'description' | 'dependency' | 'title';
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
  reason: string;
  action?: string;
  // 可直接应用的优化值
  newTitle?: string;
  newDescription?: string;
  newPriority?: string;
  newDueDate?: string;
}

export interface TaskOptimizationResult {
  summary: string;
  totalIssues: number;
  suggestions: TaskOptimizationSuggestion[];
  overallHealth: number;
  recommendations: string[];
}

// 智能任务生成结果
export interface SuggestedTask {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedHours?: number;
  reason: string;
}

export interface TaskOptimizationAction {
  taskId: string;
  taskTitle: string;
  action: 'set_priority' | 'set_deadline' | 'update_status';
  value: string;
  reason: string;
}

export interface NextTaskGenerationResult {
  analysis: string;
  suggestedTasks: SuggestedTask[];
  optimizations: TaskOptimizationAction[];
}

// 单个任务优化结果
export interface SingleTaskOptimization {
  optimizedTitle: string;
  optimizedDescription: string;
  suggestions: string[];
  reason: string;
}

// 项目优化结果
export interface ProjectOptimizationResult {
  optimizedTitle: string;
  optimizedDescription: string;
  suggestedLeader: {
    role: string;
    skills: string[];
    reason: string;
  };
  suggestedTeam: {
    role: string;
    count: number;
    skills: string[];
    responsibilities: string;
  }[];
  suggestions: string[];
  reason: string;
}

class AIService {
  // ==================== 新版 API ====================
  
  async getStatus(): Promise<{ enabled: boolean; features: string[] }> {
    // api.get 已经返回 data.data，直接返回即可
    return api.get<{ enabled: boolean; features: string[] }>('/ai/status');
  }

  // 获取任务优化建议（项目级）
  async optimizeTasks(projectId: string): Promise<TaskOptimizationResult> {
    return api.get<TaskOptimizationResult>(`/ai/projects/${projectId}/optimize`);
  }

  // 优化单个任务（标题和描述）
  async optimizeSingleTask(taskId: string): Promise<SingleTaskOptimization> {
    return api.get<SingleTaskOptimization>(`/ai/tasks/${taskId}/optimize`);
  }

  // 优化项目（标题、描述、团队构成）
  async optimizeProject(projectId: string): Promise<ProjectOptimizationResult> {
    return api.get<ProjectOptimizationResult>(`/ai/projects/${projectId}/optimize-project`);
  }

  // 智能任务生成（下一步建议 + 可创建的任务）
  async generateNextTasks(
    projectId: string,
    tasks: Array<{ id: string; title: string; status: string; priority: string; dueDate?: string | null; description?: string | null }>
  ): Promise<NextTaskGenerationResult> {
    try {
      const status = await this.getStatus();
      if (!status.enabled) {
        return this.generateRuleBasedTasks(tasks);
      }

      const response = await api.post<NextTaskGenerationResult>(`/ai/projects/${projectId}/generate-tasks`, { tasks });
      return response;
    } catch (error) {
      console.error('AI 任务生成失败，使用规则建议:', error);
      return this.generateRuleBasedTasks(tasks);
    }
  }

  // 基于规则的任务生成（AI 不可用时的备选）
  private generateRuleBasedTasks(
    tasks: Array<{ id: string; title: string; status: string; priority: string; dueDate?: string | null }>
  ): NextTaskGenerationResult {
    const suggestedTasks: SuggestedTask[] = [];
    
    if (tasks.length === 0) {
      suggestedTasks.push({
        title: '项目启动与需求分析',
        description: '1. 明确项目目标和范围\n2. 收集并整理需求\n3. 制定初步计划',
        priority: 'high',
        estimatedHours: 4,
        reason: '项目刚开始，需要先进行需求分析和规划',
      });
    }
    
    const allDone = tasks.length > 0 && tasks.every(t => t.status === 'done');
    if (allDone) {
      suggestedTasks.push({
        title: '项目回顾与总结',
        description: '1. 总结项目成果\n2. 记录经验教训\n3. 归档项目文档',
        priority: 'medium',
        estimatedHours: 2,
        reason: '所有任务已完成，可以进行项目总结',
      });
    }
    
    return {
      analysis: tasks.length === 0 
        ? '项目刚开始，建议先进行需求分析和规划。'
        : `项目共有 ${tasks.length} 个任务。`,
      suggestedTasks,
      optimizations: [],
    };
  }

  async breakdownTask(taskId: string, options?: { maxSubtasks?: number; granularity?: string; direction?: string }): Promise<TaskBreakdownResult> {
    return api.post<TaskBreakdownResult>(`/ai/tasks/${taskId}/breakdown`, options || {});
  }

  async predictRisk(taskId: string): Promise<RiskPredictionResult> {
    return api.get<RiskPredictionResult>(`/ai/tasks/${taskId}/risk`);
  }

  async recommendPriority(title: string, description: string, projectId: string, dueDate?: string): Promise<PriorityRecommendation> {
    return api.post<PriorityRecommendation>('/ai/tasks/recommend-priority', { title, description, projectId, dueDate });
  }

  async recommendAssignment(taskId: string, workspaceId: string): Promise<AssignmentRecommendation> {
    return api.get<AssignmentRecommendation>(`/ai/tasks/${taskId}/recommend-assignment?workspaceId=${workspaceId}`);
  }

  async estimateProgress(projectId: string): Promise<ProgressEstimation> {
    return api.get<ProgressEstimation>(`/ai/projects/${projectId}/progress-estimate`);
  }

  async getDailySuggestions(): Promise<DailySuggestions> {
    return api.get<DailySuggestions>('/ai/daily-suggestions');
  }

  // ==================== 旧版 API（向后兼容）====================
  
  async getAiInfo(): Promise<{ enabled: boolean; provider: string }> {
    try {
      const status = await this.getStatus();
      return { enabled: status.enabled, provider: 'anthropic' };
    } catch {
      return { enabled: false, provider: 'mock' };
    }
  }

  async analyzeTask(taskId: string, direction?: string): Promise<{ analysis: AiAnalysis }> {
    // 使用新的风险预测 API，转换为旧格式
    const risk = await this.predictRisk(taskId);
    
    const nextActions = risk.recommendations.map((r, i) => ({
      action: r,
      priority: i === 0 ? 'high' : 'medium',
      reason: '基于 AI 分析建议',
    }));
    
    const risks = risk.riskFactors.map(f => ({
      risk: f.description,
      severity: f.severity,
      mitigation: f.mitigation,
    }));
    
    // 根据分析方向调整摘要
    const directionNote = direction ? `\n\n分析方向：${direction}` : '';
    
    return {
      analysis: {
        id: `analysis-${Date.now()}`,
        createdAt: new Date().toISOString(),
        model: 'claude-3-5-sonnet',
        result: {
          summary: `风险评估：${risk.overallRisk === 'high' ? '高风险' : risk.overallRisk === 'medium' ? '中等风险' : '低风险'}，风险分数 ${risk.riskScore}/100${directionNote}`,
          suggestedActions: nextActions,
          potentialRisks: risks,
          estimatedCompletion: {
            optimistic: risk.estimatedDelayDays === 0 ? '按时完成' : `可能延期 ${Math.max(0, risk.estimatedDelayDays - 2)} 天`,
            realistic: risk.estimatedDelayDays === 0 ? '按时完成' : `可能延期 ${risk.estimatedDelayDays} 天`,
            pessimistic: risk.estimatedDelayDays === 0 ? '按时完成' : `可能延期 ${risk.estimatedDelayDays + 3} 天`,
          },
          // 兼容旧版字段
          progress_assessment: {
            overall_status: risk.overallRisk === 'high' ? '需要关注' : risk.overallRisk === 'medium' ? '进展正常' : '进展良好',
            completion_percentage: Math.max(0, 100 - risk.riskScore),
            confidence_level: risk.riskScore > 70 ? 'low' : risk.riskScore > 40 ? 'medium' : 'high',
            key_findings: risk.recommendations.slice(0, 3),
          },
          next_actions: nextActions,
          risks: risks,
          insights: risk.recommendations,
        },
      },
    };
  }

  async getAnalysisHistory(taskId: string): Promise<AiAnalysis[]> {
    // 返回空历史，因为新 API 不存储历史
    console.log('getAnalysisHistory called for task:', taskId);
    return [];
  }

  // 获取下一步任务建议（基于已有任务的 AI 分析）
  async getNextTaskSuggestion(
    projectId: string, 
    tasks: Array<{ title: string; status: string; priority: string; dueDate: string }>
  ): Promise<{ suggestion: string }> {
    try {
      // 首先检查 AI 是否可用
      const status = await this.getStatus();
      if (!status.enabled) {
        console.log('AI 未启用，使用基于规则的建议');
        return this.generateRuleBasedSuggestion(tasks);
      }

      // 调用后端 AI 服务，传入任务列表进行分析
      const response = await api.post<{ suggestion: string }>('/ai/next-task-suggestion', {
        projectId,
        tasks,
      });
      
      // 如果返回结果为空，使用备选方案
      if (!response.suggestion) {
        return this.generateRuleBasedSuggestion(tasks);
      }
      
      return response;
    } catch (error) {
      console.error('AI 建议获取失败，使用基于规则的备选方案:', error);
      // 失败时使用基于规则的建议
      return this.generateRuleBasedSuggestion(tasks);
    }
  }

  // 基于规则的建议（AI 不可用时的备选方案）
  private generateRuleBasedSuggestion(
    tasks: Array<{ title: string; status: string; priority: string; dueDate: string }>
  ): { suggestion: string } {
    const suggestions: string[] = [];
    
    // 分析任务状态
    const todoTasks = tasks.filter(t => t.status === '待办');
    const inProgressTasks = tasks.filter(t => t.status === '进行中');
    const urgentTasks = tasks.filter(t => t.priority === '紧急');
    const highPriorityTasks = tasks.filter(t => t.priority === '高');
    
    // 检查紧急任务
    if (urgentTasks.length > 0) {
      suggestions.push(`[重要] 优先处理 ${urgentTasks.length} 个紧急任务：${urgentTasks.slice(0, 3).map(t => `「${t.title}」`).join('、')}。`);
    }
    
    // 检查高优先级任务
    if (highPriorityTasks.length > 0 && urgentTasks.length === 0) {
      suggestions.push(`[建议] 优先处理高优先级任务：${highPriorityTasks.slice(0, 2).map(t => `「${t.title}」`).join('、')}。`);
    }
    
    // 检查进行中任务数量
    if (inProgressTasks.length > 3) {
      suggestions.push(`[注意] 当前有 ${inProgressTasks.length} 个任务同时进行中，建议完成部分任务后再开始新任务，避免精力分散。`);
    } else if (inProgressTasks.length === 0 && todoTasks.length > 0) {
      suggestions.push(`[提示] 当前没有进行中的任务，建议从待办任务中选择一个开始执行。`);
    }
    
    // 检查截止日期（已完成的任务不算逾期）
    const today = new Date();
    const overdueTasks = tasks.filter(t => {
      if (t.dueDate === '无') return false;
      // 已完成的任务不算逾期
      if (t.status === '已完成' || t.status === 'done') return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < today;
    });
    
    if (overdueTasks.length > 0) {
      suggestions.push(`[警告] 有 ${overdueTasks.length} 个任务已过期，请优先处理或调整截止日期。`);
    }
    
    // 通用建议
    if (suggestions.length === 0) {
      if (tasks.length === 0) {
        suggestions.push('[提示] 项目暂无任务，建议创建第一个任务来开始工作。');
      } else {
        suggestions.push('[良好] 项目任务状态良好！继续保持当前进度，按优先级逐个完成任务。');
      }
    }
    
    // 添加工作建议
    suggestions.push('\n[工作建议]');
    suggestions.push('• 每天优先处理最重要的 2-3 个任务');
    suggestions.push('• 大任务可以拆分成小的子任务');
    suggestions.push('• 定期回顾任务进度，及时调整优先级');
    
    return { suggestion: suggestions.join('\n') };
  }

  // AI 对话
  async chatWithTask(
    taskId: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<{ reply: string; suggestions?: string[] }> {
    // api.post 已经返回 data.data，所以直接返回
    return api.post<{ reply: string; suggestions?: string[] }>(
      `/ai/tasks/${taskId}/chat`, 
      { message, history }
    );
  }

  // AI 优化群发消息
  async optimizeBroadcastMessage(
    title: string,
    content: string,
    context: 'announcement' | 'reminder' | 'notification' | 'general' = 'general'
  ): Promise<BroadcastOptimizationResult> {
    return api.post<BroadcastOptimizationResult>('/ai/optimize-broadcast', {
      title,
      content,
      context,
    });
  }

  // 🌞 暖阳 AI 伙伴聊天
  async chat(options: {
    message: string;
    context?: { userName?: string; role?: string; style?: string };
  }): Promise<CompanionChatResult> {
    return api.post<CompanionChatResult>('/ai/chat', options);
  }

  // ✨ 智能任务拆解（基于标题）
  async breakdownTaskByTitle(
    title: string,
    options?: { maxSubtasks?: number }
  ): Promise<TitleBreakdownResult> {
    return api.post<TitleBreakdownResult>('/ai/breakdown-title', {
      title,
      ...options,
    });
  }
}

// 暖阳 AI 伙伴聊天结果
export interface CompanionChatResult {
  reply: string;
  suggestions?: string[];
}

// 任务标题拆解结果
export interface TitleBreakdownResult {
  subtasks: string[];
  estimatedTime?: string;
}

// 群发消息优化结果
export interface BroadcastOptimizationResult {
  optimizedTitle: string;
  optimizedContent: string;
  suggestions: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiService = new AIService();
