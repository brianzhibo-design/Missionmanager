import Anthropic from '@anthropic-ai/sdk';
import pLimit from 'p-limit';
import prisma from '../lib/prisma';
import { log } from '../lib/logger';
import { metrics } from '../lib/metrics';
import { aiConfig, isAIEnabled } from '../lib/aiConfig';

// ==================== 错误类型 ====================

export class AIError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.details = details;
  }
}

export const AIErrorCodes = {
  DISABLED: 'AI_DISABLED',
  NOT_ENABLED: 'AI_NOT_ENABLED',
  RATE_LIMITED: 'AI_RATE_LIMITED',
  TIMEOUT: 'AI_TIMEOUT',
  PARSE_ERROR: 'AI_PARSE_ERROR',
  API_ERROR: 'AI_API_ERROR',
  INVALID_INPUT: 'AI_INVALID_INPUT',
  QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  NOT_FOUND: 'NOT_FOUND',
} as const;

// ==================== 限流器 ====================

const concurrencyLimit = pLimit(aiConfig.rateLimit.maxConcurrent);
const userCallCounts = new Map<string, { count: number; resetAt: number }>();

function checkUserQuota(userId: string): void {
  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const userStats = userCallCounts.get(userId);
  
  if (!userStats || userStats.resetAt < dayStart) {
    userCallCounts.set(userId, { count: 1, resetAt: now });
    return;
  }
  
  if (userStats.count >= aiConfig.rateLimit.maxPerDayPerUser) {
    throw new AIError(
      `今日 AI 调用次数已达上限 (${aiConfig.rateLimit.maxPerDayPerUser})`,
      AIErrorCodes.QUOTA_EXCEEDED
    );
  }
  userStats.count++;
}

// ==================== Anthropic 客户端 ====================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: aiConfig.timeout,
      maxRetries: aiConfig.maxRetries,
    });
  }
  return anthropicClient;
}

// ==================== 核心 AI 调用 ====================

interface CallAIOptions {
  userId?: string;
  workspaceId?: string;
  maxTokens?: number;
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  type: string,
  options: CallAIOptions = {}
): Promise<string> {
  if (!isAIEnabled()) {
    throw new AIError('AI 功能当前已禁用，请配置 API Key', AIErrorCodes.DISABLED);
  }

  if (options.userId) {
    checkUserQuota(options.userId);
  }

  const startTime = Date.now();
  
  return concurrencyLimit(async () => {
    try {
      log.info(`AI ${type} 开始`, { type, userId: options.userId });

      const client = getAnthropicClient();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AIError(`AI 请求超时 (${aiConfig.timeout}ms)`, AIErrorCodes.TIMEOUT));
        }, aiConfig.timeout);
      });

      const apiPromise = client.messages.create({
        model: aiConfig.model,
        max_tokens: options.maxTokens || 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const response = await Promise.race([apiPromise, timeoutPromise]);
      const content = response.content[0];
      
      if (content.type !== 'text') {
        throw new AIError('AI 响应格式异常', AIErrorCodes.API_ERROR);
      }

      const duration = Date.now() - startTime;
      metrics.recordAiAnalysis(type, duration, true);
      log.info(`AI ${type} 完成`, { type, duration, tokens: response.usage?.output_tokens });

      return content.text;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordAiAnalysis(type, duration, false);
      
      if (error instanceof AIError) throw error;
      
      log.error(`AI ${type} 失败`, { type, error: (error as Error).message });
      throw new AIError('AI 服务暂时不可用，请稍后重试', AIErrorCodes.API_ERROR);
    }
  });
}

// ==================== JSON 解析 ====================

function parseJSON<T>(text: string, type: string): T {
  // 方法1：直接尝试提取 JSON 对象（最可靠）
  const extractAndParse = (input: string): T | null => {
    // 移除 markdown 代码块标记
    let cleaned = input
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // 提取 JSON 对象
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const jsonStr = objectMatch[0]
          .replace(/,\s*}/g, '}')    // 移除尾随逗号
          .replace(/,\s*]/g, ']');   // 移除数组尾随逗号
        return JSON.parse(jsonStr);
      } catch {
        // 继续尝试
      }
    }
    
    // 尝试提取 JSON 数组
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const jsonStr = arrayMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        return JSON.parse(jsonStr);
      } catch {
        // 继续尝试
      }
    }
    
    return null;
  };

  // 尝试提取和解析
  const result = extractAndParse(text);
  if (result !== null) {
    log.info(`AI ${type} JSON 解析成功`);
    return result;
  }

  // 如果失败，记录错误并抛出异常
  log.error(`AI ${type} JSON 解析失败`, {
    type,
    rawResponse: text.substring(0, 2000),
  });
  
  throw new AIError('AI 响应格式解析失败', AIErrorCodes.PARSE_ERROR);
}

// ==================== 1. 任务智能分解 ====================

interface SubTask {
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  skills: string[];
  dependencies: number[];
}

interface TaskBreakdownResult {
  subtasks: SubTask[];
  totalEstimatedHours: number;
  suggestedOrder: number[];
  reasoning: string;
}

export async function breakdownTask(
  taskId: string,
  userId: string,
  options?: { maxSubtasks?: number; granularity?: 'fine' | 'medium' | 'coarse'; direction?: string }
): Promise<TaskBreakdownResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { workspace: true } }, assignee: true },
  });

  if (!task) throw new AIError('任务不存在', AIErrorCodes.NOT_FOUND);

  const maxSubtasks = options?.maxSubtasks || 8;
  const granularity = options?.granularity || 'medium';
  const direction = options?.direction;

  const directionInstruction = direction 
    ? `\n5. 重要：严格按照用户指定的拆解方向进行拆解` 
    : '';

  const systemPrompt = `你是专业项目管理AI。将任务分解为${maxSubtasks}个以内的子任务。
要求：
1. 每个子任务应该是具体的、可执行的
2. 子任务之间应该有清晰的先后顺序或依赖关系
3. 根据粒度调整每个子任务的工作量
4. 子任务数量控制在3-${maxSubtasks}个${directionInstruction}

返回纯JSON：{"subtasks":[{"title":"","description":"","estimatedHours":2,"priority":"HIGH","skills":[],"dependencies":[]}],"totalEstimatedHours":0,"suggestedOrder":[0,1],"reasoning":""}`;

  const userPrompt = `分解任务：${task.title}
描述：${task.description || '无'}
优先级：${task.priority}
粒度：${granularity}${direction ? `\n\n拆解方向：${direction}` : ''}`;

  const result = await callAI(systemPrompt, userPrompt, 'task_breakdown', {
    userId,
    workspaceId: task.project.workspaceId,
  });
  
  return parseJSON<TaskBreakdownResult>(result, 'task_breakdown');
}

