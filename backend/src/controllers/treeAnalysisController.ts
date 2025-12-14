/**
 * 树分析 Controller
 * 提供团队任务树分析和项目全景分析 API
 */
import { Router, Request, Response, NextFunction } from 'express';
import { treeAnalysisService } from '../services/treeAnalysisService';
import { requireAuth } from '../middleware/authMiddleware';

export const treeAnalysisRouter = Router();

treeAnalysisRouter.use(requireAuth);

// POST /tree-analysis/projects/:projectId/team - 分析团队任务树
treeAnalysisRouter.post(
  '/projects/:projectId/team',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await treeAnalysisService.analyzeTeamTree(
        req.user!.userId,
        req.params.projectId
      );

      res.json({
        success: true,
        data: { analysis: result },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /tree-analysis/workspaces/:workspaceId/overview - 分析项目全景
treeAnalysisRouter.post(
  '/workspaces/:workspaceId/overview',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await treeAnalysisService.analyzeProjectsOverview(
        req.user!.userId,
        req.params.workspaceId
      );

      res.json({
        success: true,
        data: { analysis: result },
      });
    } catch (error) {
      next(error);
    }
  }
);

