/**
 * 成员管理页面
 */
import { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { memberService, Member } from '../../services/member';
import { workspaceService, JoinRequest } from '../../services/workspace';
import { Modal } from '../../components/Modal';
import { Avatar } from '../../components/Avatar';
import { Users, Send, Mail, Calendar, Shield, Eye, UserPlus, Check, X, Clock } from 'lucide-react';
import { 
  WORKSPACE_ROLE_OPTIONS,
  WORKSPACE_ROLE_HIERARCHY 
} from '../../config/permissions';
import RoleBadge from '../../components/RoleBadge';
import BroadcastPanel from '../../components/BroadcastPanel';
import PermissionSettingsModal from '../../components/PermissionSettingsModal';
import './MembersManage.css';

export default function MembersManage() {
  const { currentWorkspace, workspaceRole, canWorkspace, hasCustomPermission } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal 状态
  const [showInvite, setShowInvite] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileMember, setProfileMember] = useState<Member | null>(null);
  const [showPermission, setShowPermission] = useState(false);
  const [permissionMember, setPermissionMember] = useState<Member | null>(null);
  
  // 加入申请
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [, setLoadingRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      loadMembers();
      if (canWorkspace('invite')) {
        loadJoinRequests();
      }
    }
  }, [currentWorkspace]);

  const loadMembers = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const data = await memberService.getMembers(currentWorkspace.id);
      setMembers(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    if (!currentWorkspace) return;
    setLoadingRequests(true);
    try {
      const data = await workspaceService.getJoinRequests(currentWorkspace.id);
      setJoinRequests(data);
    } catch (err) {
      console.error('加载加入申请失败:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleReviewRequest = async (requestId: string, approved: boolean) => {
    if (!currentWorkspace) return;
    setProcessingRequest(requestId);
    try {
      await workspaceService.reviewJoinRequest(requestId, approved);
      setJoinRequests(joinRequests.filter(r => r.id !== requestId));
      if (approved) {
        loadMembers(); // 刷新成员列表
      }
    } catch (err: any) {
      setError(err.message || '处理申请失败');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string || '').trim();
    const role = formData.get('role') as string;

    if (!email) return;

    setSubmitting(true);
    setError(null);
    try {
      const newMember = await memberService.inviteMember(currentWorkspace.id, email, role);
      setMembers([...members, newMember]);
      setShowInvite(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWorkspace || !selectedMember) return;

    const formData = new FormData(e.currentTarget);
    const role = formData.get('role') as string;

    setSubmitting(true);
    setError(null);
    try {
      const updated = await memberService.updateMemberRole(
        currentWorkspace.id,
        selectedMember.userId,
        role
      );
      setMembers(members.map(m => m.userId === updated.userId ? updated : m));
      setShowEditRole(false);
      setSelectedMember(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (member: Member) => {
    if (!currentWorkspace) return;
    if (!confirm(`确定要移除成员 ${member.user.name} 吗？`)) return;

    try {
      await memberService.removeMember(currentWorkspace.id, member.userId);
      setMembers(members.filter(m => m.userId !== member.userId));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const openEditRole = (member: Member) => {
    setSelectedMember(member);
    setShowEditRole(true);
  };

  const openProfile = (member: Member) => {
    setProfileMember(member);
    setShowProfile(true);
  };

  const openPermission = (member: Member) => {
    setPermissionMember(member);
    setShowPermission(true);
  };

  // 检查当前用户是否可以修改目标成员
  const canModifyMember = (member: Member) => {
    if (member.role === 'owner') return false;
    if (!canWorkspace('manageAllRoles') && !canWorkspace('invite')) return false;
    
    const myIndex = WORKSPACE_ROLE_HIERARCHY.indexOf(workspaceRole || 'member');
    const targetIndex = WORKSPACE_ROLE_HIERARCHY.indexOf(member.role);
    
    return myIndex > targetIndex;
  };

  // 获取可选角色（过滤掉比自己高的角色）
  const getAvailableRoles = () => {
    const myIndex = WORKSPACE_ROLE_HIERARCHY.indexOf(workspaceRole || 'member');
    return WORKSPACE_ROLE_OPTIONS.filter(r => WORKSPACE_ROLE_HIERARCHY.indexOf(r.value) < myIndex);
  };

  return (
    <div className="members-manage-page fade-in">
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon icon-orange"><Users size={28} /></div>
          <div className="header-text">
            <h1>成员管理</h1>
            <p>管理 {currentWorkspace?.name} 的团队成员</p>
          </div>
        </div>
        <div className="header-actions">
          {hasCustomPermission('BROADCAST_MESSAGES') && (
            <button className="btn btn-secondary" onClick={() => setShowBroadcast(true)}>
              <Send size={16} /> 群发消息
            </button>
          )}
          {canWorkspace('invite') && (
            <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
              + 邀请成员
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-card">⚠️ {error}</div>
      )}

      {/* 加入申请列表 */}
      {joinRequests.length > 0 && (
        <div className="join-requests-section card-static">
          <div className="section-header">
            <UserPlus size={20} />
            <h3>待审批申请 ({joinRequests.length})</h3>
          </div>
          <div className="join-requests-list">
            {joinRequests.map(request => (
              <div key={request.id} className="join-request-item">
                <div className="request-user">
                  <Avatar name={request.user.name} src={request.user.avatar ?? undefined} size="sm" />
                  <div className="request-info">
                    <span className="request-name">{request.user.name}</span>
                    <span className="request-email">{request.user.email}</span>
                    {request.message && (
                      <span className="request-message">"{request.message}"</span>
                    )}
                  </div>
                </div>
                <div className="request-meta">
                  <span className="request-time">
                    <Clock size={12} /> {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="request-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleReviewRequest(request.id, true)}
                    disabled={processingRequest === request.id}
                  >
                    <Check size={14} /> 批准
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReviewRequest(request.id, false)}
                    disabled={processingRequest === request.id}
                  >
                    <X size={14} /> 拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>加载中...</p>
        </div>
      ) : (
        <div className="members-table-container card-static">
          <table className="members-table">
            <thead>
              <tr>
                <th>成员</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>加入时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                  <tr key={member.userId}>
                    <td>
                      <div className="member-cell clickable" onClick={() => openProfile(member)}>
                        <Avatar name={member.user.name} src={member.user.avatar ?? undefined} size="sm" />
                        <span className="member-name">{member.user.name}</span>
                        <Eye size={14} className="view-icon" />
                      </div>
                    </td>
                    <td className="email-cell">{member.user.email}</td>
                    <td>
                      <RoleBadge role={member.role} size="sm" variant="dot" />
                    </td>
                    <td className="date-cell">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {/* 权限设置按钮 - 仅创始人可见 */}
                        {workspaceRole === 'owner' && member.role !== 'owner' && (
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => openPermission(member)}
                            title="权限设置"
                          >
                            <Shield size={14} /> 权限
                          </button>
                        )}
                        {canModifyMember(member) ? (
                          <>
                            <button 
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditRole(member)}
                            >
                              修改角色
                            </button>
                            <button 
                              className="btn btn-ghost btn-sm danger"
                              onClick={() => handleRemove(member)}
                            >
                              移除
                            </button>
                          </>
                        ) : null}
                        {!canModifyMember(member) && (workspaceRole !== 'owner' || member.role === 'owner') && (
                          <span className="no-action">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 邀请成员 Modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        title="邀请成员"
        size="sm"
      >
        <form onSubmit={handleInvite}>
          <div className="form-group">
            <label className="form-label">邮箱地址 *</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="输入成员邮箱"
              required
              autoFocus
            />
            <p className="form-hint">被邀请的用户需要已注册账号</p>
          </div>
          <div className="form-group">
            <label className="form-label">角色</label>
            <select name="role" className="form-select" defaultValue="member">
              {getAvailableRoles().map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setShowInvite(false)}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? '邀请中...' : '发送邀请'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 修改角色 Modal */}
      <Modal
        isOpen={showEditRole}
        onClose={() => { setShowEditRole(false); setSelectedMember(null); }}
        title="修改成员角色"
        size="sm"
      >
        {selectedMember && (
          <form onSubmit={handleUpdateRole}>
            <div className="member-info-card">
              <Avatar name={selectedMember.user.name} src={selectedMember.user.avatar ?? undefined} size="lg" />
              <div>
                <div className="member-name">{selectedMember.user.name}</div>
                <div className="member-email">{selectedMember.user.email}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">新角色</label>
              <div className="role-options">
                {getAvailableRoles().map((role) => (
                  <label key={role.value} className="role-option">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      defaultChecked={role.value === selectedMember.role}
                    />
                    <div className="role-option-content">
                      <span className="role-option-label">{role.label}</span>
                      <span className="role-option-desc">{role.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => { setShowEditRole(false); setSelectedMember(null); }}
              >
                取消
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存更改'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 群发消息面板 */}
      {showBroadcast && currentWorkspace && (
        <BroadcastPanel
          workspaceId={currentWorkspace.id}
          onClose={() => setShowBroadcast(false)}
          userRole={workspaceRole}
          canCoffeeLottery={hasCustomPermission('COFFEE_LOTTERY')}
        />
      )}

      {/* 成员简介弹窗 */}
      <Modal
        isOpen={showProfile}
        onClose={() => { setShowProfile(false); setProfileMember(null); }}
        title="成员信息"
        size="sm"
      >
        {profileMember && (
          <div className="member-profile">
            <div className="profile-header">
              <Avatar 
                name={profileMember.user.name} 
                src={profileMember.user.avatar ?? undefined} 
                size="xl" 
              />
              <h2 className="profile-name">{profileMember.user.name}</h2>
              <RoleBadge role={profileMember.role} size="md" variant="dot" />
            </div>
            <div className="profile-info-list">
              <div className="profile-info-item">
                <Mail size={16} />
                <div>
                  <span className="info-label">邮箱</span>
                  <span className="info-value">{profileMember.user.email}</span>
                </div>
              </div>
              <div className="profile-info-item">
                <Shield size={16} />
                <div>
                  <span className="info-label">角色</span>
                  <RoleBadge role={profileMember.role} size="sm" variant="dot" />
                </div>
              </div>
              <div className="profile-info-item">
                <Calendar size={16} />
                <div>
                  <span className="info-label">加入时间</span>
                  <span className="info-value">
                    {new Date(profileMember.joinedAt).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="profile-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => { setShowProfile(false); setProfileMember(null); }}
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 权限设置弹窗 */}
      {currentWorkspace && permissionMember && (
        <PermissionSettingsModal
          isOpen={showPermission}
          onClose={() => {
            setShowPermission(false);
            setPermissionMember(null);
          }}
          workspaceId={currentWorkspace.id}
          userId={permissionMember.userId}
          userName={permissionMember.user.name}
          userAvatar={permissionMember.user.avatar}
          onUpdate={loadMembers}
        />
      )}
    </div>
  );
}

