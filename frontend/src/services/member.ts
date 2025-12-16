/**
 * 成员管理服务
 */
import api from './api';

export interface Member {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

export const memberService = {
  // 获取工作区成员列表
  async getMembers(workspaceId: string): Promise<Member[]> {
    return api.get<Member[]>(`/members/workspaces/${workspaceId}`);
  },

  // 邀请成员
  async inviteMember(workspaceId: string, email: string, role: string = 'member'): Promise<Member> {
    return api.post<Member>(`/members/workspaces/${workspaceId}`, { email, role });
  },

  // 更新成员角色
  async updateMemberRole(workspaceId: string, memberId: string, role: string): Promise<Member> {
    return api.patch<Member>(`/members/workspaces/${workspaceId}/${memberId}`, { role });
  },

  // 移除成员
  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    await api.delete(`/members/workspaces/${workspaceId}/${memberId}`);
  },
};

