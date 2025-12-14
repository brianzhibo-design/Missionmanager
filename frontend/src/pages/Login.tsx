/**
 * 登录页面
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  
  const { login, register, isLoading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 如果已登录，重定向到目标页面
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/projects';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    const name = nameRef.current?.value || '';

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/projects';
      navigate(from, { replace: true });
    } catch {
      // 错误已在 useAuth 中处理
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-logo">任务管理系统</h1>
          <p className="login-subtitle">AI 驱动的智能任务管理</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="form-title">{isRegister ? '创建账号' : '登录'}</h2>

          {error && <div className="error-message">{error}</div>}

          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">姓名</label>
              <input
                id="name"
                type="text"
                ref={nameRef}
                placeholder="请输入姓名"
                required={isRegister}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              ref={emailRef}
              placeholder="请输入邮箱"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              ref={passwordRef}
              placeholder="请输入密码"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>

          <div className="form-footer">
            <button
              type="button"
              className="toggle-btn"
              onClick={() => {
                setIsRegister(!isRegister);
                clearError();
              }}
            >
              {isRegister ? '已有账号？立即登录' : '没有账号？立即注册'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
