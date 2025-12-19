/**
 * 浏览器推送通知服务
 * 用于向用户发送系统级通知
 */

// 通知权限状态
export type NotificationPermission = 'default' | 'granted' | 'denied';

// 通知选项
export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
  data?: Record<string, unknown>;
}

// 本地存储键
const STORAGE_KEY = 'push_notification_enabled';

export const pushNotificationService = {
  /**
   * 检查浏览器是否支持通知
   */
  isSupported(): boolean {
    return 'Notification' in window;
  },

  /**
   * 获取当前通知权限状态
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission as NotificationPermission;
  },

  /**
   * 检查是否已启用推送通知
   * 默认为开启状态（除非用户明确禁用）
   */
  isEnabled(): boolean {
    if (!this.isSupported()) return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    // 默认开启：如果没有存储值或存储值不是 'false'，且有权限，则为开启
    if (stored === 'false') return false;
    return Notification.permission === 'granted';
  },

  /**
   * 初始化通知服务（应用启动时调用）
   * 如果用户未明确禁用，自动请求权限
   */
  async init(): Promise<void> {
    if (!this.isSupported()) return;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    
    // 如果用户未明确禁用，且权限为 default，自动请求权限
    if (stored !== 'false' && Notification.permission === 'default') {
      await this.requestPermission();
    }
  },

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('浏览器不支持通知');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
      return permission as NotificationPermission;
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return 'denied';
    }
  },

  /**
   * 启用推送通知
   */
  async enable(): Promise<boolean> {
    const permission = await this.requestPermission();
    if (permission === 'granted') {
      localStorage.removeItem(STORAGE_KEY); // 移除禁用标记，恢复默认开启
      // 发送测试通知
      this.show({
        title: '通知已启用 🎉',
        body: '您现在可以接收任务和消息提醒了',
      });
      return true;
    }
    return false;
  },

  /**
   * 禁用推送通知
   */
  disable(): void {
    localStorage.setItem(STORAGE_KEY, 'false'); // 明确设置为禁用
  },

  /**
   * 显示通知
   */
  show(options: PushNotificationOptions): void {
    if (!this.isEnabled()) {
      console.log('推送通知未启用');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        data: options.data,
        requireInteraction: false,
        silent: false,
      });

      // 点击通知
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      // 自动关闭（5秒后）
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('显示通知失败:', error);
    }
  },

  /**
   * 发送任务相关通知
   */
  showTaskNotification(type: string, title: string, message: string, taskId?: string): void {
    const icons: Record<string, string> = {
      task_assigned: '📋',
      task_status_changed: '✅',
      task_due_soon: '⏰',
      task_overdue: '⚠️',
      mention: '💬',
      task_comment: '💬',
      broadcast: '📢',
      coffee_lottery: '☕',
    };

    this.show({
      title: `${icons[type] || '🔔'} ${title}`,
      body: message,
      tag: `task-${taskId || Date.now()}`,
      onClick: () => {
        if (taskId) {
          window.location.href = `/tasks/${taskId}`;
        }
      },
    });
  },
};

export default pushNotificationService;

