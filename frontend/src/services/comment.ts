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
  likes: {
    userId: string;
  }[];
  _count: {
    likes: number;
  };
}

export interface CreateCommentInput {
  content: string;
  mentionedUserIds?: string[];
}

export interface LikeResult {
  liked: boolean;
  likeCount: number;
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
   * 点赞/取消点赞评论
   */
  async toggleLike(commentId: string): Promise<LikeResult> {
    return api.post<LikeResult>(`/comments/${commentId}/like`);
  },

  /**
   * 删除评论
   */
  async delete(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  },
};

