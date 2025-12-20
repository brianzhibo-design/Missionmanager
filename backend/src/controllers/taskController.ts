/**
 * 任务控制器
 */
import { Router, Request, Response, NextFunction } from 'express';
import { taskService } from '../services/taskService';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../infra/database';

/**
 * 规范化任务数据，确保 status 始终有值
 */
function normalizeTask<T extends { status?: string | null }>(task: T): T & { status: string } {
  return {
    ...task,
    status: task.status || 'todo',
  };
}

function normalizeTasks<T extends { status?: string | null }>(tasks: T[]): (T & { status: string })[] {
  return tasks.map(normalizeTask);
}

export const taskRouter = Router();

taskRouter.use(requireAuth);

/**
 * POST /tasks - 创建任务
 */
taskRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, title, description, status, priority, assigneeId, parentId, dueDate } = req.body;

    if (!projectId || !title) {
      throw new AppError('请提供 projectId 和 title', 400, 'MISSING_FIELDS');
    }

    const task = await taskService.create(req.user!.userId, {
      projectId,
      title,
      description,
      status,
      priority,
      assigneeId,
      parentId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks?projectId=xxx - 获取项目任务列表
 */
taskRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, status, assigneeId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      throw new AppError('请提供 projectId', 400, 'MISSING_PROJECT_ID');
    }

    const tasks = await taskService.getByProject(req.user!.userId, projectId, {
      status: status as string | undefined,
      assigneeId: assigneeId as string | undefined,
    });

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/stats/project/:projectId - 获取项目任务统计
 */
taskRouter.get('/stats/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await taskService.getProjectStats(req.user!.userId, req.params.projectId);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/my - 获取当前用户的所有任务
 */
taskRouter.get('/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { status, priority, dueFilter } = req.query;

    // 构建查询条件
    const where: any = {
      assigneeId: userId,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    // 日期筛选
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (dueFilter === 'today') {
      where.dueDate = {
        gte: today,
        lt: tomorrow,
      };
    } else if (dueFilter === 'upcoming') {
      where.dueDate = {
        gte: tomorrow,
        lte: nextWeek,
      };
    } else if (dueFilter === 'overdue') {
      where.dueDate = {
        lt: today,
      };
      where.status = { not: 'done' };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // 计算统计
    const allTasks = await prisma.task.findMany({
      where: { assigneeId: userId },
      select: { status: true, dueDate: true },
    });

    const stats = {
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      review: allTasks.filter(t => t.status === 'review').length,
      done: allTasks.filter(t => t.status === 'done').length,
      overdue: allTasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < today && 
        t.status !== 'done'
      ).length,
      dueToday: allTasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) >= today && 
        new Date(t.dueDate) < tomorrow
      ).length,
    };

    res.json({
      success: true,
      data: {
        tasks: normalizeTasks(tasks),
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:id - 获取任务详情
 */
taskRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.getById(req.user!.userId, req.params.id);

    res.json({
      success: true,
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /tasks/:id - 更新任务（不含状态）
 */
taskRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, priority, assigneeId, dueDate } = req.body;

    const task = await taskService.update(req.user!.userId, req.params.id, {
      title,
      description,
      priority,
      assigneeId,
      dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
    });

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /tasks/:id/status - 智能状态转换（保留用户习惯，后端智能处理）
 */
taskRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;

    if (!status) {
      throw new AppError('请提供 status', 400, 'MISSING_STATUS');
    }

    const result = await taskService.changeStatusSmart(req.user!.userId, req.params.id, status);

    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /tasks/:id - 删除任务
 */
taskRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await taskService.delete(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: '任务已删除',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/batch/complete - 批量完成任务（遵循审核流程）
 */
taskRouter.post('/batch/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskIds } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new AppError('请提供要完成的任务ID列表', 400, 'MISSING_TASK_IDS');
    }

    const results = await taskService.batchComplete(req.user!.userId, taskIds);

    res.json({
      success: true,
      data: {
        results,
        message: `成功完成 ${results.success.length} 个任务${results.failed.length > 0 ? `，${results.failed.length} 个任务失败` : ''}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/batch/delete - 批量删除任务（含级联删除子任务）
 */
taskRouter.post('/batch/delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskIds } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new AppError('请提供要删除的任务ID列表', 400, 'MISSING_TASK_IDS');
    }

    const results = await taskService.batchDelete(req.user!.userId, taskIds);

    res.json({
      success: true,
      data: {
        results,
        message: `成功删除 ${results.success.length} 个任务${results.subtaskCount > 0 ? `及 ${results.subtaskCount} 个子任务` : ''}${results.failed.length > 0 ? `，${results.failed.length} 个任务删除失败` : ''}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:id/events - 获取任务事件历史
 */
taskRouter.get('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await taskService.getEvents(req.user!.userId, req.params.id);

    res.json({
      success: true,
      data: { events },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/submit-review - 提交任务审核
 * 任务负责人点击"完成"后，将任务从 in_progress 转为 review
 */
taskRouter.post('/:id/submit-review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.submitForReview(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: '任务已提交审核',
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/approve - 审核通过
 * 项目负责人/管理员将任务从 review 转为 done
 */
taskRouter.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.approveTask(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: '审核通过',
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/reject - 审核不通过
 * 项目负责人/管理员将任务从 review 退回 in_progress
 */
taskRouter.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const task = await taskService.rejectTask(req.user!.userId, req.params.id, reason);

    res.json({
      success: true,
      message: '已退回修改',
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/start - 开始任务
 * 将任务从 todo 转为 in_progress
 */
taskRouter.post('/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.startTask(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: '任务已开始',
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/reopen - 重新打开任务
 * 将任务从 done 转为 in_progress
 */
taskRouter.post('/:id/reopen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.reopenTask(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: '任务已重新打开',
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/complete - 直接完成任务（无需审核）
 * 将任务从 in_progress 转为 done
 */
taskRouter.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.completeTask(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: '任务已完成',
      data: { task: normalizeTask(task) },
    });
  } catch (error) {
    next(error);
  }
});

