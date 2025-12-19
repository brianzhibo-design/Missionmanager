import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { storageService, FileCategory } from '../services/storageService';
import { requireAuth } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  },
});

router.post('/avatar', requireAuth, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择文件' });
    }

    const result = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'avatars',
      req.user!.userId
    );

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatar: result.url },
    });

    res.json({
      success: true,
      data: { url: result.url },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/attachment', requireAuth, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择文件' });
    }

    const category = (req.body.category as FileCategory) || 'attachments';

    const result = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      category,
      req.user!.userId
    );

    res.json({
      success: true,
      data: {
        key: result.key,
        url: result.url,
        name: req.file.originalname,
        size: result.size,
        type: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:key(*)', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storageService.deleteFile(req.params.key);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
