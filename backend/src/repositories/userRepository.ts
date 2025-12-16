/**
 * 用户数据访问层
 */
import { prisma } from '../infra/database';
import { User } from '@prisma/client';

export const userRepository = {
  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  /**
   * 根据手机号查找用户
   */
  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } });
  },

  /**
   * 根据邮箱或手机号查找用户
   */
  async findByEmailOrPhone(emailOrPhone: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone }
        ]
      }
    });
  },

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * 根据重置令牌查找用户
   */
  async findByResetToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { resetToken: token } });
  },

  /**
   * 创建用户（邮箱注册）
   */
  async create(data: { email: string; name: string; password: string }): Promise<User> {
    return prisma.user.create({ data });
  },

  /**
   * 创建用户（手机号注册）
   */
  async createByPhone(data: { phone: string; name: string }): Promise<User> {
    // 手机号用户使用手机号作为邮箱占位（后续可完善）
    return prisma.user.create({ 
      data: {
        ...data,
        email: `${data.phone}@phone.local`, // 临时邮箱
        password: null, // 手机号用户无密码
      }
    });
  },

  /**
   * 更新用户
   */
  async update(id: string, data: Partial<Pick<User, 
    'name' | 'email' | 'password' | 'avatar' | 
    'profession' | 'bio' | 'phone' | 'company' | 'location' | 'profileCompleted' |
    'resetToken' | 'resetTokenExpiry' | 'phoneCode' | 'phoneCodeExpiry'
  >>): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  /**
   * 更新手机验证码
   */
  async updatePhoneCode(phone: string, code: string, expiry: Date): Promise<User | null> {
    const user = await this.findByPhone(phone);
    if (!user) return null;
    
    return prisma.user.update({
      where: { id: user.id },
      data: { phoneCode: code, phoneCodeExpiry: expiry }
    });
  },

  /**
   * 清除手机验证码
   */
  async clearPhoneCode(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { phoneCode: null, phoneCodeExpiry: null }
    });
  },
};

