/**
 * 通知服务
 */
import { api } from './api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  task?: {
    id: string;
    title: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationService = {
  /**
   * 获取通知列表
   */
  async getAll(options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}): Promise<NotificationResponse> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.unreadOnly) params.append('unreadOnly', 'true');

    return api.get<NotificationResponse>(`/notifications?${params.toString()}`);
  },

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(): Promise<{ count: number }> {
    const response = await api.post<{ success: boolean; count: number }>('/notifications/read-all');
    return { count: response.count };
  },

  /**
   * 删除通知
   */
  async delete(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },

  /**
   * 清空所有已读通知
   */
  async clearRead(): Promise<{ count: number }> {
    const response = await api.delete<{ success: boolean; count: number }>('/notifications/clear-read');
    return { count: response.count };
  },
};
