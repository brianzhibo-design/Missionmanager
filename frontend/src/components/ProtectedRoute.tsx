/**
 * 路由守卫组件
 * 未登录用户重定向到登录页
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // 保存当前路径，登录后可以跳回
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

