/**
 * 认证服务
 * 处理用户注册、登录、JWT 签发与验证
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
  };
  token: string;
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
      user: { id: user.id, email: user.email, name: user.name },
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
      user: { id: user.id, email: user.email, name: user.name },
      token,
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

