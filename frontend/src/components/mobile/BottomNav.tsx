/**
 * 移动端底部导航组件
 * 5个Tab：首页、任务、+新建、项目、我的
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Plus, Folder, User } from '../Icons';

interface BottomNavProps {
  onAddClick?: () => void;
}

export default function BottomNav({ onAddClick }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const tabs = [
    { id: 'home', icon: Home, label: '首页', path: '/dashboard' },
    { id: 'tasks', icon: CheckSquare, label: '任务', path: '/my-tasks' },
    { id: 'add', icon: Plus, label: '新建', path: null }, // FAB
    { id: 'projects', icon: Folder, label: '项目', path: '/projects' },
    { id: 'profile', icon: User, label: '我的', path: '/settings' },
  ];
  
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'home';
    if (path.startsWith('/my-tasks') || path.startsWith('/tasks')) return 'tasks';
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/settings') || path.startsWith('/profile')) return 'profile';
    // 管理页面也高亮对应 Tab
    if (path.startsWith('/admin/members-tree') || path.startsWith('/admin/projects-tree')) return 'projects';
    return '';
  };
  
  const activeTab = getActiveTab();

  return (
    <nav className="mm-bottom-nav">
      {tabs.map((tab) => {
        if (tab.id === 'add') {
          return (
            <div key={tab.id} className="mm-nav-fab-wrapper">
              <button className="mm-nav-fab" onClick={onAddClick}>
                <Plus size={24} />
              </button>
            </div>
          );
        }
        
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            className={`mm-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => tab.path && navigate(tab.path)}
          >
            <Icon size={24} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
