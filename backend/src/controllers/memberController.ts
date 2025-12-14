/**
 * 成员管理控制器
 */
import { Router, Request, Response, NextFunction } from 'express';
import { workspaceService } from '../services/workspaceService';
import { workspaceRepository } from '../repositories/workspaceRepository';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';

export const memberRouter = Router();

memberRouter.use(requireAuth);

// GET /members/workspaces/:workspaceId - 获取工作区成员列表
memberRouter.get(
  '/workspaces/:workspaceId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.userId;

      // 验证是工作区成员
      const membership = await workspaceRepository.getMembership(workspaceId, userId);
      if (!membership) {
        throw new AppError('无权访问此工作区', 403, 'ACCESS_DENIED');
      }

      const members = await workspaceRepository.getMembers(workspaceId);

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /members/workspaces/:workspaceId - 邀请成员
memberRouter.post(
  '/workspaces/:workspaceId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const { email, role } = req.body;
      const userId = req.user!.userId;

      if (!email) {
        throw new AppError('请提供成员邮箱', 400, 'MISSING_EMAIL');
      }

      const member = await workspaceService.inviteMemberByEmail(
        workspaceId,
        userId,
        email,
        role || 'member'
      );

      res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /members/workspaces/:workspaceId/:memberId - 更新成员角色
memberRouter.patch(
  '/workspaces/:workspaceId/:memberId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, memberId } = req.params;
      const { role } = req.body;
      const userId = req.user!.userId;

      if (!role) {
        throw new AppError('请提供新角色', 400, 'MISSING_ROLE');
      }

      const member = await workspaceService.updateMemberRole(
        workspaceId,
        userId,
        memberId,
        role
      );

      res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /members/workspaces/:workspaceId/:memberId - 移除成员
memberRouter.delete(
  '/workspaces/:workspaceId/:memberId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, memberId } = req.params;
      const userId = req.user!.userId;

      await workspaceService.removeMember(workspaceId, userId, memberId);

      res.json({
        success: true,
        message: '成员已移除',
      });
    } catch (error) {
      next(error);
    }
  }
);

