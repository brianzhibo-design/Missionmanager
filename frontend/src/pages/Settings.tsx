/**
 * 用户设置页面
 */
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { usePermissions } from '../hooks/usePermissions';
import { authService } from '../services/auth';
import { workspaceService } from '../services/workspace';
import { ROLE_LABELS, ROLE_COLORS } from '../config/permissions';
import { User, Palette, Briefcase, Lock, Check, X, Loader2, Trash2 } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { currentWorkspace, workspaces, refreshWorkspaces, setCurrentWorkspaceId } = usePermissions();
  const [activeTab, setActiveTab] = useState('profile');
  const [deleting, setDeleting] = useState(false);

  // 编辑状态
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // 表单状态
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 加载和错误状态
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 重置表单
  const resetProfileForm = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setIsEditingProfile(false);
    setError(null);
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditingPassword(false);
    setError(null);
  };

  // 保存资料
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError('姓名不能为空');
      return;
    }
    if (!email.trim()) {
      setError('邮箱不能为空');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await authService.updateProfile({ name: name.trim(), email: email.trim() });
      
      // 刷新用户状态
      if (refreshUser) {
        await refreshUser();
      }
      
      setSuccess('资料更新成功');
      setIsEditingProfile(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除工作区
  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!window.confirm(`确定要删除工作区「${workspaceName}」吗？\n\n此操作将永久删除该工作区下的所有项目和任务，不可恢复！`)) {
      return;
    }

    // 检查是否是最后一个工作区
    if (workspaces.length === 1) {
      setError('无法删除最后一个工作区');
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      
      // 如果删除的是当前工作区，先切换到另一个工作区
      const isCurrentWs = workspaceId === currentWorkspace?.id;
      if (isCurrentWs) {
        const nextWorkspace = workspaces.find(ws => ws.id !== workspaceId);
        if (nextWorkspace) {
          setCurrentWorkspaceId(nextWorkspace.id);
        }
      }
      
      await workspaceService.deleteWorkspace(workspaceId);
      
      // 刷新工作区列表
      await refreshWorkspaces();
      
      setSuccess('工作区删除成功');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // 保存密码
  const handleSavePassword = async () => {
    if (!currentPassword) {
      setError('请输入当前密码');
      return;
    }
    if (!newPassword) {
      setError('请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码长度至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await authService.updatePassword(currentPassword, newPassword);
      setSuccess('密码更新成功');
      resetPasswordForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page fade-in">
      <div className="page-header">
        <h1>⚙️ 设置</h1>
      </div>

      {/* 成功/错误提示 */}
      {success && (
        <div className="settings-message success">
          <Check size={18} />
          {success}
        </div>
      )}
      {error && (
        <div className="settings-message error">
          <X size={18} />
          {error}
        </div>
      )}

      <div className="settings-layout">
        {/* 侧边栏 */}
        <div className="settings-sidebar card-static">
          <button
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} /> 个人资料
          </button>
          <button
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={18} /> 账号安全
          </button>
          <button
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={18} /> 外观
          </button>
          <button
            className={`settings-tab ${activeTab === 'workspaces' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspaces')}
          >
            <Briefcase size={18} /> 工作区
          </button>
        </div>

        {/* 内容区 */}
        <div className="settings-content">
          {/* 个人资料 */}
          {activeTab === 'profile' && (
            <div className="settings-section card-static">
              <div className="section-header">
                <h2>个人资料</h2>
                {!isEditingProfile ? (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    编辑
                  </button>
                ) : (
                  <div className="section-actions">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={resetProfileForm}
                      disabled={saving}
                    >
                      取消
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? <Loader2 size={16} className="spin" /> : null}
                      保存
                    </button>
                  </div>
                )}
              </div>

              <div className="profile-card">
                <div className="profile-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="profile-info">
                  <div className="profile-name">{user?.name}</div>
                  <div className="profile-email">{user?.email}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">显示名称</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditingProfile || saving}
                  placeholder="请输入您的姓名"
                />
              </div>

              <div className="form-group">
                <label className="form-label">邮箱地址</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditingProfile || saving}
                  placeholder="请输入您的邮箱"
                />
                {isEditingProfile && (
                  <p className="form-hint">修改邮箱后，下次登录需要使用新邮箱</p>
                )}
              </div>
            </div>
          )}

          {/* 账号安全 */}
          {activeTab === 'security' && (
            <div className="settings-section card-static">
              <div className="section-header">
                <h2>修改密码</h2>
                {!isEditingPassword ? (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditingPassword(true)}
                  >
                    修改
                  </button>
                ) : (
                  <div className="section-actions">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={resetPasswordForm}
                      disabled={saving}
                    >
                      取消
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={handleSavePassword}
                      disabled={saving}
                    >
                      {saving ? <Loader2 size={16} className="spin" /> : null}
                      保存
                    </button>
                  </div>
                )}
              </div>

              {!isEditingPassword ? (
                <div className="security-info">
                  <p>为了保护您的账号安全，建议定期更换密码。</p>
                  <p className="security-hint">密码长度至少 6 位，建议使用字母、数字和符号的组合。</p>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">当前密码</label>
                    <input
                      type="password"
                      className="form-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={saving}
                      placeholder="请输入当前密码"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">新密码</label>
                    <input
                      type="password"
                      className="form-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={saving}
                      placeholder="请输入新密码（至少 6 位）"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">确认新密码</label>
                    <input
                      type="password"
                      className="form-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={saving}
                      placeholder="请再次输入新密码"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* 外观设置 */}
          {activeTab === 'appearance' && (
            <div className="settings-section card-static">
              <h2>外观设置</h2>
              <div className="form-group">
                <label className="form-label">主题</label>
                <div className="theme-options">
                  <button
                    className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <span className="theme-icon">☀️</span>
                    <span className="theme-name">浅色</span>
                  </button>
                  <button
                    className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <span className="theme-icon">🌙</span>
                    <span className="theme-name">深色</span>
                  </button>
                  <button
                    className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                    onClick={() => setTheme('system')}
                  >
                    <span className="theme-icon">💻</span>
                    <span className="theme-name">跟随系统</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 工作区 */}
          {activeTab === 'workspaces' && (
            <div className="settings-section card-static">
              <h2>我的工作区</h2>
              <div className="workspaces-list">
                {workspaces.map((ws) => {
                  const wsRoleStyle = ROLE_COLORS[ws.role] || ROLE_COLORS.member;
                  const wsRoleLabel = ROLE_LABELS[ws.role] || ws.role;
                  const isCurrent = ws.id === currentWorkspace?.id;
                  const canDelete = ws.role === 'owner';
                  
                  return (
                    <div 
                      key={ws.id} 
                      className={`workspace-item ${isCurrent ? 'current' : ''}`}
                    >
                      <div className="workspace-icon">📁</div>
                      <div className="workspace-info">
                        <div className="workspace-name">
                          {ws.name}
                          {isCurrent && <span className="current-badge">当前</span>}
                        </div>
                        <div className="workspace-meta">
                          <span 
                            className="role-badge"
                            style={{ background: wsRoleStyle.bg, color: wsRoleStyle.color }}
                          >
                            {wsRoleLabel}
                          </span>
                        </div>
                      </div>
                      {canDelete && (
                        <button
                          className="workspace-delete-btn"
                          onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                          disabled={deleting}
                          title="删除工作区"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
