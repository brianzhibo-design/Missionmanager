/**
 * 认证控制器
 * 处理用户注册、登录、获取当前用户信息
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

/**
 * POST /auth/register
 * 用户注册
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // 基础校验
    if (!email || !password || !name) {
      throw new AppError('请提供 email、password 和 name', 400, 'MISSING_FIELDS');
    }

    if (password.length < 6) {
      throw new AppError('密码长度至少 6 位', 400, 'PASSWORD_TOO_SHORT');
    }

    const result = await authService.register(email, password, name);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login
 * 用户登录
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('请提供 email 和 password', 400, 'MISSING_FIELDS');
    }

    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * 获取当前用户信息（需要登录）
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /auth/profile
 * 更新用户资料（名称和邮箱）
 */
authRouter.patch('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      throw new AppError('请提供要更新的字段', 400, 'MISSING_FIELDS');
    }

    const user = await authService.updateProfile(req.user!.userId, { name, email });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /auth/password
 * 更新密码
 */
authRouter.patch('/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('请提供当前密码和新密码', 400, 'MISSING_FIELDS');
    }

    const result = await authService.updatePassword(req.user!.userId, currentPassword, newPassword);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

