/**
 * 管理控制器
 * 处理角色管理和汇报关系管理请求
 */
import { Router, Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';

export const adminRouter = Router();

adminRouter.use(requireAuth);

/**
 * PATCH /admin/workspaces/:workspaceId/members/:userId/role
 * 设置工作区成员角色
 */
adminRouter.patch(
  '/workspaces/:workspaceId/members/:userId/role',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = req.params;
      const { role } = req.body;

      if (!role) {
        throw new AppError('请提供 role', 400, 'MISSING_ROLE');
      }

      const result = await adminService.setWorkspaceRole(
        req.user!.userId,
        workspaceId,
        userId,
        role
      );

      res.json({
        success: true,
        data: { membership: result },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/projects/:projectId/members
 * 获取项目成员列表
 */
adminRouter.get(
  '/projects/:projectId/members',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await adminService.getProjectMembers(
        req.user!.userId,
        req.params.projectId
      );

      res.json({
        success: true,
        data: { members },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/projects/:projectId/members
 * 添加/更新项目成员
 */
adminRouter.post(
  '/projects/:projectId/members',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { userId, isLeader, managerId, role } = req.body; // 支持 role（向后兼容）和 isLeader

      if (!userId) {
        throw new AppError('请提供 userId', 400, 'MISSING_FIELDS');
      }

      // 支持新旧两种接口：isLeader 或 role
      let isLeaderValue = false;
      if (typeof isLeader === 'boolean') {
        isLeaderValue = isLeader;
      } else if (role) {
        // 向后兼容：将 role 转换为 isLeader
        isLeaderValue = role === 'lead' || role === 'project_admin';
      }

      const member = await adminService.setProjectMember(
        req.user!.userId,
        projectId,
        userId,
        isLeaderValue,
        managerId
      );

      res.json({
        success: true,
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/projects/:projectId/reporting
 * 批量设置汇报关系
 */
adminRouter.post(
  '/projects/:projectId/reporting',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { subordinateIds, managerId } = req.body;

      if (!Array.isArray(subordinateIds) || subordinateIds.length === 0) {
        throw new AppError('请提供 subordinateIds 数组', 400, 'MISSING_SUBORDINATES');
      }

      const result = await adminService.setReportingRelation(
        req.user!.userId,
        projectId,
        subordinateIds,
        managerId ?? null
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/projects/:projectId/subordinates/:managerId
 * 获取某用户在项目中的所有下属
 */
adminRouter.get(
  '/projects/:projectId/subordinates/:managerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, managerId } = req.params;

      const subordinateIds = await adminService.getSubordinates(
        req.user!.userId,
        projectId,
        managerId
      );

      res.json({
        success: true,
        data: { subordinateIds },
      });
    } catch (error) {
      next(error);
    }
  }
);

