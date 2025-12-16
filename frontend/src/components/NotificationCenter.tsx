/**
 * 通知中心组件
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle, Trash2, MessageCircle, ClipboardList, Clock, AlertTriangle, BarChart3, Send, Coffee, Check } from 'lucide-react';
import { notificationService, NotificationResponse } from '../services/notification';
import './NotificationCenter.css';

interface NotificationCenterProps {
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  task_assigned: <ClipboardList size={16} />,
  task_status_changed: <CheckCircle size={16} />,
  task_due_soon: <Clock size={16} />,
  task_overdue: <AlertTriangle size={16} />,
  mention: <MessageCircle size={16} />,
  task_comment: <MessageCircle size={16} />,
  report_ready: <BarChart3 size={16} />,
  broadcast: <Send size={16} />,
  coffee_lottery: <Coffee size={16} />,
};

function NotificationCenter({ onClose, onUnreadCountChange }: NotificationCenterProps) {
  const [data, setData] = useState<NotificationResponse | null>(null);
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
      const result = await notificationService.getAll({ limit: 20 });
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
        <h3><Bell size={18} /> 通知</h3>
        {data && data.unreadCount > 0 && (
          <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
            全部已读
          </button>
        )}
      </div>

      <div className="notification-list">
        {loading ? (
          <div className="notification-loading">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        ) : !data || data.notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={32} className="empty-icon" />
            <p>暂无通知</p>
          </div>
        ) : (
          data.notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
            >
              <div className="notification-icon">
                {NOTIFICATION_ICONS[notification.type] || <Bell size={16} />}
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
                    <Check size={14} />
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(notification.id)}
                  title="删除"
                >
                  <Trash2 size={14} />
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
