/**
 * 认证服务
 */
import { api } from './api';
import { config } from '../config';

// 用户类型
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  profession?: string;
  bio?: string;
  phone?: string;
  company?: string;
  location?: string;
  profileCompleted?: boolean;
}

// 用户个人信息类型
export interface UserProfile {
  name?: string;
  email?: string;
  profession?: string;
  bio?: string;
  phone?: string;
  company?: string;
  location?: string;
}

// 登录响应
interface LoginResponse {
  user: User;
  token: string; // 兼容旧版
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Token 刷新响应
interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 认证状态
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // Token 过期时间戳
  isAuthenticated: boolean;
}

// 认证状态监听器
type AuthListener = (state: AuthState) => void;
const listeners: Set<AuthListener> = new Set();

// Storage keys for tokens
const REFRESH_TOKEN_KEY = 'refreshToken';
const EXPIRES_AT_KEY = 'tokenExpiresAt';

// Token 自动刷新定时器
let refreshTimer: number | null = null;

// 当前状态
let currentState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  isAuthenticated: false,
};

// 保存 token 信息到 localStorage
function saveTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem(config.storageKeys.token, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
  return expiresAt;
}

// 清除 token 信息
function clearTokens() {
  localStorage.removeItem(config.storageKeys.token);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem(config.storageKeys.user);
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// 设置自动刷新定时器
function scheduleTokenRefresh(expiresAt: number) {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  
  // 在 token 过期前 1 分钟刷新
  const refreshTime = expiresAt - Date.now() - 60000;
  
  if (refreshTime > 0) {
    refreshTimer = window.setTimeout(async () => {
      try {
        await authService.refreshTokens();
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        // 刷新失败，登出用户
        authService.logout();
      }
    }, refreshTime);
  }
}

// 初始化：从 localStorage 恢复状态
function init() {
  const token = localStorage.getItem(config.storageKeys.token);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const expiresAtStr = localStorage.getItem(EXPIRES_AT_KEY);
  const userStr = localStorage.getItem(config.storageKeys.user);
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr) as User;
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;
      
      currentState = {
        user,
        token,
        refreshToken,
        expiresAt,
        isAuthenticated: true,
      };
      
      // 检查 token 是否已过期
      if (expiresAt && expiresAt > Date.now()) {
        // Token 未过期，设置自动刷新
        scheduleTokenRefresh(expiresAt);
      } else if (refreshToken) {
        // Token 已过期但有 refresh token，尝试刷新
        authService.refreshTokens().catch(() => {
          authService.logout();
        });
      }
    } catch {
      // 解析失败，清除存储
      clearTokens();
    }
  }
}

// 初始化
init();

// 通知监听器
function notifyListeners() {
  listeners.forEach((listener) => listener(currentState));
}

