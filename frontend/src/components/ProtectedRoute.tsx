/**
 * 路由守卫组件
 * 未登录用户重定向到登录页
 */
import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { config } from '../config';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // 检查本地存储中是否有 token
    const token = localStorage.getItem(config.storageKeys.token);
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!token && !refreshToken) {
      // 完全没有认证信息，需要跳转登录
      setShouldRedirect(true);
    }
    
    // 等待一小段时间让认证状态初始化
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // 检查中显示空白（避免闪烁）
  if (isChecking) {
    return null;
  }

  // 完全没有 token 且认证状态为 false
  if (shouldRedirect && !isAuthenticated) {
    // 保存当前路径，登录后可以跳回
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 有 token 但认证状态为 false（可能正在刷新 token）
  if (!isAuthenticated) {
    const token = localStorage.getItem(config.storageKeys.token);
    if (token) {
      // 有 token，继续显示内容（API 层会处理 token 刷新）
      return <>{children}</>;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

