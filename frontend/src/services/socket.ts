/**
 * WebSocket 服务 - 实时通知
 */
import { io, Socket } from 'socket.io-client';
import { authService } from './auth';
import { pushNotificationService } from './pushNotification';

// WebSocket 连接实例
let socket: Socket | null = null;

// 通知事件监听器
type NotificationListener = (notification: SocketNotification) => void;
const notificationListeners: Set<NotificationListener> = new Set();

// 通知数据结构
export interface SocketNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  createdAt: string;
}

/**
 * 初始化 WebSocket 连接
 */
export function initSocket(): void {
  const state = authService.getState();
  
  if (!state.token) {
    console.log('未登录，跳过 WebSocket 连接');
    return;
  }

  if (socket?.connected) {
    console.log('WebSocket 已连接');
    return;
  }

  // 获取 API 基础 URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  // socket.io 会自动处理协议，我们使用 http URL
  const baseUrl = apiUrl.replace('/api', '');

  socket = io(baseUrl, {
    auth: {
      token: state.token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // 连接成功
  socket.on('connect', () => {
    console.log('✅ WebSocket 连接成功');
  });

  // 连接错误
  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket 连接错误:', error.message);
  });

  // 断开连接
  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket 断开:', reason);
  });

  // 接收通知
  socket.on('notification', (notification: SocketNotification) => {
    console.log('📬 收到实时通知:', notification);
    
    // 触发浏览器系统通知
    pushNotificationService.showTaskNotification(
      notification.type,
      notification.title,
      notification.message,
      notification.taskId
    );

    // 通知所有监听器
    notificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('通知监听器错误:', error);
      }
    });
  });

  // 连接确认
  socket.on('connected', (data) => {
    console.log('🎉 服务器确认:', data.message);
  });
}

/**
 * 断开 WebSocket 连接
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('WebSocket 已断开');
  }
}

/**
 * 重新连接 WebSocket
 */
export function reconnectSocket(): void {
  disconnectSocket();
  initSocket();
}

/**
 * 添加通知监听器
 */
export function addNotificationListener(listener: NotificationListener): () => void {
  notificationListeners.add(listener);
  return () => notificationListeners.delete(listener);
}

/**
 * 检查 WebSocket 是否已连接
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * 获取 Socket 实例
 */
export function getSocket(): Socket | null {
  return socket;
}

export const socketService = {
  init: initSocket,
  disconnect: disconnectSocket,
  reconnect: reconnectSocket,
  addListener: addNotificationListener,
  isConnected: isSocketConnected,
  getSocket,
};

export default socketService;

