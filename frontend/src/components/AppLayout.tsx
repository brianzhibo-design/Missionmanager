import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useIsMobile';
import RoleBadge from './RoleBadge';
import NotificationCenter from './NotificationCenter';
import MobileNav from './MobileNav';
import UserMenu from './UserMenu';
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
  PanelLeftClose,
  PanelLeftOpen,
} from './Icons';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <aside 
        className={`sidebar-v2 ${sidebarCollapsed ? 'collapsed' : ''}`}
        onClick={(e) => {
          // 点击空白区域展开（排除按钮和菜单项）
          if (sidebarCollapsed && !e.defaultPrevented && !(e.target as HTMLElement).closest('button, a')) {
            setSidebarCollapsed(false);
          }
        }}
      >
        {/* 1. 工作区切换器 */}
        <div className="ws-header">
          <div className="ws-switcher" onClick={() => !sidebarCollapsed && setShowWorkspaceMenu(!showWorkspaceMenu)}>
            <div className="ws-logo">
              {currentWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="ws-info">
                  <span className="ws-name">{currentWorkspace?.name || 'Workspace'}</span>
                  <span className="ws-plan">{workspaceRole === 'owner' ? '创始人' : workspaceRole === 'director' ? '管理员' : '成员'}</span>
                </div>
                <ChevronDown size={14} className="ws-chevron" />
              </>
            )}
          </div>

          {/* 折叠/展开按钮 */}
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

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
                    data-label={item.label}
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
                      data-label={item.label}
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
                      data-label={item.label}
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

        </div>

        {/* 6. 底部用户菜单 */}
        <UserMenu collapsed={sidebarCollapsed} />
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
    </div>
  );
}
