import { Link } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../config/permissions';
import './AdminRoute.css';

interface AdminRouteProps {
  children: React.ReactNode;
  permission?: keyof typeof PERMISSIONS.workspace;
}

export default function AdminRoute({ children, permission = 'adminTree' }: AdminRouteProps) {
  const { canWorkspace, loadingWorkspaces } = usePermissions();

  if (loadingWorkspaces) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (!canWorkspace(permission)) {
    return (
      <div className="access-denied">
        <div className="denied-icon">🔒</div>
        <h2>无权访问</h2>
        <p>您没有权限访问此页面</p>
        <p className="denied-hint">请联系工作区管理员获取访问权限</p>
        <Link to="/dashboard" className="btn btn-primary">返回首页</Link>
      </div>
    );
  }

  return <>{children}</>;
}

