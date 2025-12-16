/**
 * 评论服务
 */
import { api } from './api';

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  mentions: {
    mentionedUser: {
      id: string;
      name: string;
    };
  }[];
}

export interface CreateCommentInput {
  content: string;
  mentionedUserIds?: string[];
}

export const commentService = {
  /**
   * 获取任务的所有评论
   */
  async getByTaskId(taskId: string): Promise<Comment[]> {
    return api.get<Comment[]>(`/comments/tasks/${taskId}`);
  },

  /**
   * 创建评论
   */
  async create(taskId: string, input: CreateCommentInput): Promise<Comment> {
    return api.post<Comment>(`/comments/tasks/${taskId}`, input);
  },

  /**
   * 更新评论
   */
  async update(commentId: string, content: string): Promise<Comment> {
    return api.patch<Comment>(`/comments/${commentId}`, { content });
  },

  /**
   * 删除评论
   */
  async delete(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  },
};

