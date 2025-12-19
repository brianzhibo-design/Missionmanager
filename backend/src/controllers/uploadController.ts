/**
 * 文件上传控制器
 */

import { Request, Response } from 'express';
import multer from 'multer';
import {
  uploadFile,
  deleteFile,
  validateFile,
  generateFileKey,
  getSignedUploadUrl,
  getSignedDownloadUrl,
  FILE_TYPES,
  FileType,
} from '../lib/storageService';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

// 配置 multer 内存存储
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB 最大限制
  },
});

// 导出 multer 中间件
export const uploadMiddleware = upload;

/**
 * 上传用户头像
 */
export async function uploadAvatar(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    // 验证文件
    const validation = validateFile(file.originalname, file.mimetype, file.size, 'AVATAR');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 生成文件 key
    const key = generateFileKey('AVATAR', file.originalname, userId);

    // 上传文件
    const result = await uploadFile(file.buffer, key, file.mimetype, {
      originalName: file.originalname,
      userId,
    });

    // 更新用户头像 URL
    const oldAvatarUrl = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: result.url },
    });

    // 删除旧头像（如果有且是存储服务上的文件）
    if (oldAvatarUrl?.avatar && oldAvatarUrl.avatar.includes('/avatars/')) {
      try {
        const oldKey = extractKeyFromAvatarUrl(oldAvatarUrl.avatar);
        if (oldKey) {
          await deleteFile(oldKey);
        }
      } catch (e) {
        logger.warn('删除旧头像失败', { error: e });
      }
    }

    res.json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
      },
    });
  } catch (error) {
    logger.error('上传头像失败', { error });
    res.status(500).json({ error: '上传失败' });
  }
}

/**
 * 上传任务附件
 */
export async function uploadTaskAttachment(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const { taskId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    // 验证任务存在且用户有权限
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 验证文件
    const validation = validateFile(file.originalname, file.mimetype, file.size, 'TASK_ATTACHMENT');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 生成文件 key
    const key = generateFileKey('TASK_ATTACHMENT', file.originalname, taskId);

    // 上传文件
    const result = await uploadFile(file.buffer, key, file.mimetype, {
      originalName: file.originalname,
      taskId,
      userId,
    });

    // 保存附件记录到数据库
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        uploaderId: userId,
        filename: result.originalName,
        fileKey: result.key,
        fileUrl: result.url,
        mimeType: result.mimeType,
        fileSize: result.size,
      },
    });

    res.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    logger.error('上传任务附件失败', { error });
    res.status(500).json({ error: '上传失败' });
  }
}

/**
 * 删除任务附件
 */
export async function deleteTaskAttachment(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const { attachmentId } = req.params;

    // 查找附件
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          include: {
            project: {
              include: { members: true },
            },
          },
        },
      },
    });

    if (!attachment) {
      return res.status(404).json({ error: '附件不存在' });
    }

    // 验证权限（上传者或项目管理员）
    const isUploader = attachment.uploaderId === userId;
    const isAdmin = attachment.task.project.members.some(
      m => m.userId === userId && ['owner', 'admin'].includes(m.role)
    );

    if (!isUploader && !isAdmin) {
      return res.status(403).json({ error: '无权删除此附件' });
    }

    // 删除存储中的文件
    await deleteFile(attachment.fileKey);

    // 删除数据库记录
    await prisma.taskAttachment.delete({
      where: { id: attachmentId },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('删除任务附件失败', { error });
    res.status(500).json({ error: '删除失败' });
  }
}

/**
 * 获取任务附件列表
 */
export async function getTaskAttachments(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: attachments });
  } catch (error) {
    logger.error('获取任务附件失败', { error });
    res.status(500).json({ error: '获取失败' });
  }
}

/**
 * 上传评论图片
 */
export async function uploadCommentImage(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const { taskId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    // 验证任务存在
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 验证文件
    const validation = validateFile(file.originalname, file.mimetype, file.size, 'COMMENT_IMAGE');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 生成文件 key
    const key = generateFileKey('COMMENT_IMAGE', file.originalname, taskId);

    // 上传文件
    const result = await uploadFile(file.buffer, key, file.mimetype, {
      originalName: file.originalname,
      taskId,
      userId,
    });

    res.json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        filename: result.originalName,
      },
    });
  } catch (error) {
    logger.error('上传评论图片失败', { error });
    res.status(500).json({ error: '上传失败' });
  }
}

/**
 * 上传项目文件
 */
export async function uploadProjectFile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const { projectId } = req.params;
    const file = req.file;
    const { folder } = req.body; // 可选的文件夹路径

    if (!file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    // 验证项目存在且用户有权限
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: '无权访问此项目' });
    }

    // 验证文件
    const validation = validateFile(file.originalname, file.mimetype, file.size, 'PROJECT_FILE');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 生成文件 key
    const key = generateFileKey('PROJECT_FILE', file.originalname, projectId);

    // 上传文件
    const result = await uploadFile(file.buffer, key, file.mimetype, {
      originalName: file.originalname,
      projectId,
      userId,
    });

    // 保存文件记录
    const projectFile = await prisma.projectFile.create({
      data: {
        projectId,
        uploaderId: userId,
        filename: result.originalName,
        fileKey: result.key,
        fileUrl: result.url,
        mimeType: result.mimeType,
        fileSize: result.size,
        folder: folder || null,
      },
    });

    res.json({
      success: true,
      data: projectFile,
    });
  } catch (error) {
    logger.error('上传项目文件失败', { error });
    res.status(500).json({ error: '上传失败' });
  }
}

