/**
 * 前端配置
 */
export const config = {
  // API 基础 URL
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // 请求超时时间（毫秒）
  requestTimeout: 30000,
  
  // 本地存储键名
  storageKeys: {
    token: 'task_manager_token',
    user: 'task_manager_user',
  },
};