// ==================== 2. 风险预测 ====================

interface RiskFactor {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}

interface RiskPredictionResult {
  overallRisk: 'high' | 'medium' | 'low';
  riskScore: number;
  delayProbability: number;
  estimatedDelayDays: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
}

export async function predictTaskRisk(taskId: string, userId: string): Promise<RiskPredictionResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { tasks: { where: { status: { not: 'done' } } }, workspace: true } },
      assignee: true,
    },
  });

  if (!task) throw new AIError('任务不存在', AIErrorCodes.NOT_FOUND);

  let assigneeWorkload = 0;
  if (task.assigneeId) {
    assigneeWorkload = await prisma.task.count({
      where: { assigneeId: task.assigneeId, status: { in: ['todo', 'in_progress'] } },
    });
  }

  const daysUntilDue = task.dueDate
    ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const systemPrompt = `你是风险评估专家。返回纯JSON：
{"overallRisk":"high|medium|low","riskScore":0-100,"delayProbability":0-100,"estimatedDelayDays":0,"riskFactors":[{"type":"deadline","severity":"high","description":"","mitigation":""}],"recommendations":[]}`;

  const userPrompt = `评估任务风险：${task.title}
状态：${task.status}，优先级：${task.priority}
距截止：${daysUntilDue !== null ? `${daysUntilDue}天` : '未设置'}
负责人待办：${assigneeWorkload}个`;

  const result = await callAI(systemPrompt, userPrompt, 'risk_prediction', {
    userId,
    workspaceId: task.project.workspaceId,
  });
  
  return parseJSON<RiskPredictionResult>(result, 'risk_prediction');
}

// ==================== 3. 优先级推荐 ====================

interface PriorityRecommendation {
  recommendedPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  reasoning: string;
  factors: { factor: string; impact: string; weight: number }[];
}

export async function recommendPriority(
  title: string,
  description: string,
  projectId: string,
  userId: string,
  dueDate?: Date
): Promise<PriorityRecommendation> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { where: { status: { not: 'done' } }, select: { priority: true } },
      workspace: true,
    },
  });

  if (!project) throw new AIError('项目不存在', AIErrorCodes.NOT_FOUND);

  const stats = {
    CRITICAL: project.tasks.filter(t => t.priority === 'critical').length,
    HIGH: project.tasks.filter(t => t.priority === 'high').length,
    MEDIUM: project.tasks.filter(t => t.priority === 'medium').length,
    LOW: project.tasks.filter(t => t.priority === 'low').length,
  };

  const systemPrompt = `你是优先级评估专家。返回纯JSON：
{"recommendedPriority":"HIGH","confidence":85,"reasoning":"","factors":[{"factor":"","impact":"positive|negative","weight":0.3}]}`;

  const userPrompt = `推荐优先级：${title}
描述：${description || '无'}
截止：${dueDate ? new Date(dueDate).toLocaleDateString('zh-CN') : '未设置'}
项目现有：紧急${stats.CRITICAL}，高${stats.HIGH}，中${stats.MEDIUM}，低${stats.LOW}`;

  const result = await callAI(systemPrompt, userPrompt, 'priority_recommendation', {
    userId,
    workspaceId: project.workspaceId,
  });
  
  return parseJSON<PriorityRecommendation>(result, 'priority_recommendation');
}

// ==================== 4. 分配推荐 ====================

interface AssignmentRecommendation {
  recommendedAssignee: string;
  recommendedAssigneeName: string;
  confidence: number;
  reasoning: string;
  alternatives: { memberId: string; memberName: string; score: number; reason: string }[];
}

export async function recommendAssignment(
  taskId: string,
  workspaceId: string,
  userId: string
): Promise<AssignmentRecommendation> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) throw new AIError('任务不存在', AIErrorCodes.NOT_FOUND);

  const members = await prisma.workspaceUser.findMany({
    where: { workspaceId },
    include: { user: true },
  });

  const memberWorkloads = await Promise.all(
    members.map(async (m) => {
      const count = await prisma.task.count({
        where: { assigneeId: m.userId, status: { in: ['todo', 'in_progress'] } },
      });
      return { id: m.userId, name: m.user.name, tasks: count, availability: Math.max(0, 100 - count * 15) };
    })
  );

  const systemPrompt = `你是资源分配专家。返回纯JSON：
{"recommendedAssignee":"id","recommendedAssigneeName":"name","confidence":80,"reasoning":"","alternatives":[{"memberId":"","memberName":"","score":75,"reason":""}]}`;

  const userPrompt = `为任务推荐负责人：${task.title}
优先级：${task.priority}
成员负载：
${memberWorkloads.map(m => `- ${m.name}(${m.id}): ${m.tasks}个任务, 可用${m.availability}%`).join('\n')}`;

  const result = await callAI(systemPrompt, userPrompt, 'assignment_recommendation', {
    userId,
    workspaceId,
  });
  
  return parseJSON<AssignmentRecommendation>(result, 'assignment_recommendation');
}

// ==================== 5. 项目进度预估 ====================

interface ProgressEstimation {
  currentProgress: number;
  estimatedCompletionDate: string;
  confidence: number;
  velocity: number;
  milestones: { name: string; estimatedDate: string; confidence: number; blockers: string[] }[];
  risks: string[];
  recommendations: string[];
}

