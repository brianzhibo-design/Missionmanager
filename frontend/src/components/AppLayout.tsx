import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { usePermissions } from '../hooks/usePermissions';
import { ROLE_LABELS, ROLE_COLORS } from '../config/permissions';
import { Logo } from './Logo';
import NotificationCenter from './NotificationCenter';
import MobileNav from './MobileNav';
import { notificationService } from '../services/notification';
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
  ChevronLeft,
  ChevronRight,
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
    canWorkspace 
  } = usePermissions();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 检查是否有任何管理菜单权限
  const hasAnyAdminPermission = 
    canWorkspace('manageMembers') || 
    canWorkspace('adminTree') || 
    canWorkspace('viewReports');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ws = workspaces.find(w => w.id === e.target.value);
    if (ws) setCurrentWorkspace(ws);
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

  // 初始加载未读数量
  useEffect(() => {
    loadUnreadCount();
    // 每30秒轮询一次
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
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
    <div className="app-layout" data-sidebar-collapsed={sidebarCollapsed}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Logo size={sidebarCollapsed ? 'sm' : 'md'} showText={!sidebarCollapsed} />
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="workspace-selector">
            <select 
              value={currentWorkspace?.id || ''} 
              onChange={handleWorkspaceChange}
              className="workspace-select"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
            {workspaceRole && (
              <span 
                className="workspace-role"
                style={{ 
                  background: ROLE_COLORS[workspaceRole]?.bg,
                  color: ROLE_COLORS[workspaceRole]?.color 
                }}
              >
                {ROLE_LABELS[workspaceRole]}
              </span>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!sidebarCollapsed && <span className="nav-section-title">主菜单</span>}
            {mainNavItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink 
                  key={item.path} 
                  to={item.path} 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={20} className="nav-icon" />
                  {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>

          {hasAnyAdminPermission && (
            <div className="nav-section">
              {!sidebarCollapsed && <span className="nav-section-title">管理</span>}
              {adminNavItems.map(item => {
                const Icon = item.icon;
                return canWorkspace(item.permission) && (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={20} className="nav-icon" />
                    {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          )}

          {canWorkspace('aiGlobalAnalysis') && (
            <div className="nav-section">
              {!sidebarCollapsed && <span className="nav-section-title">AI</span>}
              {aiNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={20} className="nav-icon" />
                    {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <NavLink to="/settings" className="nav-item">
              <Settings size={20} className="nav-icon" />
              <span className="nav-label">设置</span>
            </NavLink>
          </div>
        )}
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
                  {getUserInitials()}
                </div>
              </button>

              {showUserMenu && (
                <div className="user-menu" onClick={(e) => e.stopPropagation()}>
                  <div className="user-menu-header">
                    <div className="user-avatar user-avatar-lg">
                      {getUserInitials()}
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

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
