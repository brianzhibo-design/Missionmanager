import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useIsMobile';
import RoleBadge from './RoleBadge';
import NotificationCenter from './NotificationCenter';
import MobileNav from './MobileNav';
import { notificationService } from '../services/notification';
import { pushNotificationService } from '../services/pushNotification';
import { socketService, SocketNotification } from '../services/socket';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Network,
  BarChart3,
  FileText,
  Brain,
  Settings,
  Bell,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronDown,
  Plus,
  Mail,
  Phone,
  Link,
  Copy,
  Check,
  X,
} from 'lucide-react';
import './AppLayout.css';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { 
    workspaces, 
    currentWorkspace, 
    setCurrentWorkspace, 
    workspaceRole,
    canWorkspace,
  } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 判断是否使用新的移动端布局（简约蓝主题页面）
  // 这些页面使用独立的 MobileLayout，不需要 AppLayout 的 MobileNav
  // 判断是否使用新的移动端布局
  const mobileLayoutPaths = [
    '/dashboard', 
    '/my-tasks', 
    '/projects',
    '/settings',
    '/notifications',
    '/search',
    '/daily-report',
    '/ai/',
    '/admin/members-tree',
    '/admin/projects-tree',
    '/tasks/',
  ];
  const useNewMobileLayout = isMobile && mobileLayoutPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(path)
  );

  // 检查是否有任何管理菜单权限
  const hasAnyAdminPermission = 
    canWorkspace('manageMembers') || 
    canWorkspace('adminTree') || 
    canWorkspace('viewReports');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleWorkspaceSelect = (ws: typeof workspaces[0]) => {
    setCurrentWorkspace(ws);
    setShowWorkspaceMenu(false);
  };

  // 加载未读通知数量
  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await notificationService.getAll({ limit: 1 });
      setUnreadCount(result.unreadCount);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }, []);

  // 初始化通知服务和 WebSocket 连接
  useEffect(() => {
    // 自动请求浏览器通知权限
    pushNotificationService.init();
    
    // 初始化 WebSocket 连接
    socketService.init();
    
    // 监听实时通知，更新未读数
    const unsubscribe = socketService.addListener((_notification: SocketNotification) => {
      // 收到新通知时，增加未读数
      setUnreadCount(prev => prev + 1);
    });
    
    // 加载初始未读数量
    loadUnreadCount();
    
    // 每60秒同步一次未读数（作为备份）
    const interval = setInterval(loadUnreadCount, 60000);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
      socketService.disconnect();
    };
  }, [loadUnreadCount]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const mainNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
    { path: '/my-tasks', icon: CheckSquare, label: '我的任务' },
    { path: '/projects', icon: FolderKanban, label: '项目' },
    { path: '/daily-report', icon: FileText, label: '我的日报' },
  ];

  const adminNavItems = [
    { path: '/admin/members', icon: Users, label: '成员管理', permission: 'manageMembers' as const },
    { path: '/admin/members-tree', icon: Network, label: '成员任务树', permission: 'adminTree' as const },
    { path: '/admin/projects-tree', icon: BarChart3, label: '项目总览', permission: 'adminTree' as const },
    { path: '/reports', icon: FileText, label: '报告中心', permission: 'viewReports' as const },
  ];

  const aiNavItems = [
    { path: '/ai-insights', icon: Brain, label: 'AI 洞察' },
  ];

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="app-layout" data-mobile-new-layout={useNewMobileLayout}>
      {/* Sidebar - 精美商务风格 */}
      <aside className="sidebar-v2">
        {/* 1. 工作区切换器 */}
        <div className="ws-header">
          <div className="ws-switcher" onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}>
            <div className="ws-logo">
              {currentWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
            </div>
            <div className="ws-info">
              <span className="ws-name">{currentWorkspace?.name || 'Workspace'}</span>
              <span className="ws-plan">{workspaceRole === 'owner' ? '创始人' : workspaceRole === 'director' ? '管理员' : '成员'}</span>
            </div>
            <ChevronDown size={14} className="ws-chevron" />
          </div>

          {/* 工作区下拉菜单 */}
          {showWorkspaceMenu && (
            <>
              <div className="ws-menu-overlay" onClick={() => setShowWorkspaceMenu(false)} />
              <div className="ws-menu">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    className={`ws-menu-item ${ws.id === currentWorkspace?.id ? 'active' : ''}`}
                    onClick={() => handleWorkspaceSelect(ws)}
                  >
                    <div className="ws-menu-logo">{ws.name.charAt(0).toUpperCase()}</div>
                    <div className="ws-menu-info">
                      <span className="ws-menu-name">{ws.name}</span>
                      <RoleBadge role={ws.role} size="xs" variant="dot" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 侧边栏主内容区 */}
        <div className="sidebar-content">
          {/* 2. 主导航 */}
          <div className="nav-group">
            <div className="nav-group-title">主菜单</div>
            <div className="nav-items">
              {mainNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    className={({ isActive }) => `nav-item-v2 ${isActive ? 'active' : ''}`}
                  >
                    <div className="nav-item-left">
                      <Icon size={18} strokeWidth={2} />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* 3. 管理菜单 */}
          {hasAnyAdminPermission && (
            <div className="nav-group">
              <div className="nav-group-title">管理</div>
              <div className="nav-items">
                {adminNavItems.map(item => {
                  const Icon = item.icon;
                  return canWorkspace(item.permission) && (
                    <NavLink 
                      key={item.path} 
                      to={item.path} 
                      className={({ isActive }) => `nav-item-v2 ${isActive ? 'active' : ''}`}
                    >
                      <div className="nav-item-left">
                        <Icon size={18} strokeWidth={2} />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI 菜单 */}
          {canWorkspace('aiGlobalAnalysis') && (
            <div className="nav-group">
              <div className="nav-group-title">AI 功能</div>
              <div className="nav-items">
                {aiNavItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink 
                      key={item.path} 
                      to={item.path} 
                      className={({ isActive }) => `nav-item-v2 ${isActive ? 'active' : ''}`}
                    >
                      <div className="nav-item-left">
                        <Icon size={18} strokeWidth={2} />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* 邀请成员按钮 */}
          {canWorkspace('manageMembers') && (
            <div className="nav-group">
              <button 
                className="invite-member-btn"
                onClick={() => setShowInviteModal(true)}
              >
                <Plus size={14} /> 邀请成员
              </button>
            </div>
          )}
        </div>

        {/* 6. 底部个人资料 */}
        <div className="sidebar-footer-v2">
          <div className="profile-card" onClick={() => navigate('/settings')}>
            <div className="profile-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} />
              ) : (
                getUserInitials()
              )}
            </div>
            <div className="profile-info">
              <span className="profile-name">{user?.name}</span>
              <span className="profile-email">{user?.email}</span>
            </div>
            <Settings size={16} className="profile-settings" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-container">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="current-workspace-name">
              {currentWorkspace?.name || 'TaskFlow'}
            </span>
          </div>

          <div className="topbar-right">
            {/* Notifications */}
            <div className="notification-wrapper">
              <button 
                className="topbar-btn notification-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <>
                  <div className="notification-overlay" onClick={() => setShowNotifications(false)} />
                  <NotificationCenter 
                    onClose={() => setShowNotifications(false)} 
                    onUnreadCountChange={setUnreadCount}
                  />
                </>
              )}
            </div>

            {/* Theme Switcher */}
            <div className="theme-switcher">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                title="浅色模式"
              >
                <Sun size={18} />
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                title="深色模式"
              >
                <Moon size={18} />
              </button>
              <button 
                className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
                title="跟随系统"
              >
                <Monitor size={18} />
              </button>
            </div>

            {/* User Menu */}
            <div className="user-menu-wrapper">
              <button 
                className="user-avatar-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                }}
              >
                <div className="user-avatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="avatar-img" />
                  ) : (
                    getUserInitials()
                  )}
                </div>
              </button>

              {showUserMenu && (
                <div className="user-menu" onClick={(e) => e.stopPropagation()}>
                  <div className="user-menu-header">
                    <div className="user-avatar user-avatar-lg">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="avatar-img" />
                      ) : (
                        getUserInitials()
                      )}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user?.name}</span>
                      <span className="user-email">{user?.email}</span>
                    </div>
                  </div>
                  <div className="user-menu-divider" />
                  <NavLink to="/settings" className="user-menu-item" onClick={() => setShowUserMenu(false)}>
                    <Settings size={16} />
                    <span>设置</span>
                  </NavLink>
                  <button className="user-menu-item danger" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation - 隐藏于使用新布局的页面 */}
      {!useNewMobileLayout && <MobileNav />}

      {/* 邀请成员模态框 */}
      {showInviteModal && (
        <InviteMemberModal 
          workspaceId={currentWorkspace?.id || ''}
          workspaceName={currentWorkspace?.name || ''}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

// 邀请成员模态框组件
function InviteMemberModal({ 
  workspaceId, 
  workspaceName,
  onClose 
}: { 
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}) {
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
      // 调用邀请 API
      const { memberService } = await import('../services/member');
      await memberService.inviteMember(workspaceId, contact, role);
      setSuccess(`已发送邀请至 ${contact}`);
      setEmail('');
      setPhone('');
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