export async function estimateProjectProgress(projectId: string, userId: string): Promise<ProgressEstimation> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { tasks: true, workspace: true },
  });

  if (!project) throw new AIError('项目不存在', AIErrorCodes.NOT_FOUND);

  const total = project.tasks.length;
  const completed = project.tasks.filter(t => t.status === 'done').length;
  const inProgress = project.tasks.filter(t => t.status === 'in_progress').length;
  const review = project.tasks.filter(t => t.status === 'review').length;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const completedLastWeek = project.tasks.filter(t => t.status === 'done' && t.updatedAt >= oneWeekAgo).length;

  const systemPrompt = `你是进度预测专家。返回纯JSON：
{"currentProgress":45,"estimatedCompletionDate":"2024-02-15","confidence":75,"velocity":5,"milestones":[{"name":"","estimatedDate":"","confidence":80,"blockers":[]}],"risks":[],"recommendations":[]}`;

  const userPrompt = `预估项目：${project.name}
总任务：${total}，完成：${completed}，进行中：${inProgress}，审核中：${review}
本周完成：${completedLastWeek}`;

  const result = await callAI(systemPrompt, userPrompt, 'progress_estimation', {
    userId,
    workspaceId: project.workspaceId,
  });
  
  return parseJSON<ProgressEstimation>(result, 'progress_estimation');
}

// ==================== 6. 每日建议 ====================

interface DailySuggestions {
  greeting: string;
  focusTask?: { taskId: string; taskTitle: string; reason: string };
  insights: { type: string; title: string; description: string }[];
  productivity: { score: number; trend: string; comparison: string };
}

export async function getDailySuggestions(userId: string): Promise<DailySuggestions> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 完成状态的所有可能值
  const doneStatuses = ['DONE', 'done', '已完成', 'completed'];
  
  const [todayTasks, overdueTasks, recentCompleted, user] = await Promise.all([
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        status: { notIn: doneStatuses },
      },
      include: { project: true },
      take: 5,
    }),
    prisma.task.count({
      where: { assigneeId: userId, dueDate: { lt: today }, status: { notIn: doneStatuses } },
    }),
    prisma.task.count({
      where: { assigneeId: userId, status: { in: doneStatuses }, updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? '早上' : hour < 18 ? '下午' : '晚上';

  const systemPrompt = `你是友好的工作助手。返回纯JSON：
{"greeting":"","focusTask":{"taskId":"","taskTitle":"","reason":""},"insights":[{"type":"tip","title":"","description":""}],"productivity":{"score":75,"trend":"up","comparison":""}}`;

  const userPrompt = `生成建议：
姓名：${user?.name || '用户'}，时间：${timeOfDay}
今日任务：${todayTasks.length}，逾期：${overdueTasks}，本周完成：${recentCompleted}
${todayTasks.length > 0 ? `今日任务：${todayTasks.map(t => `${t.title}(${t.id})`).join('、')}` : ''}`;

  const result = await callAI(systemPrompt, userPrompt, 'daily_suggestions', { userId });
  return parseJSON<DailySuggestions>(result, 'daily_suggestions');
}

// ==================== 7. 单个任务优化（标题和描述） ====================

interface SingleTaskOptimization {
  optimizedTitle: string;
  optimizedDescription: string;
  suggestions: string[];
  reason: string;
}

export async function optimizeSingleTask(
  taskId: string,
  userId: string
): Promise<SingleTaskOptimization> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) throw new AIError('任务不存在', AIErrorCodes.NOT_FOUND);

  const systemPrompt = `你是专业的项目管理专家。优化任务的标题和描述，使其更加清晰、具体、可执行。

返回纯JSON格式（不要markdown代码块）：
{
  "optimizedTitle": "优化后的标题（简洁明确，不超过50字）",
  "optimizedDescription": "优化后的描述（详细说明，包含：\\n1. 任务目标\\n2. 具体步骤\\n3. 验收标准\\n4. 注意事项）",
  "suggestions": ["其他优化建议1", "其他优化建议2"],
  "reason": "优化的理由说明"
}

优化原则：
1. 标题要简洁明确，使用动词开头（如"完成"、"开发"、"设计"）
2. 描述要详细可操作，包含具体步骤和验收标准
3. 去除模糊词汇，使用具体数字和指标
4. 如果原标题/描述已经很好，保持不变并说明原因`;

  const userPrompt = `请优化以下任务的标题和描述：

**项目**：${task.project.name}
**当前标题**：${task.title}
**当前描述**：${task.description || '（无描述）'}
**优先级**：${task.priority}
**状态**：${task.status}

请根据任务内容，优化标题使其更加清晰具体，优化描述使其包含完整的执行指南。`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 'single_task_optimization', {
      userId,
      workspaceId: task.project.workspaceId,
      maxTokens: 1000,
    });

    return parseJSON<SingleTaskOptimization>(result, 'single_task_optimization');
  } catch (error) {
    log.error('单个任务优化失败', { error: (error as Error).message });
    
    // 返回基于规则的优化
    let optimizedTitle = task.title;
    let optimizedDescription = task.description || '';
    const suggestions: string[] = [];
    
    // 简单规则：如果标题太短，建议扩展
    if (task.title.length < 10) {
      suggestions.push('标题可以更详细一些，说明具体要做什么');
    }
    
    // 如果没有描述，生成基础模板
    if (!task.description || task.description.length < 20) {
      optimizedDescription = `## 任务目标\n${task.title}\n\n## 具体步骤\n1. \n2. \n3. \n\n## 验收标准\n- \n\n## 注意事项\n- `;
      suggestions.push('已生成描述模板，请补充具体内容');
    }
    
    return {
      optimizedTitle,
      optimizedDescription,
      suggestions,
      reason: 'AI 分析暂时不可用，已生成基础优化模板',
    };
  }
}

