import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { socketService } from '../services/socket';
import { workspaceService } from '../services/workspace';
import {
  DashboardIcon,
  TasksIcon,
  ProjectsIcon,
  ReportsIcon,
  MembersIcon,
  TaskTreeIcon,
  OverviewIcon,
  ReportCenterIcon,
  AIIcon,
} from './SidebarIcons';
import {
  Settings,
  Bell,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  Plus,
  Check,
  User,
} from './Icons';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import './AppLayout.css';

// ==========================================
// 工作区切换器组件
// ==========================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkspaceAny = any;

interface WorkspaceSwitcherProps {
  collapsed: boolean;
  workspaces: WorkspaceAny[];
  currentWorkspace: WorkspaceAny | null;
  workspaceRole: string | undefined;
  onSelect: (ws: WorkspaceAny) => void;
  onCreateWorkspace: () => void;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  collapsed,
  workspaces,
  currentWorkspace,
  workspaceRole,
  onSelect,
  onCreateWorkspace,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // 工作区颜色映射 - 返回内联样式
  const getWorkspaceStyle = (name: string): React.CSSProperties => {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #8b5cf6)',
      'linear-gradient(135deg, #ec4899, #f43f5e)',
      'linear-gradient(135deg, #10b981, #14b8a6)',
      'linear-gradient(135deg, #f97316, #f59e0b)',
      'linear-gradient(135deg, #06b6d4, #3b82f6)',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return { background: gradients[index] };
  };

