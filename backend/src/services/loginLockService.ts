/**
 * 登录锁定服务
 * 实现账户级登录失败锁定机制
 * 
 * 规则：
 * - 同一账户5次失败后锁定15分钟
 * - 成功登录后重置计数
 */

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

// 内存存储登录尝试（生产环境应使用 Redis）
const loginAttempts = new Map<string, LoginAttempt>();

// 配置
const MAX_ATTEMPTS = 5; // 最大尝试次数
const LOCK_DURATION = 15 * 60 * 1000; // 锁定时间（15分钟）
const ATTEMPT_WINDOW = 30 * 60 * 1000; // 尝试窗口期（30分钟内的尝试会累计）

export const loginLockService = {
  /**
   * 检查账户是否被锁定
   * @param identifier 账户标识（邮箱或手机号）
   * @returns 锁定信息
   */
  isLocked(identifier: string): { locked: boolean; remainingTime?: number } {
    const key = identifier.toLowerCase();
    const attempt = loginAttempts.get(key);

    if (!attempt || !attempt.lockedUntil) {
      return { locked: false };
    }

    const now = Date.now();
    if (attempt.lockedUntil > now) {
      const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000 / 60); // 分钟
      return { locked: true, remainingTime };
    }

    // 锁定已过期，重置
    loginAttempts.delete(key);
    return { locked: false };
  },

  /**
   * 记录登录失败
   * @param identifier 账户标识
   * @returns 当前失败次数和剩余尝试次数
   */
  recordFailure(identifier: string): { 
    count: number; 
    remaining: number; 
    locked: boolean;
    lockDuration?: number;
  } {
    const key = identifier.toLowerCase();
    const now = Date.now();
    let attempt = loginAttempts.get(key);

    if (!attempt || (now - attempt.lastAttempt > ATTEMPT_WINDOW)) {
      // 新的尝试或超过窗口期，重置计数
      attempt = {
        count: 1,
        lastAttempt: now,
        lockedUntil: null,
      };
    } else {
      // 累计失败次数
      attempt.count++;
      attempt.lastAttempt = now;
    }

    // 检查是否需要锁定
    if (attempt.count >= MAX_ATTEMPTS) {
      attempt.lockedUntil = now + LOCK_DURATION;
      loginAttempts.set(key, attempt);
      return {
        count: attempt.count,
        remaining: 0,
        locked: true,
        lockDuration: Math.ceil(LOCK_DURATION / 1000 / 60), // 分钟
      };
    }

    loginAttempts.set(key, attempt);
    return {
      count: attempt.count,
      remaining: MAX_ATTEMPTS - attempt.count,
      locked: false,
    };
  },

  /**
   * 登录成功，重置计数
   * @param identifier 账户标识
   */
  recordSuccess(identifier: string): void {
    const key = identifier.toLowerCase();
    loginAttempts.delete(key);
  },

  /**
   * 获取登录尝试信息
   * @param identifier 账户标识
   */
  getAttemptInfo(identifier: string): LoginAttempt | null {
    const key = identifier.toLowerCase();
    return loginAttempts.get(key) || null;
  },

  /**
   * 清除所有记录（仅用于测试）
   */
  clearAll(): void {
    loginAttempts.clear();
  },
};

