/**
 * 移动端底部导航组件 - Warm Sun Design
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import {
  Home,
  CheckSquare,
  Plus,
  User,
  Users,
  Network,
  FileText,
  Brain,
  Settings,
  FolderKanban,
  LucideIcon,
} from 'lucide-react';
import './MobileNav.css';

interface NavItem {
  path: string;
  Icon: LucideIcon;
  label: string;
}

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, canWorkspace } = usePermissions();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const moreItems: NavItem[] = [
    { path: '/projects', Icon: FolderKanban, label: '项目' },
    ...(isAdmin ? [
      { path: '/admin/members', Icon: Users, label: '成员' },
      { path: '/admin/members-tree', Icon: Network, label: '组织' },
      { path: '/reports', Icon: FileText, label: '报告' },
    ] : []),
    ...(canWorkspace('aiGlobalAnalysis') ? [
      { path: '/ai-insights', Icon: Brain, label: 'AI' },
    ] : []),
    { path: '/settings', Icon: Settings, label: '设置' },
  ];

  const handleFabClick = () => {
    // 跳转到任务页面创建新任务
    navigate('/my-tasks?action=create');
  };

  return (
    <>
      <nav className="ws-bottom-nav">
        {/* 首页 */}
        <Link
          to="/dashboard"
          className={`ws-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
        >
          <Home />
          <span>首页</span>
        </Link>

        {/* 任务 */}
        <Link
          to="/my-tasks"
          className={`ws-nav-item ${isActive('/my-tasks') ? 'active' : ''}`}
        >
          <CheckSquare />
          <span>任务</span>
        </Link>

        {/* 中心 FAB 按钮 */}
        <div className="ws-nav-fab-wrapper">
          <button className="ws-nav-fab" onClick={handleFabClick}>
            <Plus />
          </button>
        </div>

        {/* 成就 (占位，可后续实现) */}
        <Link
          to="/projects"
          className={`ws-nav-item ${isActive('/projects') ? 'active' : ''}`}
        >
          <FolderKanban />
          <span>项目</span>
        </Link>

        {/* 我的 / 更多 */}
        <button
          className={`ws-nav-item ${showMore ? 'active' : ''}`}
          onClick={() => setShowMore(!showMore)}
        >
          <User />
          <span>我的</span>
        </button>
      </nav>

      {/* 更多菜单 - iOS Action Sheet 风格 */}
      {showMore && (
        <>
          <div className="ws-sheet-overlay show" onClick={() => setShowMore(false)} />
          <div className="ws-sheet-modal show">
            <div className="ws-sheet-header">更多功能</div>
            <div className="ws-more-menu-grid">
              {moreItems.map((item) => {
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`ws-more-menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => setShowMore(false)}
                  >
                    <div className="ws-more-menu-icon">
                      <Icon size={24} />
                    </div>
                    <span className="ws-more-menu-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <button
              className="ws-btn ws-btn-secondary ws-btn-block ws-btn-md"
              style={{ marginTop: '16px' }}
              onClick={() => setShowMore(false)}
            >
              关闭
            </button>
          </div>
        </>
      )}
    </>
  );
}
