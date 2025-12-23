/**
 * 认证控制器
 * 处理用户注册、登录、获取当前用户信息
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { 
  validatePasswordStrength, 
  validateEmail, 
  validateName 
} from '../utils/validators';

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

    // 验证邮箱格式
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      throw new AppError(emailValidation.error || '邮箱格式不正确', 400, 'INVALID_EMAIL');
    }

    // 验证用户名
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      throw new AppError(nameValidation.error || '用户名格式不正确', 400, 'INVALID_NAME');
    }

    // 验证密码强度
    const passwordValidation = validatePasswordStrength(password, email, name);
    if (!passwordValidation.isValid) {
      throw new AppError(
        passwordValidation.errors[0] || '密码不符合要求', 
        400, 
        'WEAK_PASSWORD',
        { 
          strength: passwordValidation.strength,
          checks: passwordValidation.checks,
          errors: passwordValidation.errors,
        }
      );
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
 * 用户登录（支持邮箱或手机号）
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('请提供账号和密码', 400, 'MISSING_FIELDS');
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
 * POST /auth/send-code
 * 发送手机验证码
 */
authRouter.post('/send-code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      throw new AppError('请提供手机号', 400, 'MISSING_FIELDS');
    }

    const result = await authService.sendPhoneCode(phone);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login-phone
 * 手机号+验证码登录（自动注册新用户）
 */
authRouter.post('/login-phone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      throw new AppError('请提供手机号和验证码', 400, 'MISSING_FIELDS');
    }

    const result = await authService.loginByPhone(phone, code);

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
 * 更新用户资料（名称、邮箱和个人信息）
 */
authRouter.patch('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, profession, bio, phone, company, location } = req.body;

    // 至少需要提供一个字段
    if (!name && !email && !profession && bio === undefined && !phone && !company && !location) {
      throw new AppError('请提供要更新的字段', 400, 'MISSING_FIELDS');
    }

    const user = await authService.updateProfile(req.user!.userId, { 
      name, 
      email,
      profession,
      bio,
      phone,
      company,
      location,
    });

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

    // 验证新密码强度
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(
        passwordValidation.errors[0] || '新密码不符合要求', 
        400, 
        'WEAK_PASSWORD',
        { 
          strength: passwordValidation.strength,
          checks: passwordValidation.checks,
          errors: passwordValidation.errors,
        }
      );
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

/**
 * POST /auth/forgot-password
 * 请求密码重置
 */
authRouter.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('请提供邮箱地址', 400, 'MISSING_FIELDS');
    }

    const result = await authService.requestPasswordReset(email);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/verify-reset-token
 * 验证重置令牌
 */
authRouter.post('/verify-reset-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError('请提供重置令牌', 400, 'MISSING_FIELDS');
    }

    const result = await authService.verifyResetToken(token);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/reset-password
 * 重置密码
 */
authRouter.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('请提供重置令牌和新密码', 400, 'MISSING_FIELDS');
    }

    // 验证新密码强度
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(
        passwordValidation.errors[0] || '新密码不符合要求', 
        400, 
        'WEAK_PASSWORD',
        { 
          strength: passwordValidation.strength,
          checks: passwordValidation.checks,
          errors: passwordValidation.errors,
        }
      );
    }

    const result = await authService.resetPassword(token, newPassword);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /auth/complete-profile
 * 完善个人信息
 */
authRouter.patch('/complete-profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profession, bio, phone, company, location } = req.body;

    if (!profession) {
      throw new AppError('请选择您的职业', 400, 'MISSING_FIELDS');
    }

    const user = await authService.completeProfile(req.user!.userId, {
      profession,
      bio,
      phone,
      company,
      location,
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