  // 计算弹窗位置
  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      if (collapsed) {
        // 收起状态：弹窗在按钮右侧
        setMenuPosition({
          top: rect.top,
          left: rect.right + 8,
        });
      } else {
        // 展开状态：弹窗在按钮下方
        setMenuPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
    }
  }, [collapsed]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 打开弹窗时更新位置
  useEffect(() => {
    if (isOpen) {
      updateMenuPosition();
    }
  }, [isOpen, updateMenuPosition]);

  const getRoleName = (role: string | undefined) => {
    if (!role) return '成员';
    const roleMap: Record<string, string> = {
      owner: '创始人',
      director: '管理员',
      leader: '组长',
      member: '成员',
      guest: '访客',
    };
    return roleMap[role] || '成员';
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return (
    <div className="ws-switcher-wrapper">
      <button 
        ref={buttonRef}
        onClick={handleToggle}
        className={`ws-switcher-btn ${collapsed ? 'collapsed' : ''}`}
      >
        <div className="ws-logo" style={getWorkspaceStyle(currentWorkspace?.name || 'W')}>
          {currentWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
        </div>
        {!collapsed && (
          <div className="ws-info">
            <span className="ws-name">{currentWorkspace?.name || 'Workspace'}</span>
            <span className="ws-plan">{getRoleName(workspaceRole)}</span>
          </div>
        )}
        {!collapsed && (
          <ChevronDown size={14} className={`ws-chevron ${isOpen ? 'rotated' : ''}`} />
        )}
      </button>

      {/* 工作区菜单 - 使用 Portal 渲染到 body */}
      {isOpen && createPortal(
        <div 
          ref={menuRef}
          className="ws-menu-portal"
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 99999,
          }}
        >
          <div className="ws-menu-header">切换工作区</div>
          <div className="ws-menu-list">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                className={`ws-menu-item ${ws.id === currentWorkspace?.id ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); onSelect(ws); setIsOpen(false); }}
              >
                <div className="ws-menu-logo" style={getWorkspaceStyle(ws.name)}>
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="ws-menu-info">
                  <span className="ws-menu-name">{ws.name}</span>
                  <RoleBadge role={ws.role} size="xs" variant="dot" />
                </div>
                {ws.id === currentWorkspace?.id && (
                  <Check size={16} className="ws-menu-check" />
                )}
              </button>
            ))}
          </div>
          
          <div className="ws-menu-divider" />
          <button 
            className="ws-menu-create"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onCreateWorkspace();
            }}
          >
            <div className="ws-menu-create-icon">
              <Plus size={14} />
            </div>
            创建工作区
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

// ==========================================
// 用户菜单组件
// ==========================================
interface UserMenuProps {
  collapsed: boolean;
  user: { name?: string; email?: string; avatar?: string } | null;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

const SidebarUserMenu: React.FC<UserMenuProps> = ({ collapsed, user, onLogout, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const handleMenuClick = (action: string) => {
    setIsOpen(false);
    switch (action) {
      case 'profile':
      case 'settings':
        onNavigate('/settings');
        break;
      case 'logout':
        onLogout();
        break;
    }
  };

  return (
    <div className="sidebar-user-menu" ref={menuRef}>
      {/* 弹出菜单 */}
      {isOpen && (
        <div className={`user-popup ${collapsed ? 'popup-right' : 'popup-top'}`}>
          <div className="user-popup-content">
            <div className="user-popup-header">
              <p className="user-popup-label">登录账户</p>
              <p className="user-popup-email">{user?.email || 'user@example.com'}</p>
            </div>
            
            <div className="user-popup-items">
              <button className="user-popup-item" onClick={() => handleMenuClick('profile')}>
                <User size={16} />
                <span>我的资料</span>
              </button>
              <button className="user-popup-item" onClick={() => handleMenuClick('settings')}>
                <Settings size={16} />
                <span>设置</span>
              </button>
            </div>
            
            <div className="user-popup-divider" />
            <button className="user-popup-logout" onClick={() => handleMenuClick('logout')}>
              <LogOut size={16} />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}

      {/* 触发按钮 */}
      <div className={`user-trigger-wrapper ${collapsed ? 'collapsed' : ''}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className={`user-trigger ${isOpen ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
        >
          <div className="user-avatar-wrapper">
            <div className={`user-avatar ${isOpen ? 'active' : ''}`}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} />
              ) : (
                getUserInitials()
              )}
            </div>
            <div className="user-status-dot" />
          </div>
          
          {!collapsed && (
            <div className="user-info">
              <span className={`user-name ${isOpen ? 'active' : ''}`}>
                {user?.name || '用户'}
              </span>
              <span className="user-role">
                {user?.email?.split('@')[0] || 'User'}
              </span>
            </div>
          )}

          {!collapsed && (
            <div className={`user-chevron ${isOpen ? 'rotated' : ''}`}>
              <ChevronDown size={16} />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 导航项组件
// ==========================================
interface NavItemProps {
  to: string;
  icon: React.FC<{ active?: boolean; className?: string }>;
  label: string;
  collapsed: boolean;
  badge?: string;
  isAI?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, collapsed, badge, isAI }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <NavLink 
      to={to}
      className={`nav-item-v2 ${isActive ? 'active' : ''}`}
      data-label={label}
    >
      <div className="nav-item-left">
        <Icon active={isActive} className={`nav-icon ${isActive ? 'active' : ''} ${isAI ? 'ai-icon' : ''}`} />
        {!collapsed && <span className="nav-label">{label}</span>}
      </div>

      {badge && !collapsed && (
        <span className={`nav-badge ${isAI ? 'ai-badge' : ''} ${isActive ? 'active' : ''}`}>
          {badge}
        </span>
      )}
      
      {badge && collapsed && (
        <span className={`nav-badge-dot ${isAI ? 'ai-dot' : ''}`} />
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="nav-tooltip">{label}</div>
      )}
    </NavLink>
  );
};

// ==========================================
// 主布局组件
// ==========================================
export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { 
    workspaces, 
    currentWorkspace, 
    setCurrentWorkspace, 
    workspaceRole,
    canWorkspace,
    refreshWorkspaces,
  } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 移动端布局判断
  const mobileLayoutPaths = [
    '/dashboard', '/my-tasks', '/projects', '/settings',
    '/notifications', '/search', '/daily-report', '/ai/',
    '/admin/members-tree', '/admin/projects-tree', '/tasks/',
  ];
  const useNewMobileLayout = isMobile && mobileLayoutPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(path)
  );

  // 权限检查
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
  };

  // 创建工作区模态框状态
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  // 创建工作区处理
  const handleCreateWorkspace = async (data: { name: string; description?: string }) => {
    await workspaceService.createWorkspace(data.name, data.description);
    await refreshWorkspaces();
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
    pushNotificationService.init();
    socketService.init();
    
    const unsubscribe = socketService.addListener(() => {
      setUnreadCount(prev => prev + 1);
    });
    
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
      socketService.disconnect();
    };
  }, [loadUnreadCount]);

  // 导航配置
  const mainNavItems = [
    { path: '/dashboard', icon: DashboardIcon, label: '仪表盘' },
    { path: '/my-tasks', icon: TasksIcon, label: '我的任务' },
    { path: '/projects', icon: ProjectsIcon, label: '项目' },
    { path: '/daily-report', icon: ReportsIcon, label: '我的日报' },
  ];

  const adminNavItems = [
    { path: '/admin/members', icon: MembersIcon, label: '成员管理', permission: 'manageMembers' as const },
    { path: '/admin/members-tree', icon: TaskTreeIcon, label: '成员任务树', permission: 'adminTree' as const },
    { path: '/admin/projects-tree', icon: OverviewIcon, label: '项目总览', permission: 'adminTree' as const },
    { path: '/reports', icon: ReportCenterIcon, label: '报告中心', permission: 'viewReports' as const },
  ];

  const aiNavItems = [
    { path: '/ai-insights', icon: AIIcon, label: 'AI 洞察', badge: 'New' },
  ];

  return (
    <div className="app-layout" data-mobile-new-layout={useNewMobileLayout}>
      {/* 侧边栏 */}
      <aside 
        className={`sidebar-v2 ${sidebarCollapsed ? 'collapsed' : ''}`}
        onClick={(e) => {
          // 只有在收起状态下，点击空白区域才展开侧边栏
          // 排除按钮和链接的点击
          const target = e.target as HTMLElement;
          const isInteractiveElement = target.closest('button, a, .ws-switcher-btn');
          if (sidebarCollapsed && !e.defaultPrevented && !isInteractiveElement) {
            setSidebarCollapsed(false);
          }
        }}
      >
        {/* 顶部：工作区切换器 + 折叠按钮 */}
        <div className={`sidebar-header ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <WorkspaceSwitcher
            collapsed={sidebarCollapsed}
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            workspaceRole={workspaceRole}
            onSelect={handleWorkspaceSelect}
            onCreateWorkspace={() => setShowCreateWorkspace(true)}
          />
          
          {!sidebarCollapsed && (
            <button 
              className="sidebar-toggle"
              onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(true); }}
              title="收起侧边栏"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* 导航内容区 */}
        <nav className="sidebar-nav">
          {/* 主导航 */}
          <div className="nav-group">
            {!sidebarCollapsed && <div className="nav-group-title">主菜单</div>}
            {sidebarCollapsed && <div className="nav-group-divider" />}
            <div className="nav-items">
              {mainNavItems.map(item => (
                <NavItem
                  key={item.path}
                  to={item.path}
                  icon={item.icon}
                  label={item.label}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </div>

          {/* 管理菜单 */}
          {hasAnyAdminPermission && (
            <div className="nav-group">
              {!sidebarCollapsed && <div className="nav-group-title">管理</div>}
              {sidebarCollapsed && <div className="nav-group-divider" />}
              <div className="nav-items">
                {adminNavItems.map(item => (
                  canWorkspace(item.permission) && (
                    <NavItem
                      key={item.path}
                      to={item.path}
                      icon={item.icon}
                      label={item.label}
                      collapsed={sidebarCollapsed}
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {/* AI 功能 */}
          {canWorkspace('aiGlobalAnalysis') && (
            <div className="nav-group">
              {!sidebarCollapsed && <div className="nav-group-title">AI 功能</div>}
              {sidebarCollapsed && <div className="nav-group-divider" />}
              <div className="nav-items">
                {aiNavItems.map(item => (
                  <NavItem
                    key={item.path}
                    to={item.path}
                    icon={item.icon}
                    label={item.label}
                    collapsed={sidebarCollapsed}
                    badge={item.badge}
                    isAI
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* 底部用户菜单 */}
        <SidebarUserMenu
          collapsed={sidebarCollapsed}
          user={user}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
      </aside>

      {/* 主内容区 */}
      <div className="main-container">
        {/* 顶部栏 */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="current-workspace-name">
              {currentWorkspace?.name || 'TaskFlow'}
            </span>
          </div>

          <div className="topbar-right">
            {/* 通知 */}
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

            {/* 主题切换 */}
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
          </div>
        </header>

        {/* 主内容 */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* 移动端导航 */}
      {!useNewMobileLayout && <MobileNav />}

      {/* 创建工作区模态框 */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
        onSubmit={handleCreateWorkspace}
      />
    </div>
  );
}
