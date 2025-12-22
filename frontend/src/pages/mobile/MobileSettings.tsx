/**
 * 移动端设置页面 - 简约蓝主题
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Bell, 
  Moon, 
  Sun, 
  Monitor,
  ChevronRight, 
  LogOut,
  Shield,
  Info,
  Palette,
  Building2,
  Check,
  Loader2,
  X,
  Trash2,
  ChevronDown,
  Users,
  Folder,
  FileText,
} from '../../components/Icons';
import MobileLayout from '../../components/mobile/MobileLayout';
import SheetModal from '../../components/mobile/SheetModal';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { usePermissions } from '../../hooks/usePermissions';
import { authService } from '../../services/auth';
import { workspaceService } from '../../services/workspace';
import { pushNotificationService } from '../../services/pushNotification';
import RoleBadge from '../../components/RoleBadge';
import '../../styles/mobile-minimal.css';

// 职业选项
const PROFESSIONS = [
  { value: 'developer', label: '开发工程师' },
  { value: 'designer', label: '设计师' },
  { value: 'pm', label: '产品经理' },
  { value: 'marketing', label: '市场营销' },
  { value: 'operation', label: '运营' },
  { value: 'hr', label: '人力资源' },
  { value: 'finance', label: '财务' },
  { value: 'sales', label: '销售' },
  { value: 'student', label: '学生' },
  { value: 'other', label: '其他' },
];

export default function MobileSettings() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { workspaceRole, workspaces, currentWorkspace, setCurrentWorkspaceId, refreshWorkspaces } = usePermissions();

  // 编辑状态
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);
  const [showWorkspaceSheet, setShowWorkspaceSheet] = useState(false);
  const [showProfessionSheet, setShowProfessionSheet] = useState(false);

  // 表单状态
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profession, setProfession] = useState(user?.profession || '');
  const [company, setCompany] = useState(user?.company || '');
  const [location, setLocation] = useState(user?.location || '');
  const [bio, setBio] = useState(user?.bio || '');

  // 密码表单
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 状态
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 通知权限状态
  const [notificationEnabled, setNotificationEnabled] = useState(pushNotificationService.isEnabled());
  const [_notificationPermission, setNotificationPermission] = useState(pushNotificationService.getPermission());

  // 同步用户信息
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setProfession(user.profession || '');
      setCompany(user.company || '');
      setLocation(user.location || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // 获取职业标签
  const getProfessionLabel = (value: string) => {
    if (!value) return '未设置';
    const values = value.split(',').filter(v => v.trim());
    if (values.length === 0) return '未设置';
    const labels = values.map(v => {
      const prof = PROFESSIONS.find(p => p.value === v.trim());
      return prof ? prof.label : v.trim();
    });
    return labels.join('、');
  };

  // 切换职业选择
  const toggleProfession = (value: string) => {
    const currentValues = profession ? profession.split(',').filter(v => v.trim()) : [];
    let newValues: string[];
    if (currentValues.includes(value)) {
      newValues = currentValues.filter(v => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    setProfession(newValues.join(','));
  };

  const isProfessionSelected = (value: string) => {
    if (!profession) return false;
    return profession.split(',').map(v => v.trim()).includes(value);
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
      await authService.updateProfile({ 
        name: name.trim(), 
        email: email.trim(),
        phone: phone.trim() || undefined,
        profession,
        company: company.trim(),
        location: location.trim(),
        bio: bio.trim(),
      });
      
      if (refreshUser) {
        await refreshUser();
      }
      
      setSuccess('资料更新成功');
      setShowProfileSheet(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSaving(false);
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
      // TODO: 实现密码修改功能
      throw new Error('密码修改功能暂未实现');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '修改失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除工作区
  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!window.confirm(`确定要删除工作区「${workspaceName}」吗？\n\n此操作将永久删除该工作区下的所有项目和任务，不可恢复！`)) {
      return;
    }

    if (workspaces.length === 1) {
      setError('无法删除最后一个工作区');
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      
      const isCurrentWs = workspaceId === currentWorkspace?.id;
      if (isCurrentWs) {
        const nextWorkspace = workspaces.find(ws => ws.id !== workspaceId);
        if (nextWorkspace) {
          setCurrentWorkspaceId(nextWorkspace.id);
        }
      }
      
      await workspaceService.deleteWorkspace(workspaceId);
      await refreshWorkspaces();
      
      setSuccess('工作区删除成功');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // 切换通知
  const handleToggleNotification = async () => {
    if (notificationEnabled) {
      pushNotificationService.disable();
      setNotificationEnabled(false);
    } else {
      const result = await pushNotificationService.enable();
      setNotificationEnabled(result);
      setNotificationPermission(pushNotificationService.getPermission());
    }
  };

  const themeOptions = [
    { value: 'light', label: '浅色', icon: <Sun size={16} /> },
    { value: 'dark', label: '深色', icon: <Moon size={16} /> },
    { value: 'system', label: '系统', icon: <Monitor size={16} /> },
  ];

  return (
    <MobileLayout
      headerType="list"
      headerTitle="设置"
      showBottomNav={true}
    >
      <div className="mm-settings-page">
        {/* 成功/错误提示 */}
        {success && (
          <div className="mm-toast mm-toast-success">
            <Check size={16} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mm-toast mm-toast-error">
            <X size={16} />
            <span>{error}</span>
            <button className="mm-toast-close" onClick={() => setError(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* 用户信息卡片 */}
        <div className="mm-profile-card" onClick={() => setShowProfileSheet(true)}>
          <div className="mm-profile-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              getUserInitials()
            )}
          </div>
          <div className="mm-profile-info">
            <h2 className="mm-profile-name">{user?.name}</h2>
            <p className="mm-profile-email">{user?.email}</p>
            {workspaceRole && (
              <RoleBadge role={workspaceRole} size="sm" variant="dot" />
            )}
          </div>
          <ChevronRight size={20} className="mm-profile-arrow" />
        </div>

        {/* 外观设置 */}
        <div className="mm-settings-section">
          <div className="mm-settings-title">外观</div>
          <div className="mm-settings-list">
            <div className="mm-settings-item">
              <div className="mm-settings-icon">
                <Palette size={20} />
              </div>
              <span className="mm-settings-label">主题</span>
              <div className="mm-theme-options">
                {themeOptions.map(option => (
                  <button
                    key={option.value}
                    className={`mm-theme-btn ${theme === option.value ? 'active' : ''}`}
                    onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                  >
                    {option.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 工作区设置 */}
        <div className="mm-settings-section">
          <div className="mm-settings-title">工作区</div>
          <div className="mm-settings-list">
            <div className="mm-settings-item" onClick={() => setShowWorkspaceSheet(true)}>
              <div className="mm-settings-icon">
                <Building2 size={20} />
              </div>
              <span className="mm-settings-label">管理工作区</span>
              <span className="mm-settings-value">{workspaces.length} 个</span>
              <ChevronRight size={18} className="mm-settings-arrow" />
            </div>
          </div>
        </div>

        {/* 功能入口 */}
        <div className="mm-settings-section">
          <div className="mm-settings-title">功能</div>
          <div className="mm-settings-list">
            <div className="mm-settings-item" onClick={() => navigate('/daily-report')}>
              <div className="mm-settings-icon">
                <FileText size={20} />
              </div>
              <span className="mm-settings-label">工作日报</span>
              <ChevronRight size={18} className="mm-settings-arrow" />
            </div>
            <div className="mm-settings-item" onClick={() => navigate('/admin/members-tree')}>
              <div className="mm-settings-icon">
                <Users size={20} />
              </div>
              <span className="mm-settings-label">成员管理</span>
              <ChevronRight size={18} className="mm-settings-arrow" />
            </div>
            <div className="mm-settings-item" onClick={() => navigate('/admin/projects-tree')}>
              <div className="mm-settings-icon">
                <Folder size={20} />
              </div>
              <span className="mm-settings-label">项目管理</span>
              <ChevronRight size={18} className="mm-settings-arrow" />
            </div>
          </div>
        </div>

        {/* 账户设置 */}
        <div className="mm-settings-section">
          <div className="mm-settings-title">账户</div>
          <div className="mm-settings-list">
            <div className="mm-settings-item" onClick={() => setShowProfileSheet(true)}>
              <div className="mm-settings-icon">
                <User size={20} />
              </div>
              <span className="mm-settings-label">个人资料</span>
              <ChevronRight size={18} className="mm-settings-arrow" />
            </div>

            <div className="mm-settings-item" onClick={handleToggleNotification}>
              <div className="mm-settings-icon">
                <Bell size={20} />
              </div>
              <span className="mm-settings-label">通知设置</span>
              <div className={`mm-toggle ${notificationEnabled ? 'active' : ''}`}>
                <div className="mm-toggle-thumb" />
              </div>
            </div>

            <div className="mm-settings-item" onClick={() => setShowPasswordSheet(true)}>
              <div className="mm-settings-icon">
                <Shield size={20} />
              </div>
              <span className="mm-settings-label">修改密码</span>
              <ChevronRight size={18} className="mm-settings-arrow" />
            </div>
          </div>
        </div>

        {/* 其他 */}
        <div className="mm-settings-section">
          <div className="mm-settings-title">其他</div>
          <div className="mm-settings-list">
            <div className="mm-settings-item" onClick={() => navigate('/about')}>
              <div className="mm-settings-icon">
                <Info size={20} />
              </div>
              <span className="mm-settings-label">关于</span>
              <ChevronRight size={18} className="mm-settings-arrow" />
            </div>
          </div>
        </div>

        {/* 退出登录按钮 */}
        <div className="mm-settings-logout">
          <button className="mm-btn mm-btn-danger mm-btn-block" onClick={handleLogout}>
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>

        {/* 版本信息 */}
        <div className="mm-version-info">
          <p>TaskFlow v1.0.0</p>
        </div>
      </div>

      {/* 个人资料编辑弹窗 */}
      <SheetModal
        isOpen={showProfileSheet}
        onClose={() => setShowProfileSheet(false)}
        title="编辑个人资料"
        height="85vh"
      >
        <div className="mm-form-scroll">
          <div className="mm-form-group">
            <label className="mm-form-label">姓名 *</label>
            <input
              type="text"
              className="mm-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
            />
          </div>

          <div className="mm-form-group">
            <label className="mm-form-label">邮箱 *</label>
            <input
              type="email"
              className="mm-form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
            />
          </div>

          <div className="mm-form-group">
            <label className="mm-form-label">手机号</label>
            <input
              type="tel"
              className="mm-form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
            />
          </div>

          <div className="mm-form-group">
            <label className="mm-form-label">职业</label>
            <button
              className="mm-form-select-btn"
              onClick={() => setShowProfessionSheet(true)}
            >
              <span>{getProfessionLabel(profession)}</span>
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="mm-form-group">
            <label className="mm-form-label">公司</label>
            <input
              type="text"
              className="mm-form-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="请输入公司名称"
            />
          </div>

          <div className="mm-form-group">
            <label className="mm-form-label">所在地</label>
            <input
              type="text"
              className="mm-form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="请输入所在城市"
            />
          </div>

          <div className="mm-form-group">
            <label className="mm-form-label">个人简介</label>
            <textarea
              className="mm-form-input mm-form-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="介绍一下自己..."
              rows={3}
            />
          </div>

          <button
            className="mm-btn mm-btn-primary mm-btn-block"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving && <Loader2 size={18} className="mm-spinner-icon" />}
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </SheetModal>

      {/* 职业选择弹窗 */}
      <SheetModal
        isOpen={showProfessionSheet}
        onClose={() => setShowProfessionSheet(false)}
        title="选择职业（可多选）"
      >
        <div className="mm-profession-list">
          {PROFESSIONS.map(prof => (
            <button
              key={prof.value}
              className={`mm-profession-item ${isProfessionSelected(prof.value) ? 'selected' : ''}`}
              onClick={() => toggleProfession(prof.value)}
            >
              <span>{prof.label}</span>
              {isProfessionSelected(prof.value) && <Check size={16} />}
            </button>
          ))}
        </div>
        <div style={{ padding: '16px' }}>
          <button
            className="mm-btn mm-btn-primary mm-btn-block"
            onClick={() => setShowProfessionSheet(false)}
          >
            确定
          </button>
        </div>
      </SheetModal>

      {/* 修改密码弹窗 */}
      <SheetModal
        isOpen={showPasswordSheet}
        onClose={() => {
          setShowPasswordSheet(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setError(null);
        }}
        title="修改密码"
      >
        <div className="mm-form-scroll">
          <div className="mm-form-group">
            <label className="mm-form-label">当前密码</label>
            <input
              type="password"
              className="mm-form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="请输入当前密码"
            />
          </div>

          <div className="mm-form-group">
            <label className="mm-form-label">新密码</label>
            <input
              type="password"
              className="mm-form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 位"
            />
          </div>

          <div className="mm-form-group">
            <label className="mm-form-label">确认新密码</label>
            <input
              type="password"
              className="mm-form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
            />
          </div>

          <button
            className="mm-btn mm-btn-primary mm-btn-block"
            onClick={handleSavePassword}
            disabled={saving}
          >
            {saving && <Loader2 size={18} className="mm-spinner-icon" />}
            {saving ? '保存中...' : '确认修改'}
          </button>
        </div>
      </SheetModal>

      {/* 工作区管理弹窗 */}
      <SheetModal
        isOpen={showWorkspaceSheet}
        onClose={() => setShowWorkspaceSheet(false)}
        title="管理工作区"
      >
        <div className="mm-workspace-list">
          {workspaces.map(ws => (
            <div 
              key={ws.id} 
              className={`mm-workspace-item ${ws.id === currentWorkspace?.id ? 'current' : ''}`}
            >
              <div 
                className="mm-workspace-info"
                onClick={() => {
                  setCurrentWorkspaceId(ws.id);
                  setShowWorkspaceSheet(false);
                }}
              >
                <div className="mm-workspace-icon">
                  {ws.name.charAt(0)}
                </div>
                <div className="mm-workspace-details">
                  <span className="mm-workspace-name">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <span className="mm-workspace-current">当前</span>
                  )}
                </div>
              </div>
              {workspaces.length > 1 && (
                <button
                  className="mm-workspace-delete"
                  onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                  disabled={deleting}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </SheetModal>
    </MobileLayout>
  );
}
