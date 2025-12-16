/**
 * 通知控制器
 * 处理通知相关的 HTTP 请求
 */
import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(requireAuth);

/**
 * 获取当前用户的通知列表
 * GET /notifications
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getByUserId(userId, { limit, offset, unreadOnly });
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('获取通知失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取通知失败' });
  }
});

/**
 * 标记通知为已读
 * PATCH /notifications/:notificationId/read
 */
router.patch('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.userId;

    await notificationService.markAsRead(notificationId, userId);
    res.json({ success: true, data: null });
  } catch (error: any) {
    console.error('标记已读失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '标记已读失败' });
  }
});

/**
 * 标记所有通知为已读
 * POST /notifications/read-all
 */
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = await notificationService.markAllAsRead(userId);
    res.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error('标记全部已读失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '标记全部已读失败' });
  }
});

/**
 * 删除通知
 * DELETE /notifications/:notificationId
 */
router.delete('/:notificationId', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.userId;

    await notificationService.delete(notificationId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('删除通知失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '删除通知失败' });
  }
});

/**
 * 清空所有已读通知
 * DELETE /notifications/clear-read
 */
router.delete('/clear-read', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = await notificationService.clearRead(userId);
    res.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error('清空已读通知失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '清空已读通知失败' });
  }
});

export default router;
