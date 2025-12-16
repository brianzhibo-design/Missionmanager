/**
 * 群发消息服务
 */
import { api } from './api';

export interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  sendEmail: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
  _count: {
    recipients: number;
  };
}

export interface CoffeeWinner {
  id: string;
  name: string;
  avatar: string | null;
}

export interface CoffeeLottery {
  id: string;
  date: string;
  winner: CoffeeWinner;
}

export const broadcastService = {
  /**
   * 发送群发消息
   */
  async send(
    workspaceId: string,
    data: {
      title: string;
      content: string;
      recipientIds: string[];
      sendEmail: boolean;
    }
  ): Promise<{ messageId: string; recipientCount: number }> {
    return api.post<{ messageId: string; recipientCount: number }>(
      `/broadcast/workspaces/${workspaceId}/send`,
      data
    );
  },

  /**
   * 获取群发消息历史
   */
  async getHistory(
    workspaceId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ messages: BroadcastMessage[]; total: number }> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    return api.get<{ messages: BroadcastMessage[]; total: number }>(
      `/broadcast/workspaces/${workspaceId}/history?${params.toString()}`
    );
  },

  /**
   * 获取今日咖啡获奖者
   */
  async getTodayCoffeeWinner(workspaceId: string): Promise<CoffeeWinner | null> {
    const data = await api.get<{ winner: CoffeeWinner | null }>(
      `/broadcast/workspaces/${workspaceId}/coffee-winner`
    );
    return data.winner;
  },

  /**
   * 手动执行咖啡抽奖
   */
  async drawCoffeeLottery(workspaceId: string): Promise<{ winner: CoffeeWinner; alreadyDrawn: boolean }> {
    return api.post<{ winner: CoffeeWinner; alreadyDrawn: boolean }>(
      `/broadcast/workspaces/${workspaceId}/draw-coffee`
    );
  },

  /**
   * 获取咖啡抽奖历史
   */
  async getCoffeeHistory(workspaceId: string, limit: number = 30): Promise<CoffeeLottery[]> {
    return api.get<CoffeeLottery[]>(
      `/broadcast/workspaces/${workspaceId}/coffee-history?limit=${limit}`
    );
  },
};