// ==================== 8. 项目优化（标题、描述、团队构成） ====================

interface ProjectOptimizationResult {
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

export async function optimizeProject(
  projectId: string,
  userId: string
): Promise<ProjectOptimizationResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        select: { title: true, status: true, priority: true },
      },
      workspace: true,
    },
  });

  if (!project) throw new AIError('项目不存在', AIErrorCodes.NOT_FOUND);

  const systemPrompt = `你是专业的项目管理顾问。根据项目信息，提供全面的项目优化建议。

返回纯JSON格式（不要markdown代码块）：
{
  "optimizedTitle": "优化后的项目标题（简洁、专业、体现项目核心价值）",
  "optimizedDescription": "优化后的项目描述（包含：\\n1. 项目背景\\n2. 项目目标\\n3. 预期成果\\n4. 关键里程碑）",
  "suggestedLeader": {
    "role": "建议的负责人角色（如：技术总监、产品经理等）",
    "skills": ["需要具备的技能1", "技能2"],
    "reason": "为什么需要这样的负责人"
  },
  "suggestedTeam": [
    {
      "role": "团队角色（如：前端开发）",
      "count": 2,
      "skills": ["需要的技能"],
      "responsibilities": "主要职责"
    }
  ],
  "suggestions": ["其他优化建议1", "建议2"],
  "reason": "整体优化理由"
}

优化原则：
1. 标题要简洁专业，体现项目核心价值
2. 描述要完整清晰，包含背景、目标、成果、里程碑
3. 根据项目任务推断所需团队构成
4. 团队建议要具体可执行`;

  const taskSummary = project.tasks.length > 0
    ? project.tasks.map(t => `- ${t.title} (${t.status}, ${t.priority})`).join('\n')
    : '（暂无任务）';

  const userPrompt = `请优化以下项目：

**项目名称**：${project.name}
**项目描述**：${project.description || '（无描述）'}
**所属工作区**：${project.workspace.name}
**当前任务**（${project.tasks.length}个）：
${taskSummary}

请根据项目内容，优化标题和描述，并建议合适的项目负责人和团队构成。`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 'project_optimization', {
      userId,
      workspaceId: project.workspaceId,
      maxTokens: 3000, // 增加 token 限制以避免响应被截断
    });

    return parseJSON<ProjectOptimizationResult>(result, 'project_optimization');
  } catch (error) {
    const errorMessage = (error as Error).message;
    const errorCode = (error as AIError).code || 'UNKNOWN';
    log.error('项目优化失败', { 
      error: errorMessage, 
      code: errorCode,
      stack: (error as Error).stack?.substring(0, 500)
    });
    
    // 返回基于规则的建议，包含错误信息
    return {
      optimizedTitle: project.name,
      optimizedDescription: project.description || `## 项目背景\n\n## 项目目标\n\n## 预期成果\n\n## 关键里程碑\n`,
      suggestedLeader: {
        role: '项目经理',
        skills: ['项目管理', '沟通协调', '风险控制'],
        reason: '需要有经验的项目经理统筹全局',
      },
      suggestedTeam: [
        {
          role: '开发工程师',
          count: 2,
          skills: ['编程', '技术实现'],
          responsibilities: '负责核心功能开发',
        },
      ],
      suggestions: [`AI 分析失败: ${errorMessage}`, '已生成基础建议'],
      reason: `错误代码: ${errorCode}，请检查 API Key 配置`,
    };
  }
}

// ==================== 9. 项目任务批量优化建议 ====================

