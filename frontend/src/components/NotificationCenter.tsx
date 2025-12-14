/**
 * 通知中心组件
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationService, NotificationsResponse } from '../services/notification';
import './NotificationCenter.css';

interface NotificationCenterProps {
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  task_assigned: '📋',
  task_status_changed: '🔄',
  task_due_soon: '⏰',
  task_overdue: '⚠️',
  mention: '💬',
  report_ready: '📊',
};

function NotificationCenter({ onClose, onUnreadCountChange }: NotificationCenterProps) {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (data && onUnreadCountChange) {
      onUnreadCountChange(data.unreadCount);
    }
  }, [data, onUnreadCountChange]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await notificationService.getNotifications({ limit: 20 });
      setData(result);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead();
    loadNotifications();
  };

  const handleDelete = async (id: string) => {
    await notificationService.delete(id);
    loadNotifications();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-center-panel">
      <div className="notification-header">
        <h3>🔔 通知</h3>
        <div className="notification-header-actions">
          {data && data.unreadCount > 0 && (
            <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
              全部已读
            </button>
          )}
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="notification-list">
        {loading ? (
          <div className="notification-loading">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        ) : !data || data.notifications.length === 0 ? (
          <div className="notification-empty">
            <span className="empty-icon">🔔</span>
            <p>暂无通知</p>
          </div>
        ) : (
          data.notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
            >
              <div className="notification-icon">
                {NOTIFICATION_ICONS[notification.type] || '📢'}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-meta">
                  <span className="notification-time">{formatTime(notification.createdAt)}</span>
                  {notification.task && (
                    <Link
                      to={`/tasks/${notification.task.id}`}
                      className="notification-link"
                      onClick={onClose}
                    >
                      查看任务
                    </Link>
                  )}
                </div>
              </div>
              <div className="notification-actions">
                {!notification.isRead && (
                  <button
                    className="action-btn"
                    onClick={() => handleMarkAsRead(notification.id)}
                    title="标记已读"
                  >
                    ✓
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(notification.id)}
                  title="删除"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationCenter;
