/**
 * 工作区控制器
 */
import { Router, Request, Response, NextFunction } from 'express';
import { workspaceService } from '../services/workspaceService';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';

export const workspaceRouter = Router();

// 所有接口都需要登录
workspaceRouter.use(requireAuth);

/**
 * POST /workspaces - 创建工作区
 */
workspaceRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      throw new AppError('请提供工作区名称', 400, 'MISSING_NAME');
    }

    const workspace = await workspaceService.create(req.user!.userId, name, description);

    res.status(201).json({
      success: true,
      data: { workspace },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workspaces - 获取用户的所有工作区
 */
workspaceRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user!.userId);

    res.json({
      success: true,
      data: { workspaces },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workspaces/:id - 获取工作区详情
 */
workspaceRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = await workspaceService.getById(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: { workspace },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /workspaces/:id - 更新工作区
 */
workspaceRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const workspace = await workspaceService.update(req.params.id, req.user!.userId, { 
      name, 
      description 
    });

    res.json({
      success: true,
      data: { workspace },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /workspaces/:id - 删除工作区
 */
workspaceRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await workspaceService.delete(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: '工作区已删除',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workspaces/:id/members - 获取工作区成员
 */
workspaceRouter.get('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await workspaceService.getMembers(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: { members },
    });
  } catch (error) {
    next(error);
  }
});