interface TaskOptimizationSuggestion {
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

interface TaskOptimizationResult {
  summary: string;
  totalIssues: number;
  suggestions: TaskOptimizationSuggestion[];
  overallHealth: number; // 0-100
  recommendations: string[];
}

export async function optimizeTasks(
  projectId: string,
  userId: string
): Promise<TaskOptimizationResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        include: {
          assignee: true,
        },
      },
      workspace: true,
    },
  });

  if (!project) throw new AIError('项目不存在', AIErrorCodes.NOT_FOUND);

  const tasks = project.tasks;
  const today = new Date();

  // 构建任务信息
  const taskInfoList = tasks.map(t => {
    const daysUntilDue = t.dueDate
      ? Math.ceil((new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    return {
      id: t.id,
      title: t.title,
      description: t.description || '无描述',
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString('zh-CN') : '未设置',
      daysUntilDue,
      assignee: t.assignee?.name || '未分配',
      createdAt: new Date(t.createdAt).toLocaleDateString('zh-CN'),
    };
  });

  const systemPrompt = `你是专业的项目管理优化专家。分析项目任务列表，找出可以优化的地方，并提供可直接应用的优化建议。

返回纯JSON格式（不要markdown代码块）：
{
  "summary": "一句话总结项目任务健康状况",
  "totalIssues": 3,
  "overallHealth": 75,
  "suggestions": [
    {
      "taskId": "任务ID（必填，来自任务列表）",
      "taskTitle": "当前任务标题",
      "type": "title|description|priority|deadline|merge|split|dependency",
      "severity": "high|medium|low",
      "suggestion": "简短说明优化内容",
      "reason": "为什么这样建议",
      "newTitle": "优化后的标题（仅type为title时填写）",
      "newDescription": "优化后的描述（仅type为description时填写，要详细）",
      "newPriority": "urgent|high|medium|low（仅type为priority时填写）"
    }
  ],
  "recommendations": ["通用建议1", "通用建议2"]
}

优化类型说明：
- title: 标题优化（如标题不清晰，提供newTitle）
- description: 描述优化（如描述不清晰，提供newDescription，要包含目标、步骤、验收标准）
- priority: 优先级建议（提供newPriority）
- deadline: 截止日期建议
- merge: 合并建议
- split: 拆分建议
- dependency: 依赖关系

重要：每个suggestion必须包含taskId，这样用户才能直接应用优化。`;

  const taskListJson = JSON.stringify(taskInfoList, null, 2);

  const userPrompt = `分析以下项目任务，给出优化建议：

**项目名称**：${project.name}
**项目描述**：${project.description || '无'}
**任务总数**：${tasks.length}

**任务列表**：
${taskListJson}

请分析：
1. 优先级设置是否合理
2. 是否有任务缺少截止日期
3. 是否有可以合并的相似任务
4. 是否有需要拆分的大任务
5. 任务描述是否清晰
6. 任务之间是否有隐含的依赖关系
7. 整体任务规划的健康程度`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 'task_optimization', {
      userId,
      workspaceId: project.workspaceId,
      maxTokens: 2000,
    });

    return parseJSON<TaskOptimizationResult>(result, 'task_optimization');
  } catch (error) {
    log.error('任务优化分析失败，使用基于规则的分析', { error: (error as Error).message });
    
    // 返回基于规则的分析结果
    const suggestions: TaskOptimizationSuggestion[] = [];
    let overallHealth = 100;
    
    tasks.forEach(task => {
      // 检查缺少截止日期的高优先级任务
      if (!task.dueDate && (task.priority === 'urgent' || task.priority === 'high')) {
        suggestions.push({
          taskId: task.id,
          taskTitle: task.title,
          type: 'deadline',
          severity: 'high',
          suggestion: '建议为此高优先级任务设置截止日期',
          reason: '高优先级任务没有明确的截止日期可能导致项目进度不可控',
        });
        overallHealth -= 5;
      }
      
      // 检查描述为空的任务
      if (!task.description || task.description.length < 10) {
        suggestions.push({
          taskId: task.id,
          taskTitle: task.title,
          type: 'description',
          severity: 'low',
          suggestion: '建议补充更详细的任务描述',
          reason: '清晰的任务描述有助于团队成员理解任务要求',
        });
        overallHealth -= 2;
      }
      
      // 检查过期任务
      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done') {
        suggestions.push({
          taskId: task.id,
          taskTitle: task.title,
          type: 'deadline',
          severity: 'high',
          suggestion: '此任务已过期，建议重新评估截止日期或优先完成',
          reason: '过期未完成的任务需要立即关注',
        });
        overallHealth -= 10;
      }
    });
    
    return {
      summary: suggestions.length > 0 
        ? `发现 ${suggestions.length} 个可优化项，建议及时处理` 
        : '项目任务状况良好',
      totalIssues: suggestions.length,
      suggestions,
      overallHealth: Math.max(0, overallHealth),
      recommendations: [
        '定期检查任务进度，确保按时完成',
        '为所有任务添加清晰的描述和截止日期',
        '优先处理高优先级和紧急任务',
      ],
    };
  }
}

// ==================== 8. 智能任务生成（下一步建议 + 自动创建） ====================

interface SuggestedTask {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedHours?: number;
  reason: string;
}

interface NextTaskSuggestionResult {
  analysis: string;
  suggestedTasks: SuggestedTask[];
  optimizations: Array<{
    taskId: string;
    taskTitle: string;
    action: 'set_priority' | 'set_deadline' | 'update_status';
    value: string;
    reason: string;
  }>;
}

export async function generateNextTasks(
  projectId: string,
  userId: string,
  existingTasks: Array<{ id: string; title: string; status: string; priority: string; dueDate?: string | null; description?: string | null }>
): Promise<NextTaskSuggestionResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) throw new AIError('项目不存在', AIErrorCodes.NOT_FOUND);

  const systemPrompt = `你是专业的项目管理专家。分析现有任务，生成下一步应该执行的具体任务建议。

返回纯JSON格式（不要markdown代码块）：
{
  "analysis": "一段话分析当前项目状态和建议方向",
  "suggestedTasks": [
    {
      "title": "具体任务标题",
      "description": "详细的任务描述，包括目标、步骤、验收标准",
      "priority": "urgent|high|medium|low",
      "estimatedHours": 8,
      "reason": "为什么建议创建这个任务"
    }
  ],
  "optimizations": [
    {
      "taskId": "现有任务ID",
      "taskTitle": "任务标题",
      "action": "set_priority|set_deadline|update_status",
      "value": "新值",
      "reason": "为什么建议这个优化"
    }
  ]
}

注意：
1. suggestedTasks 应该是具体可执行的新任务，不要太泛泛
2. 任务标题要清晰明确，描述要详细可操作
3. optimizations 是对现有任务的优化建议
4. 最多建议3个新任务和3个优化`;

  const taskList = existingTasks.map(t => 
    `- [${t.status}] ${t.title} (优先级: ${t.priority}${t.dueDate ? `, 截止: ${t.dueDate}` : ''})`
  ).join('\n');

  const userPrompt = `项目: ${project.name}
项目描述: ${project.description || '无'}

现有任务 (${existingTasks.length}个):
${taskList || '暂无任务'}

请分析项目现状，建议：
1. 下一步应该创建什么具体任务
2. 现有任务有什么可以优化的地方`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 'next_task_generation', {
      userId,
      maxTokens: 1500,
    });

    return parseJSON<NextTaskSuggestionResult>(result, 'next_task_generation');
  } catch (error) {
    log.error('AI 任务生成失败，返回基于规则的建议', { error: (error as Error).message });
    
    // 返回基于规则的建议
    const suggestedTasks: SuggestedTask[] = [];
    
    // 如果没有任务，建议创建第一个任务
    if (existingTasks.length === 0) {
      suggestedTasks.push({
        title: '项目启动与需求分析',
        description: '1. 明确项目目标和范围\n2. 收集并整理需求\n3. 制定初步计划',
        priority: 'high',
        estimatedHours: 4,
        reason: '项目刚开始，需要先进行需求分析和规划',
      });
    }
    
    // 如果所有任务都完成了，建议总结任务
    const allDone = existingTasks.length > 0 && existingTasks.every(t => t.status === 'done');
    if (allDone) {
      suggestedTasks.push({
        title: '项目回顾与总结',
        description: '1. 总结项目成果\n2. 记录经验教训\n3. 归档项目文档',
        priority: 'medium',
        estimatedHours: 2,
        reason: '所有任务已完成，可以进行项目总结',
      });
    }
    
    // 检查是否有进行中但长期未更新的任务
    const inProgressTasks = existingTasks.filter(t => t.status === 'in_progress');
    if (inProgressTasks.length > 3) {
      suggestedTasks.push({
        title: '任务优先级重新评估',
        description: '当前有多个任务同时进行，建议：\n1. 评估各任务优先级\n2. 集中精力完成最重要的任务\n3. 暂停非紧急任务',
        priority: 'high',
        estimatedHours: 1,
        reason: '同时进行的任务太多可能影响效率',
      });
    }
    
    return {
      analysis: existingTasks.length === 0 
        ? '项目刚开始，建议先进行需求分析和规划。'
        : `项目共有 ${existingTasks.length} 个任务，${inProgressTasks.length} 个进行中。`,
      suggestedTasks,
      optimizations: [],
    };
  }
}

