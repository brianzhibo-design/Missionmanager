/**
 * 移动端通知列表页面 - 简约蓝主题
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  MessageCircle,
  AtSign,
  CheckSquare,
  AlertCircle,
  Loader2,
} from '../../components/Icons';
import MobileLayout from '../../components/mobile/MobileLayout';
import { notificationService, Notification } from '../../services/notification';
import '../../styles/mobile-minimal.css';

// 通知类型配置
const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  task_assigned: CheckSquare,
  task_updated: CheckSquare,
  comment: MessageCircle,
  mention: AtSign,
  system: AlertCircle,
};

// 判断是否是今天
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// 判断是否是昨天
function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

// 格式化时间
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  earlier: Notification[];
}

export default function MobileNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.getAll({ limit: 50 });
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      setMarking(true);
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarking(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // 标记为已读
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // 跳转到相关内容
    if (notification.task) {
      navigate(`/tasks/${notification.task.id}`);
    } else if (notification.project) {
      navigate(`/projects/${notification.project.id}`);
    }
  };

  // 按日期分组
  const groupedNotifications: GroupedNotifications = notifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.createdAt);
      if (isToday(date)) {
        groups.today.push(notification);
      } else if (isYesterday(date)) {
        groups.yesterday.push(notification);
      } else {
        groups.earlier.push(notification);
      }
      return groups;
    },
    { today: [], yesterday: [], earlier: [] } as GroupedNotifications
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotificationItem = (notification: Notification) => {
    const IconComponent = NOTIFICATION_ICONS[notification.type] || Bell;
    return (
      <div
        key={notification.id}
        className={`mm-notification-item ${notification.isRead ? 'read' : 'unread'}`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className={`mm-notification-icon ${notification.type}`}>
          <IconComponent size={18} />
        </div>
        <div className="mm-notification-content">
          <div className="mm-notification-title">{notification.title}</div>
          <div className="mm-notification-desc">{notification.message}</div>
        </div>
        <span className="mm-notification-time">
          {formatTime(notification.createdAt)}
        </span>
      </div>
    );
  };

  const renderGroup = (title: string, items: Notification[], showDate = false) => {
    if (items.length === 0) return null;
    return (
      <div className="mm-notification-group">
        <div className="mm-notification-date">{title}</div>
        {items.map(n => (
          <div key={n.id}>
            {showDate && (
              <div className="mm-notification-day-label">
                {formatDate(n.createdAt)}
              </div>
            )}
            {renderNotificationItem(n)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <MobileLayout
      headerType="manage"
      headerTitle="通知"
      showBottomNav={false}
      headerProps={{
        rightContent: unreadCount > 0 && (
          <button
            className="mm-btn-text"
            onClick={handleMarkAllAsRead}
            disabled={marking}
          >
            {marking ? '处理中...' : '全部已读'}
          </button>
        ),
      }}
    >
      {loading ? (
        <div className="mm-loading" style={{ marginTop: 100 }}>
          <Loader2 size={24} className="mm-spinner-icon" />
          <span>加载中...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="mm-empty-state">
          <Bell size={48} className="mm-empty-icon" />
          <div className="mm-empty-title">暂无通知</div>
          <div className="mm-empty-desc">新的通知会显示在这里</div>
        </div>
      ) : (
        <div className="mm-notification-list">
          {renderGroup('今天', groupedNotifications.today)}
          {renderGroup('昨天', groupedNotifications.yesterday)}
          {renderGroup('更早', groupedNotifications.earlier, true)}
        </div>
      )}
    </MobileLayout>
  );
}






