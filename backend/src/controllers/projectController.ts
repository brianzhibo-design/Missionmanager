/**
 * 项目控制器
 */
import { Router, Request, Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';

export const projectRouter = Router();

// 所有接口都需要登录
projectRouter.use(requireAuth);

/**
 * POST /projects - 创建项目
 */
projectRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, name, description } = req.body;

    if (!workspaceId || !name) {
      throw new AppError('请提供 workspaceId 和 name', 400, 'MISSING_FIELDS');
    }

    const project = await projectService.create(req.user!.userId, workspaceId, {
      name,
      description,
    });

    res.status(201).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects?workspaceId=xxx - 获取工作区下的项目列表
 */
projectRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new AppError('请提供 workspaceId', 400, 'MISSING_WORKSPACE_ID');
    }

    const projects = await projectService.getByWorkspace(req.user!.userId, workspaceId);

    res.json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id - 获取项目详情
 */
projectRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getById(req.user!.userId, req.params.id);

    res.json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /projects/:id - 更新项目
 */
projectRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, status } = req.body;
    const project = await projectService.update(req.user!.userId, req.params.id, {
      name,
      description,
      status,
    });

    res.json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /projects/:id - 删除项目
 */
projectRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await projectService.delete(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: '项目已删除',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /projects/:id/leader - 设置项目负责人
 */
projectRouter.put('/:id/leader', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { leaderId } = req.body;
    const project = await projectService.setLeader(req.user!.userId, req.params.id, leaderId);

    res.json({
      success: true,
      data: { project },
      message: leaderId ? '项目负责人已设置' : '项目负责人已移除',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id/team - 获取项目团队成员
 */
projectRouter.get('/:id/team', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await projectService.getTeamMembers(req.user!.userId, req.params.id);

    res.json({
      success: true,
      data: { members },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:id/team - 添加团队成员
 */
projectRouter.post('/:id/team', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, role } = req.body;

    if (!memberId) {
      throw new AppError('请提供 memberId', 400, 'MISSING_MEMBER_ID');
    }

    const member = await projectService.addTeamMember(req.user!.userId, req.params.id, memberId, role);

    res.status(201).json({
      success: true,
      data: { member },
      message: '团队成员已添加',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /projects/:id/team/:memberId - 移除团队成员
 */
projectRouter.delete('/:id/team/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await projectService.removeTeamMember(req.user!.userId, req.params.id, req.params.memberId);

    res.json({
      success: true,
      message: '团队成员已移除',
    });
  } catch (error) {
    next(error);
  }
});

