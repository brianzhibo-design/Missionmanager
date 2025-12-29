/**
 * API 客户端
 * 统一封装所有后端请求
 */
import { config } from '../config';

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

// API 错误类
export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiError';
  }
}

// 获取存储的 token
function getToken(): string | null {
  return localStorage.getItem(config.storageKeys.token);
}

// 构建请求头
function buildHeaders(customHeaders?: Record<string, string>): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...customHeaders,
  });

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

// 是否正在刷新 token
let isRefreshing = false;
// 等待刷新的请求队列
let refreshQueue: Array<() => void> = [];

// 刷新 token
async function refreshToken(): Promise<boolean> {
  const refreshTokenStr = localStorage.getItem('refreshToken');
  if (!refreshTokenStr) return false;
  
  try {
    const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenStr }),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    if (!data.success || !data.data) return false;
    
    // 保存新 token
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = data.data;
    const expiresAt = Date.now() + expiresIn * 1000;
    
    localStorage.setItem(config.storageKeys.token, accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('tokenExpiresAt', expiresAt.toString());
    
    return true;
  } catch {
    return false;
  }
}

// 统一请求方法
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${config.apiBaseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers as Record<string, string>),
  });

  // 处理 401 错误 - 尝试刷新 token
  if (response.status === 401 && retry && !endpoint.includes('/auth/')) {
    if (!isRefreshing) {
      isRefreshing = true;
      const success = await refreshToken();
      isRefreshing = false;
      
      if (success) {
        // 刷新成功，重试原请求
        refreshQueue.forEach(cb => cb());
        refreshQueue = [];
        return request<T>(endpoint, options, false);
      } else {
        // 刷新失败，清除登录状态
        localStorage.removeItem(config.storageKeys.token);
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem(config.storageKeys.user);
        // 不自动跳转，让 ProtectedRoute 处理
      }
    } else {
      // 等待刷新完成
      await new Promise<void>(resolve => refreshQueue.push(resolve));
      return request<T>(endpoint, options, false);
    }
  }

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message || '请求失败',
      data.error?.code || 'UNKNOWN_ERROR',
      response.status
    );
  }

  return data.data as T;
}

// API 客户端
export const api = {
  // GET 请求
  get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' });
  },

  // POST 请求
  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // PATCH 请求
  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // PUT 请求
  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // DELETE 请求
  delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' });
  },

  // 文件上传请求
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${config.apiBaseUrl}${endpoint}`;
    const token = getToken();
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // 注意：不设置 Content-Type，让浏览器自动设置 multipart/form-data 和 boundary
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new ApiError(
        data.error?.message || data.message || '上传失败',
        data.error?.code || 'UPLOAD_ERROR',
        response.status
      );
    }

    return data as T;
  },
};

export default api;