interface TaskSummary {
  title: string;
  status: string;
  priority: string;
  dueDate: string;
}

interface SimpleNextTaskSuggestion {
  suggestion: string;
}

export async function getNextTaskSuggestion(
  projectId: string,
  userId: string,
  tasks: TaskSummary[]
): Promise<SimpleNextTaskSuggestion> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: true },
  });

  if (!project) throw new AIError('项目不存在', AIErrorCodes.NOT_FOUND);

  // 分析任务状态
  const todoTasks = tasks.filter(t => t.status === '待办');
  const inProgressTasks = tasks.filter(t => t.status === '进行中');
  const reviewTasks = tasks.filter(t => t.status === '审核中');
  const urgentTasks = tasks.filter(t => t.priority === '紧急');
  const highPriorityTasks = tasks.filter(t => t.priority === '高');
  
  // 检查逾期任务（排除已完成的任务）
  const today = new Date();
  const overdueTasks = tasks.filter(t => {
    // 已完成的任务不算逾期
    if (t.status === '已完成' || t.status === 'done') return false;
    if (t.dueDate === '无' || !t.dueDate) return false;
    try {
      const dueDate = new Date(t.dueDate);
      return dueDate < today;
    } catch {
      return false;
    }
  });

  const systemPrompt = `你是专业的项目管理顾问和工作效率专家。请分析项目的当前任务状态，给出具体、可执行的下一步工作建议。

你的建议应该：
1. 基于任务的优先级、状态和截止日期做出判断
2. 具体指出应该优先处理哪些任务，以及原因
3. 提供清晰的行动步骤
4. 如果有风险或问题，提出预警
5. 语气友好专业，像一个贴心的项目经理

请用中文回复，格式清晰，使用适当的 emoji 让内容更易读。不要返回 JSON，直接返回建议文本。`;

  const taskListText = tasks.map(t => 
    `- 「${t.title}」- ${t.status} | ${t.priority}优先级 | 截止：${t.dueDate}`
  ).join('\n');

  const userPrompt = `请分析以下项目任务并给出下一步建议：

**项目名称**：${project.name}

**任务统计**：
- 总任务数：${tasks.length}
- 待办：${todoTasks.length}
- 进行中：${inProgressTasks.length}
- 审核中：${reviewTasks.length}
- 紧急任务：${urgentTasks.length}
- 高优先级：${highPriorityTasks.length}
- 已逾期：${overdueTasks.length}

**当前任务列表**：
${taskListText || '暂无任务'}

请给出：
1. 当前最应该关注的任务（如有）
2. 推荐的工作顺序和原因
3. 任何需要注意的风险或问题
4. 提高效率的建议`;

  const result = await callAI(systemPrompt, userPrompt, 'next_task_suggestion', {
    userId,
    workspaceId: project.workspaceId,
    maxTokens: 1500,
  });

  return { suggestion: result };
}

// ==================== 12. 任务AI对话 ====================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TaskChatResponse {
  reply: string;
  suggestions?: string[];
}

/**
 * 基于任务上下文的AI对话
 */
export async function chatWithTask(
  taskId: string,
  userId: string,
  message: string,
  history: ChatMessage[] = []
): Promise<TaskChatResponse> {
  if (!isAIEnabled()) {
    throw new AIError('AI 功能未启用', AIErrorCodes.NOT_ENABLED);
  }

  // 获取任务详情
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      assignee: { select: { name: true } },
      subTasks: { select: { title: true, status: true } },
    },
  });

  if (!task) {
    throw new AIError('任务不存在', AIErrorCodes.INVALID_INPUT);
  }

  const systemPrompt = `你是一个专业的项目管理助手，正在帮助用户处理一个具体的任务。

## 当前任务上下文
**任务标题**: ${task.title}
**任务描述**: ${task.description || '无'}
**状态**: ${task.status}
**优先级**: ${task.priority}
**负责人**: ${task.assignee?.name || '未分配'}
**截止日期**: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '未设置'}
**所属项目**: ${task.project.name}
${task.subTasks.length > 0 ? `**子任务**: 共${task.subTasks.length}个，完成${task.subTasks.filter(s => s.status === 'done').length}个` : ''}

## 你的职责
1. 基于任务上下文回答用户的问题
2. 提供具体、可执行的建议
3. 帮助用户规划任务执行步骤
4. 识别潜在风险和问题
5. 在回复末尾，可选地提供2-3个后续问题建议

## 回复格式
直接用自然语言回复用户的问题。如有必要，在末尾加一个换行，然后用以下格式提供建议问题：
[建议问题]
- 问题1
- 问题2`;

  // 构建对话历史
  const historyContext = history.length > 0 
    ? '\n\n## 对话历史\n' + history.map(h => `${h.role === 'user' ? '用户' : 'AI'}: ${h.content}`).join('\n')
    : '';

  const userPrompt = `${historyContext}

用户当前问题: ${message}`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 'task_chat', {
      userId,
      workspaceId: task.project.workspaceId,
      maxTokens: 1000,
    });

    // 解析回复中的建议问题
    const suggestions: string[] = [];
    let reply = result;

    const suggestionsMatch = result.match(/\[建议问题\]\s*([\s\S]*?)$/);
    if (suggestionsMatch) {
      reply = result.replace(/\[建议问题\][\s\S]*$/, '').trim();
      const suggestionLines = suggestionsMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
      suggestionLines.forEach(line => {
        const text = line.replace(/^-\s*/, '').trim();
        if (text) suggestions.push(text);
      });
    }

    return { reply, suggestions };
  } catch (error) {
    log.error('AI 对话失败', { taskId, error: (error as Error).message });
    throw error;
  }
}

