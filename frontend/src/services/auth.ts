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
  token: string;
}

// 认证状态
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// 认证状态监听器
type AuthListener = (state: AuthState) => void;
const listeners: Set<AuthListener> = new Set();

// 当前状态
let currentState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

// 初始化：从 localStorage 恢复状态
function init() {
  const token = localStorage.getItem(config.storageKeys.token);
  const userStr = localStorage.getItem(config.storageKeys.user);
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr) as User;
      currentState = {
        user,
        token,
        isAuthenticated: true,
      };
    } catch {
      // 解析失败，清除存储
      localStorage.removeItem(config.storageKeys.token);
      localStorage.removeItem(config.storageKeys.user);
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

    // 保存到 localStorage
    localStorage.setItem(config.storageKeys.token, response.token);
    localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));

    // 更新状态
    currentState = {
      user: response.user,
      token: response.token,
      isAuthenticated: true,
    };

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

    // 保存到 localStorage
    localStorage.setItem(config.storageKeys.token, response.token);
    localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));

    // 更新状态
    currentState = {
      user: response.user,
      token: response.token,
      isAuthenticated: true,
    };

    notifyListeners();
    return response.user;
  },

  // 退出登录
  logout() {
    localStorage.removeItem(config.storageKeys.token);
    localStorage.removeItem(config.storageKeys.user);

    currentState = {
      user: null,
      token: null,
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

  // 获取当前用户
  getUser(): User | null {
    return currentState.user;
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

    // 保存到 localStorage
    localStorage.setItem(config.storageKeys.token, response.token);
    localStorage.setItem(config.storageKeys.user, JSON.stringify(response.user));

    // 更新状态
    currentState = {
      user: response.user,
      token: response.token,
      isAuthenticated: true,
    };

    notifyListeners();
    return response.user;
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
};

