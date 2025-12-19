/**
 * 文件上传路由
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  uploadMiddleware,
  uploadAvatar,
  uploadTaskAttachment,
  deleteTaskAttachment,
  getTaskAttachments,
  uploadCommentImage,
  uploadProjectFile,
  getProjectFiles,
  deleteProjectFile,
  uploadReportAttachment,
  getReportAttachments,
  deleteReportAttachment,
  getPresignedUploadUrl,
  getDownloadUrl,
} from '../controllers/uploadController';

const router = Router();

// 所有路由都需要认证
router.use(requireAuth);

// 用户头像
router.post('/avatar', uploadMiddleware.single('file'), uploadAvatar);

// 任务附件
router.post('/tasks/:taskId/attachments', uploadMiddleware.single('file'), uploadTaskAttachment);
router.get('/tasks/:taskId/attachments', getTaskAttachments);
router.delete('/attachments/:attachmentId', deleteTaskAttachment);

// 评论图片
router.post('/tasks/:taskId/comment-images', uploadMiddleware.single('file'), uploadCommentImage);

// 项目文件
router.post('/projects/:projectId/files', uploadMiddleware.single('file'), uploadProjectFile);
router.get('/projects/:projectId/files', getProjectFiles);
router.delete('/files/:fileId', deleteProjectFile);

// 报告附件
router.post('/reports/:reportId/attachments', uploadMiddleware.single('file'), uploadReportAttachment);
router.get('/reports/:reportId/attachments', getReportAttachments);
router.delete('/report-attachments/:attachmentId', deleteReportAttachment);

// 预签名 URL（用于大文件直传）
router.post('/presigned-url', getPresignedUploadUrl);
router.get('/download-url', getDownloadUrl);

export default router;

