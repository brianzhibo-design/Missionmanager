/**
 * 工作区守卫组件
 * 检查用户是否有工作区，没有则跳转到设置页面
 */
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { Loader2, RefreshCw } from './Icons';

interface WorkspaceGuardProps {
  children: React.ReactNode;
}

export default function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { workspaces, loadingWorkspaces, loadError, refreshWorkspaces } = usePermissions();
  const location = useLocation();

  // 正在加载工作区列表
  if (loadingWorkspaces) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f8fafc'
      }}>
        <Loader2 size={32} className="spin" style={{ color: '#10b981' }} />
      </div>
    );
  }

  // 加载失败，显示重试选项
  if (loadError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f8fafc',
        gap: '16px'
      }}>
        <p style={{ color: '#ef4444', fontSize: '14px' }}>{loadError}</p>
        <button 
          onClick={() => refreshWorkspaces()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <RefreshCw size={16} />
          重新加载
        </button>
      </div>
    );
  }

  // 没有工作区，跳转到设置页面
  if (workspaces.length === 0) {
    return <Navigate to="/workspace-setup" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}