// ==================== 13. 项目创建时 AI 推荐任务 ====================

export interface SuggestedProjectTask {
  title: string;
  description: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedDays?: number;
  order: number;
}

export interface ProjectTaskSuggestionResult {
  optimizedTitle: string;
  optimizedDescription: string;
  suggestedTasks: SuggestedProjectTask[];
  reasoning: string;
}

/**
 * 根据项目标题和描述推荐任务
 * 用于创建项目时的 AI 辅助功能
 */
export async function suggestProjectTasks(
  title: string,
  description: string,
  userId: string
): Promise<ProjectTaskSuggestionResult> {
  if (!title || title.trim().length < 2) {
    throw new AIError('请提供有效的项目标题', AIErrorCodes.INVALID_INPUT);
  }

  const systemPrompt = `你是一位资深的项目管理专家。根据用户提供的项目标题和描述，进行以下工作：

1. **优化项目信息**：
   - 项目标题：**尽量保持用户原始输入的核心词汇**，只在语义不清时添加少量补充说明。不要过度专业化或彻底改写用户的项目名称。
   - 项目描述：使其更完整，包含背景、目标、范围
2. **推荐初始任务**：基于项目内容，推荐 3-6 个具体、可执行的初始任务

返回纯 JSON 格式（不要 markdown 代码块）：
{
  "optimizedTitle": "保持用户原始项目名称的核心词汇，只做最小必要的补充（例如：用户输入'跟拍'→输出'跟拍'或'跟拍项目'，而不是'跟拍平台搭建'）",
  "optimizedDescription": "优化后的项目描述（100-200字，包含项目背景和目标）",
  "suggestedTasks": [
    {
      "title": "具体任务标题（动词开头，如：完成、设计、开发、测试）",
      "description": "任务详细描述（包含目标、步骤提示、验收标准）",
      "priority": "HIGH|MEDIUM|LOW",
      "estimatedDays": 2,
      "order": 1
    }
  ],
  "reasoning": "推荐这些任务的理由（一句话说明任务设计思路）"
}

重要原则：
1. **尊重用户输入**：项目标题应保持用户原始的命名风格和核心词汇，不要自作主张地改成"XX系统"、"XX平台搭建"等专业化名称
2. 任务要具体可执行，避免过于宽泛
3. 按照项目启动的逻辑顺序排列（从规划到实施到验收）
4. 第一个任务通常是"项目启动/需求分析"相关
5. 最后一个任务通常是"测试验收/项目总结"相关
6. 优先级根据任务的紧急性和依赖关系设置`;

  const userPrompt = `请为以下项目推荐初始任务：

**项目标题**：${title}
**项目描述**：${description || '（未提供描述）'}

请优化项目信息，并推荐 3-6 个合理的初始任务。`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 'project_task_suggestion', {
      userId,
      maxTokens: 2000,
    });

    return parseJSON<ProjectTaskSuggestionResult>(result, 'project_task_suggestion');
  } catch (error) {
    log.error('AI 项目任务推荐失败', { error: (error as Error).message });
    
    // 返回基于规则的默认建议
    return {
      optimizedTitle: title,
      optimizedDescription: description || `${title} 项目的详细描述待补充。`,
      suggestedTasks: [
        {
          title: '项目启动与需求确认',
          description: '明确项目目标、范围和关键需求，制定初步计划',
          priority: 'HIGH',
          estimatedDays: 2,
          order: 1,
        },
        {
          title: '方案设计与评审',
          description: '设计技术方案或业务方案，组织团队评审',
          priority: 'HIGH',
          estimatedDays: 3,
          order: 2,
        },
        {
          title: '核心功能开发/实施',
          description: '根据方案执行核心任务的开发或实施工作',
          priority: 'MEDIUM',
          estimatedDays: 5,
          order: 3,
        },
        {
          title: '测试与验收',
          description: '进行功能测试，确保达到验收标准',
          priority: 'MEDIUM',
          estimatedDays: 2,
          order: 4,
        },
      ],
      reasoning: 'AI 分析暂时不可用，已生成通用项目任务模板',
    };
  }
}

// ==================== 群发消息优化 ====================

interface BroadcastOptimizationResult {
  optimizedTitle: string;
  optimizedContent: string;
  suggestions: string[];
}

/**
 * 优化群发消息的标题和内容
 * 让消息更专业、友好、有吸引力
 */
