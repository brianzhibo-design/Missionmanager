/**
 * 邀请成员模态框组件
 */
import { useState } from 'react';
import { Mail, Phone, Link, Copy, Check, X } from './Icons';
import { memberService } from '../services/member';
import './InviteMemberModal.css';

interface InviteMemberModalProps {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InviteMemberModal({ 
  workspaceId, 
  workspaceName,
  onClose,
  onSuccess
}: InviteMemberModalProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'phone' | 'link'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}/workspace-setup?join=${workspaceId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    const contact = activeTab === 'email' ? email.trim() : phone.trim();
    if (!contact) {
      setError(activeTab === 'email' ? '请输入邮箱地址' : '请输入手机号');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await memberService.inviteMember(workspaceId, contact, role);
      setSuccess(`已发送邀请至 ${contact}`);
      setEmail('');
      setPhone('');
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '邀请失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invite-modal-overlay" onClick={onClose}>
      <div className="invite-modal" onClick={e => e.stopPropagation()}>
        <div className="invite-modal-header">
          <h3>邀请成员加入</h3>
          <span className="workspace-tag">{workspaceName}</span>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="invite-tabs">
          <button 
            className={`invite-tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={16} /> 邮箱邀请
          </button>
          <button 
            className={`invite-tab ${activeTab === 'phone' ? 'active' : ''}`}
            onClick={() => setActiveTab('phone')}
          >
            <Phone size={16} /> 手机邀请
          </button>
          <button 
            className={`invite-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <Link size={16} /> 分享链接
          </button>
        </div>

        <div className="invite-content">
          {activeTab === 'email' && (
            <div className="invite-form">
              <div className="form-group">
                <label>邮箱地址</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@company.com"
                />
              </div>
              <div className="form-group">
                <label>角色</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="director">大管家（管理员）</option>
                  <option value="leader">带头大哥（组长）</option>
                  <option value="member">少侠（成员）</option>
                  <option value="guest">吃瓜群侠（访客）</option>
                </select>
              </div>
              <button 
                className="invite-submit-btn"
                onClick={handleInvite}
                disabled={loading}
              >
                {loading ? '发送中...' : '发送邀请'}
              </button>
            </div>
          )}

          {activeTab === 'phone' && (
            <div className="invite-form">
              <div className="form-group">
                <label>手机号</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="13800138000"
                />
              </div>
              <div className="form-group">
                <label>角色</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="director">大管家（管理员）</option>
                  <option value="leader">带头大哥（组长）</option>
                  <option value="member">少侠（成员）</option>
                  <option value="guest">吃瓜群侠（访客）</option>
                </select>
              </div>
              <button 
                className="invite-submit-btn"
                onClick={handleInvite}
                disabled={loading}
              >
                {loading ? '发送中...' : '发送邀请'}
              </button>
            </div>
          )}

          {activeTab === 'link' && (
            <div className="invite-link-section">
              <p className="link-desc">分享以下链接，邀请成员加入工作区</p>
              <div className="link-box">
                <input 
                  type="text" 
                  value={inviteLink} 
                  readOnly 
                  className="link-input"
                />
                <button className="copy-link-btn" onClick={handleCopyLink}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <p className="link-hint">成员通过链接申请后，需要您在成员管理中审批</p>
            </div>
          )}

          {error && <div className="invite-error">{error}</div>}
          {success && <div className="invite-success">{success}</div>}
        </div>
      </div>
    </div>
  );
}









