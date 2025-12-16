/**
 * 认证服务
 * 处理用户注册、登录、JWT 签发与验证、密码重置
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository } from '../repositories/userRepository';
import { config } from '../infra/config';
import { AppError } from '../middleware/errorHandler';

/**
 * JWT Payload 类型
 */
export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * 认证响应类型
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    profileCompleted: boolean;
  };
  token: string;
}

/**
 * 用户个人信息类型
 */
export interface UserProfile {
  profession?: string;
  bio?: string;
  phone?: string;
  company?: string;
  location?: string;
}

export const authService = {
  /**
   * 用户注册
   */
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    // 1. 检查邮箱是否已存在
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('该邮箱已被注册', 409, 'EMAIL_EXISTS');
    }

    // 2. 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. 创建用户
    const user = await userRepository.create({
      email,
      name,
      password: hashedPassword,
    });

    // 4. 生成 JWT
    const token = this.generateToken({ userId: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name, profileCompleted: user.profileCompleted },
      token,
    };
  },

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // 1. 查找用户
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    // 2. 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    // 3. 生成 JWT
    const token = this.generateToken({ userId: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name, profileCompleted: user.profileCompleted },
      token,
    };
  },

  /**
   * 请求密码重置（生成重置令牌）
   */
  async requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // 为了安全，即使用户不存在也返回成功信息
      return { message: '如果该邮箱已注册，您将收到密码重置邮件' };
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1小时后过期

    // 保存重置令牌
    await userRepository.update(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    // 注意：在生产环境中，这里应该发送邮件
    // 为了演示，我们直接返回令牌
    return { 
      message: '密码重置链接已发送到您的邮箱',
      resetToken // 仅用于演示，生产环境不应返回
    };
  },

  /**
   * 验证重置令牌
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const user = await userRepository.findByResetToken(token);
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return { valid: false };
    }
    return { valid: true, email: user.email };
  },

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await userRepository.findByResetToken(token);
    if (!user) {
      throw new AppError('重置令牌无效', 400, 'INVALID_TOKEN');
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new AppError('重置令牌已过期', 400, 'TOKEN_EXPIRED');
    }

    if (newPassword.length < 6) {
      throw new AppError('新密码长度至少 6 位', 400, 'PASSWORD_TOO_SHORT');
    }

    // 更新密码并清除重置令牌
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return { message: '密码重置成功' };
  },

  /**
   * 完善个人信息
   */
  async completeProfile(userId: string, profile: UserProfile): Promise<AuthResponse['user']> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    const updatedUser = await userRepository.update(userId, {
      ...profile,
      profileCompleted: true,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      profileCompleted: updatedUser.profileCompleted,
    };
  },

  /**
   * 生成 JWT Token
   */
  generateToken(payload: JwtPayload): string {
    // 使用 @ts-ignore 忽略类型检查，因为 jsonwebtoken 的类型定义有问题
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - expiresIn accepts string like '7d'
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  },

  /**
   * 验证 JWT Token
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch {
      throw new AppError('Token 无效或已过期', 401, 'INVALID_TOKEN');
    }
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }
    return { id: user.id, email: user.email, name: user.name };
  },

  /**
   * 更新用户资料（名称和邮箱）
   */
  async updateProfile(userId: string, data: { name?: string; email?: string }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // 如果要更新邮箱，检查是否已被使用
    if (data.email && data.email !== user.email) {
      const existingUser = await userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new AppError('该邮箱已被使用', 409, 'EMAIL_EXISTS');
      }
    }

    // 更新用户信息
    const updatedUser = await userRepository.update(userId, {
      name: data.name || user.name,
      email: data.email || user.email,
    });

    return { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name };
  },

  /**
   * 更新密码
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // 验证当前密码
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError('当前密码错误', 401, 'INVALID_PASSWORD');
    }

    // 检查新密码长度
    if (newPassword.length < 6) {
      throw new AppError('新密码长度至少 6 位', 400, 'PASSWORD_TOO_SHORT');
    }

    // 加密新密码并更新
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.update(userId, { password: hashedPassword });

    return { message: '密码更新成功' };
  },
};

