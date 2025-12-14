/**
 * 通知服务
 */
import api from './api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  task?: { id: string; title: string };
  project?: { id: string; name: string };
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationService = {
  async getNotifications(options?: { unreadOnly?: boolean; limit?: number }): Promise<NotificationsResponse> {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.limit) params.append('limit', options.limit.toString());
    
    // api.get 已经解包了 data 字段
    return api.get<NotificationsResponse>(`/notifications?${params.toString()}`);
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.post(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },

  async delete(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },
};

