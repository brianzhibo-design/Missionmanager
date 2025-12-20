import { Router, Request, Response, NextFunction } from 'express';
import { aiService, AIError, AIErrorCodes } from '../services/aiService';
import { requireTaskAccess, requireProjectAccess, requireWorkspaceAccess } from '../middleware/aiAuth';
import { log } from '../lib/logger';
import { requireAuth } from '../middleware/authMiddleware';
import { getAIStatus } from '../lib/aiConfig';

const router = Router();

function handleAIError(error: any, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AIError) {
    const statusMap: Record<string, number> = {
      [AIErrorCodes.DISABLED]: 503,
      [AIErrorCodes.RATE_LIMITED]: 429,
      [AIErrorCodes.QUOTA_EXCEEDED]: 429,
      [AIErrorCodes.TIMEOUT]: 504,
      [AIErrorCodes.PARSE_ERROR]: 500,
      [AIErrorCodes.API_ERROR]: 503,
      [AIErrorCodes.NOT_FOUND]: 404,
    };

    return res.status(statusMap[error.code] || 500).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        retryable: [AIErrorCodes.TIMEOUT, AIErrorCodes.API_ERROR].includes(error.code as any),
      },
    });
  }

  log.error('AI Controller 错误', { error: (error as Error).message });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '服务器错误' } });
}

// AI 状态（无需额外权限）
router.get('/status', (_req, res) => {
  const status = getAIStatus();
  res.json({
    success: true,
    data: {
      enabled: status.enabled,
      hasApiKey: status.hasApiKey,
      provider: status.provider,
      model: status.model,
      reason: status.reason,
      features: ['breakdown', 'risk', 'priority', 'assignment', 'progress', 'suggestions', 'optimize'],
    },
  });
});

// 任务分解
// 单个任务优化（标题和描述）
router.get('/tasks/:id/optimize', requireAuth, requireTaskAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const result = await aiService.optimizeSingleTask(id, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 项目优化（标题、描述、团队构成）
router.get('/projects/:id/optimize-project', requireAuth, requireProjectAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const result = await aiService.optimizeProject(id, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

router.post('/tasks/:id/breakdown', requireAuth, requireTaskAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { maxSubtasks, granularity } = req.body;
    const userId = req.user!.userId;
    const result = await aiService.breakdownTask(id, userId, { maxSubtasks, granularity });
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 风险预测
router.get('/tasks/:id/risk', requireAuth, requireTaskAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const result = await aiService.predictTaskRisk(id, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// AI 对话
router.post('/tasks/:id/chat', requireAuth, requireTaskAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '请输入消息' } });
    }

    const result = await aiService.chatWithTask(id, userId, message, history || []);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 优先级推荐
router.post('/tasks/recommend-priority', requireAuth, async (req, res, next) => {
  try {
    const { title, description, projectId, dueDate } = req.body;
    const userId = req.user!.userId;

    if (!title || !projectId) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少参数' } });

    const result = await aiService.recommendPriority(title, description, projectId, userId, dueDate ? new Date(dueDate) : undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 分配推荐
router.get('/tasks/:id/recommend-assignment', requireAuth, requireTaskAccess, requireWorkspaceAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).workspaceId;
    const userId = req.user!.userId;
    const result = await aiService.recommendAssignment(id, workspaceId, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 项目进度
router.get('/projects/:id/progress-estimate', requireAuth, requireProjectAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const result = await aiService.estimateProjectProgress(id, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 每日建议
router.get('/daily-suggestions', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const result = await aiService.getDailySuggestions(userId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 任务优化建议
router.get('/projects/:id/optimize', requireAuth, requireProjectAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const result = await aiService.optimizeTasks(id, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 智能任务生成（下一步建议 + 自动创建）
router.post('/projects/:id/generate-tasks', requireAuth, requireProjectAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tasks } = req.body;
    const userId = req.user!.userId;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: '请提供 tasks 数组' } 
      });
    }

    const result = await aiService.generateNextTasks(id, userId, tasks);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 下一步任务建议
router.post('/next-task-suggestion', requireAuth, async (req, res, next) => {
  try {
    const { projectId, tasks } = req.body;
    const userId = req.user!.userId;

    if (!projectId) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: '缺少 projectId' } 
      });
    }

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: '缺少 tasks 数组' } 
      });
    }

    const result = await aiService.getNextTaskSuggestion(projectId, userId, tasks);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// AI 推荐项目任务（创建项目时使用）
router.post('/suggest-project-tasks', requireAuth, async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const userId = req.user!.userId;

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: '请提供有效的项目标题' } 
      });
    }

    const result = await aiService.suggestProjectTasks(
      title.trim(), 
      description?.trim() || '', 
      userId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// AI 优化群发消息
router.post('/optimize-broadcast', requireAuth, async (req, res, next) => {
  try {
    const { title, content, context } = req.body;
    const userId = req.user!.userId;

    if (!title && !content) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: '请提供标题或内容' } 
      });
    }

    const messageContext = context || 'general';
    const validContexts = ['announcement', 'reminder', 'notification', 'general'];
    
    const result = await aiService.optimizeBroadcastMessage(
      title?.trim() || '', 
      content?.trim() || '', 
      validContexts.includes(messageContext) ? messageContext : 'general',
      userId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// 🌞 暖阳 AI 伙伴通用聊天
router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const { message, context } = req.body;
    const userId = req.user!.userId;

    if (!message?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: '请提供消息内容' } 
      });
    }

    const result = await aiService.companionChat(message.trim(), userId, context);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

// ✨ 智能任务拆解（基于任务标题）
router.post('/breakdown-title', requireAuth, async (req, res, next) => {
  try {
    const { title, maxSubtasks } = req.body;
    const userId = req.user!.userId;

    if (!title?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: '请提供任务标题' } 
      });
    }

    const result = await aiService.breakdownTaskByTitle(title.trim(), userId, { maxSubtasks: maxSubtasks || 5 });
    res.json({ success: true, data: result });
  } catch (error) {
    handleAIError(error, req, res, next);
  }
});

export const aiRouter = router;
export default router;
