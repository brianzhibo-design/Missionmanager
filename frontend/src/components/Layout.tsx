/**
 * 基础布局组件
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-left">
          <h1 className="logo" onClick={() => navigate('/projects')}>
            任务管理系统
          </h1>
        </div>
        <div className="header-right">
          {user && (
            <>
              <span className="user-info">{user.email}</span>
              <button className="logout-btn" onClick={handleLogout}>
                退出登录
              </button>
            </>
          )}
        </div>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}

