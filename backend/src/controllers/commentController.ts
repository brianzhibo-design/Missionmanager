/**
 * 评论控制器
 * 处理任务评论相关的 HTTP 请求
 */
import { Router, Request, Response } from 'express';
import { commentService } from '../services/commentService';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(requireAuth);

/**
 * 获取任务的所有评论
 * GET /comments/tasks/:taskId
 */
router.get('/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const comments = await commentService.getByTaskId(taskId);
    res.json({ success: true, data: comments });
  } catch (error: any) {
    console.error('获取评论失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取评论失败' });
  }
});

/**
 * 创建评论
 * POST /comments/tasks/:taskId
 */
router.post('/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { content, mentionedUserIds } = req.body;
    const userId = req.user!.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: '评论内容不能为空' });
    }

    const comment = await commentService.create({
      taskId,
      userId,
      content: content.trim(),
      mentionedUserIds,
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error: any) {
    console.error('创建评论失败:', error);
    if (error.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ error: 'TASK_NOT_FOUND', message: '任务不存在' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '创建评论失败' });
  }
});

/**
 * 点赞/取消点赞评论
 * POST /comments/:commentId/like
 */
router.post('/:commentId/like', async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.userId;

    const result = await commentService.toggleLike(commentId, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('点赞失败:', error);
    if (error.message === 'COMMENT_NOT_FOUND') {
      return res.status(404).json({ error: 'COMMENT_NOT_FOUND', message: '评论不存在' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '操作失败' });
  }
});

/**
 * 删除评论
 * DELETE /comments/:commentId
 */
router.delete('/:commentId', async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.userId;

    await commentService.delete(commentId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('删除评论失败:', error);
    if (error.message === 'COMMENT_NOT_FOUND') {
      return res.status(404).json({ error: 'COMMENT_NOT_FOUND', message: '评论不存在' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'FORBIDDEN', message: '无权限删除此评论' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '删除评论失败' });
  }
});

export default router;

