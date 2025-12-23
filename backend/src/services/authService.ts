/**
 * 认证服务
 * 处理用户注册、登录、JWT 签发与验证、密码重置、手机号登录
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository } from '../repositories/userRepository';
import { config } from '../infra/config';
import { AppError } from '../middleware/errorHandler';
import { smsService, isValidPhone } from './smsService';
import { loginLockService } from './loginLockService';

/**
 * JWT Payload 类型
 */
export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Token 对响应类型
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Access Token 过期时间（秒）
}

/**
 * 认证响应类型
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    profileCompleted: boolean;
  };
  token: string; // 兼容旧版，同 accessToken
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
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

    // 4. 生成 Token 对
    const tokens = this.generateTokenPair({ userId: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name, profileCompleted: user.profileCompleted },
      token: tokens.accessToken, // 兼容旧版
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  },

  /**
   * 用户登录（邮箱/手机号 + 密码）
   */
  async login(emailOrPhone: string, password: string): Promise<AuthResponse> {
    // 1. 检查账户是否被锁定
    const lockStatus = loginLockService.isLocked(emailOrPhone);
    if (lockStatus.locked) {
      throw new AppError(
        `账户已锁定，请 ${lockStatus.remainingTime} 分钟后再试`,
        429,
        'ACCOUNT_LOCKED',
        { remainingTime: lockStatus.remainingTime }
      );
    }

    // 2. 查找用户（支持邮箱或手机号）
    const user = await userRepository.findByEmailOrPhone(emailOrPhone);
    if (!user) {
      // 记录失败（即使用户不存在也要记录，防止枚举攻击）
      const failInfo = loginLockService.recordFailure(emailOrPhone);
      if (failInfo.locked) {
        throw new AppError(
          `登录失败次数过多，账户已锁定 ${failInfo.lockDuration} 分钟`,
          429,
          'ACCOUNT_LOCKED',
          { lockDuration: failInfo.lockDuration }
        );
      }
      throw new AppError(
        `账号或密码错误，还剩 ${failInfo.remaining} 次尝试机会`,
        401,
        'INVALID_CREDENTIALS',
        { remaining: failInfo.remaining }
      );
    }

    // 3. 验证密码（手机号用户可能没有密码）
    if (!user.password) {
      throw new AppError('该账号未设置密码，请使用验证码登录', 401, 'NO_PASSWORD');
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      // 记录失败
      const failInfo = loginLockService.recordFailure(emailOrPhone);
      if (failInfo.locked) {
        throw new AppError(
          `登录失败次数过多，账户已锁定 ${failInfo.lockDuration} 分钟`,
          429,
          'ACCOUNT_LOCKED',
          { lockDuration: failInfo.lockDuration }
        );
      }
      throw new AppError(
        `账号或密码错误，还剩 ${failInfo.remaining} 次尝试机会`,
        401,
        'INVALID_CREDENTIALS',
        { remaining: failInfo.remaining }
      );
    }

    // 4. 登录成功，重置计数
    loginLockService.recordSuccess(emailOrPhone);

    // 5. 生成 Token 对
    const tokens = this.generateTokenPair({ userId: user.id, email: user.email });

    return {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        phone: user.phone,
        profileCompleted: user.profileCompleted 
      },
      token: tokens.accessToken, // 兼容旧版
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  },

  /**
   * 发送手机验证码
   */
  async sendPhoneCode(phone: string): Promise<{ success: boolean; message: string; code?: string }> {
    if (!isValidPhone(phone)) {
      throw new AppError('手机号格式不正确', 400, 'INVALID_PHONE');
    }

    const result = await smsService.sendCode(phone);
    return result;
  },

  /**
   * 手机号+验证码登录（自动注册新用户）
   */
  async loginByPhone(phone: string, code: string): Promise<AuthResponse> {
    // 1. 验证手机号格式
    if (!isValidPhone(phone)) {
      throw new AppError('手机号格式不正确', 400, 'INVALID_PHONE');
    }

    // 2. 验证验证码
    const verification = smsService.verifyCode(phone, code);
    if (!verification.valid) {
      throw new AppError(verification.message, 400, 'INVALID_CODE');
    }

    // 3. 查找或创建用户
    let user = await userRepository.findByPhone(phone);
    let isNewUser = false;

    if (!user) {
      // 新用户自动注册
      isNewUser = true;
      user = await userRepository.createByPhone({
        phone,
        name: `用户${phone.slice(-4)}`, // 默认昵称
      });
    }

    // 4. 生成 Token 对
    const tokens = this.generateTokenPair({ userId: user.id, email: user.email });

    return {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        phone: user.phone,
        profileCompleted: isNewUser ? false : user.profileCompleted // 新用户未完善资料
      },
      token: tokens.accessToken, // 兼容旧版
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
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
   * 生成 Access Token（短期有效）
   */
  generateAccessToken(payload: JwtPayload): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - expiresIn accepts string like '15m'
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  },

  /**
   * 生成 Refresh Token（长期有效）
   */
  generateRefreshToken(payload: JwtPayload): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - expiresIn accepts string like '7d'
    return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn });
  },

  /**
   * 生成 Token 对（Access + Refresh）
   */
  generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    // 解析过期时间为秒数
    const expiresIn = this.parseExpiresIn(config.jwtExpiresIn);
    
    return { accessToken, refreshToken, expiresIn };
  },

  /**
   * 解析过期时间字符串为秒数
   */
  parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 默认15分钟
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900;
    }
  },

  /**
   * 兼容旧版：生成单个 Token
   */
  generateToken(payload: JwtPayload): string {
    return this.generateAccessToken(payload);
  },

  /**
   * 验证 Access Token
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch {
      throw new AppError('Token 无效或已过期', 401, 'INVALID_TOKEN');
    }
  },

  /**
   * 验证 Refresh Token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload;
    } catch {
      throw new AppError('Refresh Token 无效或已过期', 401, 'INVALID_REFRESH_TOKEN');
    }
  },

  /**
   * 刷新 Token
   * 使用 Refresh Token 获取新的 Token 对
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // 1. 验证 Refresh Token
    const payload = this.verifyRefreshToken(refreshToken);
    
    // 2. 检查用户是否存在
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }
    
    // 3. 生成新的 Token 对
    return this.generateTokenPair({ userId: user.id, email: user.email });
  },

  /**
   * 获取当前用户信息（包含个人资料）
   */
  async getCurrentUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }
    return { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      avatar: user.avatar,
      profession: user.profession,
      bio: user.bio,
      phone: user.phone,
      company: user.company,
      location: user.location,
      profileCompleted: user.profileCompleted,
    };
  },

  /**
   * 更新用户资料（名称、邮箱和个人信息）
   */
  async updateProfile(userId: string, data: { 
    name?: string; 
    email?: string;
    profession?: string;
    bio?: string;
    phone?: string;
    company?: string;
    location?: string;
  }) {
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

    // 如果要更新手机号，检查是否已被使用
    if (data.phone && data.phone !== user.phone) {
      const existingUser = await userRepository.findByPhone(data.phone);
      if (existingUser) {
        throw new AppError('该手机号已被绑定', 409, 'PHONE_EXISTS');
      }
    }

    // 更新用户信息
    const updatedUser = await userRepository.update(userId, {
      name: data.name !== undefined ? data.name : user.name,
      email: data.email !== undefined ? data.email : user.email,
      profession: data.profession !== undefined ? data.profession : user.profession,
      bio: data.bio !== undefined ? data.bio : user.bio,
      phone: data.phone !== undefined ? data.phone : user.phone,
      company: data.company !== undefined ? data.company : user.company,
      location: data.location !== undefined ? data.location : user.location,
      profileCompleted: true, // 更新资料后标记为已完善
    });

    return { 
      id: updatedUser.id, 
      email: updatedUser.email, 
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      profession: updatedUser.profession,
      bio: updatedUser.bio,
      phone: updatedUser.phone,
      company: updatedUser.company,
      location: updatedUser.location,
      profileCompleted: updatedUser.profileCompleted,
    };
  },

  /**
   * 更新密码
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // 如果用户是手机号注册且没有设置密码
    if (!user.password) {
      throw new AppError('您是手机号注册用户，请先设置密码', 400, 'NO_PASSWORD_SET');
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

