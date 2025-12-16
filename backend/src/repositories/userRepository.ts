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
   * 创建用户
   */
  async create(data: { email: string; name: string; password: string }): Promise<User> {
    return prisma.user.create({ data });
  },

  /**
   * 更新用户
   */
  async update(id: string, data: Partial<Pick<User, 
    'name' | 'email' | 'password' | 'avatar' | 
    'profession' | 'bio' | 'phone' | 'company' | 'location' | 'profileCompleted' |
    'resetToken' | 'resetTokenExpiry'
  >>): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },
};

