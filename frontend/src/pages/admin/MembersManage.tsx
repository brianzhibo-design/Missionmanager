/**
 * 成员管理页面
 */
import { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { memberService, Member } from '../../services/member';
import { Modal } from '../../components/Modal';
import { Avatar } from '../../components/Avatar';
import { Users, Send, Mail, Calendar, Shield, Eye } from 'lucide-react';
import { 
  ROLE_LABELS, 
  WORKSPACE_ROLE_OPTIONS,
  WORKSPACE_ROLE_HIERARCHY 
} from '../../config/permissions';
import BroadcastPanel from '../../components/BroadcastPanel';
import './MembersManage.css';

export default function MembersManage() {
  const { currentWorkspace, workspaceRole, canWorkspace } = usePermissions();
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

  useEffect(() => {
    if (currentWorkspace) {
      loadMembers();
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
          {(workspaceRole === 'owner' || workspaceRole === 'director') && (
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
                      <span className={`role-badge role-${member.role}`}>
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td>
                      {canModifyMember(member) ? (
                        <div className="action-buttons">
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
                        </div>
                      ) : (
                        <span className="no-action">—</span>
                      )}
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
              <span className={`role-badge role-${profileMember.role}`}>
                {ROLE_LABELS[profileMember.role] || profileMember.role}
              </span>
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
                  <span className="info-value">{ROLE_LABELS[profileMember.role] || profileMember.role}</span>
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
    </div>
  );
}

