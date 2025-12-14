/**
 * 移动端底部导航组件
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Menu,
  X,
  Users,
  Network,
  FileText,
  Brain,
  Settings,
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
  const { isAdmin, canWorkspace } = usePermissions();
  const [showMore, setShowMore] = useState(false);

  const mainItems: NavItem[] = [
    { path: '/dashboard', Icon: LayoutDashboard, label: '首页' },
    { path: '/my-tasks', Icon: CheckSquare, label: '任务' },
    { path: '/projects', Icon: FolderKanban, label: '项目' },
  ];

  const moreItems: NavItem[] = [
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="mobile-nav">
        {mainItems.map((item) => {
          const Icon = item.Icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <Icon size={20} className="mobile-nav-icon" />
              <span className="mobile-nav-label">{item.label}</span>
            </Link>
          );
        })}
        <button
          className={`mobile-nav-item ${showMore ? 'active' : ''}`}
          onClick={() => setShowMore(!showMore)}
        >
          <Menu size={20} className="mobile-nav-icon" />
          <span className="mobile-nav-label">更多</span>
        </button>
      </nav>

      {/* 更多菜单 */}
      {showMore && (
        <>
          <div className="mobile-menu-overlay" onClick={() => setShowMore(false)} />
          <div className="mobile-menu">
            <div className="mobile-menu-header">
              <h3>更多功能</h3>
              <button className="close-btn" onClick={() => setShowMore(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mobile-menu-items">
              {moreItems.map((item) => {
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => setShowMore(false)}
                  >
                    <Icon size={20} className="menu-icon" />
                    <span className="menu-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
