/**
 * 工作区守卫组件
 * 检查用户是否有工作区，没有则跳转到设置页面
 */
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { Loader2 } from './Icons';

interface WorkspaceGuardProps {
  children: React.ReactNode;
}

export default function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { workspaces, loadingWorkspaces } = usePermissions();
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

  // 没有工作区，跳转到设置页面
  if (workspaces.length === 0) {
    return <Navigate to="/workspace-setup" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