export async function optimizeBroadcastMessage(
  title: string,
  content: string,
  context: 'announcement' | 'reminder' | 'notification' | 'general',
  userId: string
): Promise<BroadcastOptimizationResult> {
  if (!title && !content) {
    throw new AIError('请提供标题或内容', AIErrorCodes.INVALID_INPUT);
  }

  const contextDescriptions: Record<string, string> = {
    announcement: '正式公告/通知',
    reminder: '温馨提醒',
    notification: '事务通知',
    general: '日常沟通',
  };

  const systemPrompt = `你是一位专业的企业内部沟通专家。请优化用户提供的群发消息，使其：
1. **专业清晰**：语言规范、表达精准
2. **友好温暖**：语气亲切、积极向上
3. **简洁有力**：重点突出、易于理解
4. **引人注目**：标题吸引人、内容有吸引力

消息类型：${contextDescriptions[context] || '日常沟通'}

返回纯 JSON 格式（不要 markdown 代码块）：
{
  "optimizedTitle": "优化后的标题（简洁有力，15字以内）",
  "optimizedContent": "优化后的正文（保持原意，语言更精炼、专业）",
  "suggestions": ["改进建议1", "改进建议2"]
}

优化原则：
1. 保留原始信息的核心含义
2. 使用积极正面的措辞
3. 适当添加礼貌用语
4. 如果是提醒类消息，可适当加入鼓励性语句
5. 避免过于生硬或命令式的语气`;

  const userPrompt = `请优化以下群发消息：

**原标题**：${title || '（未提供）'}
**原内容**：${content || '（未提供）'}

请优化使其更专业、友好、有吸引力。`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 'broadcast_optimization', {
      userId,
      maxTokens: 1000,
    });

    return parseJSON<BroadcastOptimizationResult>(result, 'broadcast_optimization');
  } catch (error) {
    log.error('AI 消息优化失败', { error: (error as Error).message });
    
    // 返回简单优化版本
    return {
      optimizedTitle: title || '重要通知',
      optimizedContent: content ? `${content}\n\n感谢您的关注！` : '',
      suggestions: ['建议添加具体的时间或行动项', '可以适当添加鼓励性语句'],
    };
  }
}

// ==================== 🌞 暖阳 AI 伙伴聊天 ====================

interface CompanionChatResult {
  reply: string;
  suggestions?: string[];
}

async function companionChat(
  message: string,
  userId: string,
  context?: { userName?: string; role?: string; style?: string }
): Promise<CompanionChatResult> {
  if (!isAIEnabled()) {
    return {
      reply: '你好！我是暖阳，你的 AI 伙伴。虽然现在 AI 功能暂时不可用，但我相信你一定能把事情做好！💪',
      suggestions: ['查看今日任务', '创建新任务', '查看项目进度'],
    };
  }

  const userName = context?.userName || '朋友';
  
  const systemPrompt = `你是"暖阳"，一个温暖、鼓励型的 AI 生产力伙伴。你的角色是：
1. 以温暖友好的语气与用户交流
2. 给予积极的鼓励和建议
3. 帮助用户规划任务、提高效率
4. 在用户感到压力时提供支持

交流风格：
- 使用适当的 emoji 增加亲和力
- 回复简洁但温暖
- 主动提供可行的建议
- 始终保持积极乐观的态度

用户名：${userName}

请用中文回复，返回 JSON 格式：
{
  "reply": "你的回复内容",
  "suggestions": ["建议1", "建议2"]
}`;

  try {
    const result = await callAI(systemPrompt, message, 'companion_chat', {
      userId,
      maxTokens: 500,
    });

    return parseJSON<CompanionChatResult>(result, 'companion_chat');
  } catch (error) {
    log.error('暖阳聊天失败', { error: (error as Error).message });
    
    return {
      reply: `${userName}，我明白你的想法！有什么具体需要帮助的吗？我在这里支持你！☀️`,
      suggestions: ['规划今天的任务', '查看待办事项', '创建新任务'],
    };
  }
}

// ==================== ✨ 智能任务拆解（基于标题） ====================

interface TitleBreakdownResult {
  subtasks: string[];
  estimatedTime?: string;
}

async function breakdownTaskByTitle(
  title: string,
  userId: string,
  options: { maxSubtasks?: number } = {}
): Promise<TitleBreakdownResult> {
  const maxSubtasks = options.maxSubtasks || 5;

  if (!isAIEnabled()) {
    // 基于标题的简单拆解
    const keywords = title.toLowerCase();
    let subtasks: string[] = [];
    
    if (keywords.includes('报告') || keywords.includes('周报')) {
      subtasks = ['收集本周工作数据', '总结主要完成事项', '分析遇到的问题', '制定下周计划', '格式化并提交'];
    } else if (keywords.includes('会议') || keywords.includes('开会')) {
      subtasks = ['确认会议主题和议程', '通知参会人员', '准备会议材料', '预订会议室/设置线上链接', '记录会议纪要'];
    } else if (keywords.includes('方案') || keywords.includes('策划')) {
      subtasks = ['明确目标和需求', '调研参考案例', '制定初步方案', '内部评审优化', '输出最终文档'];
    } else {
      subtasks = ['明确任务目标', '分析所需资源', '制定执行步骤', '开始执行', '检查并完成'];
    }
    
    return { subtasks: subtasks.slice(0, maxSubtasks), estimatedTime: '1-2 小时' };
  }

  const systemPrompt = `你是一个任务分解专家。根据用户提供的任务标题，将其拆解为具体可执行的子任务。

规则：
1. 子任务应该具体、可执行
2. 每个子任务用一句话描述
3. 保持逻辑顺序
4. 最多返回 ${maxSubtasks} 个子任务

返回 JSON 格式：
{
  "subtasks": ["子任务1", "子任务2", ...],
  "estimatedTime": "预估总时间"
}`;

  const userPrompt = `请将以下任务拆解为具体的执行步骤：

**任务**：${title}`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 'title_breakdown', {
      userId,
      maxTokens: 500,
    });

    return parseJSON<TitleBreakdownResult>(result, 'title_breakdown');
  } catch (error) {
    log.error('任务标题拆解失败', { error: (error as Error).message });
    
    return {
      subtasks: ['分析任务需求', '准备必要资源', '执行主要工作', '检查并优化', '完成并归档'],
      estimatedTime: '1-2 小时',
    };
  }
}

// ==================== 导出 ====================

export const aiService = {
  breakdownTask,
  predictTaskRisk,
  recommendPriority,
  recommendAssignment,
  estimateProjectProgress,
  getDailySuggestions,
  getNextTaskSuggestion,
  optimizeTasks,
  generateNextTasks,
  optimizeSingleTask,
  optimizeProject,
  chatWithTask,
  suggestProjectTasks,
  optimizeBroadcastMessage,
  companionChat,
  breakdownTaskByTitle,
  isEnabled: isAIEnabled,
  AIError,
  AIErrorCodes,
};
