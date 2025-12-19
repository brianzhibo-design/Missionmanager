/**
 * WebSocket 服务 - 实时通知推送
 */
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../infra/config';
import { logger } from '../infra/logger';

// 用户连接映射：userId -> Set<socketId>
const userSockets = new Map<string, Set<string>>();

let io: Server | null = null;

/**
 * 初始化 WebSocket 服务
 */
export function initSocketService(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  // 身份验证中间件
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('未提供认证令牌'));
    }

    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('认证令牌无效'));
    }
  });

  // 连接处理
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    
    if (!userId) {
      socket.disconnect();
      return;
    }

    // 添加到用户连接映射
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    logger.info(`WebSocket 连接: userId=${userId}, socketId=${socket.id}`);

    // 加入用户专属房间
    socket.join(`user:${userId}`);

    // 发送连接成功消息
    socket.emit('connected', { message: '实时通知已连接' });

    // 断开连接处理
    socket.on('disconnect', () => {
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
        }
      }
      logger.info(`WebSocket 断开: userId=${userId}, socketId=${socket.id}`);
    });

    // 心跳处理
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  logger.info('WebSocket 服务已启动');
  return io;
}

/**
 * 向指定用户推送通知
 */
export function pushNotificationToUser(userId: string, notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  createdAt: string;
}): void {
  if (!io) {
    logger.warn('WebSocket 服务未初始化');
    return;
  }

  // 向用户专属房间发送通知
  io.to(`user:${userId}`).emit('notification', notification);
  
  logger.info(`推送通知给用户: userId=${userId}, type=${notification.type}`);
}

/**
 * 向多个用户推送通知
 */
export function pushNotificationToUsers(userIds: string[], notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  createdAt: string;
}): void {
  userIds.forEach(userId => pushNotificationToUser(userId, notification));
}

/**
 * 获取在线用户数
 */
export function getOnlineUserCount(): number {
  return userSockets.size;
}

/**
 * 检查用户是否在线
 */
export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId);
}

export { io };