// 认证服务
export const authService = {
  // 获取当前状态
  getState(): AuthState {
    return currentState;
  },

  // 登录
  async login(email: string, password: string): Promise<User> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    // 保存 tokens
    const accessToken = response.accessToken || response.token;
    const refreshToken = response.refreshToken || '';
    const expiresIn = response.expiresIn || 900; // 默认 15 分钟
    
    const expiresAt = saveTokens(accessToken, refreshToken, expiresIn);
    localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));

    // 更新状态
    currentState = {
      user: response.user,
      token: accessToken,
      refreshToken,
      expiresAt,
      isAuthenticated: true,
    };

    // 设置自动刷新
    scheduleTokenRefresh(expiresAt);

    notifyListeners();
    return response.user;
  },

  // 注册
  async register(email: string, password: string, name: string): Promise<User> {
    const response = await api.post<LoginResponse>('/auth/register', {
      email,
      password,
      name,
    });

    // 保存 tokens
    const accessToken = response.accessToken || response.token;
    const refreshToken = response.refreshToken || '';
    const expiresIn = response.expiresIn || 900;
    
    const expiresAt = saveTokens(accessToken, refreshToken, expiresIn);
    localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));

    // 更新状态
    currentState = {
      user: response.user,
      token: accessToken,
      refreshToken,
      expiresAt,
      isAuthenticated: true,
    };

    // 设置自动刷新
    scheduleTokenRefresh(expiresAt);

    notifyListeners();
    return response.user;
  },

  // 退出登录
  logout() {
    clearTokens();

    currentState = {
      user: null,
      token: null,
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,
    };

    notifyListeners();
  },

  // 订阅状态变化
  subscribe(listener: AuthListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // 检查是否已认证
  isAuthenticated(): boolean {
    return currentState.isAuthenticated;
  },

  // 获取当前用户（从本地缓存）
  getUser(): User | null {
    return currentState.user;
  },

  // 从服务器获取最新用户信息并更新本地缓存
  async fetchUser(): Promise<User | null> {
    if (!currentState.isAuthenticated) {
      return null;
    }
    
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      
      if (response.user) {
        currentState = {
          ...currentState,
          user: response.user,
        };
        localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));
        notifyListeners();
        return response.user;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // 如果获取失败（可能是 token 过期），不做处理，保持当前状态
      return null;
    }
  },

  // 更新用户资料（支持完整个人信息）
  async updateProfile(data: UserProfile): Promise<User> {
    const response = await api.patch<{ user: User }>('/auth/profile', data);

    // 更新本地状态
    if (response.user) {
      currentState = {
        ...currentState,
        user: response.user,
      };
      localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));
      notifyListeners();
    }

    return response.user;
  },

  // 更新密码
  async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.patch<{ message: string }>('/auth/password', {
      currentPassword,
      newPassword,
    });
    return response;
  },

  // 请求密码重置
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const response = await api.post<{ message: string; resetToken?: string }>('/auth/forgot-password', {
      email,
    });
    return response;
  },

  // 验证重置令牌
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const response = await api.post<{ valid: boolean; email?: string }>('/auth/verify-reset-token', {
      token,
    });
    return response;
  },

  // 重置密码
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
    return response;
  },

  // 完善个人信息
  async completeProfile(profile: UserProfile): Promise<User> {
    const response = await api.patch<{ user: User }>('/auth/complete-profile', profile);
    
    // 更新本地状态
    if (response.user) {
      currentState = {
        ...currentState,
        user: response.user,
      };
      localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));
      notifyListeners();
    }

    return response.user;
  },

  // 发送手机验证码
  async sendPhoneCode(phone: string): Promise<{ success: boolean; message: string; code?: string }> {
    const response = await api.post<{ success: boolean; message: string; code?: string }>('/auth/send-code', {
      phone,
    });
    return response;
  },

  // 手机号+验证码登录
  async loginByPhone(phone: string, code: string): Promise<User> {
    const response = await api.post<LoginResponse>('/auth/login-phone', {
      phone,
      code,
    });

    // 保存 tokens
    const accessToken = response.accessToken || response.token;
    const refreshToken = response.refreshToken || '';
    const expiresIn = response.expiresIn || 900;
    
    const expiresAt = saveTokens(accessToken, refreshToken, expiresIn);
    localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));

    // 更新状态
    currentState = {
      user: response.user,
      token: accessToken,
      refreshToken,
      expiresAt,
      isAuthenticated: true,
    };

    // 设置自动刷新
    scheduleTokenRefresh(expiresAt);

    notifyListeners();
    return response.user;
  },

  // 刷新 Tokens
  async refreshTokens(): Promise<void> {
    const refreshToken = currentState.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<RefreshResponse>('/auth/refresh', {
      refreshToken,
    });

    // 保存新的 tokens
    const expiresAt = saveTokens(response.accessToken, response.refreshToken, response.expiresIn);

    // 更新状态
    currentState = {
      ...currentState,
      token: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt,
    };

    // 设置下一次自动刷新
    scheduleTokenRefresh(expiresAt);

    notifyListeners();
  },

  // 刷新用户信息
  async refreshUser(): Promise<User | null> {
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      if (response.user) {
        currentState = {
          ...currentState,
          user: response.user,
        };
        localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));
        notifyListeners();
        return response.user;
      }
      return null;
    } catch {
      return null;
    }
  },

  // 获取 Token 过期时间
  getTokenExpiresAt(): number | null {
    return currentState.expiresAt;
  },

  // 检查 Token 是否即将过期（1分钟内）
  isTokenExpiringSoon(): boolean {
    if (!currentState.expiresAt) return false;
    return currentState.expiresAt - Date.now() < 60000;
  },
};

