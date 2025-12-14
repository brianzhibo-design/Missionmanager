/**
 * 树状视图控制器
 * 处理成员任务树和项目树查询请求
 */
import { Router, Request, Response, NextFunction } from 'express';
import { treeService } from '../services/treeService';
import { requireAuth } from '../middleware/authMiddleware';

export const treeRouter = Router();

treeRouter.use(requireAuth);

/**
 * GET /tree/projects/:projectId/members
 * 获取项目成员任务树
 */
treeRouter.get(
  '/projects/:projectId/members',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tree = await treeService.getMemberTree(
        req.user!.userId,
        req.params.projectId
      );

      res.json({
        success: true,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tree/workspaces/:workspaceId/projects
 * 获取工作区项目树
 */
treeRouter.get(
  '/workspaces/:workspaceId/projects',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tree = await treeService.getProjectTree(
        req.user!.userId,
        req.params.workspaceId
      );

      res.json({
        success: true,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }
);

