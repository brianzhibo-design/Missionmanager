/**
 * 通知控制器
 */
import { Router, Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { requireAuth } from '../middleware/authMiddleware';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

// GET /notifications - 获取通知列表
notificationRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { unreadOnly, limit, offset } = req.query;

      const result = await notificationService.getByUser(userId, {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /notifications/:id/read - 标记为已读
notificationRouter.post(
  '/:id/read',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await notificationService.markAsRead(id, userId);

      res.json({
        success: true,
        message: '已标记为已读',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /notifications/read-all - 标记全部已读
notificationRouter.post(
  '/read-all',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: '已全部标记为已读',
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /notifications/:id - 删除通知
notificationRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await notificationService.delete(id, userId);

      res.json({
        success: true,
        message: '通知已删除',
      });
    } catch (error) {
      next(error);
    }
  }
);