/**
 * 获取项目文件列表
 */
export async function getProjectFiles(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    const { folder } = req.query;

    // 验证项目存在且用户有权限
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: '无权访问此项目' });
    }

    const files = await prisma.projectFile.findMany({
      where: {
        projectId,
        ...(folder ? { folder: folder as string } : {}),
      },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: files });
  } catch (error) {
    logger.error('获取项目文件失败', { error });
    res.status(500).json({ error: '获取失败' });
  }
}

/**
 * 删除项目文件
 */
export async function deleteProjectFile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const { fileId } = req.params;

    const file = await prisma.projectFile.findUnique({
      where: { id: fileId },
      include: {
        project: {
          include: { members: true },
        },
      },
    });

    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 验证权限
    const isUploader = file.uploaderId === userId;
    const isAdmin = file.project.members.some(
      m => m.userId === userId && ['owner', 'admin'].includes(m.role)
    );

    if (!isUploader && !isAdmin) {
      return res.status(403).json({ error: '无权删除此文件' });
    }

    await deleteFile(file.fileKey);
    await prisma.projectFile.delete({ where: { id: fileId } });

    res.json({ success: true });
  } catch (error) {
    logger.error('删除项目文件失败', { error });
    res.status(500).json({ error: '删除失败' });
  }
}

/**
 * 获取预签名上传 URL（用于大文件直传）
 */
export async function getPresignedUploadUrl(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const { filename, mimeType, fileType, entityId } = req.body;

    if (!filename || !mimeType || !fileType) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const type = fileType.toUpperCase() as FileType;
    if (!FILE_TYPES[type]) {
      return res.status(400).json({ error: '无效的文件类型' });
    }

    // 生成 key
    const key = generateFileKey(type, filename, entityId);

    // 获取预签名 URL
    const { uploadUrl, publicUrl } = await getSignedUploadUrl(key, mimeType);

    res.json({
      success: true,
      data: {
        uploadUrl,
        publicUrl,
        key,
      },
    });
  } catch (error) {
    logger.error('获取预签名 URL 失败', { error });
    res.status(500).json({ error: '获取失败' });
  }
}

/**
 * 获取文件下载 URL
 */
export async function getDownloadUrl(req: Request, res: Response) {
  try {
    const { key } = req.query;

    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: '缺少文件 key' });
    }

    const downloadUrl = await getSignedDownloadUrl(key);

    res.json({
      success: true,
      data: { downloadUrl },
    });
  } catch (error) {
    logger.error('获取下载 URL 失败', { error });
    res.status(500).json({ error: '获取失败' });
  }
}

/**
 * 上传报告附件
 */
export async function uploadReportAttachment(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const { reportId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    // 验证报告存在
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({ error: '报告不存在' });
    }

    // 验证文件
    const validation = validateFile(file.originalname, file.mimetype, file.size, 'REPORT_ATTACHMENT');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 生成文件 key
    const key = generateFileKey('REPORT_ATTACHMENT', file.originalname, reportId);

    // 上传文件
    const result = await uploadFile(file.buffer, key, file.mimetype, {
      originalName: file.originalname,
      reportId,
      userId,
    });

    // 保存附件记录
    const attachment = await prisma.reportAttachment.create({
      data: {
        reportId,
        uploaderId: userId,
        filename: result.originalName,
        fileKey: result.key,
        fileUrl: result.url,
        mimeType: result.mimeType,
        fileSize: result.size,
      },
    });

    res.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    logger.error('上传报告附件失败', { error });
    res.status(500).json({ error: '上传失败' });
  }
}

/**
 * 获取报告附件列表
 */
export async function getReportAttachments(req: Request, res: Response) {
  try {
    const { reportId } = req.params;

    const attachments = await prisma.reportAttachment.findMany({
      where: { reportId },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: attachments });
  } catch (error) {
    logger.error('获取报告附件失败', { error });
    res.status(500).json({ error: '获取失败' });
  }
}

/**
 * 删除报告附件
 */
export async function deleteReportAttachment(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const { attachmentId } = req.params;

    const attachment = await prisma.reportAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return res.status(404).json({ error: '附件不存在' });
    }

    // 验证权限（上传者）
    if (attachment.uploaderId !== userId) {
      return res.status(403).json({ error: '无权删除此附件' });
    }

    await deleteFile(attachment.fileKey);
    await prisma.reportAttachment.delete({ where: { id: attachmentId } });

    res.json({ success: true });
  } catch (error) {
    logger.error('删除报告附件失败', { error });
    res.status(500).json({ error: '删除失败' });
  }
}

// 辅助函数：从头像 URL 提取 key
function extractKeyFromAvatarUrl(url: string): string | null {
  try {
    const match = url.match(/avatars\/[^?]+/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

