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

// ============ 加入申请相关 ============

/**
 * GET /workspaces/lookup/:id - 通过 ID 查找工作区（公开信息）
 */
workspaceRouter.get('/lookup/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = await workspaceService.findWorkspaceById(req.params.id);
    
    if (!workspace) {
      throw new AppError('工作区不存在', 404, 'WORKSPACE_NOT_FOUND');
    }

    // 只返回公开信息
    res.json({
      success: true,
      data: {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workspaces/:id/join-request - 申请加入工作区
 */
workspaceRouter.post('/:id/join-request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    const request = await workspaceService.requestJoin(req.user!.userId, req.params.id, message);

    res.status(201).json({
      success: true,
      data: { request },
      message: '申请已提交，请等待管理员审批',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workspaces/:id/join-requests - 获取工作区的待审批申请
 */
workspaceRouter.get('/:id/join-requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await workspaceService.getJoinRequests(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workspaces/join-requests/:requestId/review - 审批申请
 */
workspaceRouter.post('/join-requests/:requestId/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { approved, role } = req.body;
    
    if (typeof approved !== 'boolean') {
      throw new AppError('请指定是否批准', 400, 'MISSING_APPROVED');
    }

    const request = await workspaceService.reviewJoinRequest(
      req.params.requestId,
      req.user!.userId,
      approved,
      role || 'member'
    );

    res.json({
      success: true,
      data: { request },
      message: approved ? '已批准该申请' : '已拒绝该申请',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workspaces/my-join-requests - 获取我的申请列表
 */
workspaceRouter.get('/my-join-requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await workspaceService.getMyJoinRequests(req.user!.userId);

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
});

